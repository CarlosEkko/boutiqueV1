// Translations for KBEX.io
// Aggregates per-language locale files for easier maintenance.
// To edit a specific language, modify the corresponding file in ./locales/

import EN from './locales/en';
import PT from './locales/pt';
import AR from './locales/ar';
import FR from './locales/fr';
import ES from './locales/es';
import EXTRAS from './locales/_extras';

// Deep-merge: src into target. Existing keys in target are NOT overridden.
// Used to attach `_extras.js` chaves complementares without altering the
// estrutura aninhada das locales principais.
function deepMerge(target, src) {
  if (!src || typeof src !== 'object') return target;
  for (const k of Object.keys(src)) {
    const sv = src[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], sv);
    } else if (target[k] === undefined) {
      target[k] = sv;
    }
  }
  return target;
}

deepMerge(PT, EXTRAS.pt);
deepMerge(EN, EXTRAS.en);
deepMerge(FR, EXTRAS.fr);
deepMerge(ES, EXTRAS.es);
deepMerge(AR, EXTRAS.ar);

const translations = { EN, PT, AR, FR, ES };

export default translations;
