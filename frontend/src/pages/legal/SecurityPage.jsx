import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, Lock, KeyRound, FileCheck, AlertTriangle,
  ServerCog, UserCheck, Fingerprint, Database, Mail,
} from 'lucide-react';
import { useLanguage } from '../../i18n';

/**
 * KBEX Security — public informational page covering custody, operational
 * security, compliance certifications and responsible disclosure.
 */

const COPY = {
  pt: {
    eyebrow: 'Confiança & Proteção',
    title: 'Segurança',
    subtitle: 'A proteção dos ativos e dados dos nossos clientes está no centro de cada decisão técnica e operacional da KBEX.',
    backHome: 'Voltar ao Início',
    cta: { title: 'Reportar uma vulnerabilidade', body: 'Agradecemos a divulgação responsável. Por favor reporte qualquer vulnerabilidade de segurança diretamente à nossa equipa.', email: 'security@kbex.io' },
    pillars: [
      { icon: Database, title: 'Custódia Multi-Assinatura', body: 'Os ativos dos clientes são custodiados em carteiras multi-assinatura (2-de-3 e 3-de-5) de nível institucional. Transferências acima de limiares predefinidos requerem aprovação de múltiplos colaboradores e pausas temporais (time-locks) para mitigar erros humanos e ataques internos.' },
      { icon: Lock, title: 'Cold Storage 95/5', body: 'Pelo menos 95% dos ativos dos clientes são mantidos em cold storage offline com air-gap físico. Apenas 5% circulam em hot wallets operacionais, sujeitos a limites diários de retirada rigorosos e whitelisting de endereços.' },
      { icon: KeyRound, title: 'Gestão de Chaves HSM', body: 'As chaves criptográficas sensíveis são geradas e guardadas em Hardware Security Modules (HSM) certificados FIPS 140-2 Level 3, com rotação periódica, shamir secret sharing e procedimentos de recuperação geograficamente distribuídos entre cofres na Europa e Médio Oriente.' },
      { icon: UserCheck, title: 'Autenticação Forte', body: '2FA obrigatório (TOTP ou WebAuthn/FIDO2), bloqueio progressivo em tentativas falhadas, detecção de dispositivos desconhecidos e políticas de sessão segura com expiração automática e revogação remota.' },
      { icon: ShieldCheck, title: 'KYC / AML Institucional', body: 'Onboarding em camadas com verificação documental biométrica, análise de risco comportamental, screening contra listas de sanções (UN, EU, OFAC, HM Treasury) e rastreamento on-chain de origem de fundos em tempo real.' },
      { icon: ServerCog, title: 'Infraestrutura', body: 'Cloud hardened em regiões europeias (Zurique, Frankfurt) e do Médio Oriente (Dubai), isolamento por cliente (tenant), encriptação em trânsito (TLS 1.3) e em repouso (AES-256-GCM), e backups encriptados com rotação de 30 dias.' },
      { icon: Fingerprint, title: 'Auditoria Contínua', body: 'Logs imutáveis de todas as operações sensíveis, monitorização 24/7 por SOC dedicado, alertas anómalos em tempo real baseados em machine learning, e testes de penetração independentes trimestrais por empresas especializadas.' },
      { icon: FileCheck, title: 'Conformidade Regulatória', body: 'União Europeia: alinhamento com MiCA (Markets in Crypto-Assets), GDPR (proteção de dados), 6AMLD (anti-branqueamento). Emirados Árabes Unidos: conformidade com VARA (Dubai), SCA (federal) e políticas ADGM/DFSA para operações institucionais. Em processo de obtenção SOC 2 Type II e ISO 27001.' },
    ],
    disclosureTitle: 'Divulgação Responsável',
    disclosureBody: 'Se identificar uma vulnerabilidade de segurança, por favor não a divulgue publicamente antes de nos conceder tempo para corrigir. Comprometemo-nos a confirmar a receção em 48 horas, manter comunicação ativa e reconhecer publicamente (se desejar) os investigadores que contribuam para a segurança da plataforma.',
  },
  en: {
    eyebrow: 'Trust & Protection',
    title: 'Security',
    subtitle: 'Protecting our clients\' assets and data sits at the center of every technical and operational decision at KBEX.',
    backHome: 'Back to Home',
    cta: { title: 'Report a vulnerability', body: 'We appreciate responsible disclosure. Please report any security vulnerability directly to our team.', email: 'security@kbex.io' },
    pillars: [
      { icon: Database, title: 'Multi-Signature Custody', body: 'Client assets are custodied in institutional-grade multi-signature wallets (2-of-3 and 3-of-5). Withdrawals above predefined thresholds require multi-party approval and time-locks to mitigate human error and insider threats.' },
      { icon: Lock, title: '95/5 Cold Storage', body: 'At least 95% of client assets are held in offline cold storage with physical air-gap. Only 5% circulate in operational hot wallets under strict daily withdrawal limits and address whitelisting.' },
      { icon: KeyRound, title: 'HSM Key Management', body: 'Sensitive cryptographic keys are generated and stored in FIPS 140-2 Level 3 certified Hardware Security Modules, with periodic rotation, Shamir secret sharing and geographically-distributed recovery vaults across Europe and the Middle East.' },
      { icon: UserCheck, title: 'Strong Authentication', body: 'Mandatory 2FA (TOTP or WebAuthn/FIDO2), progressive lockout on failed attempts, unknown-device detection, and secure session policies with automatic expiration and remote revocation.' },
      { icon: ShieldCheck, title: 'Institutional KYC / AML', body: 'Layered onboarding with biometric document verification, behavioral risk scoring, sanctions screening (UN, EU, OFAC, HM Treasury) and real-time on-chain source-of-funds tracing.' },
      { icon: ServerCog, title: 'Infrastructure', body: 'Hardened cloud across European regions (Zurich, Frankfurt) and the Middle East (Dubai), per-client (tenant) isolation, in-transit (TLS 1.3) and at-rest (AES-256-GCM) encryption, 30-day rotating encrypted backups.' },
      { icon: Fingerprint, title: 'Continuous Audit', body: 'Immutable logs on all sensitive operations, 24/7 dedicated SOC monitoring, real-time ML-based anomaly alerts, and quarterly independent penetration tests by specialised firms.' },
      { icon: FileCheck, title: 'Regulatory Compliance', body: 'European Union: aligned with MiCA (Markets in Crypto-Assets), GDPR (data protection), 6AMLD (anti-money-laundering). United Arab Emirates: compliant with VARA (Dubai), SCA (federal) and ADGM/DFSA policies for institutional operations. Working toward SOC 2 Type II and ISO 27001.' },
    ],
    disclosureTitle: 'Responsible Disclosure',
    disclosureBody: 'If you identify a security vulnerability, please do not disclose it publicly before giving us time to fix it. We commit to acknowledging receipt within 48 hours, keeping you updated, and publicly crediting (if you wish) researchers who contribute to the platform\'s security.',
  },
  fr: {
    eyebrow: 'Confiance & Protection',
    title: 'Sécurité',
    subtitle: 'La protection des actifs et des données de nos clients est au cœur de chaque décision technique et opérationnelle de KBEX.',
    backHome: "Retour à l'accueil",
    cta: { title: 'Signaler une vulnérabilité', body: 'Nous apprécions la divulgation responsable. Merci de signaler toute vulnérabilité directement à notre équipe.', email: 'security@kbex.io' },
    pillars: [
      { icon: Database, title: 'Custody Multi-Signature', body: 'Les actifs des clients sont conservés dans des portefeuilles multi-signature de niveau institutionnel (2-sur-3 et 3-sur-5). Les retraits dépassant certains seuils nécessitent une approbation multi-partie et des time-locks.' },
      { icon: Lock, title: 'Cold Storage 95/5', body: 'Au moins 95% des actifs sont conservés en stockage froid hors ligne avec air-gap physique. Seuls 5% circulent en hot wallets avec limites journalières strictes et whitelisting d\'adresses.' },
      { icon: KeyRound, title: 'Gestion des clés HSM', body: 'Les clés cryptographiques sensibles sont stockées dans des HSM certifiés FIPS 140-2 Niveau 3, avec rotation périodique, Shamir secret sharing et coffres de récupération répartis entre l\'Europe et le Moyen-Orient.' },
      { icon: UserCheck, title: 'Authentification Forte', body: '2FA obligatoire (TOTP ou WebAuthn/FIDO2), verrouillage progressif, détection d\'appareils inconnus, sessions sécurisées avec expiration automatique et révocation à distance.' },
      { icon: ShieldCheck, title: 'KYC / AML Institutionnel', body: 'Onboarding multi-couches avec vérification biométrique, scoring comportemental, screening contre listes de sanctions (ONU, UE, OFAC, HM Treasury) et traçage on-chain de l\'origine des fonds.' },
      { icon: ServerCog, title: 'Infrastructure', body: 'Cloud durci en Europe (Zurich, Francfort) et Moyen-Orient (Dubaï), isolation par client, chiffrement TLS 1.3 et AES-256-GCM, backups chiffrés sur 30 jours.' },
      { icon: Fingerprint, title: 'Audit Continu', body: 'Journaux immuables, SOC dédié 24/7, alertes anomalies par ML, tests de pénétration indépendants trimestriels.' },
      { icon: FileCheck, title: 'Conformité Réglementaire', body: 'Union Européenne : MiCA, RGPD, 6AMLD. Émirats Arabes Unis : VARA (Dubaï), SCA (fédéral) et politiques ADGM/DFSA pour opérations institutionnelles. En cours : SOC 2 Type II et ISO 27001.' },
    ],
    disclosureTitle: 'Divulgation Responsable',
    disclosureBody: 'Si vous identifiez une vulnérabilité, veuillez ne pas la divulguer publiquement avant que nous ayons eu le temps de la corriger. Nous accusons réception sous 48 h et pouvons créditer publiquement les chercheurs.',
  },
  es: {
    eyebrow: 'Confianza & Protección',
    title: 'Seguridad',
    subtitle: 'La protección de los activos y datos de nuestros clientes está en el centro de cada decisión técnica y operativa de KBEX.',
    backHome: 'Volver al inicio',
    cta: { title: 'Reportar una vulnerabilidad', body: 'Agradecemos la divulgación responsable. Por favor, reporte cualquier vulnerabilidad directamente a nuestro equipo.', email: 'security@kbex.io' },
    pillars: [
      { icon: Database, title: 'Custodia Multi-Firma', body: 'Los activos se custodian en wallets multi-firma de nivel institucional (2-de-3 y 3-de-5). Retiros sobre umbrales definidos requieren aprobación multi-parte y time-locks.' },
      { icon: Lock, title: 'Cold Storage 95/5', body: 'Al menos el 95% de los activos se mantienen en almacenamiento en frío offline con air-gap físico. Solo el 5% circula en hot wallets con límites diarios y whitelisting de direcciones.' },
      { icon: KeyRound, title: 'Gestión de Claves HSM', body: 'Claves criptográficas en HSM certificados FIPS 140-2 Nivel 3, con rotación periódica, Shamir secret sharing y bóvedas de recuperación distribuidas entre Europa y Oriente Medio.' },
      { icon: UserCheck, title: 'Autenticación Fuerte', body: '2FA obligatorio (TOTP o WebAuthn/FIDO2), bloqueo progresivo, detección de dispositivos desconocidos y sesiones seguras con expiración automática y revocación remota.' },
      { icon: ShieldCheck, title: 'KYC / AML Institucional', body: 'Onboarding en capas con verificación biométrica, scoring de riesgo conductual, screening contra listas de sanciones (ONU, UE, OFAC, HM Treasury) y rastreo on-chain del origen de fondos.' },
      { icon: ServerCog, title: 'Infraestructura', body: 'Cloud endurecido en Europa (Zúrich, Fráncfort) y Oriente Medio (Dubái), aislamiento por cliente, cifrado TLS 1.3 y AES-256-GCM, backups cifrados con rotación de 30 días.' },
      { icon: Fingerprint, title: 'Auditoría Continua', body: 'Logs inmutables, SOC dedicado 24/7, alertas de anomalías por ML, pruebas de penetración independientes trimestrales.' },
      { icon: FileCheck, title: 'Cumplimiento Regulatorio', body: 'Unión Europea: MiCA, RGPD, 6AMLD. Emiratos Árabes Unidos: VARA (Dubái), SCA (federal) y políticas ADGM/DFSA para operaciones institucionales. En proceso: SOC 2 Type II e ISO 27001.' },
    ],
    disclosureTitle: 'Divulgación Responsable',
    disclosureBody: 'Si identifica una vulnerabilidad, por favor no la divulgue públicamente antes de darnos tiempo para corregirla. Acusamos recibo en 48 h y podemos reconocer públicamente a los investigadores.',
  },
  ar: {
    eyebrow: 'الثقة والحماية',
    title: 'الأمن',
    subtitle: 'حماية أصول وبيانات عملائنا في صميم كل قرار تقني وتشغيلي في KBEX.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    cta: { title: 'الإبلاغ عن ثغرة أمنية', body: 'نقدر الإفصاح المسؤول. يرجى إبلاغ فريقنا مباشرة عن أي ثغرة.', email: 'security@kbex.io' },
    pillars: [
      { icon: Database, title: 'حفظ متعدد التوقيعات', body: 'أصول العملاء محفوظة في محافظ متعددة التوقيعات من الدرجة المؤسسية (2 من 3 و3 من 5) مع موافقات متعددة الأطراف وقفل زمني للسحوبات الكبيرة.' },
      { icon: Lock, title: 'تخزين بارد 95/5', body: 'ما لا يقل عن 95٪ من الأصول محفوظة في تخزين بارد غير متصل مع فصل فيزيائي. 5٪ فقط تتداول في محافظ ساخنة بحدود يومية صارمة.' },
      { icon: KeyRound, title: 'إدارة مفاتيح HSM', body: 'المفاتيح في وحدات HSM معتمدة FIPS 140-2 Level 3 مع دوران دوري وتخزين موزع جغرافيًا بين أوروبا والشرق الأوسط.' },
      { icon: UserCheck, title: 'مصادقة قوية', body: 'المصادقة الثنائية إلزامية (TOTP أو WebAuthn/FIDO2) مع قفل تدريجي وكشف الأجهزة غير المعروفة.' },
      { icon: ShieldCheck, title: 'KYC/AML مؤسسي', body: 'تسجيل متعدد الطبقات مع التحقق البيومتري، تقييم السلوك، فحص قوائم العقوبات (الأمم المتحدة، الاتحاد الأوروبي، OFAC) وتتبع مصدر الأموال على السلسلة.' },
      { icon: ServerCog, title: 'البنية التحتية', body: 'سحابة معززة في أوروبا (زيورخ، فرانكفورت) والشرق الأوسط (دبي)، عزل لكل عميل، تشفير TLS 1.3 وAES-256-GCM، ونسخ احتياطية مشفرة بدوران 30 يومًا.' },
      { icon: Fingerprint, title: 'تدقيق مستمر', body: 'سجلات غير قابلة للتعديل، مركز عمليات أمنية (SOC) على مدار الساعة، اختبارات اختراق مستقلة ربع سنوية.' },
      { icon: FileCheck, title: 'الامتثال التنظيمي', body: 'الاتحاد الأوروبي: MiCA وGDPR و6AMLD. الإمارات العربية المتحدة: VARA (دبي)، SCA (الاتحادي) وسياسات ADGM/DFSA للعمليات المؤسسية. قيد الإنجاز: SOC 2 Type II وISO 27001.' },
    ],
    disclosureTitle: 'الإفصاح المسؤول',
    disclosureBody: 'إذا اكتشفت ثغرة أمنية، يرجى عدم الإفصاح عنها علنًا قبل منحنا الوقت لإصلاحها. نلتزم بالرد خلال 48 ساعة.',
  },
};

export default function SecurityPage() {
  const { language, isRTL } = useLanguage();
  const langKey = (language || 'EN').toLowerCase();
  const c = COPY[langKey] || COPY.en;

  return (
    <div className={`min-h-screen bg-black text-zinc-200 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid="security-page">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-gold-400 transition-colors text-sm mb-10" data-testid="security-back-home">
          <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} />
          {c.backHome}
        </Link>

        {/* Hero */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold-400/80 mb-3">
            <ShieldCheck size={14} />
            <span>{c.eyebrow}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight">{c.title}</h1>
          <p className="text-zinc-400 max-w-2xl leading-relaxed text-base">{c.subtitle}</p>
        </div>

        {/* Pillars grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-14">
          {c.pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 hover:border-gold-700/30 transition-colors"
                data-testid={`security-pillar-${idx}`}
              >
                <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 mb-4">
                  <Icon size={18} />
                </div>
                <h3 className="text-white text-base font-medium mb-2">{p.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{p.body}</p>
              </div>
            );
          })}
        </div>

        {/* Responsible disclosure */}
        <div className="rounded-2xl border border-amber-700/30 bg-amber-500/5 p-6 md:p-8 mb-8">
          <div className="flex items-start gap-4 mb-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-white text-lg font-light mb-2">{c.disclosureTitle}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">{c.disclosureBody}</p>
            </div>
          </div>
        </div>

        {/* Security email CTA */}
        <div className="rounded-2xl border border-gold-700/30 bg-gold-950/20 p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 mb-4">
            <Mail size={20} />
          </div>
          <h2 className="text-white text-xl font-light mb-2">{c.cta.title}</h2>
          <p className="text-zinc-400 text-sm mb-5 max-w-xl mx-auto">{c.cta.body}</p>
          <a
            href={`mailto:${c.cta.email}`}
            data-testid="security-email-link"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gold-500 hover:bg-gold-400 text-black text-sm font-medium transition-colors"
          >
            <Mail size={14} />
            {c.cta.email}
          </a>
        </div>
      </div>
    </div>
  );
}
