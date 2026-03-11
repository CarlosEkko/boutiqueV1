import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Banknote,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Upload,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FiatDepositPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState('select'); // select, details, history
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [depositResult, setDepositResult] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [selectedDeposit, setSelectedDeposit] = useState(null);

  const currencies = [
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', min: 100 },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', min: 100 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', min: 500 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', min: 500 },
  ];

  useEffect(() => {
    fetchDeposits();
  }, [token]);

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
        {
          currency: selectedCurrency.code,
          amount: parseFloat(amount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDepositResult(response.data);
      setActiveStep('details');
      fetchDeposits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar depósito');
    } finally {
      setLoading(false);
    }
  };

  const submitProof = async (depositId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(
        `${API_URL}/api/uploads/deposit-proof/${depositId}`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      toast.success('Comprovante enviado! Aguardando aprovação.');
      fetchDeposits();
      setSelectedDeposit(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar comprovante');
    }
  };

  const cancelDeposit = async (depositId) => {
    try {
      await axios.delete(`${API_URL}/api/trading/fiat/deposit/${depositId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Depósito cancelado');
      fetchDeposits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar depósito');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência');
  };

  const formatStatus = (status) => {
    const statusMap = {
      pending: { label: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
      awaiting_approval: { label: 'Aguardando Aprovação', color: 'text-blue-400', bg: 'bg-blue-500/20' },
      approved: { label: 'Aprovado', color: 'text-green-400', bg: 'bg-green-500/20' },
      completed: { label: 'Completo', color: 'text-green-400', bg: 'bg-green-500/20' },
      rejected: { label: 'Rejeitado', color: 'text-red-400', bg: 'bg-red-500/20' },
      cancelled: { label: 'Cancelado', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    };
    return statusMap[status] || { label: status, color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  const BankDetailsCard = ({ details, currency }) => (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
      <h4 className="text-white font-medium flex items-center gap-2">
        <Building2 size={18} className="text-emerald-400" />
        Dados Bancários KBEX
      </h4>
      
      {details.iban && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">IBAN</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm">{details.iban}</span>
            <button onClick={() => copyToClipboard(details.iban)} className="text-emerald-400 hover:text-emerald-300">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      
      {details.bic && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">BIC/SWIFT</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm">{details.bic}</span>
            <button onClick={() => copyToClipboard(details.bic)} className="text-emerald-400 hover:text-emerald-300">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      
      {/* US specific */}
      {details.routing_number && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Routing Number</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm">{details.routing_number}</span>
            <button onClick={() => copyToClipboard(details.routing_number)} className="text-emerald-400 hover:text-emerald-300">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      
      {details.account_number && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Account Number</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm">{details.account_number}</span>
            <button onClick={() => copyToClipboard(details.account_number)} className="text-emerald-400 hover:text-emerald-300">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      
      {/* Brazil specific */}
      {details.pix_key && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Chave PIX</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm">{details.pix_key}</span>
            <button onClick={() => copyToClipboard(details.pix_key)} className="text-emerald-400 hover:text-emerald-300">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
      
      {details.bank && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Banco</span>
          <span className="text-white text-sm">{details.bank}</span>
        </div>
      )}
      
      {details.agency && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Agência</span>
          <span className="text-white text-sm">{details.agency}</span>
        </div>
      )}
      
      {details.account && (
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Conta</span>
          <span className="text-white text-sm">{details.account}</span>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">Beneficiário</span>
        <span className="text-white text-sm">{details.account_holder}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">Banco</span>
        <span className="text-white text-sm">{details.bank_name}</span>
      </div>
      
      <div className="border-t border-zinc-700 pt-3 mt-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Referência</span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold font-mono">{details.reference_code}</span>
            <button onClick={() => copyToClipboard(details.reference_code)} className="text-emerald-400 hover:text-emerald-300">
              <Copy size={14} />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-400 text-sm">Valor</span>
          <span className="text-white font-bold">{details.currency} {details.amount?.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
        <p className="text-yellow-400 text-xs flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>Inclua o código de referência na descrição da transferência. Sem este código, não conseguiremos identificar seu depósito.</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="fiat-deposit-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard/wallets')}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-light text-white">Depósito Fiat</h1>
          <p className="text-gray-400 mt-1">Deposite moedas fiat via transferência bancária</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeStep === 'select' || activeStep === 'details'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => { setActiveStep('select'); setDepositResult(null); }}
          data-testid="tab-new-deposit"
        >
          Novo Depósito
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeStep === 'history' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveStep('history')}
          data-testid="tab-history"
        >
          Histórico ({deposits.length})
        </button>
      </div>

      {/* Select Currency Step */}
      {activeStep === 'select' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900/50 border-emerald-800/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Banknote size={20} className="text-emerald-400" />
                Selecione a Moeda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {currencies.map(currency => (
                  <button
                    key={currency.code}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      selectedCurrency?.code === currency.code
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => setSelectedCurrency(currency)}
                    data-testid={`currency-${currency.code}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currency.flag}</span>
                      <div>
                        <p className="text-white font-medium">{currency.code}</p>
                        <p className="text-sm text-gray-400">{currency.name}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedCurrency && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Valor do Depósito</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">
                        {selectedCurrency.symbol}
                      </span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-zinc-800 border-zinc-700 text-white pl-12 text-lg"
                        data-testid="deposit-amount-input"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Mínimo: {selectedCurrency.symbol}{selectedCurrency.min.toLocaleString()}
                    </p>
                  </div>

                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3"
                    onClick={createDeposit}
                    disabled={loading || !amount || parseFloat(amount) < selectedCurrency.min}
                    data-testid="create-deposit-btn"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" size={18} />
                    ) : (
                      <Banknote className="mr-2" size={18} />
                    )}
                    {loading ? 'Criando...' : 'Obter Dados Bancários'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Selecione a moeda e valor</p>
                  <p className="text-sm text-gray-400">Escolha EUR, USD, AED ou BRL</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Receba os dados bancários</p>
                  <p className="text-sm text-gray-400">Com código de referência único</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Faça a transferência</p>
                  <p className="text-sm text-gray-400">Inclua o código de referência</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold">4</span>
                </div>
                <div>
                  <p className="text-white font-medium">Envie o comprovante</p>
                  <p className="text-sm text-gray-400">Acelere a aprovação do depósito</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Saldo creditado</p>
                  <p className="text-sm text-gray-400">Após aprovação do admin</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                <p className="text-blue-400 text-sm">
                  Tempo médio de processamento: 1-2 dias úteis após envio do comprovante.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bank Details Step */}
      {activeStep === 'details' && depositResult && (
        <Card className="bg-zinc-900/50 border-emerald-800/20 max-w-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" />
              Depósito Criado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <BankDetailsCard details={depositResult.bank_details} currency={depositResult.bank_details.currency} />
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <h4 className="text-emerald-400 font-medium mb-2">Próximos Passos</h4>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Faça a transferência para a conta indicada</li>
                <li>Use o código <span className="text-emerald-400 font-mono font-bold">{depositResult.reference_code}</span> na descrição</li>
                <li>Volte aqui e envie o comprovante no histórico de depósitos</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
                onClick={() => { setActiveStep('select'); setDepositResult(null); setSelectedCurrency(null); setAmount(''); }}
              >
                Novo Depósito
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => setActiveStep('history')}
              >
                Ver Histórico
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Step */}
      {activeStep === 'history' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock size={20} className="text-emerald-400" />
                Histórico de Depósitos
              </span>
              <Button variant="ghost" size="sm" onClick={fetchDeposits}>
                <RefreshCw size={16} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <div className="text-center py-8">
                <Banknote className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400">Nenhum depósito encontrado</p>
                <Button
                  className="mt-4 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setActiveStep('select')}
                >
                  Fazer Primeiro Depósito
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
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-emerald-400 font-bold text-sm">{deposit.currency}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {deposit.currency} {deposit.amount?.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-400">
                              Ref: <span className="font-mono">{deposit.reference_code}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(deposit.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      {deposit.status === 'pending' && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-700">
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => setSelectedDeposit(deposit)}
                          >
                            <Upload size={14} className="mr-1" />
                            Enviar Comprovante
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-gray-400 hover:text-red-400 hover:border-red-500/30"
                            onClick={() => cancelDeposit(deposit.id)}
                          >
                            <XCircle size={14} className="mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      )}

                      {deposit.status === 'awaiting_approval' && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-blue-400 text-sm flex items-center gap-2">
                              <Clock size={14} />
                              Comprovante enviado. Aguardando aprovação do administrador.
                            </p>
                          </div>
                        </div>
                      )}

                      {(deposit.status === 'approved' || deposit.status === 'completed') && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <p className="text-green-400 text-sm flex items-center gap-2">
                              <CheckCircle size={14} />
                              Depósito aprovado! Saldo creditado na sua carteira.
                            </p>
                          </div>
                        </div>
                      )}

                      {deposit.status === 'rejected' && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-red-400 text-sm flex items-center gap-2">
                              <XCircle size={14} />
                              Depósito rejeitado. {deposit.rejection_reason || 'Entre em contato com o suporte.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Proof Modal */}
      {selectedDeposit && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDeposit(null)}
        >
          <Card 
            className="bg-zinc-900 border-emerald-800/30 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-white">Enviar Comprovante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-400">
                <p>Depósito: <span className="text-white">{selectedDeposit.currency} {selectedDeposit.amount?.toLocaleString()}</span></p>
                <p>Referência: <span className="text-emerald-400 font-mono">{selectedDeposit.reference_code}</span></p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Comprovante de Transferência</label>
                <Input
                  type="file"
                  id="proof-file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="bg-zinc-800 border-zinc-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white file:cursor-pointer"
                  data-testid="proof-file-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos aceitos: PDF, JPEG, PNG (máx. 10MB)
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700"
                  onClick={() => setSelectedDeposit(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    const fileInput = document.getElementById('proof-file');
                    const file = fileInput?.files?.[0];
                    if (file) {
                      submitProof(selectedDeposit.id, file);
                    } else {
                      toast.error('Selecione um ficheiro');
                    }
                  }}
                  data-testid="submit-proof-btn"
                >
                  <Upload size={16} className="mr-2" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FiatDepositPage;
