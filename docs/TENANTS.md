# White-Label Tenants — Onboarding Guide

Each institutional client can have their own domain and branding, while sharing
the same KBEX backend. This document explains how to add a new tenant.

## Architecture

```
           ┌─────────────────────────────────────┐
           │  kbex.io (default tenant)           │ ← admin KBEX
           │  custody.bancox.com (tenant: bancox) │ ← banco X's clients
           │  vault.familyoffice.com (tenant: fo)│ ← family office clients
           └──────────────┬──────────────────────┘
                          │  all domains → same VPS IP
                          ▼
                    ┌───────────┐
                    │  nginx    │  (accepts any Host header)
                    └─────┬─────┘
                          │
                  ┌───────┴───────┐
                  ▼               ▼
             ┌─────────┐     ┌──────────┐
             │ frontend │     │ backend  │
             │ React    │     │ FastAPI  │
             └────┬─────┘     └──────────┘
                  │
                  │  On boot:
                  │  GET /api/tenants/resolve
                  │  → branding (logo, colors, name) applied dynamically
```

## Adding a new white-label tenant

### 1. Client-side: configure DNS

The client points their domain to the KBEX VPS IP:

```
A  custody.bancox.com   →  <KBEX_VPS_IP>
```

### 2. KBEX-side: extend SSL certificate

Add the new domain to the existing Let's Encrypt cert:

```bash
sudo certbot --nginx \
    -d kbex.io \
    -d www.kbex.io \
    -d custody.bancox.com      # <— new domain
    --expand
```

Alternatively use a wildcard cert if clients use subdomains of a shared apex:
```bash
sudo certbot certonly --manual --preferred-challenges=dns \
    -d "*.partner-domain.com"
```

### 3. KBEX-side: reload nginx
```bash
sudo docker compose exec nginx nginx -s reload
```

### 4. KBEX-side: create tenant in admin panel

Navigate to `/dashboard/admin/tenants` → click **Novo Tenant** → fill in:

- **Slug**: `bancox` (lowercase identifier)
- **Domains**: `custody.bancox.com, www.bancox-custody.com`
- **Platform Name**: `Banco X Custody`
- **Tagline**: `Private Digital Asset Custody`
- **Logo URL**: `https://bancox.com/assets/logo.svg`
- **Primary Color**: `#003366` (banco X blue)
- **Accent Color**: `#ffffff`
- **Sender Email**: `no-reply@bancox.com` (optional — needs SPF/DKIM for Brevo)
- **Supported Fiat**: `EUR, USD, CHF`

Save.

### 5. Verify

Visit `https://custody.bancox.com/` — you should see:
- Banco X logo in header
- Blue accent colors
- Page title "Banco X Custody"
- All platform features work identically to KBEX

## What's inherited from default tenant?

Phase 1 (current) — **only branding is isolated**. All tenants share:
- Same user database
- Same transactions, OTC deals, wallets
- Same integrations (Fireblocks, Sumsub, Revolut, Brevo)
- Same tiers and fees

Phase 2 (roadmap) — **full data isolation**:
- Users have `tenant_id`; all queries filtered automatically
- Tenant-specific tiers and fees
- Tenant-specific Sumsub provider (BYO-KYC)
- Tenant-specific fiat wallets (IBAN per tenant)

## Admin operations

### List all tenants
```bash
curl -H "Authorization: Bearer $TOKEN" https://kbex.io/api/tenants/
```

### Resolve current tenant (public, used by frontend)
```bash
curl https://custody.bancox.com/api/tenants/resolve
```

### Deactivate a tenant (preserves data, blocks access)
```bash
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}' \
  https://kbex.io/api/tenants/bancox
```

### Delete a tenant (irreversible — only if no data)
```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  https://kbex.io/api/tenants/bancox
```

## Security notes

- Domain-to-tenant mapping prevents cross-tenant access via Host header spoofing
  only if the attacker controls DNS (impossible for real users).
- Tenant data (logo, colors, name) is served publicly on `/api/tenants/resolve`
  — do NOT store secrets there.
- The default KBEX tenant CANNOT be deleted or deactivated (safety).
