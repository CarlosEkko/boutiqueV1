#!/bin/bash

# ============================================
# KBEX.io - Script de Deploy Automático
# ============================================
# Uso: ./deploy.sh
# ============================================

set -e

echo "🚀 KBEX.io - Iniciando Deploy..."
echo "================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Erro: Ficheiro .env não encontrado!${NC}"
    echo ""
    echo "Execute os seguintes comandos:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Preencha as variáveis"
    exit 1
fi

# Carregar variáveis
source .env

# Verificar variáveis obrigatórias
if [ -z "$DOMAIN_URL" ] || [ "$DOMAIN_URL" = "https://seu-dominio.com" ]; then
    echo -e "${RED}❌ Erro: DOMAIN_URL não configurado no .env${NC}"
    exit 1
fi

if [ -z "$COINMARKETCAP_API_KEY" ] || [ "$COINMARKETCAP_API_KEY" = "sua_chave_aqui" ]; then
    echo -e "${RED}❌ Erro: COINMARKETCAP_API_KEY não configurado no .env${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "gerar_um_secret_de_32_caracteres_aqui" ]; then
    echo -e "${YELLOW}⚠️  Gerando JWT_SECRET automaticamente...${NC}"
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
fi

echo -e "${GREEN}✅ Variáveis de ambiente OK${NC}"

# Verificar Docker
echo ""
echo "📦 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker não encontrado. Instalando...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker instalado${NC}"
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker OK${NC}"

# Criar diretórios necessários
echo ""
echo "📁 Criando diretórios..."
mkdir -p nginx/ssl
mkdir -p backend/uploads

# Criar ficheiro fireblocks vazio se não existir
if [ ! -f backend/fireblocks_secret.key ]; then
    touch backend/fireblocks_secret.key
fi

echo -e "${GREEN}✅ Diretórios OK${NC}"

# Extrair domínio sem https://
DOMAIN=$(echo $DOMAIN_URL | sed 's|https://||' | sed 's|http://||' | sed 's|/||g')

# Criar configuração nginx
echo ""
echo "⚙️  Configurando Nginx..."
cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

    # Upstream servers
    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:8001;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;

        # SSL certificates (serão criados pelo certbot)
        ssl_certificate /etc/nginx/ssl/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/$DOMAIN/privkey.pem;

        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API Backend
        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
        }
    }
}
EOF

echo -e "${GREEN}✅ Nginx configurado${NC}"

# Criar nginx temporário (sem SSL para obter certificado)
cat > nginx/nginx-temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;

    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:8001;
    }

    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location /api {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
        }
    }
}
EOF

# Build e start
echo ""
echo "🔨 Construindo containers..."
docker compose build --no-cache

echo ""
echo "🚀 Iniciando serviços..."
docker compose up -d

# Aguardar serviços
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Verificar status
echo ""
echo "📊 Status dos serviços:"
docker compose ps

# Verificar saúde do backend
echo ""
echo "🔍 Verificando backend..."
if curl -sf http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend OK${NC}"
else
    echo -e "${YELLOW}⚠️  Backend ainda a iniciar...${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo "================================"
echo ""
echo "Próximos passos:"
echo ""
echo "1. Configure o DNS do seu domínio:"
echo "   Tipo: A | Nome: @ | Valor: $(curl -s ifconfig.me 2>/dev/null || echo 'SEU_IP')"
echo "   Tipo: A | Nome: www | Valor: $(curl -s ifconfig.me 2>/dev/null || echo 'SEU_IP')"
echo ""
echo "2. Após DNS propagar, obtenha SSL:"
echo "   ./setup-ssl.sh"
echo ""
echo "3. Acesse temporariamente via:"
echo "   http://$(curl -s ifconfig.me 2>/dev/null || echo 'SEU_IP')"
echo ""
