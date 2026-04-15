# KBEX.io - Guia de Deploy na DigitalOcean

## Pré-requisitos
- Conta DigitalOcean
- Domínio (opcional, mas recomendado)
- Chave SSH configurada

---

## Passo 1: Criar Droplet

1. Acesse [DigitalOcean](https://cloud.digitalocean.com)
2. Clique em **Create → Droplets**
3. Configurações recomendadas:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic → Regular → **$12/mês** (1 vCPU, 2GB RAM, 50GB SSD)
   - **Datacenter**: Escolha o mais próximo dos seus usuários
   - **Authentication**: SSH Key (recomendado)
4. Clique em **Create Droplet**

---

## Passo 2: Conectar ao Servidor

```bash
ssh root@SEU_IP_DO_DROPLET
```

---

## Passo 3: Clonar o Projeto

### Opção A: Via Git (recomendado)
```bash
# Instalar git
apt-get update && apt-get install -y git

# Clonar repositório
git clone https://github.com/SEU_USUARIO/kbex.git
cd kbex
```

### Opção B: Upload via SCP
```bash
# No seu computador local:
scp -r /caminho/para/kbex root@SEU_IP:/root/
```

---

## Passo 4: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

Preencha as variáveis:
```env
DOMAIN_URL=https://seu-dominio.com
COINMARKETCAP_API_KEY=sua_chave_coinmarketcap
FIREBLOCKS_API_KEY=sua_chave_fireblocks (opcional)
```

---

## Passo 5: Executar Deploy

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

O script irá:
- ✅ Instalar Docker e Docker Compose
- ✅ Construir as imagens
- ✅ Iniciar todos os containers
- ✅ Verificar se está funcionando

---

## Passo 6: Configurar Domínio (opcional, mas recomendado)

### 6.1 Apontar DNS
No seu provedor de domínio, crie um registro A:
- **Tipo**: A
- **Nome**: @ (ou www)
- **Valor**: IP do seu Droplet
- **TTL**: 3600

### 6.2 Configurar SSL
```bash
./setup-ssl.sh seu-dominio.com
```

---

## Comandos Úteis

### Ver logs
```bash
# Todos os containers
docker-compose logs -f

# Container específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Reiniciar serviços
```bash
docker-compose restart
```

### Parar tudo
```bash
docker-compose down
```

### Atualizar aplicação
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

### Backup do MongoDB
```bash
docker exec kbex-mongodb mongodump --out /dump
docker cp kbex-mongodb:/dump ./backup-$(date +%Y%m%d)
```

### Restaurar MongoDB
```bash
docker cp ./backup-XXXXXXXX kbex-mongodb:/dump
docker exec kbex-mongodb mongorestore /dump
```

---

## Monitoramento

### Verificar uso de recursos
```bash
docker stats
```

### Verificar espaço em disco
```bash
df -h
```

### Limpar imagens antigas
```bash
docker system prune -a
```

---

## Firewall (Recomendado)

```bash
# Instalar UFW
apt-get install -y ufw

# Configurar regras
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Ativar
ufw enable
```

---

## Custos Estimados

| Recurso | Custo/mês |
|---------|-----------|
| Droplet (2GB RAM) | $12 |
| Domínio (.com) | ~$1 |
| SSL (Let's Encrypt) | Grátis |
| **Total** | **~$13/mês** |

---

## Suporte

- DigitalOcean Docs: https://docs.digitalocean.com
- Docker Docs: https://docs.docker.com
- KBEX.io Issues: (seu repositório)

---

## Checklist Final

- [ ] Droplet criado
- [ ] Projeto clonado
- [ ] .env configurado
- [ ] Deploy executado
- [ ] Domínio configurado
- [ ] SSL ativado
- [ ] Firewall configurado
- [ ] Backup configurado
