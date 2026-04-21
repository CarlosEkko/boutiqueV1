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

Phase 1 — **branding is isolated** per tenant:
- Logo, colors, platform name, favicon, tagline

Phase 2 (✅ DONE — Apr 2026) — **user & data isolation**:
- Every user carries a `tenant_slug` set at registration based on the Host header.
- **Login is tenant-scoped**: a user registered via `custody.bancox.com` cannot
  authenticate from `kbex.io` and vice-versa, even with correct credentials.
- **Email uniqueness is scoped per tenant**: the same email may exist once per
  tenant (useful when one person is client of two institutions).
- **Admin user list** auto-filters by the host calling it. Super-admins on
  `kbex.io` can narrow with `?tenant_slug=<slug>` or `?tenant_slug=all`.
- **Data collections** (`otc_deals`, `otc_leads`, `crm_leads`, `fiat_wallets`,
  `bank_accounts`, `tickets`, `escrow_deals`, `billing_accounts`, `kyc_records`,
  `crypto_wallets`) are automatically backfilled with `tenant_slug="kbex"` on
  backend startup. Since they are always accessed via `user_id`, user-level
  isolation guarantees data-level isolation transparently.
- **Admin stats endpoint** `GET /api/tenants/{slug}/stats` returns per-tenant
  counts of users, deals, wallets, leads, and tickets.

Phase 3 (roadmap) — **deep isolation**:
- Tenant-specific tiers and fees
- Tenant-specific Sumsub provider (BYO-KYC) and webhook routing
- Tenant-specific fiat wallets (IBAN per tenant)
- Tenant-specific Fireblocks vaults (multi-custodian)
- Tenant-specific email sender (Brevo sub-account per tenant)

## Admin operations

### List all tenants
```bash
curl -H "Authorization: Bearer $TOKEN" https://kbex.io/api/tenants/
```

### Per-tenant usage stats (Phase 2)
```bash
curl -H "Authorization: Bearer $TOKEN" https://kbex.io/api/tenants/bancox/stats
# {
#   "slug": "bancox",
#   "users": 42,
#   "otc_deals": 7,
#   "crypto_wallets": 42,
#   "otc_leads": 12,
#   "tickets": 3
# }
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
