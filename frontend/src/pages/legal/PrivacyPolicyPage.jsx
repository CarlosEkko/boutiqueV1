import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, Mail } from 'lucide-react';
import { useLanguage } from '../../i18n';

/**
 * KBEX Privacy Policy — public static legal page.
 *
 * Covers GDPR (EU), UK GDPR, UAE PDPL, LGPD (Brasil) high-level obligations
 * applicable to an exchange/OTC desk serving HNW/UHNW clients. 3rd-party
 * vendor names are intentionally hidden from the public-facing copy per
 * the white-label doctrine — categories of processors are referenced instead.
 */
const CONTENT = {
  pt: {
    title: 'Política de Privacidade',
    subtitle: 'Última atualização: 30 de abril de 2026',
    lead: 'A sua privacidade é um pilar essencial da relação de confiança com a KBEX. Este documento descreve como tratamos os seus dados pessoais, os seus direitos e as nossas obrigações enquanto responsável pelo tratamento.',
    sections: [
      { icon: Eye, title: '1. Dados que recolhemos', body: [
        'Dados de identificação: nome, data de nascimento, nacionalidade, fotografia de documento oficial, selfie, assinatura.',
        'Dados de contacto: email, telemóvel, morada residencial, prova de morada.',
        'Dados financeiros: origem de fundos, rendimento anual declarado, IBAN, histórico de transações na KBEX.',
        'Dados técnicos: IP, fingerprint de dispositivo, cookies estritamente necessários, registos de autenticação.',
        'Para clientes Business: KYB (identificação da entidade), beneficiários efetivos (UBO), estrutura societária.'
      ]},
      { icon: FileText, title: '2. Finalidades e base legal', body: [
        'Cumprimento de obrigações legais (AML/CFT, FATCA/CRS, reporte a reguladores): base legal — cumprimento de obrigação legal (RGPD art. 6(1)(c)).',
        'Execução do contrato de serviço financeiro que solicitou (trading, custódia, OTC): art. 6(1)(b).',
        'Prevenção de fraude, segurança da plataforma, gestão de risco: interesse legítimo — art. 6(1)(f).',
        'Comunicações operacionais (extractos, alertas, manutenção): interesse legítimo.',
        'Marketing direto: apenas com o seu consentimento expresso, revogável a qualquer momento.'
      ]},
      { icon: Lock, title: '3. Partilha com terceiros', body: [
        'Processadores de serviços financeiros qualificados (custódia institucional, gateways de pagamento fiat/cripto, provedores de KYC/KYB, de inteligência de risco on-chain e de emails transacionais). Todos vinculados por DPA compatível com RGPD.',
        'Autoridades reguladoras e judiciais quando legalmente exigido (FIU, banco central, autoridade tributária, tribunais).',
        'Auditores externos e consultores jurídicos sob dever de confidencialidade.',
        'Nunca vendemos os seus dados a terceiros. Nunca partilhamos dados para fins de marketing de terceiros.'
      ]},
      { icon: ShieldCheck, title: '4. Transferências internacionais', body: [
        'Alguns dos nossos processadores estão sediados fora do EEE. Nestes casos utilizamos Cláusulas Contratuais Tipo aprovadas pela Comissão Europeia e, quando aplicável, avaliações de impacto de transferência (TIA).'
      ]},
      { icon: FileText, title: '5. Retenção de dados', body: [
        'Dados de KYC/KYB: 5 a 7 anos após o fim da relação comercial (conforme obrigações AML locais).',
        'Registos de transações: mínimo 5 anos (exigência regulatória UE e UAE).',
        'Dados de marketing: até revogação do consentimento ou 24 meses sem interação.',
        'Logs de segurança: até 12 meses.'
      ]},
      { icon: Eye, title: '6. Os seus direitos', body: [
        'Acesso, retificação, apagamento (nos limites legais de retenção obrigatória).',
        'Portabilidade dos dados que nos forneceu.',
        'Oposição ao tratamento baseado em interesse legítimo.',
        'Retirada de consentimento a qualquer momento (não afeta a licitude do tratamento prévio).',
        'Apresentação de queixa junto da autoridade de proteção de dados competente (ex.: CNPD em Portugal, AEPD em Espanha, CNIL em França).'
      ]},
      { icon: Lock, title: '7. Segurança', body: [
        'Cifra em trânsito (TLS 1.3) e em repouso (AES-256). Autenticação multifator obrigatória para operações sensíveis. Segregação de ambientes (produção/staging). Auditoria contínua e testes de intrusão periódicos.'
      ]},
      { icon: Mail, title: '8. Contacto do Data Protection Officer', body: [
        'Email: dpo@kbex.io. Resposta a pedidos de titulares de dados em até 30 dias (prorrogável por mais 60 dias em casos complexos, com notificação).'
      ]},
    ],
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'Last updated: April 30, 2026',
    lead: 'Your privacy is a core pillar of the trust relationship with KBEX. This document describes how we process your personal data, your rights and our obligations as data controller.',
    sections: [
      { icon: Eye, title: '1. Data we collect', body: [
        'Identification data: name, date of birth, nationality, official ID photo, selfie, signature.',
        'Contact data: email, mobile phone, home address, proof of address.',
        'Financial data: source of funds, declared annual income, IBAN, transaction history on KBEX.',
        'Technical data: IP, device fingerprint, strictly-necessary cookies, authentication logs.',
        'For Business clients: KYB (entity identification), ultimate beneficial owners (UBO), corporate structure.'
      ]},
      { icon: FileText, title: '2. Purposes and legal basis', body: [
        'Compliance with legal obligations (AML/CFT, FATCA/CRS, reporting to regulators): legal obligation (GDPR art. 6(1)(c)).',
        'Performance of the financial service contract you requested (trading, custody, OTC): art. 6(1)(b).',
        'Fraud prevention, platform security, risk management: legitimate interest — art. 6(1)(f).',
        'Operational communications (statements, alerts, maintenance): legitimate interest.',
        'Direct marketing: only with your explicit consent, revocable at any time.'
      ]},
      { icon: Lock, title: '3. Sharing with third parties', body: [
        'Qualified financial service processors (institutional custody, fiat/crypto payment gateways, KYC/KYB providers, on-chain risk intelligence and transactional email providers). All bound by a GDPR-compatible DPA.',
        'Regulatory and judicial authorities where legally required (FIU, central bank, tax authority, courts).',
        'External auditors and legal counsel under confidentiality duty.',
        'We never sell your data. We never share data for third-party marketing.'
      ]},
      { icon: ShieldCheck, title: '4. International transfers', body: [
        'Some of our processors are based outside the EEA. In those cases we use Standard Contractual Clauses approved by the European Commission and, where applicable, transfer impact assessments (TIA).'
      ]},
      { icon: FileText, title: '5. Data retention', body: [
        'KYC/KYB data: 5 to 7 years after end of business relationship (per local AML obligations).',
        'Transaction records: minimum 5 years (EU and UAE regulatory requirement).',
        'Marketing data: until consent revocation or 24 months without interaction.',
        'Security logs: up to 12 months.'
      ]},
      { icon: Eye, title: '6. Your rights', body: [
        'Access, rectification, erasure (within mandatory retention limits).',
        'Portability of the data you provided us.',
        'Objection to processing based on legitimate interest.',
        'Consent withdrawal at any time (does not affect lawfulness of prior processing).',
        'Lodge a complaint with your competent data protection authority (e.g. CNPD in Portugal, AEPD in Spain, CNIL in France, ICO in the UK).'
      ]},
      { icon: Lock, title: '7. Security', body: [
        'Encryption in transit (TLS 1.3) and at rest (AES-256). Mandatory MFA for sensitive operations. Environment segregation (production/staging). Continuous auditing and periodic penetration testing.'
      ]},
      { icon: Mail, title: '8. Data Protection Officer contact', body: [
        'Email: dpo@kbex.io. Response to data-subject requests within 30 days (extendable by 60 days for complex cases, with notification).'
      ]},
    ],
  },
  ar: {
    title: 'سياسة الخصوصية',
    subtitle: 'آخر تحديث: 30 أبريل 2026',
    lead: 'خصوصيتك ركيزة أساسية لعلاقة الثقة مع KBEX. توضح هذه الوثيقة كيفية معالجة بياناتك الشخصية وحقوقك والتزاماتنا كمراقب بيانات.',
    sections: [
      { icon: Eye, title: '1. البيانات التي نجمعها', body: [
        'بيانات التعريف: الاسم، تاريخ الميلاد، الجنسية، صورة وثيقة رسمية، صورة سيلفي، التوقيع.',
        'بيانات الاتصال: البريد الإلكتروني، الهاتف، العنوان، إثبات العنوان.',
        'البيانات المالية: مصدر الأموال، الدخل السنوي المصرح به، IBAN، سجل المعاملات على KBEX.',
        'البيانات التقنية: IP، بصمة الجهاز، ملفات تعريف الارتباط الضرورية، سجلات المصادقة.',
        'لعملاء الأعمال: KYB، المالكون المستفيدون النهائيون، الهيكل الشركاتي.'
      ]},
      { icon: FileText, title: '2. الأغراض والأساس القانوني', body: [
        'الامتثال للالتزامات القانونية (AML/CFT، FATCA/CRS، الإبلاغ للجهات التنظيمية).',
        'تنفيذ عقد الخدمة المالية الذي طلبته (التداول، الحفظ، OTC).',
        'منع الاحتيال، أمن المنصة، إدارة المخاطر.',
        'الاتصالات التشغيلية.',
        'التسويق المباشر: فقط بموافقتك الصريحة القابلة للإلغاء في أي وقت.'
      ]},
      { icon: Lock, title: '3. المشاركة مع أطراف ثالثة', body: [
        'معالجون ماليون مؤهلون (الحفظ المؤسسي، بوابات الدفع، موفرو KYC، الذكاء في المخاطر، رسائل البريد الإلكتروني المعاملاتية).',
        'السلطات التنظيمية والقضائية عند طلب قانوني.',
        'المدققون الخارجيون والمستشارون القانونيون.',
        'لا نبيع بياناتك أبدًا. لا نشاركها للتسويق الخاص بأطراف ثالثة.'
      ]},
      { icon: ShieldCheck, title: '4. التحويلات الدولية', body: [
        'بعض معالجينا خارج المنطقة الاقتصادية الأوروبية. نستخدم الشروط التعاقدية القياسية وتقييمات أثر النقل عند اللزوم.'
      ]},
      { icon: FileText, title: '5. الاحتفاظ بالبيانات', body: [
        'بيانات KYC/KYB: من 5 إلى 7 سنوات بعد انتهاء العلاقة التجارية.',
        'سجلات المعاملات: 5 سنوات على الأقل.',
        'بيانات التسويق: حتى سحب الموافقة أو 24 شهرًا بدون تفاعل.',
        'سجلات الأمان: حتى 12 شهرًا.'
      ]},
      { icon: Eye, title: '6. حقوقك', body: [
        'الوصول، التصحيح، الحذف (ضمن حدود الاحتفاظ الإلزامي).',
        'قابلية النقل للبيانات التي قدمتها.',
        'الاعتراض على المعالجة القائمة على المصلحة المشروعة.',
        'سحب الموافقة في أي وقت.',
        'تقديم شكوى لسلطة حماية البيانات المختصة.'
      ]},
      { icon: Lock, title: '7. الأمان', body: [
        'تشفير أثناء النقل (TLS 1.3) وعند التخزين (AES-256). المصادقة الثنائية إلزامية للعمليات الحساسة. التدقيق المستمر والاختبارات الدورية.'
      ]},
      { icon: Mail, title: '8. جهة اتصال مسؤول حماية البيانات', body: [
        'البريد الإلكتروني: dpo@kbex.io. نرد على طلبات أصحاب البيانات خلال 30 يومًا.'
      ]},
    ],
  },
  fr: {
    title: 'Politique de Confidentialité',
    subtitle: 'Dernière mise à jour : 30 avril 2026',
    lead: 'Votre vie privée est un pilier essentiel de la relation de confiance avec KBEX. Ce document décrit comment nous traitons vos données personnelles, vos droits et nos obligations en tant que responsable du traitement.',
    sections: [
      { icon: Eye, title: '1. Données que nous collectons', body: [
        "Données d'identification : nom, date de naissance, nationalité, photo de pièce officielle, selfie, signature.",
        'Données de contact : email, téléphone, adresse, justificatif de domicile.',
        "Données financières : source des fonds, revenu annuel déclaré, IBAN, historique des transactions sur KBEX.",
        "Données techniques : IP, empreinte d'appareil, cookies strictement nécessaires, logs d'authentification.",
        'Pour les clients Business : KYB, bénéficiaires effectifs (UBO), structure corporative.'
      ]},
      { icon: FileText, title: '2. Finalités et base légale', body: [
        "Respect des obligations légales (AML/CFT, FATCA/CRS, reporting aux régulateurs).",
        'Exécution du contrat de service financier que vous avez demandé.',
        'Prévention de la fraude, sécurité de la plateforme, gestion des risques.',
        'Communications opérationnelles.',
        'Marketing direct : uniquement avec votre consentement explicite, révocable à tout moment.'
      ]},
      { icon: Lock, title: '3. Partage avec des tiers', body: [
        "Processeurs financiers qualifiés (custody institutionnelle, passerelles de paiement, fournisseurs KYC, intelligence on-chain, emails transactionnels).",
        'Autorités réglementaires et judiciaires lorsque légalement requis.',
        'Auditeurs externes et conseils juridiques.',
        'Nous ne vendons jamais vos données. Nous ne les partageons jamais pour le marketing tiers.'
      ]},
      { icon: ShieldCheck, title: '4. Transferts internationaux', body: [
        "Certains processeurs sont hors EEE. Nous utilisons les Clauses Contractuelles Types et, le cas échéant, des évaluations d'impact de transfert."
      ]},
      { icon: FileText, title: '5. Conservation', body: [
        "Données KYC/KYB : 5 à 7 ans après la fin de la relation.",
        "Transactions : minimum 5 ans.",
        "Marketing : jusqu'à révocation ou 24 mois sans interaction.",
        'Logs sécurité : jusqu\'à 12 mois.'
      ]},
      { icon: Eye, title: '6. Vos droits', body: [
        'Accès, rectification, effacement (dans les limites de conservation obligatoire).',
        'Portabilité des données fournies.',
        "Opposition au traitement fondé sur l'intérêt légitime.",
        'Retrait du consentement à tout moment.',
        "Plainte auprès de l'autorité compétente (CNIL en France, CNPD au Portugal, etc.)."
      ]},
      { icon: Lock, title: '7. Sécurité', body: [
        "Chiffrement en transit (TLS 1.3) et au repos (AES-256). MFA obligatoire. Ségrégation d'environnements. Audit continu et tests d'intrusion."
      ]},
      { icon: Mail, title: '8. Contact DPO', body: [
        'Email : dpo@kbex.io. Réponse sous 30 jours (prorogeable de 60 jours pour les cas complexes).'
      ]},
    ],
  },
  es: {
    title: 'Política de Privacidad',
    subtitle: 'Última actualización: 30 de abril de 2026',
    lead: 'Su privacidad es un pilar esencial de la relación de confianza con KBEX. Este documento describe cómo tratamos sus datos personales, sus derechos y nuestras obligaciones como responsable del tratamiento.',
    sections: [
      { icon: Eye, title: '1. Datos que recopilamos', body: [
        'Datos de identificación: nombre, fecha de nacimiento, nacionalidad, foto de documento oficial, selfie, firma.',
        'Datos de contacto: email, teléfono, dirección, prueba de domicilio.',
        'Datos financieros: origen de fondos, ingresos anuales declarados, IBAN, historial de transacciones en KBEX.',
        'Datos técnicos: IP, fingerprint del dispositivo, cookies estrictamente necesarias, logs de autenticación.',
        'Para clientes Business: KYB, beneficiarios efectivos (UBO), estructura societaria.'
      ]},
      { icon: FileText, title: '2. Finalidades y base legal', body: [
        'Cumplimiento de obligaciones legales (AML/CFT, FATCA/CRS, reporte a reguladores).',
        'Ejecución del contrato de servicio financiero solicitado.',
        'Prevención de fraude, seguridad de la plataforma, gestión de riesgo.',
        'Comunicaciones operativas.',
        'Marketing directo: solo con consentimiento explícito, revocable en cualquier momento.'
      ]},
      { icon: Lock, title: '3. Compartición con terceros', body: [
        'Procesadores financieros cualificados (custodia institucional, pasarelas de pago, KYC, inteligencia on-chain, email transaccional).',
        'Autoridades regulatorias y judiciales cuando sea legalmente requerido.',
        'Auditores externos y asesores legales.',
        'Nunca vendemos sus datos. Nunca los compartimos para marketing de terceros.'
      ]},
      { icon: ShieldCheck, title: '4. Transferencias internacionales', body: [
        'Algunos procesadores están fuera del EEE. Usamos Cláusulas Contractuales Tipo aprobadas y evaluaciones de impacto de transferencia cuando procede.'
      ]},
      { icon: FileText, title: '5. Retención', body: [
        'KYC/KYB: 5 a 7 años tras el fin de la relación.',
        'Transacciones: mínimo 5 años.',
        'Marketing: hasta revocación o 24 meses sin interacción.',
        'Logs de seguridad: hasta 12 meses.'
      ]},
      { icon: Eye, title: '6. Sus derechos', body: [
        'Acceso, rectificación, supresión (dentro de límites obligatorios).',
        'Portabilidad de datos facilitados.',
        'Oposición al tratamiento basado en interés legítimo.',
        'Retirada de consentimiento en cualquier momento.',
        'Reclamación ante la autoridad competente (AEPD en España, CNPD en Portugal, CNIL en Francia).'
      ]},
      { icon: Lock, title: '7. Seguridad', body: [
        'Cifrado en tránsito (TLS 1.3) y en reposo (AES-256). MFA obligatorio. Segregación de entornos. Auditoría continua y tests de intrusión.'
      ]},
      { icon: Mail, title: '8. Contacto DPO', body: [
        'Email: dpo@kbex.io. Respuesta en 30 días (ampliables 60 días en casos complejos).'
      ]},
    ],
  },
};

export default function PrivacyPolicyPage() {
  const { language, isRTL } = useLanguage();
  const c = CONTENT[language] || CONTENT.en;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-black text-gray-200">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 text-sm mb-10 transition-colors"
          data-testid="privacy-back-link"
        >
          <ArrowLeft size={16} className={isRTL ? 'rotate-180' : ''} />
          KBEX.io
        </Link>

        <header className="mb-12 border-b border-gold-800/20 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-gold-400" size={28} />
            <h1 className="text-3xl md:text-4xl font-light tracking-tight bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent">
              {c.title}
            </h1>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">{c.subtitle}</p>
          <p className="text-gray-300 mt-6 leading-relaxed">{c.lead}</p>
        </header>

        <div className="space-y-10">
          {c.sections.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.title} data-testid={`privacy-section-${s.title.split('.')[0]}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="text-gold-400" size={18} />
                  <h2 className="text-lg text-white font-medium">{s.title}</h2>
                </div>
                <ul className="space-y-2 text-gray-400 text-sm leading-relaxed ml-6 list-disc">
                  {s.body.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-gold-800/20 flex items-center justify-between">
          <Link to="/legal/terms" className="text-sm text-gold-400 hover:text-gold-300 transition-colors">
            {language === 'pt' ? 'Termos e Condições →' :
             language === 'fr' ? 'Conditions Générales →' :
             language === 'es' ? 'Términos y Condiciones →' :
             language === 'ar' ? '← الشروط والأحكام' :
             'Terms & Conditions →'}
          </Link>
          <Link to="/legal/cookies" className="text-sm text-gray-400 hover:text-gold-400 transition-colors">
            {language === 'pt' ? 'Política de Cookies' :
             language === 'fr' ? 'Politique de Cookies' :
             language === 'es' ? 'Política de Cookies' :
             language === 'ar' ? 'سياسة ملفات تعريف الارتباط' :
             'Cookie Policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}
