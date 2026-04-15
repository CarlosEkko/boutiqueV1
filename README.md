# KBEX.io - Crypto Boutique Exchange

Premium cryptocurrency exchange platform for high-net-worth individuals.

## 🚀 Deploy Rápido (VPS Ubuntu 22.04)

### 1. Clonar repositório
```bash
git clone https://github.com/SEU_USUARIO/kbex.git
cd kbex
```

### 2. Configurar variáveis
```bash
cp .env.example .env
nano .env
```

Preencha:
```env
DOMAIN_URL=https://seu-dominio.com
COINMARKETCAP_API_KEY=sua_chave_coinmarketcap
JWT_SECRET=gerar_com_openssl_rand_hex_32
```

### 3. Executar deploy
```bash
chmod +x deploy.sh setup-ssl.sh
./deploy.sh
```

### 4. Configurar DNS
No painel do seu domínio, crie registos A apontando para o IP do servidor.

### 5. Ativar SSL
```bash
./setup-ssl.sh
```

---

## 📁 Estrutura

```
kbex/
├── backend/           # FastAPI
├── frontend/          # React
├── nginx/             # Configuração proxy
├── docker-compose.yml
├── deploy.sh          # Script de deploy
├── setup-ssl.sh       # Script SSL
└── .env.example       # Template de configuração
```

## 🔧 Comandos Úteis

```bash
# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Atualizar
git pull && docker compose up -d --build

# Backup MongoDB
docker exec kbex-mongodb mongodump --out /dump
docker cp kbex-mongodb:/dump ./backup
```

## 🔐 Credenciais de Teste

- **Admin**: joao@teste.com / senha123
- **User**: maria@teste.com / senha123

---

© 2025 KBEX.io
