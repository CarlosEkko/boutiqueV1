# 🌐 KBEX i18n — Workflow de Traduções

## 🎯 Objetivo
Manter as 5 línguas (PT, EN, FR, ES, AR) **100% em sincronia** sem ter de iterar página-a-página quando aparecem chaves novas.

## 📂 Estrutura
```
/app/frontend/src/i18n/
├── translations.js         # Agrega + faz deep-merge de _extras
├── LanguageContext.jsx     # React context (t, language, setLanguage)
├── index.js
└── locales/
    ├── pt.js               # Locale principal (fonte de verdade)
    ├── en.js               # Inglês
    ├── fr.js               # Francês
    ├── es.js               # Espanhol
    ├── ar.js               # Árabe (RTL)
    └── _extras.js          # 🆕 Chaves complementares — deep-merged
```

## 🔧 Auditoria Automática

```bash
node /app/scripts/i18n_audit.js
```

Output:
- Lista chaves `t()` usadas no código que **não existem** em cada locale
- Lista chaves órfãs (em falta em **todos** os 5 idiomas)
- Detecta strings PT hardcoded em ficheiros JSX (heurística)
- Gera relatório em `/app/test_reports/i18n_missing_keys.md`

## ➕ Adicionar nova tradução

### Opção A — Tradução é nova em todos os idiomas (recomendado)
Adicionar em `_extras.js` o bloco com a chave nos 5 idiomas:
```js
const EXTRAS = {
  pt: { common: { newKey: 'Novo Texto' } },
  en: { common: { newKey: 'New Text' } },
  fr: { common: { newKey: 'Nouveau Texte' } },
  es: { common: { newKey: 'Nuevo Texto' } },
  ar: { common: { newKey: 'نص جديد' } },
};
```
✅ Não precisa modificar os ficheiros principais. Hot reload funciona.

### Opção B — Adicionar a um locale individual
Editar diretamente `pt.js` / `en.js` / etc. quando faz sentido manter junto a um bloco existente.

## 🚦 Regras

1. **Nunca usar strings hardcoded** em JSX — sempre `t('chave', 'fallback PT')`
2. **PT é a fonte de verdade** — todas as outras linguas devem ter as mesmas chaves
3. **Antes de fazer commit**, correr `node /app/scripts/i18n_audit.js` e garantir 100% de cobertura
4. **AR é RTL** — testar visualmente no navegador (o `dir="rtl"` é aplicado automaticamente)

## 📊 Estado atual (Fev 2026)

| Idioma | Chaves no locale | Cobertura |
|--------|------------------|-----------|
| PT     | ~2200            | **100%**  |
| EN     | ~2200            | **100%**  |
| FR     | ~2180            | **100%**  |
| ES     | ~2190            | **100%**  |
| AR     | ~2190            | **100%**  |

- 1267 chaves `t()` distintas usadas no código
- 0 chaves órfãs
- 300 strings PT ainda hardcoded em JSX (próxima vaga de fix)

## 🔮 Próximos passos
- Reduzir as 300 strings hardcoded para 0 (refatorar JSX progressivamente)
- Integrar o audit no pre-commit hook (`husky`) para bloquear commits sem cobertura 100%
