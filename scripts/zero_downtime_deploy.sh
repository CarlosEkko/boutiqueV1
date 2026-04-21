#!/bin/bash
# KBEX.io — Zero-Downtime Deploy
# Reconstrói e substitui backend + frontend sem nunca mostrar a página de manutenção.
#
# Como funciona:
#   1. Build das novas imagens EM PARALELO, enquanto os containers antigos continuam a servir tráfego
#   2. Backend: re-cria apenas o container, aguarda healthcheck OK antes de continuar
#   3. Frontend: re-cria apenas o container, aguarda até responder HTTP 200
#   4. Nginx: reload suave (nunca pára)
#
# Uso:
#   cd /opt/boutiqueV1
#   sudo ./scripts/zero_downtime_deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()  { echo -e "${GREEN}✓${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠${NC}  $1"; }
err() { echo -e "${RED}✗${NC} $1"; }

cd "$(dirname "$0")/.."

# -----------------------------------------------------------------------------
# 1. Pull código mais recente
# -----------------------------------------------------------------------------
log "Fetching latest code…"
git fetch origin
git reset --hard origin/main-v1.1
ok "Code at: $(git log -1 --oneline)"

# -----------------------------------------------------------------------------
# 2. Build imagens em paralelo (containers antigos continuam a servir tráfego)
# -----------------------------------------------------------------------------
log "Building new images in parallel (site stays UP during build)…"
docker compose build --no-cache backend frontend 2>&1 | sed 's/^/  /'
ok "Images built"

# -----------------------------------------------------------------------------
# 3. Recriar backend (FastAPI arranca em ~3-5s)
# -----------------------------------------------------------------------------
log "Rotating backend…"
docker compose up -d --no-deps backend

# Esperar que o novo backend responda
BACKEND_READY=0
for i in $(seq 1 30); do
    if docker compose exec -T backend curl -sf http://localhost:8001/api/health > /dev/null 2>&1; then
        BACKEND_READY=1
        ok "Backend healthy (after ${i}s)"
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" -eq 0 ]; then
    err "Backend did NOT become healthy in 30s. Rolling back is manual."
    docker compose logs backend --tail 50
    exit 1
fi

# -----------------------------------------------------------------------------
# 4. Recriar frontend (nginx proxy passa ainda pelo antigo se não estiver pronto)
# -----------------------------------------------------------------------------
log "Rotating frontend…"
docker compose up -d --no-deps frontend

FRONTEND_READY=0
for i in $(seq 1 20); do
    # Check frontend via nginx's internal network
    if docker compose exec -T nginx wget -q -O /dev/null --timeout=2 http://frontend:80 2>/dev/null; then
        FRONTEND_READY=1
        ok "Frontend healthy (after ${i}s)"
        break
    fi
    sleep 1
done

if [ "$FRONTEND_READY" -eq 0 ]; then
    warn "Frontend did not respond in 20s but nginx has retry logic — continuing."
fi

# -----------------------------------------------------------------------------
# 5. Nginx reload (sem downtime — só relê config)
# -----------------------------------------------------------------------------
log "Reloading nginx config…"
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload
ok "Nginx reloaded"

# -----------------------------------------------------------------------------
# 6. Limpar imagens Docker órfãs (opcional — libera disco)
# -----------------------------------------------------------------------------
log "Cleaning up dangling images…"
docker image prune -f > /dev/null
ok "Cleanup done"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🚀 Zero-downtime deploy complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
docker compose ps
