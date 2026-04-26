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

If Docker reports a `secretservice` or D-Bus credential-helper error on a headless
Orange Pi, use an isolated Docker config for this project:

```bash
mkdir -p .deploy/docker-config
printf %s eyJhdXRocyI6e319 | base64 -d > .deploy/docker-config/config.json
docker --config "$PWD/.deploy/docker-config" compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

## CI/CD

The repository includes `.github/workflows/deploy-orangepi.yml`. It verifies the
workspace, uploads the current source archive over SSH, and rebuilds Docker
Compose on the Orange Pi.

Configure these GitHub Actions secrets before enabling automatic deploys:

- `ORANGE_PI_HOST`: public host, for example `www.oscloud.xyz`.
- `ORANGE_PI_PORT`: public SSH port, for example `9987`.
- `ORANGE_PI_USER`: SSH user, normally `orangepi`.
- `ORANGE_PI_SSH_KEY`: private key text for the deploy user.
- `ORANGE_PI_PROJECT_DIR`: optional, defaults to `/mnt/sdcard/workspace/cphome`.

The workflow expects `deploy/.env` to already exist on the server and preserves
it across deployments. Do not commit `deploy/.env` or any private key.

## Data

The SQLite database is stored in the `couple-life-data` Docker volume at `/data/app.db` inside the container.
