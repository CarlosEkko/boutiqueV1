#!/bin/bash

# ============================================
# KBEX.io - Script de Atualização
# ============================================
# Uso: ./update.sh
# ============================================

set -e

cd "$(dirname "$0")"

echo "========================================"
echo "  KBEX.io - Atualização"
echo "========================================"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Baixar atualizações
echo ""
echo -e "${YELLOW}📥 Baixando atualizações do Git...${NC}"
git pull

# Rebuild containers
echo ""
echo -e "${YELLOW}🔨 Reconstruindo containers...${NC}"
sudo docker compose build --no-cache

# Reiniciar
echo ""
echo -e "${YELLOW}🚀 Reiniciando serviços...${NC}"
sudo docker compose up -d

# Aguardar
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Status
echo ""
echo -e "${GREEN}✅ Atualização completa!${NC}"
echo ""
sudo docker compose ps

echo ""
echo "========================================"
echo "  Site: https://kbex.io"
echo "========================================"
