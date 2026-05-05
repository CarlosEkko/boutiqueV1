# 🐛 Fix: "Falha ao carregar o documento" no Transparency Viewer

## Problema
Os relatórios PDF na página `/dashboard/transparency` falham com erro **"Falha ao carregar o documento"**, mesmo após carregar um PDF novo via Admin.

## Causa Raiz
O `ProtectedDocViewer` usa **PDF.js**, que requer um Web Worker (`pdf.worker.min.mjs`) carregado **antes** do PDF. Se o servidor (nginx no VPS) servir ficheiros `.mjs` com Content-Type errado (ex.: `text/plain` em vez de `application/javascript`), o browser **rejeita** o worker e a operação falha — mesmo se o próprio PDF estiver acessível.

## Fix Aplicado (Frontend)
Em `/app/frontend/src/components/ProtectedDocViewer.jsx`, agora o componente:
1. Tenta carregar o worker **local** (`/pdf.worker.min.mjs`)
2. Se a resposta não tiver Content-Type adequado **ou** retornar 404/erro, faz **fallback automático para CDN** (`https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`)
3. Mostra mensagens de erro detalhadas com URL e código HTTP

## Fix Recomendado no Nginx do VPS (definitivo)

Adicione ao bloco `server` do nginx:

```nginx
# Garantir Content-Type correto para módulos JS modernos
types {
    application/javascript js mjs;
}

# OU dentro do bloco que serve /
location ~ \.mjs$ {
    add_header Content-Type "application/javascript";
}
```

Depois testar:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

E verificar:
```bash
curl -I https://kbex.io/pdf.worker.min.mjs | grep -i content-type
# Deve devolver: Content-Type: application/javascript
```

## Diagnóstico no Browser
Após o deploy, abrir DevTools → Network e clicar num relatório:
- ✅ `pdf.worker.min.mjs` deve devolver **200** com Content-Type **application/javascript**
- ✅ O PDF deve devolver **200** com Content-Type **application/pdf**
- ❌ Se algum falhar, a mensagem de erro do viewer agora indica qual

## Como deployar no VPS
```bash
# No VPS:
cd /var/www/kbex
git pull
sudo ./scripts/zero_downtime_deploy.sh
```

Após o deploy, o fallback CDN passa a funcionar mesmo sem mudar o nginx.
