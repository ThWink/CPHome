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

## Update

```bash
git pull
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

## Data

The SQLite database is stored in the `couple-life-data` Docker volume at `/data/app.db` inside the container.
