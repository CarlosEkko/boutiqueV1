import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import {
  ArrowLeftRight, Calculator, Shield, FileSearch, Wallet, CheckCircle, XCircle,
  Clock, AlertTriangle, Users, DollarSign, TrendingUp, Eye, MoreVertical,
  Send, Lock, Fingerprint, Search, Filter, ArrowLeft, ChevronRight, RefreshCw,
  Bitcoin, Landmark, Target, BarChart3, Banknote, UserCheck, ShieldCheck, ShieldAlert,
  Copy, ExternalLink
} from 'lucide-react';

// ============ MOCK DATA ============
const MOCK_DEALS = [
  { id: 'OTC-2024-001', client: 'Al Rashid Holdings', type: 'buy', asset: 'BTC', qty: 100, price: 58200, gross: 4.0, net: 2.0, broker: 'Ahmed Hassan', member: 'Carlos Silva', status: 'negotiation', date: '2026-03-28' },
  { id: 'OTC-2024-002', client: 'Grupo Investidor BR', type: 'sell', asset: 'ETH', qty: 5000, price: 1820, gross: 3.5, net: 1.5, broker: 'Maria Santos', member: 'João Pereira', status: 'compliance', date: '2026-03-29' },
  { id: 'OTC-2024-003', client: 'Swiss Capital AG', type: 'buy', asset: 'BTC', qty: 250, price: 58200, gross: 3.0, net: 1.5, broker: 'External: Pierre Dubois', member: 'Carlos Silva', status: 'approved', date: '2026-03-27' },
  { id: 'OTC-2024-004', client: 'Dubai Ventures LLC', type: 'buy', asset: 'USDT', qty: 2000000, price: 1, gross: 2.0, net: 1.0, broker: 'Ahmed Hassan', member: 'Sandra Costa', status: 'settled', date: '2026-03-25' },
  { id: 'OTC-2024-005', client: 'Nakamoto Fund', type: 'sell', asset: 'BTC', qty: 50, price: 58200, gross: 5.0, net: 2.5, broker: 'External: James Wong', member: 'João Pereira', status: 'draft', date: '2026-03-30' },
];

const MOCK_COMMISSIONS = [
  { dealId: 'OTC-2024-001', beneficiary: 'Ahmed Hassan', role: 'Corretor', amount: 58200, currency: 'EUR', status: 'pending' },
  { dealId: 'OTC-2024-001', beneficiary: 'Carlos Silva', role: 'Membro KBEX', amount: 58200, currency: 'EUR', status: 'pending' },
  { dealId: 'OTC-2024-003', beneficiary: 'Pierre Dubois', role: 'Corretor Externo', amount: 109125, currency: 'EUR', status: 'approved' },
  { dealId: 'OTC-2024-003', beneficiary: 'Carlos Silva', role: 'Membro KBEX', amount: 109125, currency: 'EUR', status: 'approved' },
  { dealId: 'OTC-2024-004', beneficiary: 'Ahmed Hassan', role: 'Corretor', amount: 10000, currency: 'USDT', status: 'paid' },
  { dealId: 'OTC-2024-004', beneficiary: 'Sandra Costa', role: 'Membro KBEX', amount: 10000, currency: 'USDT', status: 'paid' },
];

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-600' },
  qualification: { label: 'Qualificação', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  compliance: { label: 'Compliance', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  negotiation: { label: 'Negociação', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  executing: { label: 'Executando', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  settled: { label: 'Liquidado', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  closed: { label: 'Fechado', color: 'bg-zinc-500/15 text-zinc-300 border-zinc-600' },
};

const COMMISSION_STATUS = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  paid: { label: 'Pago', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

// ============ SCREEN 1: DEAL OTC ============
const DealOTCScreen = ({ headerCurrency = 'EUR' }) => {
  const [dealType, setDealType] = useState('buy');
  const [asset, setAsset] = useState('BTC');
  const [quantity, setQuantity] = useState(100);

  const CURRENCY_RATES = { EUR: 1, USD: 1.08, AED: 3.97, BRL: 5.50 };
  const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', AED: 'د.إ', BRL: 'R$' };
  const basePriceEUR = 58200;
  const rate = CURRENCY_RATES[headerCurrency] || 1;
  const sym = CURRENCY_SYMBOLS[headerCurrency] || '€';

  const [refPrice, setRefPrice] = useState(Math.round(basePriceEUR * rate));

  // Update ref price when header currency changes
  React.useEffect(() => {
    setRefPrice(Math.round(basePriceEUR * (CURRENCY_RATES[headerCurrency] || 1)));
  }, [headerCurrency]);
  const [condition, setCondition] = useState('premium');
  const [conditionPct, setConditionPct] = useState(2);
  const [grossPct, setGrossPct] = useState(4);
  const [netPct, setNetPct] = useState(2);
  const [brokerPct, setBrokerPct] = useState(50);

  const calc = useMemo(() => {
    const adjustedPrice = condition === 'premium' ? refPrice * (1 + conditionPct / 100) : refPrice * (1 - conditionPct / 100);
    const totalValue = quantity * adjustedPrice;
    const grossAmount = totalValue * (grossPct / 100);
    const netAmount = totalValue * (netPct / 100);
    const kbexMargin = grossAmount - netAmount;
    const brokerComm = kbexMargin * (brokerPct / 100);
    const memberComm = kbexMargin - brokerComm;
    return { adjustedPrice, totalValue, grossAmount, netAmount, kbexMargin, brokerComm, memberComm };
  }, [quantity, refPrice, condition, conditionPct, grossPct, netPct, brokerPct]);

  const fmt = (v) => `${sym}${v.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-2 space-y-5">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowLeftRight className="text-yellow-500" size={20} />
              Criar Negociação OTC
            </CardTitle>
            <CardDescription className="text-zinc-500">Definir condições do negócio e distribuição de comissões</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Deal Type Toggle */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Tipo de Negócio</Label>
              <div className="flex rounded-lg overflow-hidden border border-zinc-800" data-testid="deal-type-toggle">
                <button onClick={() => setDealType('buy')} className={`flex-1 py-3 text-sm font-medium transition-colors ${dealType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30' : 'bg-zinc-950 text-zinc-500 border-r border-zinc-800 hover:text-zinc-300'}`}>
                  Compra (Cliente)
                </button>
                <button onClick={() => setDealType('sell')} className={`flex-1 py-3 text-sm font-medium transition-colors ${dealType === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>
                  Venda (Fornecedor)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Asset */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Ativo</Label>
                <Select value={asset} onValueChange={setAsset}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white" data-testid="deal-asset-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['BTC', 'ETH', 'USDT', 'USDC'].map(a => (
                      <SelectItem key={a} value={a} className="text-white hover:bg-zinc-800">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Quantidade</Label>
                <Input type="number" step="any" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || 0)} className="bg-zinc-950 border-zinc-800 text-white" data-testid="deal-quantity-input" />
              </div>
            </div>

            {/* Reference Price */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Preço de Referência ({headerCurrency})</Label>
              <div className="relative">
                <Input type="number" step="any" value={refPrice} onChange={e => setRefPrice(parseFloat(e.target.value) || 0)} className="bg-zinc-950 border-zinc-800 text-white pr-36" data-testid="deal-ref-price-input" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp size={12} /> KBEX: {sym}{refPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Condição</Label>
              <div className="flex gap-3">
                <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                  <button onClick={() => setCondition('premium')} className={`px-4 py-2 text-sm font-medium transition-colors ${condition === 'premium' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500'}`}>
                    Premium (+)
                  </button>
                  <button onClick={() => setCondition('discount')} className={`px-4 py-2 text-sm font-medium transition-colors ${condition === 'discount' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500'}`}>
                    Desconto (-)
                  </button>
                </div>
                <div className="relative flex-1">
                  <Input type="number" step="any" value={conditionPct} onChange={e => setConditionPct(parseFloat(e.target.value) || 0)} className="bg-zinc-950 border-zinc-800 text-white pr-8" step="0.1" data-testid="deal-condition-pct-input" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Gross / Net */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Gross (%)</Label>
                <div className="relative">
                  <Input type="number" step="any" value={grossPct} onChange={e => setGrossPct(parseFloat(e.target.value) || 0)} className="bg-zinc-950 border-zinc-800 text-white pr-8" step="0.1" data-testid="deal-gross-input" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Net (%)</Label>
                <div className="relative">
                  <Input type="number" step="any" value={netPct} onChange={e => setNetPct(parseFloat(e.target.value) || 0)} className="bg-zinc-950 border-zinc-800 text-white pr-8" step="0.1" data-testid="deal-net-input" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Broker & Member */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Corretor (Broker)</Label>
                <Select defaultValue="ahmed">
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white" data-testid="deal-broker-select">
                    <SelectValue placeholder="Selecionar corretor" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="ahmed" className="text-white hover:bg-zinc-800">Ahmed Hassan (Interno)</SelectItem>
                    <SelectItem value="maria" className="text-white hover:bg-zinc-800">Maria Santos (Interno)</SelectItem>
                    <SelectItem value="pierre" className="text-white hover:bg-zinc-800">Pierre Dubois (Externo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Membro KBEX</Label>
                <Select defaultValue="carlos">
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white" data-testid="deal-member-select">
                    <SelectValue placeholder="Selecionar membro" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="carlos" className="text-white hover:bg-zinc-800">Carlos Silva</SelectItem>
                    <SelectItem value="joao" className="text-white hover:bg-zinc-800">João Pereira</SelectItem>
                    <SelectItem value="sandra" className="text-white hover:bg-zinc-800">Sandra Costa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broker Share */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Distribuição da Margem — Corretor (%)</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Input type="number" step="any" value={brokerPct} onChange={e => setBrokerPct(Math.min(100, parseFloat(e.target.value) || 0))} className="bg-zinc-950 border-zinc-800 text-white pr-8" step="5" data-testid="deal-broker-pct-input" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400 text-sm whitespace-nowrap">Membro KBEX: {100 - brokerPct}%</span>
              </div>
            </div>

            {/* Commission Currency */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Moeda de Liquidação</Label>
              <Select defaultValue="EUR">
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white" data-testid="deal-commission-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {['EUR', 'USD', 'BTC', 'ETH', 'USDT', 'USDC'].map(c => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-zinc-800">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculator */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <Card className="bg-zinc-900 border-yellow-500/30 shadow-lg shadow-yellow-500/5" data-testid="deal-calculator">
            <CardHeader className="pb-3">
              <CardTitle className="text-yellow-500 flex items-center gap-2 text-lg">
                <Calculator size={18} />
                Calculadora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Preço Ajustado</span>
                  <span className="text-white font-medium">{fmt(calc.adjustedPrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Valor Total</span>
                  <span className="text-white font-bold text-lg">{fmt(calc.totalValue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Gross ({grossPct}%)</span>
                  <span className="text-yellow-400 font-medium">{fmt(calc.grossAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 text-sm">Net ({netPct}%)</span>
                  <span className="text-zinc-300 font-medium">{fmt(calc.netAmount)}</span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-3">
                <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">Margem KBEX</p>
                <p className="text-2xl font-bold text-white">{fmt(calc.kbexMargin)}</p>
                <div className="space-y-2 pt-2 border-t border-yellow-500/20">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Corretor ({brokerPct}%)</span>
                    <span className="text-emerald-400 font-medium">{fmt(calc.brokerComm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Membro KBEX ({100 - brokerPct}%)</span>
                    <span className="text-emerald-400 font-medium">{fmt(calc.memberComm)}</span>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-5" data-testid="deal-create-btn">
                Criar Negociação
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============ SCREEN 2: COMPLIANCE FORENSE ============
const ComplianceForenseScreen = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="text-yellow-500" size={22} />
            Compliance Forense
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Al Rashid Holdings — Qualificação de segurança</p>
        </div>
        <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">Em Análise</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trading Wallets */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-wallets-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Wallet className="text-yellow-500" size={18} />
              Carteiras de Negociação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { addr: 'bc1q83z...cdxyf', chain: 'Bitcoin', type: 'Cold', status: 'verified' },
              { addr: '0x8a64...8dbC', chain: 'Ethereum', type: 'Hot', status: 'pending' },
            ].map((w, i) => (
              <div key={w.addr} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Bitcoin className="text-orange-400" size={16} />
                  </div>
                  <div>
                    <code className="text-white text-sm">{w.addr}</code>
                    <div className="flex gap-2 mt-1">
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{w.chain}</Badge>
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{w.type}</Badge>
                    </div>
                  </div>
                </div>
                {w.status === 'verified' ? (
                  <CheckCircle className="text-emerald-400" size={18} />
                ) : (
                  <Clock className="text-yellow-400" size={18} />
                )}
              </div>
            ))}
            <Button variant="ghost" className="w-full text-zinc-500 hover:text-yellow-400 border border-dashed border-zinc-800 hover:border-yellow-500/30" data-testid="add-wallet-btn">
              + Adicionar Carteira
            </Button>
          </CardContent>
        </Card>

        {/* KYT Analysis */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-kyt-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <FileSearch className="text-purple-400" size={18} />
              Análise KYT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="78, 100" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-emerald-400 font-bold text-lg">78</span>
                </div>
              </div>
              <div>
                <p className="text-emerald-400 font-semibold">Risco Baixo</p>
                <p className="text-zinc-500 text-sm">Score: 78/100</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-500 text-xs uppercase">Flags Detectadas</Label>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs">Sem Mixing</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs">Sem Sanções</Badge>
                <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs">Exchange Não-KYC (1 tx)</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-500 text-xs uppercase">Notas do Analista</Label>
              <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white text-sm resize-none h-20 focus:border-yellow-500/50 focus:outline-none" placeholder="Adicionar notas da análise..." defaultValue="Carteira principal com histórico limpo. Uma transação menor via exchange sem KYC — risco aceitável." />
            </div>

            <Select defaultValue="clean">
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white" data-testid="kyt-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="pending" className="text-yellow-400">Pendente</SelectItem>
                <SelectItem value="clean" className="text-emerald-400">Limpo</SelectItem>
                <SelectItem value="flagged" className="text-orange-400">Sinalizado</SelectItem>
                <SelectItem value="rejected" className="text-red-400">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Satoshi Test */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-satoshi-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Target className="text-cyan-400" size={18} />
              Teste de Satoshi (AB Test)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 space-y-3">
              <div>
                <p className="text-zinc-500 text-xs mb-1">Valor de Teste Gerado</p>
                <p className="text-orange-400 font-mono font-bold text-lg">0.00005731 BTC</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Endereço KBEX de Verificação</p>
                <div className="flex items-center gap-2">
                  <code className="text-yellow-400 text-xs font-mono bg-zinc-900 px-2 py-1 rounded flex-1 truncate">bc1q83zcsh5kmtac53kwjjn2yh6wpujgnac79cdxyf</code>
                  <button className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700"><Copy className="text-zinc-400" size={14} /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400" size={18} />
                <span className="text-emerald-400 font-medium text-sm">Verificado</span>
              </div>
              <span className="text-zinc-500 text-xs">31/03/2026 14:32</span>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <p className="text-zinc-500 text-xs mb-2">Opção alternativa: Verificação por endereço de origem</p>
              <div className="flex gap-2">
                <Input placeholder="Endereço de origem do cliente" className="bg-zinc-950 border-zinc-800 text-white text-sm flex-1" />
                <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white" size="sm">Verificar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fireblocks Proofs */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-fireblocks-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Fingerprint className="text-yellow-500" size={18} />
              Provas de Verificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Proof of Ownership */}
            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-blue-400" size={16} />
                  <span className="text-white font-medium text-sm">Proof of Ownership</span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs">Verificado</Badge>
              </div>
              <p className="text-zinc-500 text-xs">Assinatura digital verificada via Signed Typed Message</p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="text-emerald-400" size={14} />
                <span className="text-zinc-400">Carteira bc1q83z...cdxyf confirmada</span>
              </div>
            </div>

            {/* Proof of Reserves */}
            <div className="p-4 bg-zinc-950 rounded-lg border border-yellow-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="text-yellow-500" size={16} />
                  <span className="text-white font-medium text-sm">Proof of Reserves</span>
                </div>
                <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs">Pendente</Badge>
              </div>
              <p className="text-zinc-500 text-xs">Verificação obrigatória antes da execução do negócio</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Reservas Necessárias</span>
                  <span className="text-white font-medium">100 BTC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Estado</span>
                  <span className="text-yellow-400">Aguardando verificação</span>
                </div>
              </div>
              <Button className="w-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30" data-testid="request-proof-reserves-btn">
                <Send size={14} className="mr-2" /> Solicitar Verificação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============ SCREEN 3: PIPELINE OTC ============
const PipelineOTCScreen = () => {
  const fmt = (v) => v >= 1000000 ? `€${(v / 1000000).toFixed(1)}M` : `€${(v / 1000).toFixed(0)}K`;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <BarChart3 className="text-yellow-500" size={22} />
          Pipeline de Negócios OTC
        </h2>
        <Button className="bg-yellow-500 text-black hover:bg-yellow-400 font-semibold" data-testid="new-deal-btn">
          + Novo Negócio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input placeholder="Pesquisar por ID, cliente..." className="bg-zinc-900 border-zinc-800 text-white pl-10" data-testid="pipeline-search" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-white">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="pipeline-table">
            <thead>
              <tr className="border-b border-zinc-800">
                {['ID', 'Cliente/Fornecedor', 'Tipo', 'Ativo', 'Qtd', 'Valor', 'Gross', 'Net', 'Margem', 'Corretor', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_DEALS.map(deal => {
                const totalValue = deal.qty * deal.price;
                const margin = totalValue * ((deal.gross - deal.net) / 100);
                const sc = STATUS_CONFIG[deal.status];
                return (
                  <tr key={deal.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-yellow-400 text-sm font-mono">{deal.id}</td>
                    <td className="px-4 py-3 text-white text-sm">{deal.client}</td>
                    <td className="px-4 py-3">
                      <Badge className={deal.type === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}>
                        {deal.type === 'buy' ? 'Compra' : 'Venda'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{deal.asset}</td>
                    <td className="px-4 py-3 text-zinc-300 text-sm">{deal.qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{fmt(totalValue)}</td>
                    <td className="px-4 py-3 text-yellow-400 text-sm">{deal.gross}%</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{deal.net}%</td>
                    <td className="px-4 py-3 text-emerald-400 text-sm font-medium">{fmt(margin)}</td>
                    <td className="px-4 py-3 text-zinc-300 text-sm">{deal.broker}</td>
                    <td className="px-4 py-3"><Badge className={`${sc.color} text-xs border`}>{sc.label}</Badge></td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white p-1"><Eye size={16} /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ============ SCREEN 4: COMMISSION DASHBOARD ============
const CommissionDashboard = () => {
  const totals = useMemo(() => {
    const generated = MOCK_COMMISSIONS.reduce((s, c) => s + c.amount, 0);
    const pending = MOCK_COMMISSIONS.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
    const approved = MOCK_COMMISSIONS.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
    const paid = MOCK_COMMISSIONS.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
    return { generated, pending, approved, paid };
  }, []);

  const kpis = [
    { label: 'Total Gerado', value: totals.generated, icon: DollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Pendente Aprovação', value: totals.pending, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Aprovado', value: totals.approved, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Pago', value: totals.paid, icon: Banknote, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        <Banknote className="text-yellow-500" size={22} />
        Dashboard de Comissões
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="commission-kpis">
        {kpis.map(kpi => (
          <Card key={kpi.label} className={`bg-zinc-900 border ${kpi.bg.split(' ')[1]}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={kpi.color} size={20} />
                <span className="text-zinc-600 text-xs">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>€{kpi.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broker Summary */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="broker-summary-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users size={16} className="text-yellow-500" />
              Resumo por Corretor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Ahmed Hassan', earned: 68200, pending: 58200, paid: 10000 },
              { name: 'Pierre Dubois', earned: 109125, pending: 0, paid: 0, tag: 'Externo' },
              { name: 'Carlos Silva', earned: 177325, pending: 58200, paid: 10000 },
            ].map(b => (
              <div key={b.name} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{b.name}</span>
                    {b.tag && <Badge className="bg-zinc-800 text-zinc-500 text-[10px]">{b.tag}</Badge>}
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-yellow-400">Total: €{b.earned.toLocaleString()}</span>
                  <span className="text-orange-400">Pend: €{b.pending.toLocaleString()}</span>
                  <span className="text-emerald-400">Pago: €{b.paid.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Commission Table */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2" data-testid="commission-table-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Comissões Detalhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Negócio', 'Beneficiário', 'Papel', 'Valor', 'Moeda', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-zinc-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_COMMISSIONS.map((c, i) => {
                    const cs = COMMISSION_STATUS[c.status];
                    return (
                      <tr key={c.dealId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-3 py-2.5 text-yellow-400 text-xs font-mono">{c.dealId}</td>
                        <td className="px-3 py-2.5 text-white text-sm">{c.beneficiary}</td>
                        <td className="px-3 py-2.5 text-zinc-400 text-sm">{c.role}</td>
                        <td className="px-3 py-2.5 text-white text-sm font-medium">€{c.amount.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-zinc-400 text-sm">{c.currency}</td>
                        <td className="px-3 py-2.5"><Badge className={`${cs.color} text-xs border`}>{cs.label}</Badge></td>
                        <td className="px-3 py-2.5">
                          {c.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2">Aprovar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300 text-xs px-2">Rejeitar</Button>
                            </div>
                          )}
                          {c.status === 'approved' && (
                            <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs px-2">Pagar</Button>
                          )}
                          {c.status === 'paid' && (
                            <span className="text-zinc-600 text-xs">Concluído</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============ SCREEN 5: WIZARD SUMMARY ============
const WizardSummaryScreen = () => {
  const checks = [
    { label: 'Verificação de Carteira', status: 'pass', detail: '2 carteiras verificadas' },
    { label: 'Score KYT', status: 'pass', detail: 'Score 78/100 — Risco Baixo' },
    { label: 'Teste de Satoshi', status: 'pass', detail: 'Verificado em 31/03/2026' },
    { label: 'Proof of Ownership', status: 'pass', detail: 'Assinatura Fireblocks verificada' },
    { label: 'Proof of Reserves', status: 'pending', detail: 'Aguardando verificação — 100 BTC' },
  ];
  const allPass = checks.every(c => c.status === 'pass');

  return (
    <div className="flex items-center justify-center py-8">
      <Card className="bg-zinc-900 border-yellow-500/20 max-w-md w-full shadow-lg shadow-yellow-500/5" data-testid="wizard-summary-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
            <ShieldCheck className="text-yellow-500" size={28} />
          </div>
          <CardTitle className="text-white text-lg">Resumo de Qualificação Forense</CardTitle>
          <CardDescription className="text-zinc-500">Al Rashid Holdings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c, i) => (
            <div key={c.label || i} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-3">
                {c.status === 'pass' ? (
                  <CheckCircle className="text-emerald-400" size={18} />
                ) : c.status === 'pending' ? (
                  <Clock className="text-yellow-400" size={18} />
                ) : (
                  <XCircle className="text-red-400" size={18} />
                )}
                <div>
                  <p className="text-white text-sm font-medium">{c.label}</p>
                  <p className="text-zinc-500 text-xs">{c.detail}</p>
                </div>
              </div>
            </div>
          ))}

          <div className={`mt-4 p-4 rounded-lg text-center border ${allPass ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Status Geral</p>
            {allPass ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm px-4 py-1">PRONTO PARA NEGOCIAR</Badge>
            ) : (
              <>
                <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm px-4 py-1">PENDENTE</Badge>
                <p className="text-yellow-400/80 text-xs mt-2">Proof of Reserves ainda não verificado</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN PROTOTYPE PAGE ============
const TABS = [
  { id: 'deal', label: 'Deal OTC', icon: ArrowLeftRight },
  { id: 'compliance', label: 'Compliance Forense', icon: Shield },
  { id: 'pipeline', label: 'Pipeline', icon: BarChart3 },
  { id: 'commissions', label: 'Comissões', icon: Banknote },
  { id: 'wizard', label: 'Qualificação', icon: ShieldCheck },
];

const OTCPrototypes = () => {
  const [activeTab, setActiveTab] = useState('deal');
  const [headerCurrency, setHeaderCurrency] = useState('EUR');

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-light tracking-wider text-white">KB<span className="text-yellow-500">EX</span></span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 text-sm">Protótipos OTC</span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={headerCurrency} onValueChange={setHeaderCurrency}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white w-24 h-8 text-sm" data-testid="header-currency-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {['EUR', 'USD', 'AED', 'BRL'].map(c => (
                  <SelectItem key={c} value={c} className="text-white hover:bg-zinc-800">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">PROTÓTIPO</Badge>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-zinc-950/50 border-b border-zinc-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`proto-tab-${tab.id}`}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-500'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'deal' && <DealOTCScreen headerCurrency={headerCurrency} />}
        {activeTab === 'compliance' && <ComplianceForenseScreen />}
        {activeTab === 'pipeline' && <PipelineOTCScreen />}
        {activeTab === 'commissions' && <CommissionDashboard />}
        {activeTab === 'wizard' && <WizardSummaryScreen />}
      </div>
    </div>
  );
};

export default OTCPrototypes;
