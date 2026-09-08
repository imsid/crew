# Crew

Crew is a self-hosted team of role-based agents for analytics, product decisions, and
growth workflows, built on the [Mash](https://github.com/imsid/mashpy) SDK.

The default `datasquad` host uses `data` as its primary agent and delegates product and
growth judgment to the `pm` and `growth` specialists. Crew includes a semantic metrics
layer, experiment analysis, durable artifacts, and typed workflows backed by BigQuery.

## Quick start

```bash
cp .env.example .env
# Set GEMINI_API_KEY, CREW_BETA_ALLOWED_USERS, and CREW_BETA_AUTH_SECRET.

docker compose up -d --build

curl -fsSL https://raw.githubusercontent.com/imsid/crew/main/install.sh | sh
crew login alice --api-base-url http://127.0.0.1:8003
crew repl
```

The web app runs at [http://127.0.0.1:3000](http://127.0.0.1:3000). Start a session in
the CLI or UI and continue it from the other at any time.

## Common commands

```bash
crew sessions
crew workspace list
crew metrics list
crew experiment list
crew artifact list
crew workflow list

crew workflow run consumption-dip \
  --input '{"as_of_date":"2026-05-29","workspace_id":"product_usage_db"}'
crew workflow run expansion-pqa \
  --input '{"as_of_date":"2026-05-29","workspace_id":"product_usage_db"}'
```

## Documentation

- [Crew documentation site](https://imsid.github.io/crew/)
- [Product overview](docs/product.html)
- [Semantic Layer guide](docs/semantic-layer-guide.md)
- [Development and deployment](CONTRIBUTING.md)

Preview the documentation locally:

```bash
pip install -r requirements-docs.txt
zensical serve
```
