import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Scale, Coins, AlertTriangle, Ban, Mail, Gavel, UserCheck, KeyRound,
} from 'lucide-react';
import { useLanguage } from '../../i18n';

/**
 * KBEX Terms & Conditions — minimalist legal page in 5 languages with RTL.
 * Governing law: Switzerland. Mirrors the visual language of the other
 * legal pages.
 */

const COPY = {
  pt: {
    eyebrow: 'Termos & Condições',
    title: 'Termos de Utilização',
    subtitle: 'Acordo entre o utilizador e a KBEX.io que rege o acesso e utilização da plataforma boutique de ativos digitais.',
    backHome: 'Voltar ao Início',
    lastUpdate: 'Última atualização',
    acceptanceNotice: 'Ao aceder ou utilizar a plataforma KBEX.io, o utilizador declara ter lido, compreendido e aceite os presentes Termos & Condições na sua totalidade. Caso não concorde com qualquer disposição, deverá abster-se de utilizar os nossos serviços.',
    sections: [
      { icon: FileText, title: '1. Objeto e âmbito', body: 'Estes Termos regem o acesso e utilização da plataforma KBEX.io ("Plataforma"), que oferece serviços de exchange, OTC desk, custódia, escrow, staking, launchpad e outros serviços relacionados com ativos digitais. A Plataforma é destinada a clientes High-Net-Worth (HNW) e Ultra-High-Net-Worth (UHNW), individuais e institucionais.' },
      { icon: UserCheck, title: '2. Elegibilidade e Conta', body: 'O utilizador deverá: (i) ter no mínimo 18 anos; (ii) ter capacidade legal plena; (iii) não ser residente de jurisdições restritas; (iv) completar com sucesso o processo de KYC/KYB e due diligence. A KBEX reserva-se o direito de recusar, suspender ou encerrar contas a seu exclusivo critério.' },
      { icon: Coins, title: '3. Serviços e Tarifário', body: 'Os serviços disponibilizados, taxas, spreads e limites encontram-se descritos no Tarifário Unificado, podendo ser atualizados periodicamente. As alterações entram em vigor após publicação e comunicação ao utilizador. O preço final aplicado a cada operação depende do tier do cliente, do produto e do ativo, conforme cascata definida internamente.' },
      { icon: KeyRound, title: '4. Custódia e Riscos', body: 'A KBEX disponibiliza serviços de custódia de nível institucional (multi-assinatura, cold storage, HSM). Apesar das medidas implementadas, o utilizador reconhece que ativos digitais comportam riscos significativos, incluindo volatilidade extrema, riscos tecnológicos, regulatórios e de mercado. A KBEX não garante rentabilidade.' },
      { icon: Scale, title: '5. Conformidade e KYC/AML', body: 'O utilizador compromete-se a fornecer informação verdadeira, completa e atualizada para efeitos de KYC/KYB e due diligence contínua. A KBEX cumpre com as obrigações de prevenção do branqueamento de capitais (6AMLD na UE, regulamentações VARA/SCA nos EAU) e poderá comunicar operações suspeitas às autoridades competentes.' },
      { icon: Ban, title: '6. Atividades proibidas', body: 'É expressamente proibido: (i) usar a Plataforma para atividades ilegais, fraude ou branqueamento; (ii) tentar contornar limites, controlos de segurança ou restrições geográficas; (iii) partilhar credenciais de acesso; (iv) automatizar operações sem autorização escrita prévia; (v) qualquer comportamento que viole legislação aplicável.' },
      { icon: AlertTriangle, title: '7. Limitação de responsabilidade', body: 'A KBEX não é responsável por: perdas decorrentes de flutuações de mercado, falhas em redes blockchain de terceiros, atrasos imputáveis a terceiros, ações ou omissões do utilizador, eventos de força maior. A responsabilidade total da KBEX em qualquer caso fica limitada ao valor das taxas pagas pelo utilizador nos 12 meses anteriores ao evento.' },
      { icon: Gavel, title: '8. Lei aplicável e foro', body: 'Os presentes Termos regem-se pela lei suíça. Qualquer litígio será dirimido pelos tribunais competentes do cantão de Zurique, Suíça, com renúncia expressa a qualquer outro foro. Para clientes residentes nos EAU, será adicionalmente aplicável a jurisdição do ADGM ou DFSA conforme o tipo de operação.' },
    ],
    contact: { title: '9. Contacto', body: 'Para questões legais, suporte ou esclarecimentos:', email: 'legal@kbex.io', address: 'KBEX.io — Zurique, Suíça' },
  },
  en: {
    eyebrow: 'Terms & Conditions',
    title: 'Terms of Use',
    subtitle: 'Agreement between the user and KBEX.io governing access and use of the boutique digital-asset platform.',
    backHome: 'Back to Home',
    lastUpdate: 'Last updated',
    acceptanceNotice: 'By accessing or using the KBEX.io platform, the user acknowledges having read, understood and accepted these Terms & Conditions in full. If you do not agree with any provision, you must refrain from using our services.',
    sections: [
      { icon: FileText, title: '1. Scope', body: 'These Terms govern access to and use of the KBEX.io platform offering exchange, OTC desk, custody, escrow, staking, launchpad and related digital-asset services. The platform is intended for HNW and UHNW clients (individuals and institutions).' },
      { icon: UserCheck, title: '2. Eligibility & Account', body: 'Users must: (i) be at least 18 years old; (ii) have full legal capacity; (iii) not be a resident of restricted jurisdictions; (iv) successfully complete KYC/KYB and due diligence. KBEX reserves the right to refuse, suspend or terminate accounts at its sole discretion.' },
      { icon: Coins, title: '3. Services & Pricing', body: 'Services offered, fees, spreads and limits are set out in the Unified Pricing Schedule and may be updated periodically. Changes take effect upon publication and notice to the user. The final price applied to each operation depends on the client tier, product and asset under our internal cascade rules.' },
      { icon: KeyRound, title: '4. Custody & Risk', body: 'KBEX provides institutional-grade custody (multi-signature, cold storage, HSM). The user acknowledges that digital assets carry significant risks including extreme volatility, technological, regulatory and market risks. KBEX does not guarantee any return.' },
      { icon: Scale, title: '5. Compliance & KYC/AML', body: 'The user undertakes to provide truthful, complete and up-to-date information for KYC/KYB and ongoing due diligence. KBEX complies with anti-money-laundering obligations (6AMLD in the EU, VARA/SCA regulations in the UAE) and may report suspicious activity to competent authorities.' },
      { icon: Ban, title: '6. Prohibited activities', body: 'Strictly prohibited: (i) using the platform for illegal activities, fraud or money laundering; (ii) attempting to bypass limits, security controls or geographic restrictions; (iii) sharing credentials; (iv) automating operations without prior written authorisation; (v) any behaviour breaching applicable law.' },
      { icon: AlertTriangle, title: '7. Limitation of liability', body: 'KBEX is not liable for: losses from market fluctuations, third-party blockchain failures, third-party delays, user actions or omissions, force majeure events. Total liability is in any case capped at the value of fees paid by the user in the 12 months preceding the event.' },
      { icon: Gavel, title: '8. Governing law & forum', body: 'These Terms are governed by Swiss law. Any dispute shall be settled by the competent courts of Zurich, Switzerland, with express waiver of any other forum. For UAE-resident clients, ADGM or DFSA jurisdiction may additionally apply depending on the operation.' },
    ],
    contact: { title: '9. Contact', body: 'For legal matters, support or clarifications:', email: 'legal@kbex.io', address: 'KBEX.io — Zurich, Switzerland' },
  },
  fr: {
    eyebrow: 'Conditions Générales',
    title: "Conditions d'Utilisation",
    subtitle: "Accord entre l'utilisateur et KBEX.io régissant l'accès et l'utilisation de la plateforme boutique d'actifs numériques.",
    backHome: "Retour à l'accueil",
    lastUpdate: 'Dernière mise à jour',
    acceptanceNotice: "En accédant à la plateforme KBEX.io, l'utilisateur déclare avoir lu, compris et accepté les présentes Conditions Générales dans leur totalité.",
    sections: [
      { icon: FileText, title: '1. Objet', body: 'Ces Conditions régissent l\'accès et l\'utilisation de la plateforme KBEX.io (exchange, OTC desk, custody, escrow, staking, launchpad). Destinée aux clients HNW et UHNW, individuels et institutionnels.' },
      { icon: UserCheck, title: '2. Éligibilité & Compte', body: 'L\'utilisateur doit : (i) avoir 18 ans minimum ; (ii) capacité légale ; (iii) ne pas résider dans des juridictions restreintes ; (iv) compléter KYC/KYB. KBEX se réserve le droit de refuser, suspendre ou clôturer les comptes.' },
      { icon: Coins, title: '3. Services & Tarification', body: 'Services, frais, spreads et limites figurent dans la Grille Tarifaire Unifiée. Les modifications prennent effet après publication et notification.' },
      { icon: KeyRound, title: '4. Custody & Risques', body: 'Custody institutionnelle (multi-sig, cold storage, HSM). L\'utilisateur reconnaît que les actifs numériques comportent des risques significatifs. KBEX ne garantit aucune rentabilité.' },
      { icon: Scale, title: '5. Conformité & KYC/AML', body: 'L\'utilisateur s\'engage à fournir des informations véridiques. KBEX respecte 6AMLD (UE) et les régulations VARA/SCA (EAU).' },
      { icon: Ban, title: '6. Activités interdites', body: 'Interdit : activités illégales, fraude, contournement des limites, partage d\'identifiants, automatisation non autorisée.' },
      { icon: AlertTriangle, title: '7. Limitation de responsabilité', body: 'KBEX n\'est pas responsable des fluctuations de marché, défaillances tierces, force majeure. Responsabilité plafonnée aux frais des 12 mois précédents.' },
      { icon: Gavel, title: '8. Loi applicable & juridiction', body: 'Loi suisse. Tribunaux de Zurich. Pour résidents EAU, juridiction ADGM/DFSA selon l\'opération.' },
    ],
    contact: { title: '9. Contact', body: 'Questions juridiques :', email: 'legal@kbex.io', address: 'KBEX.io — Zurich, Suisse' },
  },
  es: {
    eyebrow: 'Términos y Condiciones',
    title: 'Términos de Uso',
    subtitle: 'Acuerdo entre el usuario y KBEX.io que rige el acceso y uso de la plataforma boutique de activos digitales.',
    backHome: 'Volver al inicio',
    lastUpdate: 'Última actualización',
    acceptanceNotice: 'Al acceder o utilizar la plataforma KBEX.io, el usuario declara haber leído, comprendido y aceptado estos Términos y Condiciones en su totalidad.',
    sections: [
      { icon: FileText, title: '1. Objeto', body: 'Estos Términos rigen el acceso y uso de la plataforma KBEX.io (exchange, OTC, custodia, escrow, staking, launchpad). Destinada a clientes HNW y UHNW.' },
      { icon: UserCheck, title: '2. Elegibilidad & Cuenta', body: 'El usuario debe: (i) tener al menos 18 años; (ii) capacidad legal; (iii) no residir en jurisdicciones restringidas; (iv) completar KYC/KYB.' },
      { icon: Coins, title: '3. Servicios & Tarifas', body: 'Servicios, tarifas, spreads y límites en el Tarifario Unificado. Cambios en vigor tras publicación y notificación.' },
      { icon: KeyRound, title: '4. Custodia & Riesgos', body: 'Custodia institucional (multi-firma, cold storage, HSM). El usuario reconoce que los activos digitales conllevan riesgos significativos.' },
      { icon: Scale, title: '5. Cumplimiento & KYC/AML', body: 'El usuario se compromete a proporcionar información veraz. KBEX cumple con 6AMLD (UE) y regulaciones VARA/SCA (EAU).' },
      { icon: Ban, title: '6. Actividades prohibidas', body: 'Prohibido: actividades ilegales, fraude, eludir límites, compartir credenciales, automatización no autorizada.' },
      { icon: AlertTriangle, title: '7. Limitación de responsabilidad', body: 'KBEX no es responsable por fluctuaciones del mercado, fallos de terceros, fuerza mayor. Responsabilidad limitada a tarifas de los 12 meses previos.' },
      { icon: Gavel, title: '8. Ley aplicable & jurisdicción', body: 'Ley suiza. Tribunales de Zúrich. Para residentes EAU, jurisdicción ADGM/DFSA según la operación.' },
    ],
    contact: { title: '9. Contacto', body: 'Asuntos legales:', email: 'legal@kbex.io', address: 'KBEX.io — Zúrich, Suiza' },
  },
  ar: {
    eyebrow: 'الشروط والأحكام',
    title: 'شروط الاستخدام',
    subtitle: 'اتفاقية بين المستخدم وKBEX.io تحكم الوصول إلى منصة الأصول الرقمية البوتيك واستخدامها.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    lastUpdate: 'آخر تحديث',
    acceptanceNotice: 'بالوصول إلى منصة KBEX.io أو استخدامها، يقر المستخدم بأنه قرأ وفهم وقبل هذه الشروط والأحكام بالكامل.',
    sections: [
      { icon: FileText, title: '1. النطاق', body: 'تحكم هذه الشروط الوصول إلى منصة KBEX.io (تبادل، OTC، حفظ، escrow، staking، launchpad). موجهة لعملاء HNW وUHNW.' },
      { icon: UserCheck, title: '2. الأهلية والحساب', body: 'يجب على المستخدم أن: (1) يبلغ 18 عامًا؛ (2) أهلية قانونية كاملة؛ (3) ألا يقيم في ولايات قضائية مقيدة؛ (4) يكمل KYC/KYB.' },
      { icon: Coins, title: '3. الخدمات والرسوم', body: 'الخدمات والرسوم والفروقات والحدود في جدول الأسعار الموحد. التغييرات سارية بعد النشر والإخطار.' },
      { icon: KeyRound, title: '4. الحفظ والمخاطر', body: 'حفظ مؤسسي (متعدد التوقيعات، تخزين بارد، HSM). يقر المستخدم بأن الأصول الرقمية تنطوي على مخاطر كبيرة.' },
      { icon: Scale, title: '5. الامتثال وKYC/AML', body: 'يلتزم المستخدم بتقديم معلومات صحيحة. KBEX تلتزم بـ 6AMLD (الاتحاد الأوروبي) وVARA/SCA (الإمارات).' },
      { icon: Ban, title: '6. الأنشطة المحظورة', body: 'محظور: الأنشطة غير القانونية، الاحتيال، التحايل على الحدود، مشاركة بيانات الاعتماد، الأتمتة غير المصرح بها.' },
      { icon: AlertTriangle, title: '7. تحديد المسؤولية', body: 'KBEX ليست مسؤولة عن تقلبات السوق وإخفاقات الأطراف الثالثة والقوة القاهرة. المسؤولية محدودة برسوم آخر 12 شهرًا.' },
      { icon: Gavel, title: '8. القانون والاختصاص', body: 'القانون السويسري. محاكم زيورخ. لمقيمي الإمارات، اختصاص ADGM/DFSA حسب العملية.' },
    ],
    contact: { title: '9. الاتصال', body: 'للأمور القانونية:', email: 'legal@kbex.io', address: 'KBEX.io — زيورخ، سويسرا' },
  },
};

export default function TermsConditionsPage() {
  const { language, isRTL } = useLanguage();
  const langKey = (language || 'EN').toLowerCase();
  const c = COPY[langKey] || COPY.en;
  const lastUpdated = '2026-04-30';

  return (
    <div
      className={`min-h-screen bg-black text-zinc-200 ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="terms-conditions-page"
    >
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-gold-400 transition-colors text-sm mb-10" data-testid="terms-back-home">
          <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} />
          {c.backHome}
        </Link>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold-400/80 mb-3">
            <Scale size={14} />
            <span>{c.eyebrow}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight">{c.title}</h1>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">{c.subtitle}</p>
          <p className="text-[11px] text-zinc-600 mt-4 uppercase tracking-wider">
            {c.lastUpdate}: {lastUpdated}
          </p>
        </div>

        {/* Acceptance notice */}
        <div className="rounded-xl border border-amber-700/30 bg-amber-500/5 px-5 py-4 mb-12">
          <p className="text-amber-100/90 text-sm leading-relaxed">
            <AlertTriangle size={14} className="inline -mt-0.5 mr-1.5 text-amber-400" />
            {c.acceptanceNotice}
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
                data-testid="terms-legal-email"
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
