# Candidate-Table Workflow Design

Replaces `consumption-dip-rescue` with a two-step workflow. Every workflow writes
its candidates into one shared, play-agnostic BigQuery table keyed by `run_id`.
The agent reads that run, defines a few plays into a plays table, stamps each
play's id onto its orgs, and writes a summary artifact.

One agent. One standard tool set. Strategy is a skill — that's the only thing
that changes between churn prevention and expansion.

**Precondition:** `plan-1-upgrade-and-cleanup.md` is done — mashpy is at 0.21.1
and the old five-step workflows are gone.

---

## 1. Why

The workflow plan 1 removed threaded one growing pydantic container through five
steps, two of them agent steps. Every org's numbers got re-emitted by the LLM
twice just to survive to the next step, and because the agent could drop or alter
rows in transit, the final step re-ran the whole warehouse query and rebuilt the
candidate set to defend against its own pipeline.

Here tables hold the data, both steps address the same rows by `run_id`, and
nothing large passes through the model.

---

## 2. The two steps

| # | Step | Kind | Does |
|---|------|------|------|
| 1 | `select-play-candidates` | code | Runs the selection query, writes qualifying orgs to `crm_db.play_candidates` tagged with `run_id` |
| 2 | `curate-plays` | agent | Reads that run, creates 3–4 plays, assigns every org to one, writes the artifact |

What step 1 hands step 2:

```python
class CandidateSet(BaseModel):
    run_id: str
    workflow_id: str
    as_of_date: str
    candidate_count: int
    selection_rule: str          # prose: "decay >= 30% AND sustained >= 5d AND age >= 21d"
    selection_sql: str           # the compiled SQL that produced the rows
    org_snapshot_schema: dict    # field -> {type, unit, description}
    usage_snapshot_schema: dict  # field -> {type, unit, description}
```

This is the agent step's input, so it arrives in the first request alongside the
system prompt and the strategy skill. By the time the agent takes its first
action it already knows the run, the rule that produced it, the SQL behind that
rule, how many orgs are in it, and what every snapshot field means and is
measured in. There is no discovery round-trip.

The candidate rows themselves stay in BigQuery.

---

## 3. Tables

### `crm_db.play_candidates`

One table, shared by every play workflow. Nothing in the schema names a play or a
workflow's particular signals:

```sql
run_id                STRING     NOT NULL
workflow_id           STRING     NOT NULL
created_at            TIMESTAMP  NOT NULL
updated_at            TIMESTAMP  NOT NULL
org_id                STRING     NOT NULL
org_name              STRING
org_snapshot          JSON       -- who this org is
usage_snapshot        JSON       -- the facts that qualified it
play_id               STRING     -- FK to plays; NULL until step 2 assigns
```

Key is `(run_id, org_id)`. `play_id` is the only column the agent writes.

`as_of_date` lives inside `usage_snapshot` as a fact rather than getting its own
column; it's also on `CandidateSet`.

#### The snapshots

`org_snapshot` is who the org is; `usage_snapshot` is why it qualified. Both are
flat JSON maps of scalars — facts only.

```json
// org_snapshot
{"plan_tier": "enterprise", "segment": "critical", "consumption_mrr": 4820.00,
 "account_age_days": 412, "domain": "atlas.dev"}

// usage_snapshot  (consumption dip)
{"as_of_date": "2026-05-29", "baseline_tokens": 184000.0, "current_tokens": 96400.0,
 "decay_pct": 0.476, "sustained_days": 9, "active_users": 14, "dollars_at_risk": 2294.3}
```

#### The snapshot schemas

The field descriptions don't live in the table — they're identical for every row
in a run, and the agent gets them on `CandidateSet` before it queries anything:

```json
// usage_snapshot_schema
{
  "decay_pct":      {"type": "number", "unit": "fraction",
                     "description": "Drop from the org's own 4-week baseline. 0.48 = down 48%."},
  "sustained_days": {"type": "integer", "unit": "days",
                     "description": "Consecutive recent days below 0.8x baseline."},
  "dollars_at_risk":{"type": "number", "unit": "usd_per_month",
                     "description": "Monthly consumption revenue x decay_pct."}
}
```

The selection function declares them next to the code that builds the snapshots,
so the two can't drift. They do double duty: they tell the agent what
`sustained_days` means and what unit `consumption_mrr` is in, and they define the
set of variables a play's copy template is allowed to reference — `create_play`
validates against them.

#### How the two workflows differ

Only in what goes in the snapshots and what the schemas declare:

| | `consumption-dip-rescue` | `expansion-pqa` |
|---|---|---|
| `org_snapshot` | plan_tier, segment, consumption_mrr, account_age_days | plan_tier, segment, headcount, funding_stage, hiring_signals |
| `usage_snapshot` | baseline_tokens, current_tokens, decay_pct, sustained_days, dollars_at_risk | token_slope, active_users_start, active_users_now, new_surface, pqa_raw |

Same table, same tools, same artifact step.

Step 1 writes with `DELETE WHERE run_id = @run_id` then insert, so a retried step
replaces its own rows. Partition on `created_at`; old runs stay queryable.

### `crm_db.plays`

This name is already taken. The existing `crm_db.plays` is one row *per org* —
`org_id`, `status`, `holdout_arm`, `dollars_at_risk`, `draft_copy` — written by
the workflows plan 1 removed. Nothing writes it any more, so it gets dropped and
recreated with the schema below. See §7 for the source config and metrics that
still point at the old columns.

The plays the agent creates. One row per play, a handful per run:

```sql
play_id        STRING     NOT NULL   -- "{run_id}:{slug}"
run_id         STRING     NOT NULL
workflow_id    STRING     NOT NULL
play_name      STRING                -- "Enterprise CSM escalation"
motion         STRING                -- csm_escalation | sales_assisted_checkin | ...
criteria       STRING                -- why these orgs are in this play
copy_template  STRING                -- the message, with {variable} placeholders
template_vars  JSON                  -- declared variables -> snapshot field + format
created_at     TIMESTAMP  NOT NULL
```

The copy is written once per play and personalized per org at render time:

```
copy_template:
  "{org_name}'s token usage is down {decay_pct} from their four-week baseline and
   has stayed there {sustained_days} days. That's about {dollars_at_risk}/mo of
   consumption at risk. Worth a call this week — lead with the drop in {top_surface}."

template_vars:
  {"org_name":        {"source": "org_name"},
   "decay_pct":       {"source": "usage_snapshot.decay_pct",       "format": "percent0"},
   "sustained_days":  {"source": "usage_snapshot.sustained_days",  "format": "integer"},
   "dollars_at_risk": {"source": "usage_snapshot.dollars_at_risk", "format": "usd0"}}
```

Every variable must resolve to a field declared in that run's snapshot schemas.
`create_play` checks this and rejects a template referencing anything else, so a
play can't be created that fails to render for some org.

Rendering is a pure function of a play row plus a candidate row — the two tables
join on `play_id`, and anything downstream (a sender, a briefing export, the
artifact) can produce the per-org message without the agent in the loop.

---

## 4. Tools

The same four tools for every workflow, all scoped to one `run_id`. Nothing here
is churn- or expansion-specific. There is no "describe the run" tool — that
arrives as step input.

| Tool | Does |
|---|---|
| `read_candidates(run_id, limit, offset, order_by, where)` | Candidate rows, snapshots decoded and flattened. `order_by`/`where` take snapshot field names (`"dollars_at_risk DESC"`) and compile to JSON extraction. Capped at 200 rows. |
| `create_play(run_id, play_name, motion, criteria, copy_template, template_vars)` | Inserts into `plays`, validates every template variable resolves against the run's actual snapshot keys, returns `play_id`. |
| `preview_play_copy(run_id, play_id, limit)` | Renders the template against real candidate rows so the agent can check its own copy before assigning. |
| `assign_play(run_id, play_id, org_ids)` | `UPDATE play_candidates SET play_id`. Rejects unknown org ids, refuses to overwrite an existing assignment, returns `{assigned, unassigned_remaining}`. |

The agent's whole loop is: query `play_candidates`, write plays, stamp
assignments, write the artifact.

`assign_play` takes a list of org ids, so agent output scales with the number of
plays rather than the number of orgs. `unassigned_remaining` is how the agent
knows it's finished.

`create_play` validates against the run's data rather than the schema it handed
the agent: it reads the snapshot keys present on the run's rows and rejects any
`template_vars` source that isn't one of them. That's a stronger check than
comparing against the declared schema — it catches a field the schema promises
but the selection function never actually wrote.

Plus what the agent already has: `write_new_artifact_file` (and the other artifact
tools) and the read-only BigQuery MCP connection for evidence beyond the
snapshots.

---

## 5. The agent

`GrowthAgentSpec` keeps its current structure. Three changes: it runs on Gemini
instead of Anthropic, it takes the growth runtime context so it can build the
candidate tools, and its skills change.

```python
class GrowthAgentSpec(AgentSpec):
    def __init__(self, ctx: CrewGrowthRuntimeContext) -> None:
        self._ctx = ctx
        self._skills: SkillRegistry | None = None

    def build_llm(self) -> LLMProvider:
        return GeminiProvider(
            app_id="growth",
            model=GEMINI_MODEL,        # "gemini-3.7-flash"
            api_key=GEMINI_API_KEY,
        )

    def build_tools(self) -> ToolRegistry:
        tools = ToolRegistry()
        for tool in build_artifact_tools():
            tools.register(tool)
        for tool in build_candidate_tools(self._ctx):   # the four above
            tools.register(tool)
        return tools

    def build_agent_config(self) -> AgentConfig:
        return AgentConfig(
            app_id="growth",
            system_prompt=[
                {"type": "text", "text": build_base_prompt(BIGQUERY_PROJECT_ID),
                 "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": build_roles_context(self.build_skills()),
                 "cache_control": {"type": "ephemeral"}},
            ],
            max_steps=20,
            max_tokens=8192,
            conversation_history_turns=3,
            compaction_token_threshold=100000,
            skills_enabled=True,
        )
```

Two prompt blocks, same as today — no third block. `app.py` builds the context
before the specs; currently it's the reverse (`app.py:31` vs `app.py:43`), so
those lines swap. `max_steps` drops 30 → 20: a run is one to four
`read_candidates`, three to four `create_play` + `assign_play` pairs, a
`preview_play_copy` or two, and one artifact write.

### LLM provider

`agents/growth/config.py` swaps its Anthropic constants for Gemini:

```python
GEMINI_MODEL   = os.getenv("GROWTH_GEMINI_MODEL", "gemini-3.7-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
```

`mash.core.llm.GeminiProvider` already exists and takes the same
`(app_id, model, api_key)` shape as `AnthropicProvider`, so `build_llm` is the
only call site that changes. Two consequences:

- **`cache_control` blocks are Anthropic syntax.** The Gemini provider ignores
  them, so the two system-prompt blocks collapse to plain text. Gemini does its
  own implicit context caching; there is nothing to annotate.
- **`max_tokens=8192` was an Anthropic non-streaming ceiling.** It no longer
  binds. The agent's output is a few `create_play` and `assign_play` calls plus
  one artifact, so leave it — but it's no longer the constraint that set it.

`GeminiProvider._validate_model` only rejects `gemini-1.5`/`gemini-2.0` strings,
so `gemini-3.7-flash` passes the client-side check and will fail at the API if
that id isn't live. The id sits in one env-overridable constant so it's a
one-line change either way. The package default in mashpy is `gemini-3.5-flash`.

The other agents (`data`, `pm`) stay on Anthropic. Nothing shared changes.

### What the agent has before it acts

Everything stable arrives in the first request, in cache-friendly order:

| | Content | Varies by |
|---|---|---|
| System prompt | Growth Expert persona + standing job | never |
| System prompt | Skill index | never |
| Skill | `churn-prevention-strategy` or `expansion-strategy` | workflow |
| Step input | `CandidateSet` — run, rule, SQL, count, both snapshot schemas | run |

Nothing about the run has to be discovered. The first tool call is already
`read_candidates`.

### System prompt — persona and standing job

`build_base_prompt` keeps the Growth Expert persona it has now (owns NRR for a
consumption business, company context, BigQuery project) and gains the part that
is true on every run regardless of strategy:

- You work from candidate runs. Selection code already decided *who* qualifies —
  you decide *what* to do about them. Never re-litigate whether an org belongs in
  the run.
- The run, its selection rule, and the snapshot schemas are given to you. The
  schemas define every field's meaning and unit; use them rather than inferring
  from field names.
- Snapshots are facts. Cite only numbers present in them, through template
  variables. Never invent a figure.
- Consolidate to a small number of plays. A play is a strategy with one copy
  template, not a per-org message.
- Every org gets exactly one play. You are done when `unassigned_remaining` is 0.
- Finish with one artifact. It is what a human reads.

That's the agent's job description. It says nothing about churn or expansion.

### Skills — the strategy

This is what makes one agent serve both workflows.

| Skill | Loaded by | Contains |
|---|---|---|
| `churn-prevention-strategy` | `consumption-dip-rescue` | What a consumption dip means and why it's the churn-equivalent signal. How to read decay, breadth and sustain against revenue weight to separate a real leak from noise. The rescue motions (`csm_escalation`, `sales_assisted_checkin`, `self_serve_reengage`) and which candidates each fits. How to design rescue copy: lead with the org's own drop, which snapshot fields make good template variables, one next step, internal briefing vs. customer message per motion. |
| `expansion-strategy` | `expansion-pqa` | What product-qualified means here, and reading usage growth against company headroom — the same dev-count delta is a ceiling in a 12-person startup and a beachhead in a 4,000-person enterprise. The expansion motions (`sales_expansion_briefing`, `self_serve_upgrade_nudge`) and the timing signals that pick between them. How to design expansion copy: evidence of their own growth, the headroom argument, one path forward. |

Each skill covers the same three things for its domain: **what the signal means**,
**which motions exist and how to choose**, **how to write the copy**. The
`AgentStep` names one skill; the workflow's identity is that name plus its
selection function.

A third workflow is a selection function and a strategy skill. No prompt change,
no new tools, no schema change.

---

## 6. The artifact

Written once at the end with the existing tool:

- **Summary** — the run, the selection rule, candidate count, total dollars at
  risk or upside.
- **Plays** — a row per play: name, motion, org count, dollars covered, the
  criteria used, the copy template, and one rendered example.
- **Coverage** — every org accounted for across the plays.
- **Data** — `play_candidates` and `plays` with the
  `WHERE run_id = '...'` to pull them, plus the selection SQL.

Named `{workflow_id}-{run_id}`, one per run.

---

## 7. Files

Plan 1 leaves `src/crew/plays/` holding `context.py`, `warehouse.py`, a trimmed
`crm.py` and a trimmed `models.py`. This is what gets added:

```
src/crew/plays/
  candidate_store.py   NEW   — both tables, insert-by-run, the tool queries, template rendering
  workflow.py          NEW   — CandidateSet + build_candidate_workflow(), the two steps
  warehouse.py         +     — return the compiled SQL, plus select_dip_candidates()
                               (the gate, the snapshots, the schema declarations)
src/crew/agents/growth/
  tools.py             NEW   — the four tools (matches agents/data/tools.py)
  spec.py              +     — Gemini provider, takes ctx, registers the tools
  config.py            +     — GEMINI_MODEL / GEMINI_API_KEY replace the Anthropic pair
  prompt.py            +     — standing job added to build_base_prompt
  skills/churn-prevention-strategy/   NEW
src/crew/workspace/crm_db/metrics_layer/configs/
  sources/play_candidates.yml  NEW
  sources/plays.yml            ~     — rewritten for the new per-play schema
  metrics/                     ~     — see below
src/crew/app.py        +     — build growth ctx before the specs, register the workflow
```

`build_candidate_workflow` takes the selection function and the skill name as
arguments, so expansion later is one selection function in `plays/warehouse.py`
and one strategy skill. That's the extensibility; it isn't work in this plan.

### The `crm_db.plays` metrics

Repurposing that table breaks the metrics reading its old columns:

| Config | Action |
|---|---|
| `metrics/holdout_treatment_rate.yml` | Delete. No holdouts in this design. |
| `metrics/open_plays_by_org.yml` | Delete. Assignment lives on `play_candidates`. |
| `metrics/total_dollars_at_risk.yml` | Re-point at `play_candidates`, reading `dollars_at_risk` out of `usage_snapshot`. |
| `metrics/total_plays.yml` | Keep — still a row count, now of play definitions. |

The metrics compiler doesn't know `JSON_VALUE`, so any snapshot field a metric
needs has to be declared as a computed dimension in the source config. Verify
that compiles before committing to `total_dollars_at_risk`; if it doesn't, drop
the metric and let the artifact carry the number.

---

## 8. Build order

| Phase | Work | Check |
|-------|------|-------|
| 1 | `candidate_store.py`, both tables, the semantic-layer configs | Insert / update / render against the real tables, no agent |
| 2 | `agents/growth/tools.py` | The four tools called directly against a seeded run id, no LLM |
| 3 | `workflow.py`, `select_dip_candidates`, the Gemini swap, prompt, `churn-prevention-strategy` | Step 1 alone: rows land in `play_candidates` |
| 4 | Register in `app.py` | One end-to-end run |

Phases 1–3 need no agent tokens. The only full run is phase 4.

---

## 9. Two things worth knowing

**Write access.** Step 1 writes candidate rows and step 2 writes plays, so this
cannot run on a read-only connection. The deployed `crew-host` service account
`marketing-db-mcp@mash-487416` is read-only on the datasets; it needs dataset
WRITER on `crm_db` before this works outside local ADC.

**The Gemini model id.** I can't confirm `gemini-3.7-flash` is a live model —
mashpy's own default is `gemini-3.5-flash`, and its validator won't catch a wrong
id, it'll just fail at the API. Confirm the string before phase 6; it's one
constant either way.
