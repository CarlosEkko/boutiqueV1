# 📱 KBEX — Publicação Apple App Store & Google Play Store

> Guia passo-a-passo definitivo para publicar a app **KBEX** nas duas stores.
> Bundle ID / Package: **`io.kbex.mobile`**
> Versão atual: **1.0.0** | Build: **1**

---

## 🎯 Visão Geral — O que precisa criar

| Conta | Custo | Tempo de Aprovação | Necessário para |
|-------|-------|--------------------|------------------|
| **Apple Developer Program** | **99 USD/ano** | 24-48h (KYC empresa: 1-2 sem.) | iOS / iPadOS |
| **Google Play Console** | **25 USD (uma única vez)** | Conta: imediato. Verificação D-U-N-S/identidade: 1-3 dias | Android |

> 💡 **Recomendação para HNW/UHNW Crypto Brand**: Inscrever ambas como **conta de Organização** (não Individual). Isto permite usar o nome **"KBEX"** ou **"KBEX Group"** em vez do seu nome pessoal nas stores. Para Apple, requer **D-U-N-S Number** gratuito da Dun & Bradstreet.

---

## 🟢 PARTE 1 — GOOGLE PLAY CONSOLE (Android)

### Passo 1.1 — Criar conta Google Play Console
1. Aceder a https://play.google.com/console/signup
2. Login com a conta Google da empresa (**recomendo criar `dev@kbex.io`** se ainda não tiver)
3. Escolher tipo de conta: **Organização** (Organization)
4. Pagar a taxa única de **25 USD**
5. Preencher dados da empresa (nome legal, morada, contacto)
6. **Verificação de identidade da organização (obrigatório desde 2023):**
   - Submeter **D-U-N-S Number** (gratuito em https://www.dnb.com/duns/get-a-duns.html)
   - Documento legal da empresa (certidão comercial, IUC, etc.)
   - Aguardar 1-3 dias úteis

### Passo 1.2 — Criar App no Play Console
1. Painel → **Create app**
2. Preencher:
   - **App name**: `KBEX`
   - **Default language**: `Portuguese (Portugal) – pt-PT`
   - **App or game**: App
   - **Free or paid**: Free
   - Aceitar políticas
3. Após criada, anote o **Package name**: deve corresponder a `io.kbex.mobile`

### Passo 1.3 — Service Account para upload automatizado (EAS Submit)
1. No Play Console: **Setup → API access**
2. Criar / vincular projeto Google Cloud
3. **Create service account** → role **Service Account User**
4. Gerar chave JSON → descarregar
5. Guardar como: `/app/mobile/secrets/google-play-service-account.json`
6. **Não fazer commit deste ficheiro!** (já está no `.gitignore`, mas confirme)
7. No Play Console, conceder permissões à service account: **Release manager** (mínimo) ou **Admin**

### Passo 1.4 — Conteúdo obrigatório da Store Listing
Preencher em **Main store listing**:

- **App name**: `KBEX — Crypto Boutique`
- **Short description** (80 chars):
  > `Boutique cripto para clientes premium. Trading, OTC e custódia institucional.`
- **Full description** (4000 chars): ver `mobile/store-assets/play-description-pt.txt` (criar)
- **App icon**: 512x512 PNG (32-bit com alpha) — usar o `./assets/icon.png` mas em 512x512
- **Feature graphic**: 1024x500 PNG/JPG
- **Phone screenshots**: 2 a 8 imagens, mínimo 320px, máximo 3840px (proporção 16:9 ou 9:16)
- **7-inch tablet screenshots** (opcional mas recomendado)
- **App category**: `Finance`
- **Tags**: `Investing`, `Banking`, `Currency Converter`
- **Contact details**: email `support@kbex.io`, website `https://kbex.io`
- **Privacy policy URL**: `https://kbex.io/legal/privacy` ✅ (já existe)

### Passo 1.5 — Content Rating, Data Safety, Target Audience
1. **Content rating**: questionário (Finance app, 17+ recomendado pelas regras crypto)
2. **Data safety**: declarar que recolhem dados financeiros, identificação KYC, push tokens
3. **Target audience**: 18+
4. **News app declaration**: Não
5. **COVID-19 contact tracing**: Não
6. **Government app**: Não

### Passo 1.6 — Compliance Crypto (CRÍTICO)
A Google exige declaração específica para apps cripto desde 2024:
- **Categoria de financial services**: marcar "Cryptocurrency exchange"
- Submeter **prova de licença / autorização** do regulador (UAE — VARA / SCA, EU — MiCA, etc.)
- Países permitidos: lista os países onde a KBEX está autorizada a operar

### Passo 1.7 — Compilar AAB (App Bundle) e submeter
```bash
cd /app/mobile

# Compilar Bundle de produção (.aab) para a Play Store
eas build --platform android --profile production-store

# Após o build terminar, submeter automaticamente:
eas submit --platform android --profile production --latest
```

> ⚠️ Importante: a Play Store **não aceita APK desde Agosto 2021**. Tem que ser **AAB**. O nosso `production-store` profile já está configurado para isso (`buildType: app-bundle`).

### Passo 1.8 — Internal Testing → Closed → Production
A Google exige passar por testes antes de produção:
1. **Internal testing**: até 100 testers (você + equipa). Aprovação imediata.
2. **Closed testing (Alpha)**: 12 testers durante **14 dias contínuos** (regra anti-fraude introduzida em 2023 para contas Individual; para Organização, mais flexível).
3. **Open testing (Beta)** _(opcional)_
4. **Production**: aprovação final ~3-7 dias.

---

## 🍎 PARTE 2 — APPLE APP STORE (iOS)

### Passo 2.1 — Apple Developer Program
1. Aceder a https://developer.apple.com/programs/enroll/
2. Login com Apple ID (recomendo criar `developer@kbex.io`)
3. Escolher: **Organization**
4. Submeter:
   - **D-U-N-S Number** da empresa (mesmo que usaremos para Google)
   - Nome legal exato como aparece nos registos comerciais
   - Cargo de Legal Entity Officer
   - Site oficial: `https://kbex.io`
5. A Apple vai ligar para o número da empresa para confirmar identidade (1-2 semanas)
6. Pagar **99 USD/ano**

> 💡 **Dica**: Se o tempo for crítico, pode começar como Individual (aprovação ~24h) e migrar para Organization depois. Mas isto força mudança de nome publicado.

### Passo 2.2 — App Store Connect — Criar App
1. Aceder a https://appstoreconnect.apple.com
2. **My Apps** → **+** → **New App**
3. Preencher:
   - **Platform**: iOS
   - **Name**: `KBEX`
   - **Primary Language**: Portuguese (Portugal)
   - **Bundle ID**: criar primeiro em https://developer.apple.com/account/resources/identifiers/list → registar `io.kbex.mobile`
   - **SKU**: `KBEX-IOS-001` (qualquer string única interna)
   - **User Access**: Full Access
4. Anote o **App Store Connect App ID** (numérico, ex: `6478123456`) — vai precisar para `eas.json`

### Passo 2.3 — Conteúdo obrigatório
Preencher em **App Information**:
- **Subtitle** (30 chars): `Boutique cripto premium`
- **Category**: Primary `Finance`, Secondary `Business`
- **Content Rights**: confirmar que tem direitos sobre o conteúdo
- **Age Rating**: 17+ (Frequent/Intense Simulated Gambling — necessário para crypto trading)
- **Pricing**: Free
- **Availability**: selecionar países (sugestão: começar por Portugal, EU, UAE, e expandir conforme licenças)

### Passo 2.4 — Privacidade (App Privacy)
Apple exige declarar **todos** os dados recolhidos. Para a KBEX:
- **Contact Info**: email, telefone (KYC)
- **Identifiers**: User ID
- **Financial Info**: payment info, financial transactions
- **Sensitive Info**: government ID (KYC)
- **Usage Data**: product interaction
- **Diagnostics**: crash data, performance data
- **Privacy Policy URL**: `https://kbex.io/legal/privacy`

### Passo 2.5 — Compliance Crypto (CRÍTICO Apple)
Apple endureceu as regras para cripto em 2023 (Guideline **3.1.5(b)**):
- Apenas plataformas registadas em jurisdições reconhecidas podem oferecer trading/exchange
- Submeter prova de licença regulatória ao revisor
- Menção clara de jurisdição (UAE / VARA, EU / MiCA, etc.) na descrição

### Passo 2.6 — Screenshots & Assets iOS
São obrigatórios screenshots em **PELO MENOS 1 tamanho de iPhone moderno**:

| Device | Resolução obrigatória | Notas |
|--------|----------------------|-------|
| iPhone 6.9" (15/16 Pro Max) | 1290 x 2796 | **OBRIGATÓRIO** desde 2024 |
| iPhone 6.5" (11/XS Max) | 1242 x 2688 ou 1284 x 2778 | OBRIGATÓRIO |
| iPad Pro 13" | 2064 x 2752 | Apenas se `supportsTablet: true` ✅ (nosso caso) |

- Mínimo 3, máximo 10 screenshots por tamanho
- App Icon: 1024x1024 PNG (sem alpha, sem cantos arredondados)

### Passo 2.7 — Compilar e submeter via EAS
```bash
cd /app/mobile

# Primeiro build iOS (vai pedir credenciais Apple)
eas build --platform ios --profile production

# Submeter para App Store Connect (TestFlight + review)
eas submit --platform ios --profile production --latest
```

> 💡 **EAS Submit pede:**
> - Apple ID (email da conta developer)
> - App-specific password (gerar em https://appleid.apple.com → Sign-in → App-Specific Passwords)
> - Team ID e App Store Connect App ID (já configurados em `eas.json` após substituir os placeholders)

### Passo 2.8 — TestFlight → App Store Review
1. Após `eas submit`, build aparece no **TestFlight** em ~30 min
2. Adicionar testers internos (até 100, sem review necessário)
3. Submeter para **App Store Review**
4. Tempo médio de aprovação: **24-48h** (apps cripto frequentemente têm 1ª rejeição → preparar respostas claras sobre licença)
5. Após aprovação, publicar manualmente ou agendar release

---

## 📋 PARTE 3 — Checklist de Assets a preparar

### Para AMBAS as stores
- [ ] Logotipo KBEX em alta resolução (PNG transparente)
- [ ] App icon **1024x1024** sem alpha (Apple) e **512x512** com alpha (Google)
- [ ] **8-10 screenshots** mostrando: Login, Wallet, Trading Terminal, OTC Chat, KYC, Alertas
- [ ] **Vídeo promo opcional** (15-30s, formato MP4)
- [ ] Texto "What's New" para esta versão

### Documentos legais obrigatórios
- [x] **Privacy Policy**: `https://kbex.io/legal/privacy` ✅
- [x] **Terms of Service**: `https://kbex.io/legal/terms` ✅
- [x] **Cookie Policy**: `https://kbex.io/legal/cookies` ✅
- [ ] **License**: prova de autorização regulatória (VARA UAE / SCA / DFSA / ADGM)
- [ ] **D-U-N-S Number**: solicitar grátis em https://www.dnb.com/duns/get-a-duns.html

### Textos de Marketing (criar `/app/mobile/store-assets/`)
- [ ] `play-description-pt.txt` (até 4000 chars)
- [ ] `play-description-en.txt`
- [ ] `appstore-description-pt.txt` (até 4000 chars)
- [ ] `appstore-description-en.txt`
- [ ] `keywords-pt.txt` (App Store: 100 chars de keywords separadas por vírgula)
- [ ] `keywords-en.txt`

---

## 🔐 PARTE 4 — Onde guardar credenciais sensíveis

```
/app/mobile/secrets/                 ← já está no .gitignore
├── google-play-service-account.json ← chave para EAS Submit Android
├── apple-app-store-key.p8           ← (opcional) chave API para EAS Submit iOS sem password
└── notes.md                          ← Apple ID, Team ID, ASC App ID
```

> ⚠️ **NUNCA fazer commit destes ficheiros**. EAS oferece também credentials manager remoto: `eas credentials` — recomendado para iOS.

---

## ⏱️ Timeline realista de publicação

| Semana | Atividade |
|--------|-----------|
| **Semana 1** | Inscrição Apple + Google. Pedir D-U-N-S. Preparar assets. |
| **Semana 2** | Esperar verificação. Criar listings. Compilar primeiro build iOS. |
| **Semana 3** | TestFlight beta + Internal Testing Google. Recolher feedback. |
| **Semana 4** | Submeter para review final. Responder a possíveis rejeições crypto. |
| **Semana 5** | **Live nas stores 🎉** |

---

## 🆘 Próximos passos imediatos

1. ✅ **Pedir D-U-N-S Number** (gratuito, ~24-48h): https://www.dnb.com/duns/get-a-duns.html
2. ✅ **Comprar Apple Developer (99 USD)** e **Google Play (25 USD)** em paralelo
3. ✅ Quando tiver as contas criadas, voltar aqui e eu ajudo a:
   - Substituir os placeholders em `eas.json` (Apple ID, Team ID, ASC App ID)
   - Criar os textos de descrição PT/EN/AR/FR/ES
   - Gerar os screenshots da app
   - Configurar o Service Account JSON do Google
   - Submeter o primeiro build TestFlight + Internal Testing

---

_Última atualização: Fev 2026 — KBEX Mobile v1.0.0_
