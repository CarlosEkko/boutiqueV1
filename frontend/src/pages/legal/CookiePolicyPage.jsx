import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, ShieldCheck, Settings2, Mail } from 'lucide-react';
import { useLanguage } from '../../i18n';

/**
 * KBEX Cookie Policy — static legal page (no banner, essential cookies only).
 *
 * The platform currently does not use marketing/analytics trackers — only
 * strictly-necessary cookies (auth/session, anti-CSRF, language, theme,
 * Cloudflare Turnstile anti-bot). This page documents that fact in five
 * languages and exposes a contact path for data-subject requests.
 *
 * If/when KBEX starts using analytics or marketing trackers, upgrade to a
 * full GDPR consent banner (see ROADMAP — "Cookie consent banner with
 * categories").
 */
const COOKIE_TABLE = {
  pt: [
    { name: 'kbex_session', purpose: 'Manter a sessão autenticada após login.', duration: 'Sessão / 30 dias com "lembrar"', type: 'Essencial' },
    { name: 'kbex_lang', purpose: 'Recordar o idioma selecionado (PT/EN/AR/FR/ES).', duration: '12 meses', type: 'Essencial' },
    { name: 'kbex_theme', purpose: 'Recordar a preferência de tema (claro/escuro).', duration: '12 meses', type: 'Essencial' },
    { name: 'cf_clearance / __cf_bm', purpose: 'Proteção anti-bot e contra ataques (Cloudflare Turnstile).', duration: '30 minutos – 30 dias', type: 'Essencial' },
    { name: 'kbex_tenant', purpose: 'Identificar o cliente Institucional.', duration: 'Sessão', type: 'Essencial' },
  ],
  en: [
    { name: 'kbex_session', purpose: 'Keeps you authenticated after login.', duration: 'Session / 30 days with "remember me"', type: 'Essential' },
    { name: 'kbex_lang', purpose: 'Remembers your selected language (PT/EN/AR/FR/ES).', duration: '12 months', type: 'Essential' },
    { name: 'kbex_theme', purpose: 'Remembers your theme preference (light/dark).', duration: '12 months', type: 'Essential' },
    { name: 'cf_clearance / __cf_bm', purpose: 'Anti-bot and DDoS protection (Cloudflare Turnstile).', duration: '30 minutes – 30 days', type: 'Essential' },
    { name: 'kbex_tenant', purpose: 'Identifies the active Institutional client.', duration: 'Session', type: 'Essential' },
  ],
  fr: [
    { name: 'kbex_session', purpose: 'Maintient la session après connexion.', duration: 'Session / 30 jours avec « se souvenir »', type: 'Essentiel' },
    { name: 'kbex_lang', purpose: 'Mémorise la langue sélectionnée (PT/EN/AR/FR/ES).', duration: '12 mois', type: 'Essentiel' },
    { name: 'kbex_theme', purpose: 'Mémorise la préférence de thème (clair/sombre).', duration: '12 mois', type: 'Essentiel' },
    { name: 'cf_clearance / __cf_bm', purpose: 'Protection anti-bot et anti-DDoS (Cloudflare Turnstile).', duration: '30 minutes – 30 jours', type: 'Essentiel' },
    { name: 'kbex_tenant', purpose: 'Identifie le client Institutionnel actif.', duration: 'Session', type: 'Essentiel' },
  ],
  es: [
    { name: 'kbex_session', purpose: 'Mantiene la sesión autenticada tras el login.', duration: 'Sesión / 30 días con «recordar»', type: 'Esencial' },
    { name: 'kbex_lang', purpose: 'Recuerda el idioma seleccionado (PT/EN/AR/FR/ES).', duration: '12 meses', type: 'Esencial' },
    { name: 'kbex_theme', purpose: 'Recuerda la preferencia de tema (claro/oscuro).', duration: '12 meses', type: 'Esencial' },
    { name: 'cf_clearance / __cf_bm', purpose: 'Protección anti-bot y anti-DDoS (Cloudflare Turnstile).', duration: '30 minutos – 30 días', type: 'Esencial' },
    { name: 'kbex_tenant', purpose: 'Identifica el cliente Institucional activo.', duration: 'Sesión', type: 'Esencial' },
  ],
  ar: [
    { name: 'kbex_session', purpose: 'يحافظ على الجلسة بعد تسجيل الدخول.', duration: 'جلسة / 30 يومًا مع "تذكرني"', type: 'ضروري' },
    { name: 'kbex_lang', purpose: 'يتذكر اللغة المختارة (PT/EN/AR/FR/ES).', duration: '12 شهرًا', type: 'ضروري' },
    { name: 'kbex_theme', purpose: 'يتذكر تفضيل السمة (فاتح/داكن).', duration: '12 شهرًا', type: 'ضروري' },
    { name: 'cf_clearance / __cf_bm', purpose: 'حماية ضد الروبوتات وهجمات DDoS (Cloudflare Turnstile).', duration: '30 دقيقة – 30 يومًا', type: 'ضروري' },
    { name: 'kbex_tenant', purpose: 'يحدد العميل المؤسسي النشط.', duration: 'جلسة', type: 'ضروري' },
  ],
};

const COPY = {
  pt: {
    eyebrow: 'Política Legal',
    title: 'Política de Cookies',
    subtitle: 'Como a KBEX.io utiliza cookies — uma abordagem minimalista, apenas com cookies estritamente necessários ao funcionamento da plataforma.',
    backHome: 'Voltar ao Início',
    lastUpdate: 'Última atualização',
    sections: {
      intro: {
        title: '1. Introdução',
        body: 'A KBEX.io ("nós") respeita a sua privacidade. Esta política descreve quais os cookies e tecnologias semelhantes que utilizamos no website kbex.io e na plataforma autenticada, com que finalidade e por quanto tempo. Está alinhada com o Regulamento Geral de Proteção de Dados (RGPD/GDPR) e com a Lei n.º 41/2004 sobre comunicações eletrónicas.',
      },
      what: {
        title: '2. O que são cookies?',
        body: 'Cookies são pequenos ficheiros de texto que o website coloca no seu dispositivo (computador, telemóvel ou tablet) quando o visita. Permitem que o sistema reconheça o seu dispositivo nas visitas seguintes, mantendo, por exemplo, a sua sessão autenticada ou o idioma escolhido.',
      },
      use: {
        title: '3. Cookies que utilizamos',
        intro: 'A KBEX.io utiliza exclusivamente cookies estritamente necessários — sem cookies de marketing, publicidade comportamental ou analítica de terceiros. A tabela abaixo lista todos os cookies emitidos pela plataforma:',
      },
      headers: { name: 'Nome', purpose: 'Finalidade', duration: 'Duração', type: 'Categoria' },
      legal: {
        title: '4. Base legal',
        body: 'Os cookies estritamente necessários estão isentos de consentimento prévio nos termos do Art. 5.º(3) da Diretiva ePrivacy e da posição do Comité Europeu para a Proteção de Dados, dado que são essenciais para fornecer o serviço expressamente solicitado pelo utilizador (ex.: manter sessão após login).',
      },
      manage: {
        title: '5. Como gerir ou eliminar cookies',
        body: 'Pode controlar e/ou eliminar cookies através das configurações do seu navegador. Pode eliminar todos os cookies já guardados e configurar a maioria dos navegadores para impedir a sua colocação. No entanto, ao desativar cookies essenciais, certas funcionalidades — incluindo o login — deixarão de funcionar.',
        links: [
          { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
          { name: 'Firefox', url: 'https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer' },
          { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' },
          { name: 'Edge', url: 'https://support.microsoft.com/microsoft-edge' },
        ],
      },
      changes: {
        title: '6. Alterações a esta política',
        body: 'Reservamo-nos o direito de atualizar esta política sempre que necessário para refletir alterações regulamentares ou novos serviços da plataforma. A data da última atualização é exibida no topo desta página.',
      },
      contact: {
        title: '7. Contactos',
        body: 'Para qualquer questão relativa a esta política, ao tratamento dos seus dados pessoais ou para exercer os seus direitos (acesso, retificação, apagamento, portabilidade, oposição), contacte:',
        dpo: 'Encarregado de Proteção de Dados',
        email: 'privacy@kbex.io',
        address: 'KBEX.io — Zurique, Suíça',
      },
    },
  },
  en: {
    eyebrow: 'Legal Policy',
    title: 'Cookie Policy',
    subtitle: 'How KBEX.io uses cookies — a minimal approach with strictly-necessary cookies only.',
    backHome: 'Back to Home',
    lastUpdate: 'Last updated',
    sections: {
      intro: { title: '1. Introduction', body: 'KBEX.io ("we") respects your privacy. This policy describes which cookies and similar technologies we use on the kbex.io website and on the authenticated platform, for what purpose and for how long. It is aligned with the General Data Protection Regulation (GDPR) and the ePrivacy Directive.' },
      what: { title: '2. What are cookies?', body: 'Cookies are small text files that the website places on your device (computer, phone or tablet) when you visit it. They allow the system to recognize your device on subsequent visits, keeping for instance your authenticated session or the chosen language.' },
      use: { title: '3. Cookies we use', intro: 'KBEX.io uses exclusively strictly-necessary cookies — no marketing, behavioral advertising or third-party analytics. The table below lists every cookie issued by the platform:' },
      headers: { name: 'Name', purpose: 'Purpose', duration: 'Duration', type: 'Category' },
      legal: { title: '4. Legal basis', body: 'Strictly-necessary cookies are exempt from prior consent under Art. 5(3) of the ePrivacy Directive and the EDPB guidelines, as they are essential to provide the service expressly requested by the user (e.g., keeping the session after login).' },
      manage: { title: '5. How to manage or delete cookies', body: 'You can control and/or delete cookies via your browser settings. You can delete all cookies already saved and configure most browsers to prevent their placement. However, disabling essential cookies will break certain features — including login.', links: [ { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' }, { name: 'Firefox', url: 'https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer' }, { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' }, { name: 'Edge', url: 'https://support.microsoft.com/microsoft-edge' } ] },
      changes: { title: '6. Changes to this policy', body: 'We reserve the right to update this policy whenever necessary to reflect regulatory changes or new platform services. The date of the last update is shown at the top of this page.' },
      contact: { title: '7. Contact', body: 'For any question regarding this policy, the processing of your personal data, or to exercise your rights (access, rectification, erasure, portability, objection), contact:', dpo: 'Data Protection Officer', email: 'privacy@kbex.io', address: 'KBEX.io — Zurich, Switzerland' },
    },
  },
  fr: {
    eyebrow: 'Politique Légale',
    title: 'Politique de Cookies',
    subtitle: 'Comment KBEX.io utilise les cookies — approche minimaliste, uniquement des cookies strictement nécessaires.',
    backHome: 'Retour à l\'accueil',
    lastUpdate: 'Dernière mise à jour',
    sections: {
      intro: { title: '1. Introduction', body: 'KBEX.io (« nous ») respecte votre vie privée. Cette politique décrit quels cookies et technologies similaires nous utilisons sur le site kbex.io et sur la plateforme authentifiée, dans quel but et pendant combien de temps. Elle est conforme au RGPD et à la directive ePrivacy.' },
      what: { title: '2. Que sont les cookies ?', body: 'Les cookies sont de petits fichiers texte que le site place sur votre appareil lors de votre visite. Ils permettent au système de reconnaître votre appareil lors des visites suivantes, conservant par exemple votre session ou la langue choisie.' },
      use: { title: '3. Cookies utilisés', intro: 'KBEX.io n\'utilise que des cookies strictement nécessaires — pas de marketing, publicité comportementale ou analytique tierce. Le tableau ci-dessous liste tous les cookies émis :' },
      headers: { name: 'Nom', purpose: 'Finalité', duration: 'Durée', type: 'Catégorie' },
      legal: { title: '4. Base légale', body: 'Les cookies strictement nécessaires sont exemptés de consentement préalable selon l\'art. 5(3) de la directive ePrivacy et les lignes directrices du CEPD, car essentiels pour fournir le service expressément demandé par l\'utilisateur.' },
      manage: { title: '5. Comment gérer ou supprimer les cookies', body: 'Vous pouvez contrôler et/ou supprimer les cookies via les paramètres de votre navigateur. Vous pouvez supprimer tous les cookies déjà enregistrés. Toutefois, désactiver les cookies essentiels rendra certaines fonctionnalités — y compris le login — non fonctionnelles.', links: [ { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' }, { name: 'Firefox', url: 'https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer' }, { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' }, { name: 'Edge', url: 'https://support.microsoft.com/microsoft-edge' } ] },
      changes: { title: '6. Modifications', body: 'Nous nous réservons le droit de mettre à jour cette politique lorsque nécessaire. La date de dernière mise à jour est affichée en haut de cette page.' },
      contact: { title: '7. Contact', body: 'Pour toute question concernant cette politique ou pour exercer vos droits (accès, rectification, effacement, portabilité, opposition), contactez :', dpo: 'Délégué à la Protection des Données', email: 'privacy@kbex.io', address: 'KBEX.io — Zurich, Suisse' },
    },
  },
  es: {
    eyebrow: 'Política Legal',
    title: 'Política de Cookies',
    subtitle: 'Cómo KBEX.io utiliza cookies — un enfoque minimalista con sólo cookies estrictamente necesarias.',
    backHome: 'Volver al inicio',
    lastUpdate: 'Última actualización',
    sections: {
      intro: { title: '1. Introducción', body: 'KBEX.io ("nosotros") respeta su privacidad. Esta política describe qué cookies y tecnologías similares utilizamos en kbex.io y en la plataforma autenticada, con qué finalidad y durante cuánto tiempo. Cumple con el RGPD y la Directiva ePrivacy.' },
      what: { title: '2. ¿Qué son las cookies?', body: 'Las cookies son pequeños archivos de texto que el sitio coloca en su dispositivo cuando lo visita, permitiendo reconocer el dispositivo en visitas posteriores y mantener, por ejemplo, su sesión o el idioma elegido.' },
      use: { title: '3. Cookies que utilizamos', intro: 'KBEX.io utiliza exclusivamente cookies estrictamente necesarias — sin marketing, publicidad comportamental ni analítica de terceros. La tabla siguiente lista todas las cookies emitidas:' },
      headers: { name: 'Nombre', purpose: 'Finalidad', duration: 'Duración', type: 'Categoría' },
      legal: { title: '4. Base legal', body: 'Las cookies estrictamente necesarias están exentas de consentimiento previo según el art. 5(3) de la Directiva ePrivacy y las directrices del CEPD, al ser esenciales para prestar el servicio solicitado por el usuario.' },
      manage: { title: '5. Cómo gestionar o eliminar cookies', body: 'Puede controlar y/o eliminar las cookies mediante la configuración de su navegador. Puede borrar todas las cookies ya guardadas. Sin embargo, deshabilitar cookies esenciales romperá ciertas funcionalidades — incluido el login.', links: [ { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' }, { name: 'Firefox', url: 'https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer' }, { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' }, { name: 'Edge', url: 'https://support.microsoft.com/microsoft-edge' } ] },
      changes: { title: '6. Cambios', body: 'Nos reservamos el derecho de actualizar esta política cuando sea necesario. La fecha de la última actualización se muestra en la parte superior.' },
      contact: { title: '7. Contacto', body: 'Para cualquier consulta sobre esta política o para ejercer sus derechos (acceso, rectificación, supresión, portabilidad, oposición), contacte:', dpo: 'Delegado de Protección de Datos', email: 'privacy@kbex.io', address: 'KBEX.io — Zúrich, Suiza' },
    },
  },
  ar: {
    eyebrow: 'سياسة قانونية',
    title: 'سياسة ملفات تعريف الارتباط',
    subtitle: 'كيف تستخدم KBEX.io ملفات تعريف الارتباط — نهج بسيط، باستخدام ملفات تعريف الارتباط الضرورية فقط.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    lastUpdate: 'آخر تحديث',
    sections: {
      intro: { title: '1. مقدمة', body: 'تحترم KBEX.io ("نحن") خصوصيتك. تصف هذه السياسة ملفات تعريف الارتباط والتقنيات المماثلة التي نستخدمها على موقع kbex.io وعلى المنصة المصادق عليها، والغرض منها ومدتها. وهي متوافقة مع اللائحة العامة لحماية البيانات وتوجيه الخصوصية الإلكترونية.' },
      what: { title: '2. ما هي ملفات تعريف الارتباط؟', body: 'ملفات تعريف الارتباط هي ملفات نصية صغيرة يضعها الموقع على جهازك عند زيارته. تسمح للنظام بالتعرف على جهازك في الزيارات اللاحقة، وحفظ جلستك المعتمدة أو اللغة المختارة على سبيل المثال.' },
      use: { title: '3. ملفات تعريف الارتباط المستخدمة', intro: 'تستخدم KBEX.io حصريًا ملفات تعريف الارتباط الضرورية — بدون تسويق أو إعلانات سلوكية أو تحليلات طرف ثالث. يسرد الجدول أدناه جميع الملفات الصادرة:' },
      headers: { name: 'الاسم', purpose: 'الغرض', duration: 'المدة', type: 'الفئة' },
      legal: { title: '4. الأساس القانوني', body: 'ملفات تعريف الارتباط الضرورية معفاة من الموافقة المسبقة وفقًا للمادة 5(3) من توجيه الخصوصية الإلكترونية، لأنها أساسية لتقديم الخدمة المطلوبة صراحةً من المستخدم.' },
      manage: { title: '5. كيفية إدارة أو حذف ملفات تعريف الارتباط', body: 'يمكنك التحكم و/أو حذف ملفات تعريف الارتباط من خلال إعدادات المتصفح. يمكنك حذف جميع الملفات المحفوظة. مع ذلك، فإن تعطيل الملفات الضرورية سيؤدي إلى تعطل بعض الميزات — بما في ذلك تسجيل الدخول.', links: [ { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' }, { name: 'Firefox', url: 'https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer' }, { name: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' }, { name: 'Edge', url: 'https://support.microsoft.com/microsoft-edge' } ] },
      changes: { title: '6. التغييرات', body: 'نحتفظ بالحق في تحديث هذه السياسة كلما لزم الأمر. يظهر تاريخ آخر تحديث في أعلى هذه الصفحة.' },
      contact: { title: '7. الاتصال', body: 'لأي استفسار حول هذه السياسة أو لممارسة حقوقك (الوصول، التصحيح، المحو، النقل، الاعتراض)، تواصل مع:', dpo: 'مسؤول حماية البيانات', email: 'privacy@kbex.io', address: 'KBEX.io — زيورخ، سويسرا' },
    },
  },
};

export default function CookiePolicyPage() {
  const { language, isRTL } = useLanguage();
  const langKey = (language || 'EN').toLowerCase();
  const lang = COPY[langKey] ? langKey : 'en';
  const c = COPY[lang];
  const cookies = COOKIE_TABLE[lang] || COOKIE_TABLE.en;
  // Static last-update — bump manually when you edit the policy
  const lastUpdated = '2026-04-29';

  return (
    <div
      className={`min-h-screen bg-black text-zinc-200 ${isRTL ? 'rtl' : 'ltr'}`}
      data-testid="cookie-policy-page"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-gold-400 transition-colors text-sm mb-10"
          data-testid="cookie-policy-back-home"
        >
          <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} />
          {c.backHome}
        </Link>

        {/* Hero */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold-400/80 mb-3">
            <Cookie size={14} />
            <span>{c.eyebrow}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight">{c.title}</h1>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">{c.subtitle}</p>
          <p className="text-[11px] text-zinc-600 mt-4 uppercase tracking-wider">
            {c.lastUpdate}: {lastUpdated}
          </p>
        </div>

        {/* Body */}
        <div className="space-y-10">
          <Section title={c.sections.intro.title} body={c.sections.intro.body} />
          <Section title={c.sections.what.title} body={c.sections.what.body} />

          <div>
            <h2 className="text-xl font-light text-white mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-gold-400/80" />
              {c.sections.use.title}
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-5">{c.sections.use.intro}</p>

            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/70 text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left">{c.sections.headers.name}</th>
                    <th className="px-4 py-3 text-left">{c.sections.headers.purpose}</th>
                    <th className="px-4 py-3 text-left">{c.sections.headers.duration}</th>
                    <th className="px-4 py-3 text-left">{c.sections.headers.type}</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((row, i) => (
                    <tr key={row.name} className={i % 2 === 0 ? 'bg-zinc-950/40' : 'bg-zinc-900/20'}>
                      <td className="px-4 py-3 font-mono text-[12px] text-gold-300/90 align-top">{row.name}</td>
                      <td className="px-4 py-3 text-zinc-300 align-top">{row.purpose}</td>
                      <td className="px-4 py-3 text-zinc-400 align-top">{row.duration}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-700/40 text-emerald-300 bg-emerald-500/10">
                          {row.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Section title={c.sections.legal.title} body={c.sections.legal.body} />

          <div>
            <h2 className="text-xl font-light text-white mb-3 flex items-center gap-2">
              <Settings2 size={16} className="text-gold-400/80" />
              {c.sections.manage.title}
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-4">{c.sections.manage.body}</p>
            <div className="flex flex-wrap gap-2">
              {c.sections.manage.links.map((l) => (
                <a
                  key={l.name}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 hover:border-gold-500/60 hover:text-gold-300 transition-colors"
                  data-testid={`cookie-policy-browser-${l.name.toLowerCase()}`}
                >
                  {l.name}
                </a>
              ))}
            </div>
          </div>

          <Section title={c.sections.changes.title} body={c.sections.changes.body} />

          {/* Contact */}
          <div>
            <h2 className="text-xl font-light text-white mb-3 flex items-center gap-2">
              <Mail size={16} className="text-gold-400/80" />
              {c.sections.contact.title}
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-4">{c.sections.contact.body}</p>
            <div className="rounded-lg border border-gold-800/30 bg-gold-950/10 px-5 py-4 text-sm space-y-1">
              <div className="text-gold-400 font-medium">{c.sections.contact.dpo}</div>
              <a
                href={`mailto:${c.sections.contact.email}`}
                className="block text-white hover:text-gold-300 transition-colors"
                data-testid="cookie-policy-dpo-email"
              >
                {c.sections.contact.email}
              </a>
              <div className="text-zinc-500 text-xs">{c.sections.contact.address}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }) {
  return (
    <div>
      <h2 className="text-xl font-light text-white mb-3">{title}</h2>
      <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}
