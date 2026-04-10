import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { getErrorMessage, formatDate } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Banknote, Copy, CheckCircle, Clock, XCircle, ArrowLeft,
  Loader2, AlertCircle, RefreshCw, Building2, ArrowRight, Landmark
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CURRENCY_CONFIG = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
];

const fmtAmount = (val, cur) => {
  const n = typeof val === 'number' ? val : parseFloat(val) || 0;
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FiatDepositPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=select, 2=amount, 3=confirm, 4=done
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [depositResult, setDepositResult] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [activeView, setActiveView] = useState('new'); // new | history
  const [bankDetailsCache, setBankDetailsCache] = useState({});
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  useEffect(() => {
    fetchDeposits();
    fetchAvailableCurrencies();
  }, [token]);

  const fetchAvailableCurrencies = async () => {
    setLoadingCurrencies(true);
    const available = [];
    for (const cur of CURRENCY_CONFIG) {
      try {
        const res = await axios.get(`${API_URL}/api/revolut/public/bank-details/${cur.code}`);
        if (res.data?.bank_details) {
          available.push({ ...cur, bankDetails: res.data.bank_details });
        }
      } catch {
        // Currency not available
      }
    }
    setAvailableCurrencies(available);
    setLoadingCurrencies(false);
  };

  const fetchDeposits = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/fiat/deposits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeposits(response.data);
    } catch (err) {
      console.error('Failed to fetch deposits', err);
    }
  };

  const createDeposit = async () => {
    if (!selectedCurrency || !amount) return;
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/trading/fiat/deposit`,
        { currency: selectedCurrency.code, amount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepositResult(response.data);
      setStep(3);
      fetchDeposits();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao criar depósito'));
    } finally {
      setLoading(false);
    }
  };

  const confirmDeposit = () => {
    toast.success('Depósito registado! Assim que a transferência for confirmada, o saldo será creditado automaticamente.');
    setStep(4);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedCurrency(null);
    setAmount('');
    setDepositResult(null);
  };

  const formatStatus = (status) => {
    const map = {
      pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/15' },
      awaiting_approval: { label: 'Em Verificação', color: 'text-blue-400', bg: 'bg-blue-500/15' },
      approved: { label: 'Aprovado', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
      completed: { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
      rejected: { label: 'Rejeitado', color: 'text-red-400', bg: 'bg-red-500/15' },
      cancelled: { label: 'Cancelado', color: 'text-gray-400', bg: 'bg-gray-500/15' },
    };
    return map[status] || { label: status, color: 'text-gray-400', bg: 'bg-gray-500/15' };
  };

  const getBankDetail = () => {
    if (!selectedCurrency) return null;
    const cur = availableCurrencies.find(c => c.code === selectedCurrency.code);
    if (!cur?.bankDetails) return null;
    const details = Array.isArray(cur.bankDetails) ? cur.bankDetails[0] : cur.bankDetails;
    return details;
  };

  return (
    <div className="space-y-6" data-testid="fiat-deposit-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/wallets')}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-light text-white">Depósito Fiat</h1>
          <p className="text-gray-400 mt-1">Adicione fundos à sua conta via transferência bancária</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg transition-colors font-medium ${
            activeView === 'new'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => { setActiveView('new'); }}
          data-testid="tab-new-deposit"
        >
          Novo Depósito
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition-colors font-medium ${
            activeView === 'history'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveView('history')}
          data-testid="tab-history"
        >
          Histórico ({deposits.length})
        </button>
      </div>

      {/* New Deposit Flow */}
      {activeView === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-800 text-gray-500'
                  }`}>
                    {step > s ? <CheckCircle size={16} /> : s}
                  </div>
                  {s < 4 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Select Currency */}
            {step === 1 && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Banknote size={20} className="text-emerald-400" />
                    Selecionar Moeda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCurrencies ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin text-gold-400" size={32} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {availableCurrencies.map(cur => (
                        <button
                          key={cur.code}
                          className={`p-5 rounded-xl border transition-all text-left ${
                            selectedCurrency?.code === cur.code
                              ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30'
                          }`}
                          onClick={() => { setSelectedCurrency(cur); setStep(2); }}
                          data-testid={`currency-${cur.code}`}
                        >
                          <span className="text-3xl block mb-2">{cur.flag}</span>
                          <p className="text-white font-semibold">{cur.code}</p>
                          <p className="text-xs text-gray-400">{cur.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {!loadingCurrencies && availableCurrencies.length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="mx-auto mb-3 text-amber-400" size={32} />
                      <p className="text-gray-400">Nenhuma moeda disponível para depósito.</p>
                      <p className="text-gray-500 text-sm mt-1">Contacte o suporte para ativar depósitos fiat.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Enter Amount */}
            {step === 2 && selectedCurrency && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="text-2xl">{selectedCurrency.flag}</span>
                    Depósito em {selectedCurrency.code}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Valor a depositar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-lg">
                        {selectedCurrency.symbol}
                      </span>
                      <Input
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                        className="bg-zinc-800 border-zinc-700 text-white pl-12 text-xl h-14"
                        data-testid="deposit-amount-input"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Mínimo: {selectedCurrency.symbol} 100,00
                    </p>
                  </div>

                  {/* Bank Details Preview */}
                  {(() => {
                    const bd = getBankDetail();
                    if (!bd) return null;
                    return (
                      <div className="bg-zinc-800/50 rounded-xl p-5 space-y-3 border border-zinc-700/50">
                        <h4 className="text-white font-medium flex items-center gap-2 text-sm">
                          <Landmark size={16} className="text-emerald-400" />
                          Dados Bancários para Transferência
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {bd.iban && (
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-400 text-sm">IBAN</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-sm">{bd.iban}</span>
                                <button onClick={() => copyToClipboard(bd.iban)} className="text-emerald-400 hover:text-emerald-300" data-testid="copy-iban">
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                          {bd.bic && (
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-400 text-sm">BIC/SWIFT</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-sm">{bd.bic}</span>
                                <button onClick={() => copyToClipboard(bd.bic)} className="text-emerald-400 hover:text-emerald-300">
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                          {bd.beneficiary && (
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-400 text-sm">Beneficiário</span>
                              <span className="text-white text-sm">{bd.beneficiary}</span>
                            </div>
                          )}
                          {bd.schemes && (
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-400 text-sm">Métodos</span>
                              <div className="flex gap-1">
                                {bd.schemes.map(s => (
                                  <Badge key={s} className="bg-zinc-700 text-gray-300 border-0 text-[10px] uppercase">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-gray-300"
                      onClick={() => { setStep(1); setSelectedCurrency(null); setAmount(''); }}
                    >
                      <ArrowLeft size={16} className="mr-2" /> Voltar
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-12"
                      onClick={createDeposit}
                      disabled={loading || !amount || parseFloat(amount) < 100}
                      data-testid="create-deposit-btn"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin mr-2" size={18} />
                      ) : (
                        <ArrowRight size={18} className="mr-2" />
                      )}
                      {loading ? 'A processar...' : 'Gerar Referência'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Reference + Confirm */}
            {step === 3 && depositResult && (
              <Card className="bg-zinc-900/50 border-emerald-800/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-400" />
                    Dados para Transferência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Reference Code - Highlighted */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
                    <p className="text-gray-400 text-sm mb-2">Código de Referência</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl font-bold font-mono text-emerald-400 tracking-widest" data-testid="reference-code">
                        {depositResult.reference_code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(depositResult.reference_code)}
                        className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                        data-testid="copy-reference"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                    <p className="text-amber-400 text-xs mt-3 flex items-center justify-center gap-1">
                      <AlertCircle size={12} />
                      Inclua este código na descrição da transferência
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="bg-zinc-800/50 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-gray-400">Valor</span>
                    <span className="text-white font-bold text-xl">
                      {depositResult.bank_details?.currency} {fmtAmount(depositResult.bank_details?.amount)}
                    </span>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-zinc-800/50 rounded-xl p-5 space-y-3 border border-zinc-700/50">
                    <h4 className="text-white font-medium flex items-center gap-2 text-sm">
                      <Landmark size={16} className="text-emerald-400" />
                      Transferir para
                    </h4>
                    {depositResult.bank_details?.iban && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400 text-sm">IBAN</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-sm">{depositResult.bank_details.iban}</span>
                          <button onClick={() => copyToClipboard(depositResult.bank_details.iban)} className="text-emerald-400 hover:text-emerald-300">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    {depositResult.bank_details?.bic && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400 text-sm">BIC/SWIFT</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-sm">{depositResult.bank_details.bic}</span>
                          <button onClick={() => copyToClipboard(depositResult.bank_details.bic)} className="text-emerald-400 hover:text-emerald-300">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    {depositResult.bank_details?.account_holder && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400 text-sm">Beneficiário</span>
                        <span className="text-white text-sm">{depositResult.bank_details.account_holder}</span>
                      </div>
                    )}
                    {depositResult.bank_details?.bank_name && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400 text-sm">Banco</span>
                        <span className="text-white text-sm">{depositResult.bank_details.bank_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <h5 className="text-amber-400 font-medium text-sm mb-2">Instruções</h5>
                    <ol className="text-gray-300 text-sm space-y-1.5 list-decimal list-inside">
                      <li>Efetue a transferência para o IBAN indicado acima</li>
                      <li>Inclua o código <span className="font-mono text-emerald-400 font-bold">{depositResult.reference_code}</span> na descrição</li>
                      <li>O depósito será creditado automaticamente após confirmação</li>
                    </ol>
                  </div>

                  {/* Confirm Button */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-gray-300"
                      onClick={resetFlow}
                    >
                      Novo Depósito
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-base"
                      onClick={confirmDeposit}
                      data-testid="confirm-deposit-btn"
                    >
                      <CheckCircle size={18} className="mr-2" />
                      Concluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <Card className="bg-zinc-900/50 border-emerald-800/20">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xl text-white mb-2">Depósito Registado</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    A sua solicitação de depósito foi registada. Assim que a transferência for confirmada pelo banco, o valor será creditado automaticamente na sua conta.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-gray-300"
                      onClick={resetFlow}
                    >
                      Novo Depósito
                    </Button>
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => setActiveView('history')}
                    >
                      Ver Histórico
                    </Button>
                    <Button
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => navigate('/dashboard/wallets')}
                    >
                      Voltar às Carteiras
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - How it works */}
          <div className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-base">Como funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { n: '1', title: 'Selecionar moeda', desc: 'Escolha a moeda que pretende depositar' },
                  { n: '2', title: 'Introduzir valor', desc: 'Indique o montante do depósito' },
                  { n: '3', title: 'Transferência', desc: 'Efetue a transferência com o código de referência' },
                  { n: '4', title: 'Confirmação', desc: 'O saldo é creditado automaticamente' },
                ].map((item) => (
                  <div key={item.n} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      parseInt(item.n) <= step ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-gray-500'
                    }`}>
                      <span className="text-xs font-bold">{item.n}</span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${parseInt(item.n) <= step ? 'text-white' : 'text-gray-500'}`}>{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-blue-900/10 border-blue-800/20">
              <CardContent className="p-4">
                <p className="text-blue-400 text-sm flex items-start gap-2">
                  <Clock size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Tempo estimado: 1-3 dias úteis para transferências SEPA. Transferências SWIFT podem demorar até 5 dias.</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock size={20} className="text-emerald-400" />
                Histórico de Depósitos
              </span>
              <Button variant="ghost" size="sm" onClick={fetchDeposits} data-testid="refresh-history">
                <RefreshCw size={16} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 mb-4">Nenhum depósito encontrado</p>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => { setActiveView('new'); resetFlow(); }}
                >
                  Efetuar Depósito
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {deposits.map(deposit => {
                  const status = formatStatus(deposit.status);
                  return (
                    <div
                      key={deposit.id}
                      className="bg-zinc-800/50 rounded-lg p-4"
                      data-testid={`deposit-${deposit.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                            <Banknote size={18} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {deposit.currency} {fmtAmount(deposit.amount)}
                            </p>
                            <p className="text-sm text-gray-400">
                              Ref: <span className="font-mono text-emerald-400">{deposit.reference_code}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(deposit.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FiatDepositPage;
