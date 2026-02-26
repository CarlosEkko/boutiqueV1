import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  QrCode,
  RefreshCw,
  Plus,
  Banknote,
  Bitcoin,
  Star,
  X,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Key for localStorage watchlist
const WATCHLIST_KEY = 'kbex_crypto_watchlist';

const WalletsPage = () => {
  const { token } = useAuth();
  const { currency, formatCurrency, convertFromUSD, currentCurrency } = useCurrency();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem(WATCHLIST_KEY);
    return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL'];
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWallets();
    fetchCryptoPrices();
  }, [token]);

  // Refetch prices when currency changes
  useEffect(() => {
    fetchCryptoPrices();
  }, [currency]);

  const fetchWallets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/wallets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWallets(response.data);
    } catch (err) {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const fetchCryptoPrices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/cryptos?currency=${currency}`);
      const pricesMap = {};
      response.data.forEach(c => {
        pricesMap[c.symbol] = {
          price: c.price || c.price_usd,
          price_usd: c.price_usd,
          logo: c.logo
        };
      });
      setCryptoPrices(pricesMap);
    } catch (err) {
      console.error('Failed to fetch prices', err);
    }
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const formatBalance = (balance, asset) => {
    const fiatAssets = ['EUR', 'USD', 'AED', 'BRL'];
    if (fiatAssets.includes(asset)) {
      return parseFloat(balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const decimals = ['BTC', 'ETH'].includes(asset) ? 8 : 2;
    return parseFloat(balance || 0).toFixed(decimals);
  };

  const fiatSymbols = {
    EUR: '€',
    USD: '$',
    AED: 'د.إ',
    BRL: 'R$'
  };

  const fiatFlags = {
    EUR: '🇪🇺',
    USD: '🇺🇸',
    AED: '🇦🇪',
    BRL: '🇧🇷'
  };

  const isFiat = (assetId) => ['EUR', 'USD', 'AED', 'BRL'].includes(assetId);

  // Get crypto value in selected currency
  const getCryptoValue = (assetId, balance) => {
    const priceInfo = cryptoPrices[assetId];
    if (priceInfo) {
      return (balance || 0) * priceInfo.price;
    }
    // Fallback for stablecoins
    if (assetId === 'USDT' || assetId === 'USDC') {
      return convertFromUSD(balance || 0);
    }
    return 0;
  };

  // Save watchlist to localStorage
  const saveWatchlist = (newWatchlist) => {
    setWatchlist(newWatchlist);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
  };

  const addToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      saveWatchlist([...watchlist, symbol]);
      toast.success(`${symbol} adicionado à watchlist`);
    }
  };

  const removeFromWatchlist = (symbol) => {
    saveWatchlist(watchlist.filter(s => s !== symbol));
    toast.success(`${symbol} removido da watchlist`);
  };

  const filteredWallets = wallets.filter(w => {
    if (activeTab === 'fiat') return isFiat(w.asset_id);
    if (activeTab === 'crypto') return !isFiat(w.asset_id);
    return true;
  });

  // Separate wallets
  const fiatWallets = filteredWallets.filter(w => isFiat(w.asset_id));
  const allCryptoWallets = filteredWallets.filter(w => !isFiat(w.asset_id));
  
  // Crypto wallets with balance
  const cryptoWithBalance = allCryptoWallets.filter(w => (w.balance || 0) > 0);
  
  // Watchlist wallets (without balance but in watchlist)
  const watchlistWallets = allCryptoWallets.filter(w => 
    (w.balance || 0) === 0 && watchlist.includes(w.asset_id)
  );
  
  // Available to add to watchlist
  const availableForWatchlist = allCryptoWallets.filter(w => 
    (w.balance || 0) === 0 && !watchlist.includes(w.asset_id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  const WalletCard = ({ wallet, isWatchlist = false, onRemove }) => {
    const isFiatWallet = isFiat(wallet.asset_id);
    // Get value in selected currency
    const cryptoValue = !isFiatWallet ? getCryptoValue(wallet.asset_id, wallet.balance) : 0;
    // Get crypto logo
    const cryptoLogo = !isFiatWallet ? cryptoPrices[wallet.asset_id]?.logo : null;
    const cryptoPrice = !isFiatWallet ? cryptoPrices[wallet.asset_id]?.price : 0;
    
    return (
      <Card 
        key={wallet.id}
        className={`bg-gradient-to-br relative ${
          isFiatWallet 
            ? 'from-emerald-900/30 to-black/90 border-emerald-800/30 hover:border-emerald-500/50' 
            : 'from-zinc-900/90 to-black/90 border-gold-800/20 hover:border-gold-500/50'
        } transition-all cursor-pointer`}
        onClick={() => setSelectedWallet(wallet)}
      >
        {/* Remove from watchlist button */}
        {isWatchlist && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-10"
            title="Remover da watchlist"
          >
            <X size={16} />
          </button>
        )}
        <CardContent className="p-6">
          {/* Asset Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                isFiatWallet 
                  ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/30'
                  : 'bg-gradient-to-br from-gold-500/30 to-gold-600/30'
              }`}>
                {isFiatWallet ? (
                  <span className="text-2xl">{fiatFlags[wallet.asset_id]}</span>
                ) : cryptoLogo ? (
                  <img 
                    src={cryptoLogo} 
                    alt={wallet.asset_id} 
                    className="w-10 h-10 rounded-full"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                {!isFiatWallet && (
                  <span className={`text-gold-400 font-bold ${cryptoLogo ? 'hidden' : ''}`}>{wallet.asset_id?.slice(0, 2)}</span>
                )}
              </div>
              <div>
                <h3 className="text-white font-medium">{wallet.asset_name}</h3>
                <p className="text-sm text-gray-400">{wallet.asset_id}</p>
              </div>
            </div>
            <Badge className={isFiatWallet ? 'bg-emerald-900/30 text-emerald-400' : 'bg-green-900/30 text-green-400'}>
              {isFiatWallet ? 'Fiat' : 'Crypto'}
            </Badge>
          </div>

          {/* Balance */}
          <div className="space-y-1 mb-4">
            <p className="text-2xl font-light text-white">
              {isFiatWallet && fiatSymbols[wallet.asset_id]}{formatBalance(wallet.balance, wallet.asset_id)} {!isFiatWallet && wallet.asset_id}
            </p>
            {!isFiatWallet && (wallet.balance || 0) > 0 && (
              <p className="text-sm text-gray-400">
                ≈ {formatCurrency(cryptoValue)}
              </p>
            )}
            {!isFiatWallet && (wallet.balance || 0) === 0 && cryptoPrice > 0 && (
              <p className="text-sm text-gray-400">
                Preço: {formatCurrency(cryptoPrice)}
              </p>
            )}
            {isFiatWallet && wallet.asset_id !== currency && (
              <p className="text-sm text-gray-400">
                ≈ {formatCurrency(convertFromUSD((wallet.balance || 0) / (fiatSymbols[wallet.asset_id] === '€' ? 0.92 : wallet.asset_id === 'AED' ? 3.67 : wallet.asset_id === 'BRL' ? 5.90 : 1)))}
              </p>
            )}
          </div>

          {/* Address (only for crypto) */}
          {!isFiatWallet && wallet.address && (
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Deposit Address</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-mono truncate max-w-[180px]">
                  {wallet.address}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyAddress(wallet.address);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-gold-400 transition-colors">
                    <QrCode size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fiat info */}
          {isFiatWallet && (
            <div className="bg-emerald-900/20 rounded-lg p-3">
              <p className="text-xs text-emerald-400">
                Depósito via transferência bancária
              </p>
            </div>
          )}

          {/* Available/Pending */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Disponível</p>
              <p className="text-white">{isFiatWallet && fiatSymbols[wallet.asset_id]}{formatBalance(wallet.available_balance, wallet.asset_id)}</p>
            </div>
            <div>
              <p className="text-gray-400">Pendente</p>
              <p className={isFiatWallet ? 'text-emerald-400' : 'text-gold-400'}>
                {isFiatWallet && fiatSymbols[wallet.asset_id]}{formatBalance(wallet.pending_balance, wallet.asset_id)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Watchlist item card (smaller)
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-light text-white">Minhas Carteiras</h1>
          <p className="text-gray-400 mt-1">Gerencie suas carteiras de criptomoedas e moedas fiat</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => window.location.href = '/dashboard/fiat-deposit'}
            data-testid="fiat-deposit-btn"
          >
            <Banknote size={18} className="mr-2" />
            Depositar Fiat
          </Button>
          <Button 
            variant="outline"
            className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
            onClick={fetchWallets}
          >
            <RefreshCw size={18} className="mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-5 py-2.5 rounded-lg transition-colors font-medium ${
            activeTab === 'all' 
              ? 'bg-gold-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('all')}
          data-testid="tab-all"
        >
          Todas
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 font-medium ${
            activeTab === 'fiat' 
              ? 'bg-gold-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('fiat')}
          data-testid="tab-fiat"
        >
          <Banknote size={16} />
          Fiat
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 font-medium ${
            activeTab === 'crypto' 
              ? 'bg-gold-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('crypto')}
          data-testid="tab-crypto"
        >
          <Bitcoin size={16} />
          Cripto
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 font-medium ${
            activeTab === 'watchlist' 
              ? 'bg-gold-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('watchlist')}
          data-testid="tab-watchlist"
        >
          <Star size={16} />
          Watchlist
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-10">
        {/* Fiat Section */}
        {(activeTab === 'all' || activeTab === 'fiat') && fiatWallets.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-emerald-400 mb-6 flex items-center gap-2">
              <Banknote size={20} />
              Carteiras Fiat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {fiatWallets.map((wallet) => (
                <WalletCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
          </div>
        )}

        {/* Crypto with Balance Section */}
        {(activeTab === 'all' || activeTab === 'crypto') && cryptoWithBalance.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gold-400 mb-6 flex items-center gap-2">
              <Bitcoin size={20} />
              Carteiras Crypto com Saldo ({cryptoWithBalance.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cryptoWithBalance.map((wallet) => (
                <WalletCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
          </div>
        )}

        {/* Watchlist Section - with Full Cards */}
        {(activeTab === 'all' || activeTab === 'watchlist') && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-400 flex items-center gap-2">
                <Star size={20} />
                Watchlist ({watchlistWallets.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} className="mr-1" />
                Adicionar
              </Button>
            </div>
            
            {watchlistWallets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {watchlistWallets.map((wallet) => (
                  <WalletCard key={wallet.id} wallet={wallet} isWatchlist onRemove={() => removeFromWatchlist(wallet.asset_id)} />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-700 rounded-lg p-8 text-center">
                <Star className="mx-auto mb-3 text-gray-600" size={32} />
                <p className="text-gray-500 mb-3">Adicione criptomoedas à sua watchlist para acompanhar</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gold-500/30 text-gold-400 hover:bg-gold-500/10"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={16} className="mr-1" />
                  Adicionar cripto
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredWallets.length === 0 && (
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Nenhuma Carteira</h3>
              <p className="text-gray-400 mb-4">
                Suas carteiras aparecerão aqui após a aprovação da conta.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add to Watchlist Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <Card 
            className="bg-zinc-900 border-zinc-700 max-w-md w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="text-gold-400" size={20} />
                  Adicionar à Watchlist
                </span>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </CardTitle>
            </CardHeader>
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar criptomoeda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
            <CardContent className="p-0 overflow-y-auto flex-1">
              <div className="divide-y divide-zinc-800">
                {availableForWatchlist
                  .filter(w => 
                    w.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    w.asset_name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((wallet) => {
                    const logo = cryptoPrices[wallet.asset_id]?.logo;
                    const price = cryptoPrices[wallet.asset_id]?.price || 0;
                    return (
                      <button
                        key={wallet.id}
                        onClick={() => {
                          addToWatchlist(wallet.asset_id);
                          setShowAddModal(false);
                        }}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center overflow-hidden">
                            {logo ? (
                              <img src={logo} alt={wallet.asset_id} className="w-6 h-6 rounded-full" />
                            ) : (
                              <span className="text-gold-400 text-xs font-bold">{wallet.asset_id?.slice(0, 2)}</span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-white font-medium">{wallet.asset_id}</p>
                            <p className="text-gray-500 text-xs">{wallet.asset_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{formatCurrency(price)}</span>
                          <Plus className="text-gold-400" size={18} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallet Details Modal */}
      {selectedWallet && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWallet(null)}
        >
          <Card 
            className={`${
              isFiat(selectedWallet.asset_id) 
                ? 'bg-zinc-900 border-emerald-800/30' 
                : 'bg-zinc-900 border-gold-800/30'
            } max-w-lg w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                  isFiat(selectedWallet.asset_id) 
                    ? 'bg-emerald-500/20' 
                    : 'bg-gold-500/20'
                }`}>
                  {isFiat(selectedWallet.asset_id) ? (
                    <span className="text-2xl">{fiatFlags[selectedWallet.asset_id]}</span>
                  ) : cryptoPrices[selectedWallet.asset_id]?.logo ? (
                    <img 
                      src={cryptoPrices[selectedWallet.asset_id]?.logo} 
                      alt={selectedWallet.asset_id} 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <span className="text-gold-400 font-bold">{selectedWallet.asset_id?.slice(0, 2)}</span>
                  )}
                </div>
                Carteira {selectedWallet.asset_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Saldo</p>
                <p className="text-3xl font-light text-white">
                  {isFiat(selectedWallet.asset_id) && fiatSymbols[selectedWallet.asset_id]}
                  {formatBalance(selectedWallet.balance, selectedWallet.asset_id)} 
                  {!isFiat(selectedWallet.asset_id) && ` ${selectedWallet.asset_id}`}
                </p>
                {!isFiat(selectedWallet.asset_id) && (
                  <p className="text-sm text-gray-400 mt-1">
                    ≈ {formatCurrency(getCryptoValue(selectedWallet.asset_id, selectedWallet.balance))}
                  </p>
                )}
              </div>
              
              {!isFiat(selectedWallet.asset_id) && selectedWallet.address && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Endereço de Depósito</p>
                  <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                    <p className="text-white font-mono text-sm break-all">{selectedWallet.address}</p>
                    <button
                      onClick={() => copyAddress(selectedWallet.address)}
                      className="ml-2 p-2 text-gold-400 hover:text-gold-300"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              )}

              {isFiat(selectedWallet.asset_id) && (
                <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-emerald-400 text-sm">
                    Para depositar {selectedWallet.asset_name}, utilize a página de Depósito Fiat.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  className={`flex-1 ${isFiat(selectedWallet.asset_id) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-green-600 hover:bg-green-500'}`} 
                  onClick={() => window.location.href = isFiat(selectedWallet.asset_id) ? '/dashboard/fiat-deposit' : '/dashboard/exchange'}
                >
                  {isFiat(selectedWallet.asset_id) ? 'Depositar' : 'Comprar'}
                </Button>
                <Button 
                  className={`flex-1 ${isFiat(selectedWallet.asset_id) ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-gold-500 hover:bg-gold-400'}`}
                  onClick={() => window.location.href = '/dashboard/exchange'}
                >
                  {isFiat(selectedWallet.asset_id) ? 'Sacar' : 'Vender'}
                </Button>
              </div>

              {!isFiat(selectedWallet.asset_id) && (
                <p className="text-xs text-gray-500 text-center">
                  Depósito e saque de cripto serão habilitados com a integração Fireblocks
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WalletsPage;
