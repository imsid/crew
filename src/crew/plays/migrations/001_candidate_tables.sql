-- The tables the play workflows own. Applied at crew-host boot, every boot, so every
-- statement here must be idempotent: CREATE TABLE IF NOT EXISTS, never a bare CREATE.
--
-- Table refs are substituted from each source's config ({play_candidates}, {plays}),
-- so the physical table name stays declared once, in the source YAML.

CREATE TABLE IF NOT EXISTS {play_candidates} (
  run_id         STRING    NOT NULL,
  workflow_id    STRING    NOT NULL,
  created_at     TIMESTAMP NOT NULL,
  updated_at     TIMESTAMP NOT NULL,
  org_id         STRING    NOT NULL,
  org_name       STRING,
  org_snapshot   JSON,
  usage_snapshot JSON,
  play_id        STRING
)
PARTITION BY DATE(created_at)
CLUSTER BY run_id, org_id;

CREATE TABLE IF NOT EXISTS {plays} (
  play_id       STRING    NOT NULL,
  run_id        STRING    NOT NULL,
  workflow_id   STRING    NOT NULL,
  play_name     STRING,
  criteria      STRING,
  copy_template STRING,
  template_vars JSON,
  created_at    TIMESTAMP NOT NULL
)
PARTITION BY DATE(created_at)
CLUSTER BY run_id;
