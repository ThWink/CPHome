# Orange Pi Deployment

## Requirements

- 64-bit Linux on Orange Pi.
- Docker Engine with Compose plugin.
- Port `3000` reachable from the phone that runs the WeChat Mini Program during development.

## First Start

```bash
cp deploy/env.example deploy/.env
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
```

Set `API_TOKEN` in `deploy/.env` before exposing the API on your LAN. The WeChat Mini Program Settings page must use the same token.

## Health Check

```bash
curl http://127.0.0.1:3000/health/live
curl http://127.0.0.1:3000/health/ready
```

Expected response:

```json
{"status":"ok","service":"couple-life-api"}
```

and:

```json
{"status":"ok","checks":{"database":"ok"}}
```

When `API_TOKEN` is configured, data APIs require the token:

```bash
curl -H "x-couple-api-token: your-token" http://127.0.0.1:3000/api/setup/status
```

## Update

```bash
git pull
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

## Data

The SQLite database is stored in the `couple-life-data` Docker volume at `/data/app.db` inside the container.
