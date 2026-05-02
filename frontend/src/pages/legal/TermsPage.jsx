import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, AlertTriangle, Gavel, FileText, Ban, Globe } from 'lucide-react';
import { useLanguage } from '../../i18n';

/**
 * KBEX Terms & Conditions — public static legal page.
 *
 * Governs the contractual relationship between KBEX and its clients
 * (Personal + Business). Addresses: service description, eligibility,
 * account opening, risk warnings, prohibited uses, fees, dispute resolution.
 * Jurisdiction: UAE / Switzerland (dual-track per tenant config).
 */
const CONTENT = {
  pt: {
    title: 'Termos e Condições',
    subtitle: 'Última atualização: 30 de abril de 2026',
    lead: 'Estes Termos e Condições regem o acesso e uso da plataforma KBEX ("Plataforma") e dos serviços financeiros por ela prestados. Ao criar uma conta ou utilizar os serviços, o Cliente confirma que leu, compreendeu e aceita integralmente estes Termos.',
    sections: [
      { icon: FileText, title: '1. Descrição dos Serviços', body: [
        'A KBEX disponibiliza: (a) execução de ordens de compra e venda de ativos digitais (Exchange); (b) Mesa OTC para blocos; (c) custódia institucional de ativos digitais em cold e warm wallets segregadas; (d) carteiras fiat em EUR, USD, AED, CHF, entre outras; (e) programas de staking, launchpad e serviços de tokenização.'
      ]},
      { icon: Gavel, title: '2. Elegibilidade', body: [
        'O Cliente deve ter idade igual ou superior a 18 anos e capacidade legal para contratar na sua jurisdição.',
        'A KBEX não presta serviços a residentes de países sujeitos a sanções internacionais ou incluídos em listas AML de alto risco.',
        'Pessoas politicamente expostas (PEPs) são submetidas a diligência reforçada.'
      ]},
      { icon: FileText, title: '3. Abertura de Conta (KYC/KYB)', body: [
        'A abertura de conta está sujeita a verificação KYC (pessoa singular) ou KYB (empresa) realizada por provedores qualificados.',
        'O Cliente obriga-se a fornecer informação verdadeira, completa e atualizada.',
        'A KBEX reserva-se o direito de recusar ou encerrar contas em caso de suspeita de fraude, falsificação documental ou violação destes Termos.'
      ]},
      { icon: AlertTriangle, title: '4. Aviso de Risco', body: [
        'Os ativos digitais são instrumentos de elevada volatilidade. O valor pode variar significativamente em curtos períodos e o Cliente pode perder parte ou a totalidade do capital investido.',
        'A KBEX não presta aconselhamento de investimento. Toda a decisão é da responsabilidade exclusiva do Cliente.',
        'Transações on-chain são irreversíveis. O Cliente é responsável pela exatidão do endereço de destino em levantamentos.',
        'Risco tecnológico: falhas de rede, ataques, manutenção agendada ou eventos de força maior podem impedir temporariamente o acesso à Plataforma.'
      ]},
      { icon: Ban, title: '5. Utilizações Proibidas', body: [
        'Branqueamento de capitais, financiamento do terrorismo, evasão fiscal.',
        'Manipulação de mercado, wash trading, spoofing, insider trading.',
        'Uso de bots não autorizados ou engenharia reversa da Plataforma.',
        'Criação de múltiplas contas para contornar limites de tier.',
        'Qualquer atividade ilícita sob a legislação aplicável.'
      ]},
      { icon: FileText, title: '6. Comissões e Limites', body: [
        'As comissões aplicáveis estão publicadas no ecrã de Trading e no Tier do Cliente. A KBEX pode atualizar a tabela com aviso prévio de 30 dias.',
        'Levantamentos estão sujeitos a limites por tier e podem requerer aprovação manual da equipa de compliance.',
        'Serviços OTC exigem valor mínimo e são cotados individualmente.'
      ]},
      { icon: Gavel, title: '7. Suspensão e Encerramento', body: [
        'A KBEX pode suspender ou encerrar a conta com efeito imediato em caso de: (a) suspeita de fraude; (b) violação destes Termos; (c) ordem de autoridade competente; (d) risco reputacional ou regulatório.',
        'O Cliente pode encerrar a sua conta a qualquer momento, liquidando posições abertas e procedendo a levantamento dos fundos.'
      ]},
      { icon: Scale, title: '8. Limitação de Responsabilidade', body: [
        'A KBEX não responde por perdas indiretas, lucros cessantes ou danos consequenciais.',
        'A responsabilidade máxima agregada está limitada ao montante das comissões pagas pelo Cliente nos 12 meses anteriores ao evento.',
        'Esta limitação não exclui responsabilidade por dolo, negligência grosseira ou obrigações que não possam ser legalmente excluídas.'
      ]},
      { icon: Globe, title: '9. Lei Aplicável e Jurisdição', body: [
        'Para Clientes contratantes da entidade KBEX nos Emirados Árabes Unidos: aplica-se a lei do UAE, com foro no Tribunal DIFC/ADGM conforme a entidade contratante.',
        'Para Clientes contratantes da entidade suíça: aplica-se o direito suíço, foro em Zurique.',
        'Antes de recorrer a tribunal, as Partes obrigam-se a uma tentativa de negociação amigável e mediação durante 60 dias.'
      ]},
      { icon: FileText, title: '10. Modificações', body: [
        'A KBEX pode alterar estes Termos mediante notificação por email com antecedência mínima de 30 dias. A continuação do uso dos serviços após a entrada em vigor constitui aceitação das novas condições.'
      ]},
    ],
  },
  en: {
    title: 'Terms and Conditions',
    subtitle: 'Last updated: April 30, 2026',
    lead: 'These Terms and Conditions govern the access and use of the KBEX platform ("Platform") and the financial services provided on it. By opening an account or using the services, the Client confirms having read, understood and fully accepted these Terms.',
    sections: [
      { icon: FileText, title: '1. Description of Services', body: [
        'KBEX provides: (a) execution of buy and sell orders for digital assets (Exchange); (b) OTC Desk for block trades; (c) institutional custody of digital assets in segregated cold and warm wallets; (d) fiat wallets in EUR, USD, AED, CHF and others; (e) staking, launchpad and tokenization services.'
      ]},
      { icon: Gavel, title: '2. Eligibility', body: [
        'The Client must be at least 18 years old with full legal capacity in their jurisdiction.',
        'KBEX does not provide services to residents of countries subject to international sanctions or included in high-risk AML lists.',
        'Politically Exposed Persons (PEPs) are subject to enhanced due diligence.'
      ]},
      { icon: FileText, title: '3. Account Opening (KYC/KYB)', body: [
        'Account opening is subject to KYC (natural person) or KYB (entity) verification by qualified providers.',
        'The Client agrees to provide truthful, complete and up-to-date information.',
        'KBEX reserves the right to refuse or close accounts in case of suspected fraud, document forgery or breach of these Terms.'
      ]},
      { icon: AlertTriangle, title: '4. Risk Warning', body: [
        'Digital assets are highly volatile instruments. Their value may fluctuate significantly over short periods and the Client may lose part or all of the invested capital.',
        'KBEX does not provide investment advice. All decisions are the sole responsibility of the Client.',
        'On-chain transactions are irreversible. The Client is responsible for the accuracy of the destination address on withdrawals.',
        'Technological risk: network failures, attacks, scheduled maintenance or force-majeure events may temporarily prevent access to the Platform.'
      ]},
      { icon: Ban, title: '5. Prohibited Uses', body: [
        'Money laundering, terrorism financing, tax evasion.',
        'Market manipulation, wash trading, spoofing, insider trading.',
        'Use of unauthorized bots or reverse engineering of the Platform.',
        'Creation of multiple accounts to bypass tier limits.',
        'Any activity unlawful under applicable legislation.'
      ]},
      { icon: FileText, title: '6. Fees and Limits', body: [
        'Applicable fees are published on the Trading screen and on the Client Tier page. KBEX may update the schedule with 30 days prior notice.',
        'Withdrawals are subject to tier limits and may require manual approval by the compliance team.',
        'OTC services require a minimum size and are priced individually.'
      ]},
      { icon: Gavel, title: '7. Suspension and Termination', body: [
        'KBEX may suspend or terminate the account with immediate effect in case of: (a) suspected fraud; (b) breach of these Terms; (c) order from a competent authority; (d) reputational or regulatory risk.',
        'The Client may close the account at any time by liquidating open positions and withdrawing funds.'
      ]},
      { icon: Scale, title: '8. Limitation of Liability', body: [
        'KBEX is not liable for indirect losses, lost profits or consequential damages.',
        'Maximum aggregate liability is limited to the amount of fees paid by the Client in the 12 months preceding the event.',
        'This limitation does not exclude liability for wilful misconduct, gross negligence or obligations that cannot be excluded by law.'
      ]},
      { icon: Globe, title: '9. Governing Law and Jurisdiction', body: [
        'For Clients contracting with the KBEX UAE entity: UAE law applies, with DIFC / ADGM Courts venue as per the contracting entity.',
        'For Clients contracting with the Swiss entity: Swiss law applies, venue in Zurich.',
        'Before resorting to court, the Parties agree to attempt amicable negotiation and mediation for 60 days.'
      ]},
      { icon: FileText, title: '10. Amendments', body: [
        'KBEX may amend these Terms by email notification with at least 30 days notice. Continued use of the services after the effective date constitutes acceptance of the new terms.'
      ]},
    ],
  },
  ar: {
    title: 'الشروط والأحكام',
    subtitle: 'آخر تحديث: 30 أبريل 2026',
    lead: 'تحكم هذه الشروط والأحكام الوصول إلى منصة KBEX واستخدامها والخدمات المالية المقدمة. بإنشاء حساب أو استخدام الخدمات، يؤكد العميل قراءته وفهمه وقبوله الكامل لهذه الشروط.',
    sections: [
      { icon: FileText, title: '1. وصف الخدمات', body: [
        'تقدم KBEX: (أ) تنفيذ أوامر البيع والشراء للأصول الرقمية؛ (ب) مكتب OTC للصفقات الكبيرة؛ (ج) الحفظ المؤسسي للأصول الرقمية؛ (د) محافظ نقدية بالعملات المختلفة؛ (هـ) خدمات Staking و Launchpad والترميز.'
      ]},
      { icon: Gavel, title: '2. الأهلية', body: [
        'يجب أن يكون العميل بالغًا 18 عامًا على الأقل وذو أهلية قانونية كاملة.',
        'لا تقدم KBEX خدمات لسكان الدول الخاضعة للعقوبات الدولية أو قوائم AML عالية المخاطر.',
        'الأشخاص المعرضون سياسيًا (PEPs) يخضعون لعناية واجبة معززة.'
      ]},
      { icon: FileText, title: '3. فتح الحساب (KYC/KYB)', body: [
        'يخضع فتح الحساب للتحقق KYC/KYB من قبل مزودين مؤهلين.',
        'يلتزم العميل بتقديم معلومات صحيحة وكاملة ومحدثة.',
        'تحتفظ KBEX بحق رفض أو إغلاق الحسابات في حالة الاشتباه في الاحتيال أو انتهاك الشروط.'
      ]},
      { icon: AlertTriangle, title: '4. تحذير المخاطر', body: [
        'الأصول الرقمية شديدة التقلب. قد يخسر العميل جزءًا من رأس المال أو كله.',
        'لا تقدم KBEX نصائح استثمارية. جميع القرارات مسؤولية العميل.',
        'معاملات on-chain لا رجعة فيها. العميل مسؤول عن دقة عنوان الوجهة.',
        'مخاطر تقنية: قد تمنع الأعطال أو الصيانة الوصول مؤقتًا.'
      ]},
      { icon: Ban, title: '5. الاستخدامات المحظورة', body: [
        'غسل الأموال وتمويل الإرهاب والتهرب الضريبي.',
        'التلاعب بالسوق والتداول الوهمي.',
        'استخدام الروبوتات غير المصرح بها أو الهندسة العكسية.',
        'إنشاء حسابات متعددة لتجاوز حدود المستوى.',
        'أي نشاط غير قانوني.'
      ]},
      { icon: FileText, title: '6. الرسوم والحدود', body: [
        'الرسوم منشورة في شاشة التداول وصفحة المستوى. قد تحدث KBEX الجدول بإشعار 30 يومًا.',
        'تخضع السحوبات لحدود المستوى وقد تتطلب موافقة يدوية.',
        'خدمات OTC تتطلب حدًا أدنى وتسعيرًا فرديًا.'
      ]},
      { icon: Gavel, title: '7. التعليق والإنهاء', body: [
        'يجوز لـ KBEX تعليق أو إنهاء الحساب فورًا في حالات الاحتيال أو انتهاك الشروط أو أمر السلطات.',
        'يمكن للعميل إغلاق حسابه في أي وقت بتصفية المراكز وسحب الأموال.'
      ]},
      { icon: Scale, title: '8. تحديد المسؤولية', body: [
        'لا تتحمل KBEX الخسائر غير المباشرة أو الأرباح الضائعة أو الأضرار التبعية.',
        'الحد الأقصى الإجمالي للمسؤولية هو الرسوم المدفوعة في آخر 12 شهرًا.',
        'لا يستثني هذا التحديد المسؤولية عن سوء السلوك المتعمد أو الإهمال الجسيم.'
      ]},
      { icon: Globe, title: '9. القانون الحاكم والاختصاص', body: [
        'لعملاء الإمارات: يطبق قانون UAE، اختصاص محاكم DIFC/ADGM.',
        'لعملاء الكيان السويسري: يطبق القانون السويسري، اختصاص زيورخ.',
        'قبل اللجوء للمحكمة، تتفق الأطراف على محاولة التفاوض والوساطة لمدة 60 يومًا.'
      ]},
      { icon: FileText, title: '10. التعديلات', body: [
        'يجوز لـ KBEX تعديل هذه الشروط بإشعار بريد إلكتروني قبل 30 يومًا على الأقل. الاستمرار في الاستخدام يعتبر قبولًا للشروط الجديدة.'
      ]},
    ],
  },
  fr: {
    title: 'Conditions Générales',
    subtitle: 'Dernière mise à jour : 30 avril 2026',
    lead: 'Les présentes Conditions Générales régissent l\'accès et l\'utilisation de la plateforme KBEX (« Plateforme ») et des services financiers qui y sont fournis. En ouvrant un compte ou en utilisant les services, le Client confirme avoir lu, compris et intégralement accepté ces Conditions.',
    sections: [
      { icon: FileText, title: '1. Description des Services', body: [
        "KBEX fournit : (a) exécution d'ordres d'achat et de vente d'actifs numériques ; (b) Desk OTC pour blocs ; (c) custody institutionnelle en wallets cold et warm ségrégués ; (d) portefeuilles fiat en EUR, USD, AED, CHF ; (e) staking, launchpad et services de tokenisation."
      ]},
      { icon: Gavel, title: '2. Éligibilité', body: [
        'Le Client doit avoir au moins 18 ans et la capacité juridique dans sa juridiction.',
        'KBEX ne fournit pas de services aux résidents de pays sous sanctions internationales ou listes AML à haut risque.',
        'Les Personnes Politiquement Exposées (PEP) font l\'objet d\'une diligence renforcée.'
      ]},
      { icon: FileText, title: '3. Ouverture de Compte (KYC/KYB)', body: [
        "L'ouverture de compte est soumise à vérification KYC/KYB par des prestataires qualifiés.",
        'Le Client s\'engage à fournir des informations véridiques, complètes et à jour.',
        'KBEX se réserve le droit de refuser ou de clôturer des comptes en cas de fraude ou violation.'
      ]},
      { icon: AlertTriangle, title: '4. Avertissement sur les Risques', body: [
        'Les actifs numériques sont des instruments très volatils. Le Client peut perdre tout ou partie du capital.',
        'KBEX ne fournit pas de conseil en investissement. Toute décision relève du Client.',
        'Les transactions on-chain sont irréversibles. Le Client est responsable de l\'exactitude de l\'adresse de destination.',
        'Risque technologique : pannes, attaques ou maintenance peuvent empêcher temporairement l\'accès.'
      ]},
      { icon: Ban, title: '5. Usages Interdits', body: [
        'Blanchiment, financement du terrorisme, fraude fiscale.',
        'Manipulation de marché, wash trading, spoofing, insider trading.',
        'Bots non autorisés, ingénierie inverse de la Plateforme.',
        'Comptes multiples pour contourner les limites de tier.',
        'Toute activité illégale.'
      ]},
      { icon: FileText, title: '6. Frais et Limites', body: [
        "Les frais sont publiés sur l'écran Trading et la page Tier. KBEX peut modifier la grille avec préavis de 30 jours.",
        'Les retraits sont soumis aux limites de tier et peuvent nécessiter une approbation manuelle.',
        'Les services OTC exigent un montant minimum et sont cotés individuellement.'
      ]},
      { icon: Gavel, title: '7. Suspension et Résiliation', body: [
        'KBEX peut suspendre ou clôturer le compte avec effet immédiat en cas de fraude, violation ou ordre d\'autorité compétente.',
        'Le Client peut clôturer son compte à tout moment.'
      ]},
      { icon: Scale, title: '8. Limitation de Responsabilité', body: [
        'KBEX n\'est pas responsable des pertes indirectes, manques à gagner ou dommages consécutifs.',
        'Responsabilité maximale limitée aux frais payés par le Client dans les 12 mois précédents.',
        'Cette limitation n\'exclut pas la responsabilité pour faute intentionnelle ou négligence grave.'
      ]},
      { icon: Globe, title: '9. Droit Applicable et Juridiction', body: [
        'Pour les Clients contractant avec l\'entité UAE : droit UAE, juridiction Tribunaux DIFC/ADGM.',
        'Pour les Clients contractant avec l\'entité suisse : droit suisse, juridiction Zurich.',
        'Avant tout recours judiciaire, les Parties tenteront une négociation amiable et médiation pendant 60 jours.'
      ]},
      { icon: FileText, title: '10. Modifications', body: [
        'KBEX peut modifier ces Conditions par notification email avec préavis minimum de 30 jours. L\'usage continué vaut acceptation.'
      ]},
    ],
  },
  es: {
    title: 'Términos y Condiciones',
    subtitle: 'Última actualización: 30 de abril de 2026',
    lead: 'Estos Términos y Condiciones rigen el acceso y uso de la plataforma KBEX ("Plataforma") y los servicios financieros prestados. Al abrir una cuenta o usar los servicios, el Cliente confirma haber leído, comprendido y aceptado íntegramente estos Términos.',
    sections: [
      { icon: FileText, title: '1. Descripción de los Servicios', body: [
        'KBEX ofrece: (a) ejecución de órdenes de compra y venta de activos digitales; (b) Mesa OTC para bloques; (c) custodia institucional en carteras cold y warm segregadas; (d) carteras fiat en EUR, USD, AED, CHF; (e) staking, launchpad y tokenización.'
      ]},
      { icon: Gavel, title: '2. Elegibilidad', body: [
        'El Cliente debe tener al menos 18 años y capacidad legal en su jurisdicción.',
        'KBEX no presta servicios a residentes de países sujetos a sanciones o listas AML de alto riesgo.',
        'Las Personas Políticamente Expuestas (PEP) están sujetas a diligencia reforzada.'
      ]},
      { icon: FileText, title: '3. Apertura de Cuenta (KYC/KYB)', body: [
        'La apertura de cuenta está sujeta a verificación KYC/KYB por proveedores cualificados.',
        'El Cliente debe facilitar información veraz, completa y actualizada.',
        'KBEX se reserva el derecho de rechazar o cerrar cuentas en caso de fraude o incumplimiento.'
      ]},
      { icon: AlertTriangle, title: '4. Aviso de Riesgo', body: [
        'Los activos digitales son altamente volátiles. El Cliente puede perder parte o todo el capital.',
        'KBEX no presta asesoramiento de inversión.',
        'Las transacciones on-chain son irreversibles.',
        'Riesgo tecnológico: fallos, ataques o mantenimiento pueden impedir temporalmente el acceso.'
      ]},
      { icon: Ban, title: '5. Usos Prohibidos', body: [
        'Blanqueo de capitales, financiación del terrorismo, evasión fiscal.',
        'Manipulación de mercado, wash trading, spoofing, insider trading.',
        'Bots no autorizados o ingeniería inversa de la Plataforma.',
        'Múltiples cuentas para eludir límites de tier.',
        'Cualquier actividad ilícita.'
      ]},
      { icon: FileText, title: '6. Comisiones y Límites', body: [
        'Las comisiones aplicables están publicadas en la pantalla de Trading y en el Tier. KBEX puede actualizar la tabla con 30 días de preaviso.',
        'Los retiros están sujetos a límites por tier y pueden requerir aprobación manual.',
        'Los servicios OTC requieren mínimo y se cotizan individualmente.'
      ]},
      { icon: Gavel, title: '7. Suspensión y Terminación', body: [
        'KBEX puede suspender o terminar la cuenta con efecto inmediato en casos de fraude, incumplimiento u orden de autoridad.',
        'El Cliente puede cerrar su cuenta en cualquier momento liquidando posiciones y retirando fondos.'
      ]},
      { icon: Scale, title: '8. Limitación de Responsabilidad', body: [
        'KBEX no responde por pérdidas indirectas, lucro cesante o daños consecuenciales.',
        'Responsabilidad máxima limitada al monto de comisiones pagadas en los 12 meses anteriores.',
        'Esta limitación no excluye responsabilidad por dolo o negligencia grave.'
      ]},
      { icon: Globe, title: '9. Ley Aplicable y Jurisdicción', body: [
        'Para Clientes que contratan con la entidad KBEX UAE: aplica ley UAE, jurisdicción Tribunales DIFC/ADGM.',
        'Para Clientes que contratan con la entidad suiza: aplica derecho suizo, jurisdicción Zúrich.',
        'Antes de recurrir a tribunales, las Partes intentarán negociación amistosa y mediación durante 60 días.'
      ]},
      { icon: FileText, title: '10. Modificaciones', body: [
        'KBEX puede modificar estos Términos mediante notificación email con al menos 30 días de antelación. El uso continuado implica aceptación.'
      ]},
    ],
  },
};

export default function TermsPage() {
  const { language, isRTL } = useLanguage();
  const c = CONTENT[language] || CONTENT.en;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-black text-gray-200">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 text-sm mb-10 transition-colors"
          data-testid="terms-back-link"
        >
          <ArrowLeft size={16} className={isRTL ? 'rotate-180' : ''} />
          KBEX.io
        </Link>

        <header className="mb-12 border-b border-gold-800/20 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="text-gold-400" size={28} />
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
              <section key={s.title} data-testid={`terms-section-${s.title.split('.')[0]}`}>
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
          <Link to="/legal/privacy" className="text-sm text-gold-400 hover:text-gold-300 transition-colors">
            {language === 'pt' ? '← Política de Privacidade' :
             language === 'fr' ? '← Politique de Confidentialité' :
             language === 'es' ? '← Política de Privacidad' :
             language === 'ar' ? 'سياسة الخصوصية →' :
             '← Privacy Policy'}
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
