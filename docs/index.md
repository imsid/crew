# Crew

Crew is a self-hosted team of role-based agents for analytics, product decisions,
and growth workflows, built on the
[Mash](https://github.com/imsid/mashpy) SDK.

The default `datasquad` host coordinates three specialists:

- **Data** explores governed business data through Crew's semantic metrics layer.
- **Product** turns evidence into product decisions and durable artifacts.
- **Growth** identifies and executes repeatable growth plays.

[Explore the product overview](product.html){ .md-button .md-button--primary }
[View the repository](https://github.com/imsid/crew){ .md-button }

## Start Crew

```bash
cp .env.example .env
# Set GEMINI_API_KEY, CREW_BETA_ALLOWED_USERS, and CREW_BETA_AUTH_SECRET.

docker compose up -d --build

curl -fsSL https://raw.githubusercontent.com/imsid/crew/main/install.sh | sh
crew login alice --api-base-url http://127.0.0.1:8003
crew repl
```

The web app runs at [http://127.0.0.1:3000](http://127.0.0.1:3000). A session
started in the CLI or UI can be continued from the other at any time.

## Explore the system

<div class="grid cards" markdown>

-   :material-database-search:{ .lg .middle } **Semantic layer**

    ---

    Define reusable sources and metrics, then query them consistently across
    agents and workflows.

    [:octicons-arrow-right-24: Authoring guide](semantic-layer-guide.md)

-   :material-chart-timeline-variant-shimmer:{ .lg .middle } **Consumption dip**

    ---

    Detect accounts with declining usage, add agent judgment, and create
    actionable retention plays.

    [:octicons-arrow-right-24: Workflow guide](consumption-dip-workflow.md)

-   :material-trending-up:{ .lg .middle } **Expansion PQA**

    ---

    Find product-qualified accounts with expansion potential and turn signals
    into coordinated plays.

    [:octicons-arrow-right-24: Workflow guide](expansion-pqa-workflow.md)

</div>

## Common commands

```bash
crew sessions
crew workspace list
crew metrics list
crew experiment list
crew artifact list
crew workflow list
```

Run a built-in workflow with a workspace and an effective date:

```bash
crew workflow run consumption-dip \
  --input '{"as_of_date":"2026-05-29","workspace_id":"product_usage_db"}'

crew workflow run expansion-pqa \
  --input '{"as_of_date":"2026-05-29","workspace_id":"product_usage_db"}'
```

For local development and deployment details, see
[Contributing](https://github.com/imsid/crew/blob/main/CONTRIBUTING.md).
