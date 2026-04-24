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

## Deployment

Copy `deploy/env.example` to `deploy/.env`, edit the values, then run:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d
```
