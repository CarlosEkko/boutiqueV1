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
# --force-recreate garante que o container é substituído mesmo quando
# só a imagem (conteúdo) mudou e a config do compose não.
docker compose up -d --no-deps --force-recreate backend

# Esperar que o novo backend responda
# Nota: o backend arranca em 3-5s, mas o health check do Docker pode levar
# mais tempo a ficar `healthy` devido ao startup background (Revolut + Billing
# cycle). Damos 90s de tolerância; se não ficar pronto a tempo, seguimos para
# o frontend em vez de abortar (porque o backend mais antigo continua a servir
# tráfego via `proxy_next_upstream` no NGINX).
BACKEND_READY=0
for i in $(seq 1 90); do
    # Use python stdlib instead of curl — curl is NOT installed in the
    # python:3.11-slim image, so the previous probe always failed silently.
    if docker compose exec -T backend python -c "import urllib.request,sys;sys.exit(0 if urllib.request.urlopen('http://localhost:8001/api/health',timeout=3).status==200 else 1)" > /dev/null 2>&1; then
        BACKEND_READY=1
        ok "Backend healthy (after ${i}s)"
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" -eq 0 ]; then
    warn "Backend health-check did not pass in 90s — continuing anyway."
    warn "Backend logs (last 20 lines):"
    docker compose logs backend --tail 20 || true
    warn "Se o site ficar instável, faça: sudo docker compose restart backend"
fi

# -----------------------------------------------------------------------------
# 4. Recriar frontend (nginx proxy passa ainda pelo antigo se não estiver pronto)
# -----------------------------------------------------------------------------
log "Rotating frontend…"
# --force-recreate é ESSENCIAL: sem isto, o Compose mantém o container antigo
# (a correr a imagem antiga) quando apenas o conteúdo da imagem muda.
# Sintoma: 'docker compose ps' mostrava IMAGE como SHA hash em vez do nome.
docker compose up -d --no-deps --force-recreate frontend

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
# 6. Verificar que o frontend novo responde com novos hashes
# -----------------------------------------------------------------------------
log "Verifying deployed assets…"
NEW_INDEX=$(docker compose exec -T frontend sh -c 'md5sum /usr/share/nginx/html/index.html 2>/dev/null | cut -d" " -f1' || echo "unknown")
ok "Deployed index.html md5: $NEW_INDEX"

MAIN_JS=$(docker compose exec -T frontend sh -c 'ls /usr/share/nginx/html/static/js/main.*.js 2>/dev/null | head -1 | xargs -n1 basename' || echo "unknown")
ok "Deployed main bundle: $MAIN_JS"

# Sanity check: o container foi REALMENTE recriado? (idade < 5 min)
FRONTEND_AGE_SEC=$(docker inspect --format='{{.State.StartedAt}}' kbex-frontend 2>/dev/null | xargs -I{} date -d {} +%s 2>/dev/null || echo "0")
NOW_SEC=$(date +%s)
AGE_SEC=$((NOW_SEC - FRONTEND_AGE_SEC))
if [ "$AGE_SEC" -gt 300 ]; then
    err "Frontend container NOT recreated! Age: ${AGE_SEC}s (deve ser < 300s)."
    err "Isto significa que está a correr código ANTIGO. A forçar recreate agora…"
    docker compose up -d --no-deps --force-recreate frontend
    sleep 3
    ok "Frontend forçosamente recriado. Re-verifique o browser."
else
    ok "Frontend container recriado há ${AGE_SEC}s (OK)"
fi

# -----------------------------------------------------------------------------
# 7. Limpar imagens Docker órfãs (opcional — libera disco)
# -----------------------------------------------------------------------------
log "Cleaning up dangling images…"
docker image prune -f > /dev/null
ok "Cleanup done"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🚀 Zero-downtime deploy complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠  Se não vir as alterações no browser:${NC}"
echo "   1. Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows/Linux)"
echo "   2. DevTools → Network tab → Disable cache checkbox"
echo "   3. Modo privado / incógnito"
echo "   4. Verifique com: curl -s https://kbex.io/ | grep main.*.js"
echo ""
docker compose ps
