import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { formatNumber, getErrorMessage, formatDate} from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { 
  Briefcase,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ArrowRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Send,
  AlertTriangle,
  Zap,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientOTCPortal = () => {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [clientData, setClientData] = useState(null);

  const tx = {
    title: { pt: 'OTC Trading', en: 'OTC Trading', ar: 'تداول OTC', fr: 'Trading OTC', es: 'Trading OTC' },
    subtitle: { pt: 'Operações de grande volume com atendimento personalizado', en: 'Large volume operations with personalized service', ar: 'عمليات كبيرة الحجم مع خدمة مخصصة', fr: 'Opérations à grand volume avec service personnalisé', es: 'Operaciones de gran volumen con servicio personalizado' },
    welcome: { pt: 'Bem-vindo', en: 'Welcome', ar: 'مرحبا', fr: 'Bienvenue', es: 'Bienvenido' },
    welcomeOtc: { pt: 'Bem-vindo ao OTC Desk', en: 'Welcome to OTC Desk', ar: 'مرحبا بك في مكتب OTC', fr: 'Bienvenue au OTC Desk', es: 'Bienvenido al OTC Desk' },
    otcDescription: { pt: 'O nosso serviço OTC é destinado a operações de grande volume (mínimo $50,000). Se pretende negociar volumes significativos com atendimento personalizado, contacte-nos para se tornar um cliente OTC.', en: 'Our OTC service is for large volume operations (minimum $50,000). If you wish to trade significant volumes with personalized service, contact us to become an OTC client.', ar: 'خدمة OTC لدينا مخصصة لعمليات الحجم الكبير. اتصل بنا لتصبح عميل OTC.', fr: 'Notre service OTC est destiné aux opérations de grand volume (minimum 50 000$). Contactez-nous pour devenir client OTC.', es: 'Nuestro servicio OTC es para operaciones de gran volumen (mínimo $50,000). Contáctenos para convertirse en cliente OTC.' },
    contactOtc: { pt: 'Contactar OTC Desk', en: 'Contact OTC Desk', ar: 'اتصل بمكتب OTC', fr: 'Contacter OTC Desk', es: 'Contactar OTC Desk' },
    refresh: { pt: 'Atualizar', en: 'Refresh', ar: 'تحديث', fr: 'Actualiser', es: 'Actualizar' },
    newRfq: { pt: 'Novo Pedido de Cotação', en: 'New Quote Request', ar: 'طلب عرض أسعار جديد', fr: 'Nouvelle demande de cotation', es: 'Nueva solicitud de cotización' },
    activeDeals: { pt: 'Deals Ativos', en: 'Active Deals', ar: 'صفقات نشطة', fr: 'Deals actifs', es: 'Deals activos' },
    pendingQuotes: { pt: 'Cotações Pendentes', en: 'Pending Quotes', ar: 'عروض أسعار معلقة', fr: 'Cotations en attente', es: 'Cotizaciones pendientes' },
    completed: { pt: 'Concluídos', en: 'Completed', ar: 'مكتمل', fr: 'Terminés', es: 'Completados' },
    dailyLimit: { pt: 'Limite Diário', en: 'Daily Limit', ar: 'الحد اليومي', fr: 'Limite journalière', es: 'Límite diario' },
    hasPending: { pt: 'cotação(ões) pendente(s)', en: 'pending quote(s)', ar: 'عرض أسعار معلق', fr: 'cotation(s) en attente', es: 'cotización(es) pendiente(s)' },
    checkQuotes: { pt: 'Verifique as cotações e aceite ou rejeite antes que expirem.', en: 'Review quotes and accept or reject before they expire.', ar: 'راجع العروض قبل انتهاء صلاحيتها.', fr: 'Vérifiez et acceptez ou refusez avant expiration.', es: 'Revise y acepte o rechace antes de que expiren.' },
    viewQuotes: { pt: 'Ver Cotações', en: 'View Quotes', ar: 'عرض الأسعار', fr: 'Voir cotations', es: 'Ver cotizaciones' },
    myDeals: { pt: 'Meus Deals', en: 'My Deals', ar: 'صفقاتي', fr: 'Mes deals', es: 'Mis deals' },
    quotes: { pt: 'Cotações', en: 'Quotes', ar: 'عروض الأسعار', fr: 'Cotations', es: 'Cotizaciones' },
    history: { pt: 'Histórico', en: 'History', ar: 'التاريخ', fr: 'Historique', es: 'Historial' },
    pending: { pt: 'pendentes', en: 'pending', ar: 'معلق', fr: 'en attente', es: 'pendientes' },
    deal: { pt: 'Deal', en: 'Deal', ar: 'صفقة', fr: 'Deal', es: 'Deal' },
    operation: { pt: 'Operação', en: 'Operation', ar: 'عملية', fr: 'Opération', es: 'Operación' },
    quantity: { pt: 'Quantidade', en: 'Quantity', ar: 'الكمية', fr: 'Quantité', es: 'Cantidad' },
    value: { pt: 'Valor', en: 'Value', ar: 'القيمة', fr: 'Valeur', es: 'Valor' },
    phase: { pt: 'Fase', en: 'Phase', ar: 'مرحلة', fr: 'Phase', es: 'Fase' },
    date: { pt: 'Data', en: 'Date', ar: 'تاريخ', fr: 'Date', es: 'Fecha' },
    pair: { pt: 'Par', en: 'Pair', ar: 'زوج', fr: 'Paire', es: 'Par' },
    price: { pt: 'Preço', en: 'Price', ar: 'سعر', fr: 'Prix', es: 'Precio' },
    total: { pt: 'Total', en: 'Total', ar: 'المجموع', fr: 'Total', es: 'Total' },
    expires: { pt: 'Expira', en: 'Expires', ar: 'ينتهي', fr: 'Expire', es: 'Expira' },
    status: { pt: 'Status', en: 'Status', ar: 'الحالة', fr: 'Statut', es: 'Estado' },
    actions: { pt: 'Ações', en: 'Actions', ar: 'إجراءات', fr: 'Actions', es: 'Acciones' },
    accept: { pt: 'Aceitar', en: 'Accept', ar: 'قبول', fr: 'Accepter', es: 'Aceptar' },
    noActiveDeals: { pt: 'Sem Deals Ativos', en: 'No Active Deals', ar: 'لا صفقات نشطة', fr: 'Aucun deal actif', es: 'Sin deals activos' },
    createRfq: { pt: 'Crie um pedido de cotação para começar.', en: 'Create a quote request to get started.', ar: 'أنشئ طلب عرض أسعار للبدء.', fr: 'Créez une demande de cotation.', es: 'Cree una solicitud de cotización.' },
    noQuotes: { pt: 'Sem Cotações', en: 'No Quotes', ar: 'لا عروض أسعار', fr: 'Aucune cotation', es: 'Sin cotizaciones' },
    quotesAppear: { pt: 'Cotações recebidas aparecerão aqui.', en: 'Received quotes will appear here.', ar: 'ستظهر عروض الأسعار هنا.', fr: 'Les cotations apparaîtront ici.', es: 'Las cotizaciones aparecerán aquí.' },
    noHistory: { pt: 'Sem Histórico', en: 'No History', ar: 'لا تاريخ', fr: 'Aucun historique', es: 'Sin historial' },
    dealsAppear: { pt: 'Deals concluídos aparecerão aqui.', en: 'Completed deals will appear here.', ar: 'ستظهر الصفقات المكتملة هنا.', fr: 'Les deals terminés apparaîtront ici.', es: 'Los deals completados aparecerán aquí.' },
    finalValue: { pt: 'Valor Final', en: 'Final Value', ar: 'القيمة النهائية', fr: 'Valeur finale', es: 'Valor final' },
    rfqTitle: { pt: 'Novo Pedido de Cotação (RFQ)', en: 'New Quote Request (RFQ)', ar: 'طلب عرض أسعار جديد', fr: 'Nouvelle demande de cotation', es: 'Nueva solicitud de cotización' },
    rfqDesc: { pt: 'Preencha os detalhes da operação.', en: 'Fill in the operation details.', ar: 'املأ تفاصيل العملية.', fr: 'Remplissez les détails de l\'opération.', es: 'Complete los detalles de la operación.' },
    opType: { pt: 'Tipo de Operação', en: 'Operation Type', ar: 'نوع العملية', fr: 'Type d\'opération', es: 'Tipo de operación' },
    buy: { pt: 'Comprar', en: 'Buy', ar: 'شراء', fr: 'Acheter', es: 'Comprar' },
    sell: { pt: 'Vender', en: 'Sell', ar: 'بيع', fr: 'Vendre', es: 'Vender' },
    asset: { pt: 'Ativo', en: 'Asset', ar: 'أصل', fr: 'Actif', es: 'Activo' },
    payCurrency: { pt: 'Moeda de Pagamento', en: 'Payment Currency', ar: 'عملة الدفع', fr: 'Devise de paiement', es: 'Moneda de pago' },
    notes: { pt: 'Notas (opcional)', en: 'Notes (optional)', ar: 'ملاحظات', fr: 'Notes (optionnel)', es: 'Notas (opcional)' },
    notesPlaceholder: { pt: 'Informações adicionais...', en: 'Additional information...', ar: 'معلومات إضافية...', fr: 'Informations supplémentaires...', es: 'Información adicional...' },
    modeInstantTitle: { pt: 'Cotação Firme Imediata', en: 'Instant Firm Quote', ar: 'عرض سعر ثابت فوري', fr: 'Cotation ferme immédiate', es: 'Cotización firme inmediata' },
    modeInstantDesc: { pt: 'Preço algorítmico do desk em segundos. Válido 15s.', en: 'Algorithmic desk price in seconds. Valid 15s.', ar: 'سعر خوارزمي فوري.', fr: 'Prix algorithmique en secondes.', es: 'Precio algorítmico en segundos.' },
    modeWhiteGloveTitle: { pt: 'Serviço White-Glove', en: 'White-Glove Service', ar: 'خدمة مميزة', fr: 'Service white-glove', es: 'Servicio white-glove' },
    modeWhiteGloveDesc: { pt: 'Trader dedicado responde com cotação personalizada.', en: 'Dedicated trader replies with a bespoke quote.', ar: 'متداول مخصص يرد بعرض أسعار مخصص.', fr: 'Un trader dédié répond avec une cotation sur mesure.', es: 'Un trader dedicado responde con una cotización personalizada.' },
    modeUnavailable: { pt: 'Não disponível no seu tier', en: 'Not available on your tier', ar: 'غير متاح لمستواك', fr: 'Non disponible à votre niveau', es: 'No disponible en su nivel' },
    upgradeTierCta: { pt: 'Ver Níveis & Benefícios', en: 'View Tiers & Benefits', ar: 'عرض المستويات', fr: 'Voir les niveaux', es: 'Ver niveles' },
    selectedModeLabel: { pt: 'Modo seleccionado', en: 'Selected mode', ar: 'الوضع المحدد', fr: 'Mode sélectionné', es: 'Modo seleccionado' },
    estNotional: { pt: 'Notional estimado', en: 'Estimated notional', ar: 'القيمة الاسمية المقدرة', fr: 'Notionnel estimé', es: 'Nocional estimado' },
    tierBadge: { pt: 'Tier', en: 'Tier', ar: 'مستوى', fr: 'Niveau', es: 'Nivel' },
    orderSummary: { pt: 'Resumo do Pedido', en: 'Order Summary', ar: 'ملخص الطلب', fr: 'Résumé', es: 'Resumen' },
    teamWillQuote: { pt: 'A equipa OTC irá enviar uma cotação em breve.', en: 'The OTC team will send a quote shortly.', ar: 'سيرسل فريق OTC عرض أسعار قريبا.', fr: 'L\'équipe OTC enverra une cotation.', es: 'El equipo OTC enviará una cotización.' },
    cancel: { pt: 'Cancelar', en: 'Cancel', ar: 'إلغاء', fr: 'Annuler', es: 'Cancelar' },
    sendRequest: { pt: 'Enviar Pedido', en: 'Send Request', ar: 'إرسال', fr: 'Envoyer', es: 'Enviar solicitud' },
    inWord: { pt: 'em', en: 'in', ar: 'في', fr: 'en', es: 'en' },
    loading: { pt: 'Carregando...', en: 'Loading...', ar: 'جار التحميل...', fr: 'Chargement...', es: 'Cargando...' },
    buyLabel: { pt: 'COMPRA', en: 'BUY', ar: 'شراء', fr: 'ACHAT', es: 'COMPRA' },
    sellLabel: { pt: 'VENDA', en: 'SELL', ar: 'بيع', fr: 'VENTE', es: 'VENTA' },
    awaitQuote: { pt: 'Aguarda Cotação', en: 'Awaiting Quote', ar: 'في انتظار العرض', fr: 'En attente', es: 'Esperando cotización' },
    quoteSent: { pt: 'Cotação Enviada', en: 'Quote Sent', ar: 'تم إرسال العرض', fr: 'Cotation envoyée', es: 'Cotización enviada' },
    accepted: { pt: 'Aceite', en: 'Accepted', ar: 'مقبول', fr: 'Accepté', es: 'Aceptado' },
    executing: { pt: 'Em Execução', en: 'Executing', ar: 'قيد التنفيذ', fr: 'En exécution', es: 'Ejecutando' },
    settlement: { pt: 'Liquidação', en: 'Settlement', ar: 'تسوية', fr: 'Règlement', es: 'Liquidación' },
    invoicing: { pt: 'Faturação', en: 'Invoicing', ar: 'فوترة', fr: 'Facturation', es: 'Facturación' },
    completedLabel: { pt: 'Concluído', en: 'Completed', ar: 'مكتمل', fr: 'Terminé', es: 'Completado' },
    pendingLabel: { pt: 'Pendente', en: 'Pending', ar: 'معلق', fr: 'En attente', es: 'Pendiente' },
    rejected: { pt: 'Rejeitada', en: 'Rejected', ar: 'مرفوض', fr: 'Refusée', es: 'Rechazada' },
    expired: { pt: 'Expirada', en: 'Expired', ar: 'منتهي', fr: 'Expirée', es: 'Expirada' },
    completedCol: { pt: 'Concluído', en: 'Completed', ar: 'مكتمل', fr: 'Terminé', es: 'Completado' },
    invalidAmount: { pt: 'Insira uma quantidade válida', en: 'Enter a valid amount', ar: 'أدخل كمية صالحة', fr: 'Entrez une quantité valide', es: 'Ingrese una cantidad válida' },
    rfqSent: { pt: 'Pedido de cotação enviado!', en: 'Quote request sent!', ar: 'تم إرسال طلب عرض الأسعار!', fr: 'Demande envoyée !', es: '¡Solicitud enviada!' },
    rfqError: { pt: 'Erro ao criar pedido', en: 'Error creating request', ar: 'خطأ في إنشاء الطلب', fr: 'Erreur de création', es: 'Error al crear solicitud' },
    quoteAccepted: { pt: 'Cotação aceite! A equipa OTC irá processar.', en: 'Quote accepted! The OTC team will process it.', ar: 'تم قبول العرض! سيقوم فريق OTC بمعالجته.', fr: 'Cotation acceptée ! L\'équipe OTC va la traiter.', es: '¡Cotización aceptada! El equipo OTC la procesará.' },
    quoteAcceptError: { pt: 'Erro ao aceitar cotação', en: 'Error accepting quote', ar: 'خطأ في قبول العرض', fr: 'Erreur d\'acceptation', es: 'Error al aceptar' },
    quoteRejected: { pt: 'Cotação rejeitada', en: 'Quote rejected', ar: 'تم رفض العرض', fr: 'Cotation refusée', es: 'Cotización rechazada' },
    quoteRejectError: { pt: 'Erro ao rejeitar cotação', en: 'Error rejecting quote', ar: 'خطأ في رفض العرض', fr: 'Erreur de refus', es: 'Error al rechazar' },
  };
  const l = (key) => {
    const lang = (language || 'pt').toLowerCase();
    return (tx[key] || {})[lang] || (tx[key] || {}).pt || key;
  };
  const [deals, setDeals] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals');
  
  // RFQ Dialog
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [rfqForm, setRfqForm] = useState({
    transaction_type: 'buy',
    base_asset: 'BTC',
    quote_asset: 'EUR',
    amount: '',
    notes: ''
  });
  const [rfqMode, setRfqMode] = useState('white_glove'); // 'instant' | 'white_glove'
  const [policyCheck, setPolicyCheck] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  
  // Quote Detail Dialog
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  // --- Tier policy check — evaluate instant vs white-glove availability ---
  // Runs when dialog opens, when amount/asset changes (debounced), or when
  // the user's tier changes. Uses the public price oracle to estimate USDT
  // notional, then calls POST /api/otc-policies/check for the user's tier.
  useEffect(() => {
    if (!showRFQDialog || !token) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      setPolicyLoading(true);
      try {
        const tier = (user?.membership_level || 'standard').toLowerCase();
        let notionalUsdt = 0;
        const amt = parseFloat(rfqForm.amount);
        if (Number.isFinite(amt) && amt > 0 && rfqForm.base_asset) {
          try {
            const pr = await axios.get(
              `${API_URL}/api/trading/price/${rfqForm.base_asset}?currency=USD`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const priceUsd = Number(pr.data?.price_usd || pr.data?.price || 0);
            notionalUsdt = amt * priceUsd;
          } catch { /* silent — notional stays 0, instant check still runs against tier gates */ }
        }
        const { data } = await axios.post(
          `${API_URL}/api/otc-policies/check`,
          { tier, size_usdt: notionalUsdt },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (cancelled) return;
        setPolicyCheck({ ...data, notional_usdt: notionalUsdt });
        // If the currently-selected mode is disallowed, auto-fallback to an allowed one.
        const modes = data?.modes || {};
        if (rfqMode === 'instant' && !modes.instant?.allowed) {
          setRfqMode(modes.white_glove?.allowed ? 'white_glove' : 'white_glove');
        }
      } catch (err) {
        if (!cancelled) setPolicyCheck(null);
      } finally {
        if (!cancelled) setPolicyLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRFQDialog, rfqForm.amount, rfqForm.base_asset, user?.membership_level, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if user is an OTC client
      const clientRes = await axios.get(`${API_URL}/api/otc/client/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientData(clientRes.data);
      
      // Fetch client's deals
      const dealsRes = await axios.get(`${API_URL}/api/otc/client/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(dealsRes.data.deals || []);
      
      // Fetch client's quotes
      const quotesRes = await axios.get(`${API_URL}/api/otc/client/quotes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuotes(quotesRes.data.quotes || []);
      
    } catch (err) {
      console.error('Failed to fetch OTC data:', err);
      if (err.response?.status === 404) {
        setClientData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRFQ = async () => {
    if (!rfqForm.amount || parseFloat(rfqForm.amount) <= 0) {
      toast.error(l('invalidAmount'));
      return;
    }

    // Client-side policy guard — backend will enforce again on the desk side.
    const modeCheck = policyCheck?.modes?.[rfqMode];
    if (modeCheck && !modeCheck.allowed) {
      toast.error(modeCheck.reason || l('modeUnavailable'));
      return;
    }

    try {
      await axios.post(`${API_URL}/api/otc/client/rfq`, {
        ...rfqForm,
        amount: parseFloat(rfqForm.amount),
        mode: rfqMode,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(l('rfqSent'));
      setShowRFQDialog(false);
      setRfqForm({
        transaction_type: 'buy',
        base_asset: 'BTC',
        quote_asset: 'EUR',
        amount: '',
        notes: ''
      });
      setRfqMode('white_glove');
      setPolicyCheck(null);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, l('rfqError')));
    }
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/otc/client/quotes/${quoteId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(l('quoteAccepted'));
      setShowQuoteDialog(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, l('quoteAcceptError')));
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/otc/client/quotes/${quoteId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(l('quoteRejected'));
      setShowQuoteDialog(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, l('quoteRejectError')));
    }
  };
  const getDealStageBadge = (stage) => {
    const styles = {
      rfq: 'bg-blue-900/30 text-blue-400',
      quote: 'bg-yellow-900/30 text-yellow-400',
      acceptance: 'bg-gold-900/30 text-gold-400',
      execution: 'bg-orange-900/30 text-orange-400',
      settlement: 'bg-purple-900/30 text-purple-400',
      invoice: 'bg-cyan-900/30 text-cyan-400',
      completed: 'bg-green-900/30 text-green-400'
    };
    const labels = {
      rfq: l('awaitQuote'),
      quote: l('quoteSent'),
      acceptance: l('accepted'),
      execution: l('executing'),
      settlement: l('settlement'),
      invoice: l('invoicing'),
      completed: l('completedLabel')
    };
    return <Badge className={styles[stage]}>{labels[stage] || stage}</Badge>;
  };

  const getQuoteStatusBadge = (status, expiresAt) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    if (status === 'sent' && isExpired) {
      return <Badge className="bg-gray-900/30 text-gray-400">{l('expired')}</Badge>;
    }
    const styles = {
      sent: 'bg-yellow-900/30 text-yellow-400',
      accepted: 'bg-green-900/30 text-green-400',
      rejected: 'bg-red-900/30 text-red-400',
      expired: 'bg-gray-900/30 text-gray-400'
    };
    const labels = {
      sent: l('pendingLabel'),
      accepted: l('accepted'),
      rejected: l('rejected'),
      expired: l('expired')
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  // If not an OTC client, show onboarding message
  if (!loading && !clientData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="text-gold-400" size={32} />
          <div>
            <h1 className="text-3xl font-light text-white">{l('title')}</h1>
            <p className="text-gray-400">{l('subtitle')}</p>
          </div>
        </div>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-12 text-center">
            <Briefcase className="mx-auto mb-4 text-gold-400" size={64} />
            <h2 className="text-2xl text-white mb-4">{l('welcomeOtc')}</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-6">
              {l('otcDescription')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                className="bg-gold-500 hover:bg-gold-400 text-black"
                onClick={() => window.open('mailto:otc@kbex.io', '_blank')}
              >
                <Send size={16} className="mr-2" />
                {l('contactOtc')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDeals = deals.filter(d => !['completed'].includes(d.stage));
  const pendingQuotes = quotes.filter(q => q.status === 'sent' && (!q.expires_at || new Date(q.expires_at) > new Date()));
  const completedDeals = deals.filter(d => d.stage === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="text-gold-400" size={32} />
          <div>
            <h1 className="text-3xl font-light text-white">{l('title')}</h1>
            <p className="text-gray-400">{l('welcome')}, {clientData?.entity_name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchData}
            variant="outline"
            className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
          >
            <RefreshCw size={16} className="mr-2" />
            {l('refresh')}
          </Button>
          <Button
            onClick={() => setShowRFQDialog(true)}
            className="bg-gold-500 hover:bg-gold-400 text-black"
          >
            <Plus size={16} className="mr-2" />
            {l('newRfq')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{l('activeDeals')}</p>
                <p className="text-2xl font-light text-white">{activeDeals.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Clock className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{l('pendingQuotes')}</p>
                <p className="text-2xl font-light text-white">{pendingQuotes.length}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <FileText className="text-yellow-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{l('completed')}</p>
                <p className="text-2xl font-light text-white">{completedDeals.length}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{l('dailyLimit')}</p>
                <p className="text-2xl font-light text-gold-400">${formatNumber(clientData?.daily_limit_usd || 0)}</p>
              </div>
              <div className="p-3 bg-gold-500/20 rounded-lg">
                <DollarSign className="text-gold-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Quotes Alert */}
      {pendingQuotes.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-400" size={24} />
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">{pendingQuotes.length} {l('hasPending')}</p>
                <p className="text-gray-400 text-sm">{l('checkQuotes')}</p>
              </div>
              <Button
                onClick={() => setActiveTab('quotes')}
                variant="outline"
                className="border-yellow-500/30 text-yellow-400"
              >
                {l('viewQuotes')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900/50 border border-gold-800/20">
          <TabsTrigger value="deals" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            {l('myDeals')} ({deals.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            {l('quotes')} ({pendingQuotes.length} {l('pending')})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            {l('history')}
          </TabsTrigger>
        </TabsList>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gold-400">{l('loading')}</div>
                </div>
              ) : activeDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('deal')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('operation')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('quantity')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('value')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('phase')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                              {deal.transaction_type === 'buy' ? (
                                <><TrendingUp size={12} className="mr-1" /> {l('buyLabel')}</>
                              ) : (
                                <><TrendingDown size={12} className="mr-1" /> {l('sellLabel')}</>
                              )}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">{formatNumber(deal.amount)} {deal.base_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">
                              {deal.total_value ? `$${formatNumber(deal.total_value)}` : '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            {getDealStageBadge(deal.stage)}
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(deal.created_at)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Briefcase className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">{l('noActiveDeals')}</h3>
                  <p className="text-gray-400 mb-4">{l('createRfq')}</p>
                  <Button
                    onClick={() => setShowRFQDialog(true)}
                    className="bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <Plus size={16} className="mr-2" />
                    {l('newRfq')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {quotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('deal')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('pair')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('price')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('total')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('expires')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('status')}</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">{l('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{quote.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{quote.base_asset}/{quote.quote_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">${formatNumber(quote.final_price)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">${formatNumber(quote.total_value)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(quote.expires_at)}</span>
                          </td>
                          <td className="p-4">
                            {getQuoteStatusBadge(quote.status, quote.expires_at)}
                          </td>
                          <td className="p-4 text-right">
                            {quote.status === 'sent' && (!quote.expires_at || new Date(quote.expires_at) > new Date()) && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={() => handleAcceptQuote(quote.id)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-500"
                                >
                                  <CheckCircle size={14} className="mr-1" />
                                  {l('accept')}
                                </Button>
                                <Button
                                  onClick={() => handleRejectQuote(quote.id)}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                                >
                                  <XCircle size={14} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">{l('noQuotes')}</h3>
                  <p className="text-gray-400">{l('quotesAppear')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {completedDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('deal')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('operation')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('quantity')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('finalValue')}</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">{l('completedCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                              {deal.transaction_type === 'buy' ? l('buyLabel') : l('sellLabel')}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">{formatNumber(deal.amount)} {deal.base_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-mono">${formatNumber(deal.total_value || 0)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(deal.updated_at)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">{l('noHistory')}</h3>
                  <p className="text-gray-400">{l('dealsAppear')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create RFQ Dialog */}
      <Dialog open={showRFQDialog} onOpenChange={setShowRFQDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Plus size={20} />
              {l('rfqTitle')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {l('rfqDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{l('opType')}</Label>
                <Select 
                  value={rfqForm.transaction_type} 
                  onValueChange={(v) => setRfqForm({...rfqForm, transaction_type: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectItem value="buy" className="text-white hover:bg-zinc-700">
                      <span className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-400" /> {l('buy')}
                      </span>
                    </SelectItem>
                    <SelectItem value="sell" className="text-white hover:bg-zinc-700">
                      <span className="flex items-center gap-2">
                        <TrendingDown size={14} className="text-red-400" /> {l('sell')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{l('asset')}</Label>
                <Select 
                  value={rfqForm.base_asset} 
                  onValueChange={(v) => setRfqForm({...rfqForm, base_asset: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectItem value="BTC" className="text-white hover:bg-zinc-700">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH" className="text-white hover:bg-zinc-700">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDT" className="text-white hover:bg-zinc-700">Tether (USDT)</SelectItem>
                    <SelectItem value="USDC" className="text-white hover:bg-zinc-700">USD Coin (USDC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{l('quantity')}</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={rfqForm.amount}
                  onChange={(e) => setRfqForm({...rfqForm, amount: e.target.value})}
                  placeholder="1.5"
                  className="bg-zinc-800 border-gold-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label>{l('payCurrency')}</Label>
                <Select 
                  value={rfqForm.quote_asset} 
                  onValueChange={(v) => setRfqForm({...rfqForm, quote_asset: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectItem value="EUR" className="text-white hover:bg-zinc-700">Euro (EUR)</SelectItem>
                    <SelectItem value="USD" className="text-white hover:bg-zinc-700">Dólar (USD)</SelectItem>
                    <SelectItem value="AED" className="text-white hover:bg-zinc-700">Dirham (AED)</SelectItem>
                    <SelectItem value="BRL" className="text-white hover:bg-zinc-700">Real (BRL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{l('notes')}</Label>
              <Textarea
                value={rfqForm.notes}
                onChange={(e) => setRfqForm({...rfqForm, notes: e.target.value})}
                placeholder={l('notesPlaceholder')}
                className="bg-zinc-800 border-gold-500/30"
                rows={3}
              />
            </div>

            {/* Tier-based mode selector */}
            <div data-testid="rfq-mode-selector" className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{l('selectedModeLabel')}</Label>
                {policyCheck?.tier && (
                  <Badge
                    data-testid="rfq-policy-tier-badge"
                    variant="outline"
                    className="border-gold-500/40 text-gold-300 text-[10px] uppercase tracking-widest"
                  >
                    {l('tierBadge')} · {policyCheck.tier}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  const modes = policyCheck?.modes || {};
                  const cards = [
                    {
                      key: 'instant',
                      title: l('modeInstantTitle'),
                      desc: l('modeInstantDesc'),
                      icon: Zap,
                      accent: 'from-gold-500/10 border-gold-500/40 text-gold-300',
                      activeAccent: 'bg-gold-500/15 border-gold-400 text-gold-200 shadow-[0_0_24px_-6px_rgba(212,175,55,0.5)]',
                    },
                    {
                      key: 'white_glove',
                      title: l('modeWhiteGloveTitle'),
                      desc: l('modeWhiteGloveDesc'),
                      icon: UserCheck,
                      accent: 'from-zinc-500/5 border-zinc-700 text-zinc-300',
                      activeAccent: 'bg-zinc-800/60 border-gold-400/70 text-zinc-100 shadow-[0_0_24px_-8px_rgba(212,175,55,0.4)]',
                    },
                  ];
                  return cards.map((c) => {
                    const info = modes[c.key];
                    // While loading, show default-enabled state (no reason visible).
                    const allowed = policyLoading ? true : (info ? info.allowed : true);
                    const selected = rfqMode === c.key;
                    const Icon = c.icon;
                    return (
                      <button
                        type="button"
                        key={c.key}
                        data-testid={`rfq-mode-${c.key}`}
                        disabled={!allowed}
                        onClick={() => allowed && setRfqMode(c.key)}
                        className={`text-left rounded-lg border p-3 transition-all ${
                          selected && allowed
                            ? c.activeAccent
                            : allowed
                              ? `bg-gradient-to-br ${c.accent} hover:border-gold-500/70`
                              : 'bg-zinc-900/40 border-zinc-800 opacity-50 cursor-not-allowed text-zinc-500'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Icon size={16} className={selected && allowed ? 'text-gold-300 mt-0.5' : 'mt-0.5'} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium">{c.title}</span>
                              {selected && allowed && (
                                <CheckCircle size={12} className="text-gold-300" />
                              )}
                            </div>
                            <p className="text-[11px] leading-snug mt-0.5 opacity-80">{c.desc}</p>
                            {!allowed && info?.reason && (
                              <p className="text-[10px] text-rose-400/80 mt-1.5 italic leading-tight">
                                {info.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
              {policyCheck && !policyCheck.modes?.instant?.allowed && (
                <a
                  data-testid="rfq-upgrade-cta"
                  href="/dashboard/tiers"
                  className="inline-flex items-center gap-1 text-[11px] text-gold-400 hover:text-gold-300 transition-colors"
                >
                  <ArrowRight size={11} />
                  {l('upgradeTierCta')}
                </a>
              )}
            </div>
            
            {/* Summary */}
            {rfqForm.amount && (
              <div className="p-4 bg-gold-900/20 rounded-lg border border-gold-500/30">
                <h4 className="text-gold-400 font-medium mb-2">{l('orderSummary')}</h4>
                <p className="text-white">
                  {rfqForm.transaction_type === 'buy' ? l('buy') : l('sell')}{' '}
                  <span className="font-mono text-gold-400">{rfqForm.amount} {rfqForm.base_asset}</span>
                  {' '}{l('inWord')} {rfqForm.quote_asset}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-400">
                    {l('selectedModeLabel')}:{' '}
                    <span className="text-gold-300">
                      {rfqMode === 'instant' ? l('modeInstantTitle') : l('modeWhiteGloveTitle')}
                    </span>
                  </span>
                  {policyCheck?.notional_usdt > 0 && (
                    <span className="text-gray-400" data-testid="rfq-est-notional">
                      {l('estNotional')}:{' '}
                      <span className="font-mono text-gold-300">
                        ${Number(policyCheck.notional_usdt).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {l('teamWillQuote')}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRFQDialog(false)} className="border-zinc-600">
              {l('cancel')}
            </Button>
            <Button 
              onClick={handleCreateRFQ} 
              className="bg-gold-500 hover:bg-gold-400 text-black"
              disabled={!rfqForm.amount}
            >
              <Send size={16} className="mr-2" />
              {l('sendRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientOTCPortal;
