# KBEX - Guia de Resolução: Sumsub KYC e 2FA no VPS

## Problema
- Sumsub KYC não funciona no VPS
- 2FA no onboarding não funciona no VPS

## Diagnóstico Rápido

### 1. Verificar Variáveis de Ambiente
Aceda ao servidor VPS via SSH e verifique o ficheiro `.env` do backend:

```bash
cd /path/to/kbex/backend
cat .env | grep -E "SUMSUB|SECRET"
```

**Deve conter:**
```
SUMSUB_APP_TOKEN=seu_token_aqui
SUMSUB_SECRET_KEY=sua_chave_secreta_aqui
SUMSUB_LEVEL_NAME=basic-kyc-level
```

### 2. Obter Credenciais Sumsub
1. Aceda a: https://cockpit.sumsub.com/
2. Vá a **Developers > API Keys**
3. Crie uma nova API Key ou copie a existente
4. Copie o **App Token** e **Secret Key**

### 3. Verificar Dependências Python

```bash
# Dentro do container Docker ou venv
pip install pyotp qrcode[pil]
pip freeze | grep -E "pyotp|qrcode"
```

### 4. Testar Endpoints Manualmente

```bash
# Testar Sumsub config
curl -s https://app.kbex.io/api/sumsub/config

# Deve retornar: {"configured":true,"level_name":"basic-kyc-level"}
```

### 5. Ver Logs de Erros

```bash
# Logs do backend
docker logs kbex-backend --tail 100 2>&1 | grep -i "sumsub\|2fa\|error"

# Ou se usar supervisord:
tail -100 /var/log/supervisor/backend.err.log
```

## Soluções Comuns

### Sumsub: Erro 401 (Unauthorized)
**Causa:** Token ou Secret Key inválidos
**Solução:**
1. Gere novas credenciais no Cockpit Sumsub
2. Atualize o `.env` no VPS
3. Reinicie o backend: `docker-compose restart backend`

### Sumsub: "configured: false"
**Causa:** Variáveis de ambiente não carregadas
**Solução:**
1. Adicione ao `.env`:
```
SUMSUB_APP_TOKEN=sbx:xxxxx
SUMSUB_SECRET_KEY=xxxxx
```
2. Reconstrua o container: `docker-compose up -d --build`

### 2FA: QR Code não aparece
**Causa:** Falta a biblioteca `qrcode`
**Solução:**
```bash
pip install qrcode[pil]
# ou no Dockerfile adicionar: RUN pip install qrcode[pil]
```

### 2FA: "Código inválido" sempre
**Causa:** Relógio do servidor dessincronizado
**Solução:**
```bash
# Sincronizar relógio
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd
```

## Checklist Final

- [ ] `SUMSUB_APP_TOKEN` está no `.env` do VPS
- [ ] `SUMSUB_SECRET_KEY` está no `.env` do VPS  
- [ ] `pyotp` está instalado (`pip install pyotp`)
- [ ] `qrcode[pil]` está instalado (`pip install qrcode[pil]`)
- [ ] Backend foi reiniciado após mudanças
- [ ] Relógio do servidor está sincronizado
- [ ] Endpoint `/api/sumsub/config` retorna `{"configured":true}`

## Comando de Deploy Completo

```bash
cd /path/to/kbex

# Puxar últimas alterações
git pull origin main

# Reconstruir e reiniciar
docker-compose down
docker-compose up -d --build

# Verificar logs
docker logs -f kbex-backend
```

## Contacto para Credenciais
Se precisar de novas credenciais Sumsub de produção, contacte a equipa técnica com:
- Email associado à conta Sumsub
- Ambiente pretendido (sandbox/production)
