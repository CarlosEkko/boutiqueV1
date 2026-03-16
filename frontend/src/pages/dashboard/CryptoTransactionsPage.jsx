import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// CoinMarketCap logo URLs
const getCryptoLogo = (symbol) => {
  const cmcIds = {
    'BTC': 1, 'ETH': 1027, 'USDT': 825, 'USDC': 3408, 'SOL': 5426,
    'XRP': 52, 'BNB': 1839, 'ADA': 2010, 'DOGE': 74, 'LTC': 2,
    'DOT': 6636, 'AVAX': 5805, 'MATIC': 3890, 'LINK': 1975
  };
  const cmcId = cmcIds[symbol?.toUpperCase()];
  return cmcId ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png` : null;
};

// Status colors and labels
const getStatusInfo = (status) => {
  const statusMap = {
    'COMPLETED': { color: 'bg-green-500/20 text-green-400', label: 'Completado', icon: CheckCircle },
    'CONFIRMED': { color: 'bg-green-500/20 text-green-400', label: 'Confirmado', icon: CheckCircle },
    'PENDING_SIGNATURE': { color: 'bg-yellow-500/20 text-yellow-400', label: 'Aguardando Assinatura', icon: Clock },
    'PENDING_AUTHORIZATION': { color: 'bg-yellow-500/20 text-yellow-400', label: 'Aguardando Autorização', icon: Clock },
    'BROADCASTING': { color: 'bg-blue-500/20 text-blue-400', label: 'Transmitindo', icon: Loader2 },
    'CONFIRMING': { color: 'bg-blue-500/20 text-blue-400', label: 'Confirmando', icon: Loader2 },
    'SUBMITTED': { color: 'bg-blue-500/20 text-blue-400', label: 'Submetido', icon: Clock },
    'QUEUED': { color: 'bg-gray-500/20 text-gray-400', label: 'Na Fila', icon: Clock },
    'FAILED': { color: 'bg-red-500/20 text-red-400', label: 'Falhou', icon: XCircle },
    'REJECTED': { color: 'bg-red-500/20 text-red-400', label: 'Rejeitado', icon: XCircle },
    'CANCELLED': { color: 'bg-gray-500/20 text-gray-400', label: 'Cancelado', icon: XCircle },
    'BLOCKED': { color: 'bg-red-500/20 text-red-400', label: 'Bloqueado', icon: AlertCircle },
  };
  return statusMap[status] || { color: 'bg-gray-500/20 text-gray-400', label: status, icon: Clock };
};

const CryptoTransactionsPage = () => {
  const { token } = useAuth();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [txDetails, setTxDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, deposits, withdrawals
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransactions = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API_URL}/api/crypto-wallets/fireblocks/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Falha ao carregar transações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTransactions();
    
    // Auto-refresh every 30 seconds for pending transactions
    const interval = setInterval(() => {
      const hasPending = transactions.some(tx => 
        ['CONFIRMING', 'BROADCASTING', 'PENDING_SIGNATURE', 'SUBMITTED'].includes(tx.status)
      );
      if (hasPending) {
        fetchTransactions();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchTransactions, transactions]);

  const fetchTransactionDetails = async (txId) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_URL}/api/crypto-wallets/fireblocks/transaction/${txId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTxDetails(response.data);
    } catch (err) {
      toast.error('Falha ao carregar detalhes');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openTxDetails = (tx) => {
    setSelectedTx(tx);
    setTxDetails(null);
    fetchTransactionDetails(tx.id);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const truncateHash = (hash) => {
    if (!hash) return '-';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // Filter by type
    if (filterType === 'deposits' && tx.operation !== 'TRANSFER_IN') return false;
    if (filterType === 'withdrawals' && tx.operation !== 'TRANSFER') return false;
    
    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        tx.asset?.toLowerCase().includes(search) ||
        tx.tx_hash?.toLowerCase().includes(search) ||
        tx.destination_address?.toLowerCase().includes(search) ||
        tx.id?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-white">Transações Crypto</h1>
          <p className="text-gray-400 mt-1">Monitor de depósitos e levantamentos</p>
        </div>
        <Button 
          onClick={fetchTransactions}
          disabled={refreshing}
          className="bg-gold-500 hover:bg-gold-400 text-black"
        >
          <RefreshCw className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} size={18} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por asset, hash ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            className={filterType === 'all' ? 'bg-gold-500 text-black' : ''}
          >
            Todos
          </Button>
          <Button
            variant={filterType === 'deposits' ? 'default' : 'outline'}
            onClick={() => setFilterType('deposits')}
            className={filterType === 'deposits' ? 'bg-green-500 text-black' : ''}
          >
            <ArrowDownLeft size={16} className="mr-1" /> Depósitos
          </Button>
          <Button
            variant={filterType === 'withdrawals' ? 'default' : 'outline'}
            onClick={() => setFilterType('withdrawals')}
            className={filterType === 'withdrawals' ? 'bg-blue-500 text-white' : ''}
          >
            <ArrowUpRight size={16} className="mr-1" /> Levantamentos
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Carregando transações...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto text-gray-500 mb-4" size={48} />
            <p className="text-gray-400">Nenhuma transação encontrada</p>
            <p className="text-gray-500 text-sm mt-1">As transações aparecerão aqui automaticamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const statusInfo = getStatusInfo(tx.status);
            const StatusIcon = statusInfo.icon;
            const isDeposit = tx.operation === 'TRANSFER_IN';
            const logo = getCryptoLogo(tx.asset);
            
            return (
              <Card 
                key={tx.id} 
                className="bg-zinc-900/50 border-gold-800/20 hover:border-gold-500/30 transition-colors cursor-pointer"
                onClick={() => openTxDetails(tx)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Left side - Asset & Type */}
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDeposit ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                        {isDeposit ? (
                          <ArrowDownLeft className="text-green-400" size={20} />
                        ) : (
                          <ArrowUpRight className="text-blue-400" size={20} />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {logo && <img src={logo} alt={tx.asset} className="w-8 h-8 rounded-full" />}
                        <div>
                          <p className="text-white font-medium">
                            {isDeposit ? 'Depósito' : 'Levantamento'} {tx.asset}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {truncateHash(tx.tx_hash || tx.id)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Center - Amount */}
                    <div className="text-right">
                      <p className={`font-medium ${isDeposit ? 'text-green-400' : 'text-white'}`}>
                        {isDeposit ? '+' : '-'}{tx.amount?.toFixed(8)} {tx.asset}
                      </p>
                      {tx.amount_usd > 0 && (
                        <p className="text-gray-400 text-sm">≈ ${tx.amount_usd?.toFixed(2)}</p>
                      )}
                    </div>

                    {/* Right - Status & Date */}
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                          <StatusIcon size={12} className={tx.status === 'CONFIRMING' ? 'animate-spin' : ''} />
                          {statusInfo.label}
                        </Badge>
                        {tx.num_confirmations > 0 && (
                          <p className="text-gray-500 text-xs mt-1">
                            {tx.num_confirmations} confirmações
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              Detalhes da Transação
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="py-8 text-center">
              <Loader2 className="animate-spin mx-auto text-gold-500" size={32} />
              <p className="text-gray-400 mt-2">Carregando detalhes...</p>
            </div>
          ) : txDetails ? (
            <div className="space-y-6 mt-4">
              {/* Header - Asset Info */}
              <div className="bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getCryptoLogo(txDetails.asset) && (
                    <img 
                      src={getCryptoLogo(txDetails.asset)} 
                      alt={txDetails.asset} 
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="text-gold-400 font-medium">{txDetails.asset} ({txDetails.asset_name})</p>
                    <p className="text-gray-400 text-sm">{txDetails.fireblocks_asset_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-white font-light">{txDetails.amount?.toFixed(8)} {txDetails.asset}</p>
                  {txDetails.amount_usd > 0 && (
                    <p className="text-gray-400">${txDetails.amount_usd?.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Status with Progress */}
              <div>
                {(() => {
                  const statusInfo = getStatusInfo(txDetails.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusInfo.color} text-sm px-3 py-1`}>
                        <StatusIcon size={14} className={`mr-1 ${txDetails.status === 'CONFIRMING' ? 'animate-spin' : ''}`} />
                        {statusInfo.label}
                      </Badge>
                      {txDetails.num_confirmations > 0 && (
                        <span className="text-gray-400 text-sm">
                          ({txDetails.num_confirmations} confirmações)
                        </span>
                      )}
                    </div>
                  );
                })()}
                
                {/* Progress bar for confirming */}
                {txDetails.status === 'CONFIRMING' && (
                  <div className="mt-3">
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full animate-pulse"
                        style={{ width: `${Math.min((txDetails.num_confirmations / 6) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Fireblocks aguarda confirmação na blockchain
                    </p>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="space-y-4">
                {/* Transaction Hash */}
                {txDetails.tx_hash && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <span className="text-gray-400">Transaction Hash</span>
                    <div className="flex items-center gap-2">
                      <code className="text-white text-sm font-mono bg-zinc-800 px-2 py-1 rounded">
                        {truncateHash(txDetails.tx_hash)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(txDetails.tx_hash)}
                      >
                        <Copy size={14} />
                      </Button>
                      {txDetails.explorer_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(txDetails.explorer_url, '_blank')}
                        >
                          <ExternalLink size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Destination Address */}
                {txDetails.destination_address && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <span className="text-gray-400">Destination Address</span>
                    <div className="flex items-center gap-2">
                      <code className="text-white text-sm font-mono bg-zinc-800 px-2 py-1 rounded">
                        {truncateHash(txDetails.destination_address)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(txDetails.destination_address)}
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Network Fee */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <span className="text-gray-400">Network Fee</span>
                  <div className="text-right">
                    <p className="text-white">{txDetails.network_fee?.toFixed(10)} {txDetails.fee_currency || txDetails.asset}</p>
                    {txDetails.network_fee_usd > 0 && (
                      <p className="text-gray-500 text-sm">${txDetails.network_fee_usd?.toFixed(4)}</p>
                    )}
                  </div>
                </div>

                {/* Source */}
                {txDetails.source?.name && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <span className="text-gray-400">Source</span>
                    <span className="text-white">{txDetails.source.name}</span>
                  </div>
                )}

                {/* Destination Vault */}
                {txDetails.destination?.name && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <span className="text-gray-400">Destination</span>
                    <span className="text-white">{txDetails.destination.name}</span>
                  </div>
                )}

                {/* Signed By */}
                {txDetails.signed_by?.length > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <span className="text-gray-400">Signed By</span>
                    <span className="text-white">{txDetails.signed_by.join(', ')}</span>
                  </div>
                )}

                {/* Created By */}
                {txDetails.created_by && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <span className="text-gray-400">Initiator</span>
                    <span className="text-white">{txDetails.created_by}</span>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white">{formatDate(txDetails.created_at)}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white">{formatDate(txDetails.last_updated)}</span>
                </div>

                {/* Fireblocks TX ID */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                  <span className="text-gray-400">Fireblocks Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <code className="text-gold-400 text-sm font-mono">{txDetails.fireblocks_tx_id}</code>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(txDetails.fireblocks_tx_id)}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                {/* Note */}
                {txDetails.note && (
                  <div className="py-3">
                    <span className="text-gray-400 block mb-2">Note</span>
                    <p className="text-white bg-zinc-800 rounded-lg p-3">{txDetails.note}</p>
                  </div>
                )}
              </div>

              {/* Block Explorer Button */}
              {txDetails.explorer_url && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500"
                  onClick={() => window.open(txDetails.explorer_url, '_blank')}
                >
                  <ExternalLink size={16} className="mr-2" />
                  Ver no Block Explorer
                </Button>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">Não foi possível carregar os detalhes</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CryptoTransactionsPage;
