#!/usr/bin/env node
/**
 * KBEX i18n Audit Tool
 * --------------------
 * - Lê todos os .jsx/.js em /app/frontend/src
 * - Extrai todas as chamadas t('chave.subchave', ...)
 * - Compara com as 5 locales (pt, en, fr, es, ar)
 * - Detecta strings PT hardcoded (heurística por palavras-âncora)
 *
 * Output: /app/test_reports/i18n_missing_keys.md
 *
 * Uso: node /app/scripts/i18n_audit.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = '/app/frontend/src';
const LOCALES_DIR = '/app/frontend/src/i18n/locales';
const REPORT_PATH = '/app/test_reports/i18n_missing_keys.md';
const LANGS = ['pt', 'en', 'fr', 'es', 'ar'];

// 🇵🇹 Heurística: palavras tipicamente PT que indicam string hardcoded em JSX
const PT_ANCHORS = [
  'Adicionar', 'Carteira', 'Saldo', 'Pendente', 'Disponível', 'Levantar',
  'Depositar', 'Transferência', 'Cancelar', 'Confirmar', 'Selecione', 'Quantidade',
  'Período', 'Diário', 'Mensal', 'Anual', 'Rendimentos', 'Aprox', 'Empresa',
  'Conta', 'Cartão', 'Histórico', 'Estado', 'Concluído', 'Esgotado', 'Iniciar',
  'Terminar', 'Próximo', 'Anterior', 'Seguinte', 'Desbloquear', 'Bloquear'
];

// ---------- helpers ----------
function walk(dir, exts = ['.jsx', '.js', '.tsx', '.ts']) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj || {})) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flattenKeys(v, full)) keys.add(sub);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

function extractTCalls(content) {
  // Match t('a.b.c'...) or t("a.b.c"...) — supports both single and double quotes
  const regex = /\bt\(\s*['"]([a-zA-Z_][\w.]*)['"]/g;
  const found = new Set();
  let m;
  while ((m = regex.exec(content)) !== null) found.add(m[1]);
  return found;
}

function detectHardcodedPT(content, file) {
  const findings = [];
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    // Skip imports / comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ')) return;
    // Skip lines that already use t(
    if (/\bt\(\s*['"]/.test(line)) return;

    for (const anchor of PT_ANCHORS) {
      // Must appear inside JSX text (>Word<) or as a string between quotes in JSX prop
      const re = new RegExp(`>\\s*[^<]*\\b${anchor}\\b[^<]*<`, '');
      const reStr = new RegExp(`['"][^'"]*\\b${anchor}\\b[^'"]*['"]`, '');
      if (re.test(line) || reStr.test(line)) {
        findings.push({ line: i + 1, anchor, text: trimmed.substring(0, 140) });
        break;
      }
    }
  });
  return findings;
}

// ---------- main ----------
function main() {
  console.log('🔍 KBEX i18n Audit a iniciar...\n');

  // 1. Carregar locales + extras (deep-merge)
  let extras = null;
  try {
    const extrasPath = path.join(LOCALES_DIR, '_extras.js');
    if (fs.existsSync(extrasPath)) {
      delete require.cache[require.resolve(extrasPath)];
      extras = require(extrasPath).default || require(extrasPath);
    }
  } catch (e) { /* opcional */ }

  function mergeFlat(into, src, prefix = '') {
    if (!src) return;
    for (const [k, v] of Object.entries(src)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) mergeFlat(into, v, full);
      else into.add(full);
    }
  }

  const locales = {};
  for (const lang of LANGS) {
    const file = path.join(LOCALES_DIR, `${lang}.js`);
    delete require.cache[require.resolve(file)];
    const main = flattenKeys(require(file).default);
    if (extras && extras[lang]) mergeFlat(main, extras[lang]);
    locales[lang] = main;
    console.log(`  ✓ ${lang.toUpperCase()}: ${locales[lang].size} chaves (incl. _extras)`);
  }

  // 2. Percorrer src e extrair chamadas t()
  const files = walk(SRC_DIR).filter((f) => !f.includes('/i18n/'));
  console.log(`\n  ✓ ${files.length} ficheiros JSX/JS analisados`);

  const allKeysUsed = new Set();
  const fileToKeys = new Map();
  const hardcoded = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const keys = extractTCalls(content);
    for (const k of keys) allKeysUsed.add(k);
    if (keys.size > 0) fileToKeys.set(file, keys);

    const ptFindings = detectHardcodedPT(content, file);
    if (ptFindings.length > 0) hardcoded.push({ file, findings: ptFindings });
  }

  console.log(`  ✓ ${allKeysUsed.size} chaves t() distintas encontradas no código\n`);

  // 3. Calcular faltas por idioma (vs PT como fonte de verdade)
  const missing = {};
  for (const lang of LANGS) {
    missing[lang] = [...allKeysUsed]
      .filter((k) => !locales[lang].has(k))
      .sort();
  }

  // 4. Chaves no código que não existem em LADO NENHUM
  const orphans = [...allKeysUsed]
    .filter((k) => !LANGS.some((l) => locales[l].has(k)))
    .sort();

  // 5. Gerar relatório markdown
  const now = new Date().toISOString();
  let md = `# 🌐 KBEX i18n Audit Report\n\n`;
  md += `**Gerado:** ${now}\n\n`;
  md += `## 📊 Sumário\n\n`;
  md += `| Idioma | Chaves no locale | Chaves em falta | Cobertura |\n`;
  md += `|--------|------------------|------------------|-----------|\n`;
  for (const lang of LANGS) {
    const total = locales[lang].size;
    const miss = missing[lang].length;
    const coverage = ((1 - miss / allKeysUsed.size) * 100).toFixed(1);
    md += `| ${lang.toUpperCase()} | ${total} | ${miss} | **${coverage}%** |\n`;
  }
  md += `\n- Total chaves \`t()\` usadas no código: **${allKeysUsed.size}**\n`;
  md += `- Ficheiros analisados: **${files.length}**\n`;
  md += `- Chaves órfãs (não existem em NENHUM locale): **${orphans.length}**\n`;
  md += `- Possíveis strings PT hardcoded: **${hardcoded.reduce((a, h) => a + h.findings.length, 0)}** ocorrências em ${hardcoded.length} ficheiros\n\n`;

  if (orphans.length > 0) {
    md += `## ❌ Chaves órfãs (em falta em TODOS os 5 idiomas)\n\n`;
    for (const k of orphans) md += `- \`${k}\`\n`;
    md += `\n`;
  }

  // Faltas por idioma
  for (const lang of LANGS) {
    if (missing[lang].length === 0) continue;
    md += `## 🔴 ${lang.toUpperCase()} — ${missing[lang].length} chaves em falta\n\n`;
    md += `<details>\n<summary>Mostrar lista</summary>\n\n`;
    for (const k of missing[lang]) md += `- \`${k}\`\n`;
    md += `\n</details>\n\n`;
  }

  // Strings hardcoded
  if (hardcoded.length > 0) {
    md += `## 🟡 Strings PT hardcoded (top 20 ficheiros)\n\n`;
    const top = hardcoded
      .sort((a, b) => b.findings.length - a.findings.length)
      .slice(0, 20);
    for (const h of top) {
      const rel = h.file.replace('/app/frontend/src/', '');
      md += `### \`${rel}\` (${h.findings.length} ocorrências)\n\n`;
      for (const f of h.findings.slice(0, 8)) {
        md += `- L${f.line} (\`${f.anchor}\`): \`${f.text.replace(/`/g, "'")}\`\n`;
      }
      if (h.findings.length > 8) md += `- ...e mais ${h.findings.length - 8}\n`;
      md += `\n`;
    }
  }

  // 6. Escrever relatório
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md);

  // 7. Output console
  console.log('📋 Sumário:');
  for (const lang of LANGS) {
    const miss = missing[lang].length;
    const coverage = ((1 - miss / allKeysUsed.size) * 100).toFixed(1);
    console.log(`  ${lang.toUpperCase()}: ${miss} chaves em falta (${coverage}% cobertura)`);
  }
  console.log(`\n✓ Chaves órfãs: ${orphans.length}`);
  console.log(`✓ Strings PT hardcoded suspeitas: ${hardcoded.reduce((a, h) => a + h.findings.length, 0)}`);
  console.log(`\n✅ Relatório completo gravado em: ${REPORT_PATH}`);
}

main();
