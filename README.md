# Couple Life Assistant

Open-source self-hosted WeChat Mini Program for one cohabiting couple. The first supported deployment target is Docker Compose on Orange Pi.

## Apps

- `apps/api`: Fastify API, SQLite database, setup flow, health checks.
- `apps/miniprogram`: WeChat Mini Program source.
- `packages/shared`: Shared TypeScript contracts.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm dev:api
```

To reset the local SQLite database with readable demo data:

```bash
corepack pnpm --filter @couple-life/api seed:demo
```

With the API running, verify the local V1 walkthrough:

```bash
corepack pnpm verify:local
```

API data routes are open by default for local development. Set `API_TOKEN` in
deployment environments to require `x-couple-api-token` or
`Authorization: Bearer <token>` on `/api/*` requests.

The API defaults to local-only assistant summaries. To enable a model provider, configure:

```bash
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-key
LLM_MODEL=gpt-4o-mini
```

For Ollama:

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
LLM_MODEL=qwen2.5:7b
```

## Deployment

Copy `deploy/env.example` to `deploy/.env`, edit the values, then run:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d
```
