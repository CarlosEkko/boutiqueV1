#!/bin/bash

# ============================================
# KBEX.io - Configurar SSL (Let's Encrypt)
# ============================================
# Uso: ./setup-ssl.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Carregar variáveis
if [ ! -f .env ]; then
    echo -e "${RED}❌ Ficheiro .env não encontrado${NC}"
    exit 1
fi

source .env

# Extrair domínio
DOMAIN=$(echo $DOMAIN_URL | sed 's|https://||' | sed 's|http://||' | sed 's|/||g')

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ DOMAIN_URL não configurado no .env${NC}"
    exit 1
fi

echo "🔐 Configurando SSL para: $DOMAIN"
echo "================================"

# Usar configuração temporária sem SSL
echo "📝 Usando configuração HTTP temporária..."
cp nginx/nginx-temp.conf nginx/nginx.conf

# Reiniciar nginx
docker compose restart nginx
sleep 5

# Obter certificado
echo ""
echo "📜 Obtendo certificado Let's Encrypt..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Restaurar configuração com SSL
echo ""
echo "🔄 Ativando configuração HTTPS..."

cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

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

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;

        ssl_certificate /etc/nginx/ssl/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/$DOMAIN/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

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

# Reiniciar nginx
docker compose restart nginx

echo ""
echo -e "${GREEN}✅ SSL configurado com sucesso!${NC}"
echo ""
echo "🌐 O seu site está disponível em:"
echo "   https://$DOMAIN"
echo ""
