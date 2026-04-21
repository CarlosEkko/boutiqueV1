# Zero-Downtime Deployment

The old `git reset --hard && docker compose build --no-cache && docker compose up -d`
recipe caused ~30-60s of downtime during every deploy (the `maintenance.html` page
was shown when the frontend/backend containers were being recreated).

## New workflow (keeps site UP)

```bash
cd /opt/boutiqueV1
sudo ./scripts/zero_downtime_deploy.sh
```

### What it does differently

| Step | Old flow | New flow |
|---|---|---|
| Build images | Replaced running containers while building | Builds **new** images in parallel; old containers keep serving |
| Backend rotation | `docker compose up -d` restarts all services at once | `docker compose up -d --no-deps backend` rotates only backend; waits for `/api/health` |
| Frontend rotation | Same bulk restart | `--no-deps frontend` rotated alone; nginx retries during swap |
| Nginx | Restarted | Graceful `nginx -s reload` (no connections dropped) |
| Upstream retry | None — 502 shown immediately | `proxy_next_upstream_tries 10; proxy_next_upstream_timeout 30s` |

### Result
- Users never see the maintenance page during normal code deploys.
- The 30s retry window is longer than the 3-5s FastAPI cold start, so requests wait transparently.
- The `maintenance.html` fallback still exists — it's only triggered if the upstream is unreachable for **more than 30 continuous seconds** (a real outage).

## Manual deploy (legacy, use only if zero-downtime script fails)

```bash
cd /opt/boutiqueV1
git fetch origin && git reset --hard origin/main-v1.1
sudo docker compose build --no-cache
sudo docker compose up -d
```

## Monitor deploy in real time

```bash
# In one terminal, hammer the health endpoint every 0.5s during deploy
watch -n 0.5 'curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" https://kbex.io/api/health'

# In another, run the deploy
sudo ./scripts/zero_downtime_deploy.sh
```

You should see continuous `200` responses throughout the entire deploy.
