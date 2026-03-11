import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowUpRight,
  Copy,
  Wallet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CryptoWithdrawalPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('new');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [expandedWithdrawal, setExpandedWithdrawal] = useState(null);
  const [vaultStatus, setVaultStatus] = useState(null);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [note, setNote] = useState('');
  const [fees, setFees] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVaultStatus();
    fetchBalances();
    fetchWithdrawals();
    fetchCryptoPrices();
  }, [token]);

  const fetchVaultStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crypto-wallets/my-vault`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVaultStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch vault status', err);
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crypto-wallets/balances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalances(response.data.balances || []);
    } catch (err) {
      console.error('Failed to fetch balances', err);
    }
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/crypto-wallets/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(response.data || []);
    } catch (err) {
      console.error('Failed to fetch withdrawals', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCryptoPrices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/cryptos?currency=USD`);
      const pricesMap = {};
      response.data.forEach(c => {
        pricesMap[c.symbol] = {
          price: c.price_usd,
          logo: c.logo,
          name: c.name
        };
      });
      setCryptoPrices(pricesMap);
    } catch (err) {
      console.error('Failed to fetch prices', err);
    }
  };

  const fetchFees = async (symbol) => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/fees?crypto=${symbol}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFees(response.data);
    } catch (err) {
      console.error('Failed to fetch fees', err);
    }
  };

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setAmount('');
    setDestinationAddress('');
    fetchFees(asset.asset);
  };

  const calculateFees = () => {
    if (!fees || !amount || isNaN(parseFloat(amount))) return null;
    
    const amountNum = parseFloat(amount);
    const withdrawalFee = amountNum * (fees.withdrawal_fee_percent || 0.5) / 100;
    const networkFee = fees.network_fee || 0;
    const netAmount = amountNum - withdrawalFee - networkFee;
    
    return {
      amount: amountNum,
      withdrawalFee,
      networkFee,
      netAmount: Math.max(0, netAmount)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAsset || !amount || !destinationAddress) {
      toast.error('Por favor preencha todos os campos');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (amountNum > selectedAsset.available) {
      toast.error('Saldo insuficiente');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/crypto-wallets/withdraw`,
        {
          asset: selectedAsset.asset,
          amount: amountNum,
          destination_address: destinationAddress,
          note: note || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Pedido de levantamento submetido! Aguardando aprovação.');
      setAmount('');
      setDestinationAddress('');
      setNote('');
      setSelectedAsset(null);
      fetchWithdrawals();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao processar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelWithdrawal = async (withdrawalId) => {
    try {
      await axios.post(
        `${API_URL}/api/crypto-wallets/withdrawals/${withdrawalId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Levantamento cancelado');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pendente' },
      processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: RefreshCw, label: 'Processando' },
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle, label: 'Concluído' },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Falhado' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rejeitado' },
      cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: XCircle, label: 'Cancelado' }
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
        <Icon size={12} className="mr-1" />
        {style.label}
      </Badge>
    );
  };

  const feeCalc = calculateFees();

  // Check if vault is initialized
  if (vaultStatus && !vaultStatus.has_vault) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Levantamento Crypto</h1>
          <p className="text-gray-400">Retire criptomoedas para carteira externa</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Wallet size={48} className="text-gold-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Carteira Crypto Não Inicializada
            </h3>
            <p className="text-gray-400 mb-6">
              Inicialize a sua carteira crypto para poder fazer levantamentos.
            </p>
            <Button
              onClick={async () => {
                try {
                  await axios.post(
                    `${API_URL}/api/crypto-wallets/initialize`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  toast.success('Carteira inicializada!');
                  fetchVaultStatus();
                  fetchBalances();
                } catch (err) {
                  toast.error(err.response?.data?.detail || 'Erro ao inicializar');
                }
              }}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              Inicializar Carteira
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Levantamento Crypto</h1>
        <p className="text-gray-400">Retire criptomoedas para carteira externa</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'new' ? 'default' : 'outline'}
          onClick={() => setActiveTab('new')}
          className={activeTab === 'new' ? 'bg-emerald-500' : 'border-zinc-700'}
        >
          Novo Levantamento
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'bg-emerald-500' : 'border-zinc-700'}
        >
          Histórico ({withdrawals.length})
        </Button>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Selection */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet size={20} />
                Selecionar Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {balances.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle size={32} className="mx-auto mb-2" />
                  <p>Nenhum saldo disponível</p>
                </div>
              ) : (
                balances.map(asset => (
                  <button
                    key={asset.fireblocks_asset_id}
                    onClick={() => handleAssetSelect(asset)}
                    className={`w-full p-4 rounded-lg border transition-all ${
                      selectedAsset?.asset === asset.asset
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {cryptoPrices[asset.asset]?.logo && (
                          <img 
                            src={cryptoPrices[asset.asset].logo} 
                            alt={asset.asset}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-white">{asset.asset}</div>
                          <div className="text-xs text-gray-400">
                            {cryptoPrices[asset.asset]?.name || asset.fireblocks_asset_id}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono">
                          {parseFloat(asset.available).toFixed(8)}
                        </div>
                        <div className="text-xs text-gray-400">Disponível</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Withdrawal Form */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpRight size={20} />
                Detalhes do Levantamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAsset ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Selecione um ativo para continuar</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Quantidade</label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00000000"
                        className="bg-zinc-800 border-zinc-700 text-white pr-20"
                        data-testid="withdrawal-amount"
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(selectedAsset.available.toString())}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Disponível: {parseFloat(selectedAsset.available).toFixed(8)} {selectedAsset.asset}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Endereço de Destino</label>
                    <Input
                      type="text"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="Endereço da carteira externa"
                      className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                      data-testid="withdrawal-address"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Nota (opcional)</label>
                    <Input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nota para referência"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>

                  {/* Fee Summary */}
                  {feeCalc && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                      <div className="text-sm text-gray-400">Resumo</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Quantidade</span>
                        <span className="text-white">{feeCalc.amount.toFixed(8)} {selectedAsset.asset}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa ({fees?.withdrawal_fee_percent || 0.5}%)</span>
                        <span className="text-yellow-400">-{feeCalc.withdrawalFee.toFixed(8)} {selectedAsset.asset}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa de Rede</span>
                        <span className="text-yellow-400">-{feeCalc.networkFee.toFixed(8)} {selectedAsset.asset}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-2 flex justify-between font-medium">
                        <span className="text-gray-300">Você Recebe</span>
                        <span className="text-emerald-400">{feeCalc.netAmount.toFixed(8)} {selectedAsset.asset}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting || !amount || !destinationAddress}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    data-testid="submit-withdrawal-btn"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={16} className="mr-2" />
                        Solicitar Levantamento
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Levantamentos requerem aprovação administrativa
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* History Tab */
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Histórico de Levantamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="animate-spin text-gold-400" size={32} />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Wallet size={32} className="mx-auto mb-2" />
                <p>Nenhum levantamento encontrado</p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('new')}
                  className="mt-4 border-zinc-700"
                >
                  Fazer Primeiro Levantamento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map(w => (
                  <div
                    key={w.id}
                    className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedWithdrawal(expandedWithdrawal === w.id ? null : w.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {cryptoPrices[w.asset]?.logo && (
                            <img 
                              src={cryptoPrices[w.asset].logo} 
                              alt={w.asset}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {w.amount} {w.asset}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(w.created_at).toLocaleDateString('pt-PT', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(w.status)}
                          {expandedWithdrawal === w.id ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedWithdrawal === w.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-zinc-700 pt-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Quantidade:</span>
                            <span className="text-white ml-2">{w.amount} {w.asset}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Taxa:</span>
                            <span className="text-yellow-400 ml-2">{w.fee_amount?.toFixed(8)} {w.asset}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Taxa de Rede:</span>
                            <span className="text-yellow-400 ml-2">{w.network_fee?.toFixed(8)} {w.asset}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Valor Líquido:</span>
                            <span className="text-emerald-400 ml-2">{w.net_amount?.toFixed(8)} {w.asset}</span>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-400">Destino:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs text-white bg-zinc-900 px-2 py-1 rounded flex-1 truncate">
                              {w.destination_address}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(w.destination_address);
                                toast.success('Endereço copiado');
                              }}
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>

                        {w.fireblocks_tx_id && (
                          <div className="text-sm">
                            <span className="text-gray-400">TX ID:</span>
                            <code className="text-xs text-emerald-400 ml-2">{w.fireblocks_tx_id}</code>
                          </div>
                        )}

                        {w.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelWithdrawal(w.id)}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle size={14} className="mr-1" />
                            Cancelar
                          </Button>
                        )}

                        {w.admin_note && (
                          <div className="text-sm bg-zinc-900 p-2 rounded">
                            <span className="text-gray-400">Nota Admin:</span>
                            <p className="text-white">{w.admin_note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CryptoWithdrawalPage;
