# KBEX.io - Guia de Deploy no VPS OVH (Ubuntu 22.04)

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Conectar ao VPS](#passo-1-conectar-ao-vps)
3. [Preparar o Servidor](#passo-2-preparar-o-servidor)
4. [Instalar Docker](#passo-3-instalar-docker)
5. [Transferir o Projeto](#passo-4-transferir-o-projeto)
6. [Configurar Variáveis](#passo-5-configurar-variáveis-de-ambiente)
7. [Deploy da Aplicação](#passo-6-deploy-da-aplicação)
8. [Configurar Domínio e SSL](#passo-7-configurar-domínio-e-ssl)
9. [Comandos Úteis](#comandos-úteis)
10. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- ✅ VPS OVH com Ubuntu 22.04 LTS
- ✅ Acesso SSH ao servidor (credenciais da OVH)
- ✅ Domínio (opcional, mas recomendado para HTTPS)
- ✅ Chave API CoinMarketCap (já configurada)

---

## Passo 1: Conectar ao VPS

### 1.1 Via Terminal (Linux/Mac)
```bash
ssh ubuntu@SEU_IP_OVH
# Ou se configurou com root:
ssh root@SEU_IP_OVH
```

### 1.2 Via Windows (PowerShell ou PuTTY)
```powershell
ssh ubuntu@SEU_IP_OVH
```

> **Nota**: Substitua `SEU_IP_OVH` pelo IP do seu VPS (encontra no painel OVH)

---

## Passo 2: Preparar o Servidor

### 2.1 Atualizar o sistema
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 2.2 Instalar dependências básicas
```bash
sudo apt-get install -y \
    curl \
    wget \
    git \
    nano \
    htop \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release
```

### 2.3 Configurar Firewall (UFW)
```bash
# Configurar regras básicas
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (importante!)
sudo ufw allow 22/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status
```

### 2.4 Configurar Timezone (Portugal)
```bash
sudo timedatectl set-timezone Europe/Lisbon
```

---

## Passo 3: Instalar Docker

### 3.1 Adicionar repositório oficial Docker
```bash
# Adicionar chave GPG
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 3.2 Instalar Docker Engine
```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 3.3 Configurar Docker sem sudo
```bash
sudo usermod -aG docker $USER

# Aplicar mudanças (ou faça logout/login)
newgrp docker
```

### 3.4 Verificar instalação
```bash
docker --version
docker compose version
```

---

## Passo 4: Transferir o Projeto

### Opção A: Via Git (Recomendado)

Se o projeto está no GitHub:
```bash
cd ~
git clone https://github.com/SEU_USUARIO/kbex.git
cd kbex
```

### Opção B: Via SCP (Upload direto)

No seu computador local, execute:
```bash
# Criar arquivo compactado do projeto
cd /caminho/para/app
tar -czvf kbex.tar.gz --exclude='node_modules' --exclude='.git' --exclude='__pycache__' .

# Enviar para o servidor
scp kbex.tar.gz ubuntu@SEU_IP_OVH:~/
```

No servidor:
```bash
cd ~
mkdir kbex
tar -xzvf kbex.tar.gz -C kbex
cd kbex
```

### Opção C: Download do Emergent

Se tiver o download do projeto:
```bash
# No seu computador, enviar o arquivo
scp kbex-download.zip ubuntu@SEU_IP_OVH:~/

# No servidor
cd ~
sudo apt-get install -y unzip
unzip kbex-download.zip -d kbex
cd kbex
```

---

## Passo 5: Configurar Variáveis de Ambiente

### 5.1 Configurar Backend
```bash
nano backend/.env
```

Conteúdo do arquivo `backend/.env`:
```env
# MongoDB
MONGO_URL=mongodb://mongodb:27017
DB_NAME=kbex_db

# JWT Secret (gerar um novo!)
JWT_SECRET=gerar_um_secret_forte_aqui_com_32_caracteres

# CoinMarketCap
COINMARKETCAP_API_KEY=sua_chave_coinmarketcap_aqui

# Fireblocks (opcional - deixar vazio se não usar)
FIREBLOCKS_API_KEY=
FIREBLOCKS_API_SECRET_PATH=
```

> **Gerar JWT Secret**: `openssl rand -hex 32`

### 5.2 Configurar Frontend
```bash
nano frontend/.env
```

Conteúdo do arquivo `frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://seu-dominio.com
```

> **Nota**: Se ainda não tem domínio, use temporariamente: `REACT_APP_BACKEND_URL=http://SEU_IP_OVH`

---

## Passo 6: Deploy da Aplicação

### 6.1 Verificar estrutura de arquivos
```bash
ls -la
# Deve ter: Dockerfile, docker-compose.yml, backend/, frontend/
```

### 6.2 Construir e iniciar containers
```bash
# Build e start em background
docker compose up -d --build

# Acompanhar logs durante build
docker compose logs -f
```

### 6.3 Verificar se está a funcionar
```bash
# Ver containers ativos
docker compose ps

# Testar backend
curl http://localhost:8001/api/health

# Testar frontend
curl http://localhost:3000
```

### 6.4 Testar acesso externo
No navegador, acesse: `http://SEU_IP_OVH`

---

## Passo 7: Configurar Domínio e SSL

### 7.1 Configurar DNS no seu provedor

Acesse o painel do seu domínio e crie:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | SEU_IP_OVH | 3600 |
| A | www | SEU_IP_OVH | 3600 |

### 7.2 Instalar Nginx como Reverse Proxy
```bash
sudo apt-get install -y nginx
```

### 7.3 Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/kbex
```

Cole este conteúdo (substitua `seu-dominio.com`):
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.4 Ativar configuração
```bash
sudo ln -s /etc/nginx/sites-available/kbex /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7.5 Instalar SSL com Certbot (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Seguir instruções (email, aceitar termos)
```

### 7.6 Renovação automática SSL
```bash
# Testar renovação
sudo certbot renew --dry-run

# Certbot já configura cron automaticamente
```

### 7.7 Atualizar URL do Frontend
```bash
nano frontend/.env
```

Alterar para:
```env
REACT_APP_BACKEND_URL=https://seu-dominio.com
```

Rebuild:
```bash
docker compose up -d --build frontend
```

---

## Comandos Úteis

### Gestão de Containers
```bash
# Ver status
docker compose ps

# Ver logs (todos)
docker compose logs -f

# Ver logs (container específico)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb

# Reiniciar tudo
docker compose restart

# Parar tudo
docker compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker compose down -v
```

### Atualizar Aplicação
```bash
cd ~/kbex
git pull                          # Se usar git
docker compose build --no-cache   # Rebuild
docker compose up -d              # Restart
```

### Backup MongoDB
```bash
# Criar backup
docker exec kbex-mongodb mongodump --out /dump
docker cp kbex-mongodb:/dump ~/backup-$(date +%Y%m%d)

# Comprimir
tar -czvf backup-$(date +%Y%m%d).tar.gz ~/backup-$(date +%Y%m%d)
```

### Restaurar MongoDB
```bash
# Descomprimir e copiar
tar -xzvf backup-XXXXXXXX.tar.gz
docker cp backup-XXXXXXXX kbex-mongodb:/dump

# Restaurar
docker exec kbex-mongodb mongorestore /dump
```

### Monitoramento
```bash
# Uso de recursos dos containers
docker stats

# Espaço em disco
df -h

# Memória
free -h

# Processos
htop
```

### Limpeza
```bash
# Remover imagens não utilizadas
docker system prune -a

# Remover volumes órfãos
docker volume prune
```

---

## Troubleshooting

### ❌ Erro: "Permission denied" ao usar Docker
```bash
sudo usermod -aG docker $USER
newgrp docker
# Ou faça logout/login
```

### ❌ Erro: Porta 80 já em uso
```bash
# Ver o que está a usar a porta
sudo lsof -i :80
sudo systemctl stop apache2  # Se for Apache
```

### ❌ Erro: Container não inicia
```bash
# Ver logs detalhados
docker compose logs backend
docker compose logs frontend

# Reconstruir
docker compose down
docker compose build --no-cache
docker compose up -d
```

### ❌ Erro: MongoDB connection refused
```bash
# Verificar se container está ativo
docker compose ps mongodb

# Ver logs
docker compose logs mongodb

# Reiniciar
docker compose restart mongodb
```

### ❌ Erro: SSL não funciona
```bash
# Verificar Nginx
sudo nginx -t

# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew
```

### ❌ Erro: Site lento
```bash
# Verificar recursos
docker stats
free -h
df -h

# Considerar upgrade do VPS se necessário
```

---

## Checklist Final

- [ ] VPS Ubuntu 22.04 configurado
- [ ] Firewall (UFW) ativado
- [ ] Docker instalado
- [ ] Projeto transferido
- [ ] Variáveis de ambiente configuradas
- [ ] Containers a funcionar (`docker compose ps`)
- [ ] Site acessível via IP
- [ ] DNS configurado (se usar domínio)
- [ ] SSL ativado (Let's Encrypt)
- [ ] Site acessível via HTTPS
- [ ] Backup configurado

---

## Custos Estimados (OVH)

| Recurso | Custo/mês |
|---------|-----------|
| VPS Starter (2GB RAM) | ~€3.50 |
| Domínio (.com) | ~€10/ano |
| SSL (Let's Encrypt) | Grátis |
| **Total** | **~€4-5/mês** |

---

## Suporte

- **OVH Docs**: https://docs.ovh.com
- **Docker Docs**: https://docs.docker.com
- **Nginx Docs**: https://nginx.org/en/docs/
- **Certbot**: https://certbot.eff.org

---

**Última atualização**: Dezembro 2025
