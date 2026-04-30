import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, Database, FileText, Mail, Globe, UserCheck, Trash2, Clock, Send,
} from 'lucide-react';
import { useLanguage } from '../../i18n';

/**
 * KBEX Privacy Policy — minimalist, GDPR-aligned, 5 languages with RTL.
 * Designed to match the visual language of CookiePolicyPage.
 */

const COPY = {
  pt: {
    eyebrow: 'Política Legal',
    title: 'Política de Privacidade',
    subtitle: 'Como recolhemos, usamos e protegemos os seus dados pessoais. Em conformidade com o RGPD/GDPR (UE) e leis equivalentes nos Emirados Árabes Unidos.',
    backHome: 'Voltar ao Início',
    lastUpdate: 'Última atualização',
    sections: [
      { icon: FileText, title: '1. Quem somos', body: 'A KBEX.io é uma boutique de ativos digitais focada em clientes High-Net-Worth (HNW) e Ultra-High-Net-Worth (UHNW). Esta política explica como tratamos os dados pessoais dos nossos clientes, parceiros institucionais e visitantes do website.' },
      { icon: Database, title: '2. Dados que recolhemos', body: 'Recolhemos: (i) dados de identificação (nome, morada, número de identificação fiscal, documentos de identidade); (ii) dados financeiros (origem de fundos, transações, saldos); (iii) dados técnicos (endereço IP, tipo de dispositivo, navegador, logs de acesso); (iv) dados de comunicação (emails, chamadas gravadas para fins de qualidade quando explicitamente consentido).' },
      { icon: ShieldCheck, title: '3. Bases legais e finalidades', body: 'Tratamos dados com base em: (a) execução de contrato (operações de trading, custódia, OTC); (b) cumprimento de obrigações legais (KYC/AML, comunicação a autoridades fiscais e regulatórias); (c) interesse legítimo (segurança, prevenção de fraude); (d) consentimento (marketing, cookies não-essenciais).' },
      { icon: Clock, title: '4. Retenção', body: 'Mantemos dados pessoais pelo tempo necessário às finalidades indicadas e pelo prazo legal exigido — tipicamente 7 anos após o término da relação para registos KYC/AML, conforme legislação europeia e dos EAU.' },
      { icon: Globe, title: '5. Transferências internacionais', body: 'Os seus dados podem ser processados em servidores localizados na Suíça, União Europeia (Frankfurt) e Emirados Árabes Unidos (Dubai). Todas as transferências entre jurisdições obedecem a salvaguardas adequadas (Cláusulas Contratuais Padrão, decisões de adequação).' },
      { icon: UserCheck, title: '6. Os seus direitos', body: 'Tem direito a: aceder aos seus dados, retificar, apagar (direito ao esquecimento), limitar o tratamento, opor-se, e portabilidade. Pode também retirar o seu consentimento a qualquer momento (sem afetar a legalidade do tratamento prévio) e apresentar reclamação à autoridade de controlo competente.' },
      { icon: Trash2, title: '7. Segurança', body: 'Aplicamos medidas técnicas e organizacionais robustas: encriptação TLS 1.3 em trânsito, AES-256-GCM em repouso, acesso baseado em funções, monitorização SOC 24/7, testes de penetração trimestrais. Detalhes adicionais na nossa página de Segurança.' },
      { icon: Send, title: '8. Partilha com terceiros', body: 'Partilhamos dados apenas com prestadores essenciais ao serviço (processadores de pagamentos, fornecedores de KYC, auditores), todos vinculados por contratos de tratamento de dados (DPA). Nunca vendemos dados pessoais.' },
    ],
    contact: { title: '9. Contacto do DPO', body: 'Para exercer os seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados:', email: 'privacy@kbex.io', address: 'KBEX.io — Zurique, Suíça' },
  },
  en: {
    eyebrow: 'Legal Policy',
    title: 'Privacy Policy',
    subtitle: 'How we collect, use and protect your personal data. Aligned with GDPR (EU) and equivalent laws in the United Arab Emirates.',
    backHome: 'Back to Home',
    lastUpdate: 'Last updated',
    sections: [
      { icon: FileText, title: '1. Who we are', body: 'KBEX.io is a digital-asset boutique serving High-Net-Worth (HNW) and Ultra-High-Net-Worth (UHNW) clients. This policy explains how we handle the personal data of our clients, institutional partners and website visitors.' },
      { icon: Database, title: '2. Data we collect', body: 'We collect: (i) identification data (name, address, tax ID, identity documents); (ii) financial data (source of funds, transactions, balances); (iii) technical data (IP address, device type, browser, access logs); (iv) communication data (emails, recorded calls for quality purposes when explicitly consented).' },
      { icon: ShieldCheck, title: '3. Legal bases and purposes', body: 'We process data based on: (a) contract performance (trading, custody, OTC operations); (b) legal obligations (KYC/AML, reporting to tax and regulatory authorities); (c) legitimate interest (security, fraud prevention); (d) consent (marketing, non-essential cookies).' },
      { icon: Clock, title: '4. Retention', body: 'We keep personal data only for as long as needed and as legally required — typically 7 years after relationship termination for KYC/AML records, per EU and UAE legislation.' },
      { icon: Globe, title: '5. International transfers', body: 'Your data may be processed on servers in Switzerland, the European Union (Frankfurt) and United Arab Emirates (Dubai). Cross-border transfers rely on appropriate safeguards (Standard Contractual Clauses, adequacy decisions).' },
      { icon: UserCheck, title: '6. Your rights', body: 'You have the right to: access, rectify, erase (right to be forgotten), restrict processing, object, and data portability. You may also withdraw consent at any time (without affecting prior lawful processing) and lodge a complaint with the competent supervisory authority.' },
      { icon: Trash2, title: '7. Security', body: 'We apply robust technical and organisational measures: TLS 1.3 in transit, AES-256-GCM at rest, role-based access, 24/7 SOC monitoring, quarterly penetration testing. See our Security page for full details.' },
      { icon: Send, title: '8. Sharing with third parties', body: 'We only share data with essential service providers (payment processors, KYC providers, auditors), all bound by data-processing agreements (DPA). We never sell personal data.' },
    ],
    contact: { title: '9. DPO Contact', body: 'To exercise your rights or ask questions about how we process your data:', email: 'privacy@kbex.io', address: 'KBEX.io — Zurich, Switzerland' },
  },
  fr: {
    eyebrow: 'Politique Légale',
    title: 'Politique de Confidentialité',
    subtitle: 'Comment nous collectons, utilisons et protégeons vos données personnelles. Conforme au RGPD (UE) et aux lois équivalentes des Émirats Arabes Unis.',
    backHome: "Retour à l'accueil",
    lastUpdate: 'Dernière mise à jour',
    sections: [
      { icon: FileText, title: '1. Qui sommes-nous', body: 'KBEX.io est une boutique d\'actifs numériques au service de clients HNW et UHNW. Cette politique explique comment nous traitons les données personnelles de nos clients, partenaires institutionnels et visiteurs.' },
      { icon: Database, title: '2. Données collectées', body: 'Nous collectons : (i) données d\'identification ; (ii) données financières (origine des fonds, transactions, soldes) ; (iii) données techniques ; (iv) communications (emails, appels enregistrés avec consentement explicite).' },
      { icon: ShieldCheck, title: '3. Bases légales et finalités', body: 'Bases : (a) exécution du contrat ; (b) obligations légales (KYC/AML, autorités fiscales et réglementaires) ; (c) intérêt légitime (sécurité, prévention fraude) ; (d) consentement (marketing, cookies non essentiels).' },
      { icon: Clock, title: '4. Conservation', body: 'Données conservées uniquement le temps nécessaire et selon les exigences légales — typiquement 7 ans après la fin de la relation pour les registres KYC/AML.' },
      { icon: Globe, title: '5. Transferts internationaux', body: 'Données traitées en Suisse, UE (Francfort) et EAU (Dubaï). Transferts transfrontaliers protégés par CCT et décisions d\'adéquation.' },
      { icon: UserCheck, title: '6. Vos droits', body: 'Droit d\'accès, rectification, effacement, limitation, opposition, portabilité. Possibilité de retirer le consentement et de saisir l\'autorité de contrôle.' },
      { icon: Trash2, title: '7. Sécurité', body: 'Mesures techniques et organisationnelles : TLS 1.3, AES-256-GCM, accès par rôles, SOC 24/7, tests de pénétration trimestriels. Voir page Sécurité.' },
      { icon: Send, title: '8. Partage avec des tiers', body: 'Données partagées uniquement avec prestataires essentiels, tous liés par DPA. Nous ne vendons jamais de données personnelles.' },
    ],
    contact: { title: '9. Contact DPO', body: 'Pour exercer vos droits ou poser des questions :', email: 'privacy@kbex.io', address: 'KBEX.io — Zurich, Suisse' },
  },
  es: {
    eyebrow: 'Política Legal',
    title: 'Política de Privacidad',
    subtitle: 'Cómo recopilamos, usamos y protegemos sus datos personales. En cumplimiento con el RGPD (UE) y leyes equivalentes en los Emiratos Árabes Unidos.',
    backHome: 'Volver al inicio',
    lastUpdate: 'Última actualización',
    sections: [
      { icon: FileText, title: '1. Quiénes somos', body: 'KBEX.io es una boutique de activos digitales para clientes HNW y UHNW. Esta política explica cómo tratamos los datos personales de clientes, socios institucionales y visitantes.' },
      { icon: Database, title: '2. Datos que recopilamos', body: 'Recopilamos: (i) datos de identificación; (ii) datos financieros (origen de fondos, transacciones, saldos); (iii) datos técnicos; (iv) comunicaciones (emails, llamadas grabadas con consentimiento explícito).' },
      { icon: ShieldCheck, title: '3. Bases legales y finalidades', body: 'Bases: (a) ejecución de contrato; (b) obligaciones legales (KYC/AML, autoridades fiscales y regulatorias); (c) interés legítimo (seguridad, prevención de fraude); (d) consentimiento (marketing, cookies no esenciales).' },
      { icon: Clock, title: '4. Conservación', body: 'Conservamos datos solo el tiempo necesario y según exigencias legales — típicamente 7 años tras finalizar la relación para registros KYC/AML.' },
      { icon: Globe, title: '5. Transferencias internacionales', body: 'Datos procesados en Suiza, UE (Fráncfort) y EAU (Dubái). Transferencias transfronterizas con CCE y decisiones de adecuación.' },
      { icon: UserCheck, title: '6. Sus derechos', body: 'Derecho de acceso, rectificación, supresión, limitación, oposición y portabilidad. Puede retirar consentimiento y reclamar a la autoridad supervisora.' },
      { icon: Trash2, title: '7. Seguridad', body: 'Medidas técnicas y organizativas robustas: TLS 1.3, AES-256-GCM, acceso por roles, SOC 24/7, pruebas de penetración trimestrales.' },
      { icon: Send, title: '8. Compartir con terceros', body: 'Solo compartimos con proveedores esenciales, todos vinculados por DPA. Nunca vendemos datos personales.' },
    ],
    contact: { title: '9. Contacto DPO', body: 'Para ejercer sus derechos o consultas:', email: 'privacy@kbex.io', address: 'KBEX.io — Zúrich, Suiza' },
  },
  ar: {
    eyebrow: 'سياسة قانونية',
    title: 'سياسة الخصوصية',
    subtitle: 'كيف نجمع ونستخدم ونحمي بياناتك الشخصية. متوافق مع GDPR (الاتحاد الأوروبي) والقوانين المعادلة في الإمارات العربية المتحدة.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    lastUpdate: 'آخر تحديث',
    sections: [
      { icon: FileText, title: '1. من نحن', body: 'KBEX.io متجر متخصص في الأصول الرقمية يخدم العملاء من ذوي الثروات الكبيرة (HNW) وفائقة الكبيرة (UHNW).' },
      { icon: Database, title: '2. البيانات التي نجمعها', body: 'بيانات التعريف، البيانات المالية (مصدر الأموال، المعاملات، الأرصدة)، البيانات التقنية (IP، الجهاز، المتصفح)، الاتصالات (مع موافقة صريحة للمكالمات المسجلة).' },
      { icon: ShieldCheck, title: '3. الأسس القانونية والأغراض', body: 'تنفيذ العقد، الالتزامات القانونية (KYC/AML)، المصلحة المشروعة (الأمن، منع الاحتيال)، الموافقة (التسويق، ملفات تعريف الارتباط غير الأساسية).' },
      { icon: Clock, title: '4. الاحتفاظ', body: 'نحتفظ بالبيانات للمدة الضرورية والمطلوبة قانونيًا — عادةً 7 سنوات بعد انتهاء العلاقة لسجلات KYC/AML.' },
      { icon: Globe, title: '5. التحويلات الدولية', body: 'يتم المعالجة في سويسرا والاتحاد الأوروبي (فرانكفورت) والإمارات (دبي) مع ضمانات تعاقدية مناسبة.' },
      { icon: UserCheck, title: '6. حقوقك', body: 'حق الوصول، التصحيح، المحو، التقييد، الاعتراض، والنقل. يمكنك سحب الموافقة وتقديم شكوى للسلطة المختصة.' },
      { icon: Trash2, title: '7. الأمن', body: 'تشفير TLS 1.3 وAES-256-GCM، وصول حسب الأدوار، مراقبة SOC على مدار الساعة، اختبارات اختراق ربع سنوية.' },
      { icon: Send, title: '8. المشاركة مع الأطراف الثالثة', body: 'فقط مع مقدمي الخدمات الأساسيين بموجب اتفاقيات معالجة البيانات. لا نبيع البيانات الشخصية أبدًا.' },
    ],
    contact: { title: '9. اتصال مسؤول حماية البيانات', body: 'لممارسة حقوقك أو الاستفسار:', email: 'privacy@kbex.io', address: 'KBEX.io — زيورخ، سويسرا' },
  },
};

export default function PrivacyPolicyPage() {
  const { language, isRTL } = useLanguage();
  const langKey = (language || 'EN').toLowerCase();
  const c = COPY[langKey] || COPY.en;
  const lastUpdated = '2026-04-30';

  return (
    <div
      className={`min-h-screen bg-black text-zinc-200 ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="privacy-policy-page"
    >
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-gold-400 transition-colors text-sm mb-10" data-testid="privacy-back-home">
          <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} />
          {c.backHome}
        </Link>

        <div className="mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold-400/80 mb-3">
            <ShieldCheck size={14} />
            <span>{c.eyebrow}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight">{c.title}</h1>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">{c.subtitle}</p>
          <p className="text-[11px] text-zinc-600 mt-4 uppercase tracking-wider">
            {c.lastUpdate}: {lastUpdated}
          </p>
        </div>

        <div className="space-y-8">
          {c.sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i}>
                <h2 className="text-xl font-light text-white mb-3 flex items-center gap-2">
                  <Icon size={16} className="text-gold-400/80" />
                  {s.title}
                </h2>
                <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{s.body}</p>
              </div>
            );
          })}

          <div>
            <h2 className="text-xl font-light text-white mb-3 flex items-center gap-2">
              <Mail size={16} className="text-gold-400/80" />
              {c.contact.title}
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-4">{c.contact.body}</p>
            <div className="rounded-lg border border-gold-800/30 bg-gold-950/10 px-5 py-4 text-sm space-y-1">
              <a
                href={`mailto:${c.contact.email}`}
                className="block text-white hover:text-gold-300 transition-colors"
                data-testid="privacy-dpo-email"
              >
                {c.contact.email}
              </a>
              <div className="text-zinc-500 text-xs">{c.contact.address}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
