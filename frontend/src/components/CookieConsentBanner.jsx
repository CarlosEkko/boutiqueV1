import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, BarChart3, Megaphone, X, Check, Settings2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  hasConsent,
  persistConsent,
  getCategories,
  DEFAULT_CATEGORIES,
  CONSENT_EVENT,
} from '../lib/cookieConsent';

/**
 * GDPR-compliant cookie banner.
 *
 * - Auto-shows on first visit (no stored consent for the current policy version).
 * - "Aceitar tudo" / "Rejeitar não-essenciais" / "Personalizar" actions.
 * - Persists to localStorage + cookie + backend audit log.
 * - Listens to `kbex:cookie-consent-changed` so the Footer "Manage cookies"
 *   link can re-open it on demand (window.dispatchEvent CustomEvent).
 */

const COPY = {
  pt: {
    eyebrow: 'Cookies & Privacidade',
    title: 'A sua privacidade é importante para nós',
    body: 'Utilizamos cookies essenciais para o funcionamento da plataforma. Com o seu consentimento, podemos também ativar cookies de análise e marketing para melhorar a experiência. Pode alterar a sua escolha a qualquer momento.',
    acceptAll: 'Aceitar tudo',
    rejectAll: 'Rejeitar não-essenciais',
    customize: 'Personalizar',
    save: 'Guardar preferências',
    cancel: 'Cancelar',
    close: 'Fechar',
    learnMore: 'Saber mais',
    categories: {
      essential: { title: 'Essenciais', desc: 'Necessários para autenticação, segurança e funcionamento básico. Não podem ser desativados.', alwaysOn: 'Sempre ativos' },
      analytics: { title: 'Análise', desc: 'Ajudam-nos a entender como a plataforma é utilizada (visitas, fluxos, erros). Anónimos e agregados.' },
      marketing: { title: 'Marketing', desc: 'Permitem comunicar campanhas e conteúdos relevantes. Atualmente desativado por defeito.' },
    },
  },
  en: {
    eyebrow: 'Cookies & Privacy',
    title: 'Your privacy matters to us',
    body: 'We use strictly-necessary cookies to operate the platform. With your consent, we may also enable analytics and marketing cookies to improve your experience. You can change your choice at any time.',
    acceptAll: 'Accept all',
    rejectAll: 'Reject non-essential',
    customize: 'Customize',
    save: 'Save preferences',
    cancel: 'Cancel',
    close: 'Close',
    learnMore: 'Learn more',
    categories: {
      essential: { title: 'Essential', desc: 'Required for authentication, security and basic functioning. Cannot be disabled.', alwaysOn: 'Always on' },
      analytics: { title: 'Analytics', desc: 'Help us understand how the platform is used (visits, flows, errors). Anonymous and aggregated.' },
      marketing: { title: 'Marketing', desc: 'Allow us to surface relevant campaigns and content. Currently off by default.' },
    },
  },
  fr: {
    eyebrow: 'Cookies & Confidentialité',
    title: 'Votre vie privée nous importe',
    body: 'Nous utilisons des cookies strictement nécessaires au fonctionnement de la plateforme. Avec votre consentement, nous pouvons également activer des cookies d’analyse et de marketing pour améliorer votre expérience.',
    acceptAll: 'Tout accepter',
    rejectAll: 'Refuser les non-essentiels',
    customize: 'Personnaliser',
    save: 'Enregistrer les préférences',
    cancel: 'Annuler',
    close: 'Fermer',
    learnMore: 'En savoir plus',
    categories: {
      essential: { title: 'Essentiels', desc: 'Requis pour l’authentification, la sécurité et le fonctionnement de base. Ne peuvent pas être désactivés.', alwaysOn: 'Toujours actifs' },
      analytics: { title: 'Analyse', desc: 'Nous aident à comprendre comment la plateforme est utilisée (visites, parcours, erreurs).' },
      marketing: { title: 'Marketing', desc: 'Nous permettent de proposer des campagnes et contenus pertinents.' },
    },
  },
  es: {
    eyebrow: 'Cookies y Privacidad',
    title: 'Su privacidad nos importa',
    body: 'Utilizamos cookies estrictamente necesarias para el funcionamiento de la plataforma. Con su consentimiento, podemos también activar cookies de análisis y marketing para mejorar la experiencia.',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar no esenciales',
    customize: 'Personalizar',
    save: 'Guardar preferencias',
    cancel: 'Cancelar',
    close: 'Cerrar',
    learnMore: 'Saber más',
    categories: {
      essential: { title: 'Esenciales', desc: 'Requeridas para autenticación, seguridad y funcionamiento básico. No pueden desactivarse.', alwaysOn: 'Siempre activas' },
      analytics: { title: 'Análisis', desc: 'Nos ayudan a entender cómo se utiliza la plataforma (visitas, flujos, errores).' },
      marketing: { title: 'Marketing', desc: 'Permiten mostrar campañas y contenido relevante.' },
    },
  },
  ar: {
    eyebrow: 'ملفات تعريف الارتباط والخصوصية',
    title: 'خصوصيتك تهمنا',
    body: 'نستخدم ملفات تعريف الارتباط الضرورية لتشغيل المنصة. بموافقتك، يمكننا أيضًا تفعيل ملفات التحليل والتسويق لتحسين تجربتك.',
    acceptAll: 'قبول الكل',
    rejectAll: 'رفض غير الضروري',
    customize: 'تخصيص',
    save: 'حفظ التفضيلات',
    cancel: 'إلغاء',
    close: 'إغلاق',
    learnMore: 'معرفة المزيد',
    categories: {
      essential: { title: 'ضرورية', desc: 'مطلوبة للمصادقة والأمان والتشغيل الأساسي. لا يمكن تعطيلها.', alwaysOn: 'مفعلة دائمًا' },
      analytics: { title: 'التحليل', desc: 'تساعدنا في فهم كيفية استخدام المنصة (الزيارات، التدفقات، الأخطاء).' },
      marketing: { title: 'التسويق', desc: 'تتيح لنا تقديم حملات ومحتوى ذي صلة.' },
    },
  },
};

export default function CookieConsentBanner() {
  const { language, isRTL } = useLanguage();
  const langKey = (language || 'EN').toLowerCase();
  const c = COPY[langKey] || COPY.en;

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('banner'); // "banner" | "preferences"
  const [draft, setDraft] = useState(DEFAULT_CATEGORIES);

  // Initial check (delayed slightly to avoid flashing on hydrate) +
  // listen to manual re-open event from Footer / Cookie policy page.
  useEffect(() => {
    const showIfMissing = () => {
      if (!hasConsent()) {
        setDraft(DEFAULT_CATEGORIES);
        setMode('banner');
        setVisible(true);
      }
    };
    const t = setTimeout(showIfMissing, 700);

    const handleReopen = () => {
      setDraft(getCategories());
      setMode('preferences');
      setVisible(true);
    };
    window.addEventListener('kbex:open-cookie-preferences', handleReopen);
    // When consent changes elsewhere (e.g. cleared), refresh state.
    const handleChanged = () => {
      if (!hasConsent()) showIfMissing();
    };
    window.addEventListener(CONSENT_EVENT, handleChanged);

    return () => {
      clearTimeout(t);
      window.removeEventListener('kbex:open-cookie-preferences', handleReopen);
      window.removeEventListener(CONSENT_EVENT, handleChanged);
    };
  }, []);

  const submit = (categories, method) => {
    persistConsent(categories, { method, language: langKey });
    setVisible(false);
  };

  if (!visible) return null;

  // ---------- Preferences modal ----------
  if (mode === 'preferences') {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        data-testid="cookie-preferences-dialog"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="w-full max-w-xl rounded-2xl border border-gold-700/30 bg-zinc-950 shadow-[0_0_60px_rgba(212,175,55,0.08)] p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold-400/80 mb-1.5">
                <Settings2 size={12} />
                {c.customize}
              </div>
              <h2 className="text-xl text-white font-light">{c.title}</h2>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-zinc-500 hover:text-white transition-colors"
              aria-label={c.close}
              data-testid="cookie-preferences-close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <CategoryRow
              icon={ShieldCheck}
              iconColor="text-emerald-400"
              title={c.categories.essential.title}
              desc={c.categories.essential.desc}
              checked
              disabled
              alwaysOn={c.categories.essential.alwaysOn}
              testId="cookie-cat-essential"
            />
            <CategoryRow
              icon={BarChart3}
              iconColor="text-sky-400"
              title={c.categories.analytics.title}
              desc={c.categories.analytics.desc}
              checked={draft.analytics}
              onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
              testId="cookie-cat-analytics"
            />
            <CategoryRow
              icon={Megaphone}
              iconColor="text-violet-400"
              title={c.categories.marketing.title}
              desc={c.categories.marketing.desc}
              checked={draft.marketing}
              onChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
              testId="cookie-cat-marketing"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
            <Link
              to="/legal/cookies"
              onClick={() => setVisible(false)}
              className="text-xs text-zinc-400 hover:text-gold-300 transition-colors underline-offset-4 hover:underline"
              data-testid="cookie-preferences-policy-link"
            >
              {c.learnMore} →
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('banner')}
                className="text-sm px-4 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                data-testid="cookie-preferences-back"
              >
                {c.cancel}
              </button>
              <button
                onClick={() => submit(draft, 'preferences_dialog')}
                className="text-sm px-4 py-2 rounded-md bg-gold-500 hover:bg-gold-400 text-black font-medium transition-colors"
                data-testid="cookie-preferences-save"
              >
                <Check size={14} className="inline -mt-0.5 mr-1" />
                {c.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Compact bottom banner ----------
  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[55] animate-in slide-in-from-bottom-6 duration-500"
      data-testid="cookie-banner"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="rounded-2xl border border-gold-700/30 bg-zinc-950/95 backdrop-blur-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
            <Cookie size={16} className="text-gold-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold-400/80 mb-1">
              {c.eyebrow}
            </div>
            <h3 className="text-white text-sm font-medium leading-snug">{c.title}</h3>
          </div>
        </div>
        <p className="text-zinc-400 text-xs leading-relaxed mb-4">{c.body}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => submit({ essential: true, analytics: true, marketing: true }, 'banner')}
            className="w-full text-sm px-4 py-2.5 rounded-md bg-gold-500 hover:bg-gold-400 text-black font-medium transition-colors"
            data-testid="cookie-banner-accept-all"
          >
            {c.acceptAll}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => submit({ essential: true, analytics: false, marketing: false }, 'banner')}
              className="flex-1 text-sm px-3 py-2 rounded-md border border-zinc-700 text-zinc-200 hover:bg-zinc-900 transition-colors"
              data-testid="cookie-banner-reject"
            >
              {c.rejectAll}
            </button>
            <button
              onClick={() => { setDraft(getCategories()); setMode('preferences'); }}
              className="flex-1 text-sm px-3 py-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              data-testid="cookie-banner-customize"
            >
              {c.customize}
            </button>
          </div>
          <Link
            to="/legal/cookies"
            onClick={() => setVisible(false)}
            className="text-[11px] text-zinc-500 hover:text-gold-300 transition-colors mt-1 self-center underline-offset-4 hover:underline"
            data-testid="cookie-banner-policy-link"
          >
            {c.learnMore} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ icon: Icon, iconColor, title, desc, checked, disabled, onChange, alwaysOn, testId }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 flex items-start gap-3">
      <div className={`shrink-0 w-8 h-8 rounded-md bg-zinc-900/60 flex items-center justify-center ${iconColor}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-sm text-white font-medium">{title}</div>
          {disabled ? (
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-700/40 px-2 py-0.5 rounded-full">
              {alwaysOn}
            </span>
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={() => onChange?.(!checked)}
              data-testid={testId}
              className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                checked ? 'bg-gold-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  checked ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
