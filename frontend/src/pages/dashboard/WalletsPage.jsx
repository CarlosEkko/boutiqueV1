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
  Bitcoin
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WalletsPage = () => {
  const { token } = useAuth();
  const { currency, formatCurrency, convertFromUSD, currentCurrency } = useCurrency();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [cryptoPrices, setCryptoPrices] = useState({});

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

  const filteredWallets = wallets.filter(w => {
    if (activeTab === 'fiat') return isFiat(w.asset_id);
    if (activeTab === 'crypto') return !isFiat(w.asset_id);
    return true;
  });

  // Separate and sort wallets
  const fiatWallets = filteredWallets.filter(w => isFiat(w.asset_id));
  const cryptoWallets = filteredWallets.filter(w => !isFiat(w.asset_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  const WalletCard = ({ wallet }) => {
    const isFiatWallet = isFiat(wallet.asset_id);
    // Get value in selected currency
    const cryptoValue = !isFiatWallet ? getCryptoValue(wallet.asset_id, wallet.balance) : 0;
    // Get crypto logo
    const cryptoLogo = !isFiatWallet ? cryptoPrices[wallet.asset_id]?.logo : null;
    
    return (
      <Card 
        key={wallet.id}
        className={`bg-gradient-to-br ${
          isFiatWallet 
            ? 'from-emerald-900/30 to-black/90 border-emerald-800/30 hover:border-emerald-500/50' 
            : 'from-zinc-900/90 to-black/90 border-gold-800/20 hover:border-gold-500/50'
        } transition-all cursor-pointer`}
        onClick={() => setSelectedWallet(wallet)}
      >
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
            {!isFiatWallet && (
              <p className="text-sm text-gray-400">
                ≈ {formatCurrency(cryptoValue)}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">Minhas Carteiras</h1>
          <p className="text-gray-400 mt-1">Gerencie suas carteiras de criptomoedas e moedas fiat</p>
        </div>
        <div className="flex gap-2">
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
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'all' 
              ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('all')}
          data-testid="tab-all"
        >
          Todas
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'fiat' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('fiat')}
          data-testid="tab-fiat"
        >
          <Banknote size={16} />
          Fiat
        </button>
        <button
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'crypto' 
              ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('crypto')}
          data-testid="tab-crypto"
        >
          <Bitcoin size={16} />
          Cripto
        </button>
      </div>

      {/* Wallets Grid */}
      {filteredWallets.length > 0 ? (
        <div className="space-y-6">
          {/* Fiat Section */}
          {(activeTab === 'all' || activeTab === 'fiat') && fiatWallets.length > 0 && (
            <div>
              {activeTab === 'all' && (
                <h2 className="text-lg font-medium text-emerald-400 mb-4 flex items-center gap-2">
                  <Banknote size={20} />
                  Carteiras Fiat
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {fiatWallets.map((wallet) => (
                  <WalletCard key={wallet.id} wallet={wallet} />
                ))}
              </div>
            </div>
          )}

          {/* Crypto Section */}
          {(activeTab === 'all' || activeTab === 'crypto') && cryptoWallets.length > 0 && (
            <div>
              {activeTab === 'all' && (
                <h2 className="text-lg font-medium text-gold-400 mb-4 flex items-center gap-2">
                  <Bitcoin size={20} />
                  Carteiras Cripto
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cryptoWallets.map((wallet) => (
                  <WalletCard key={wallet.id} wallet={wallet} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isFiat(selectedWallet.asset_id) 
                    ? 'bg-emerald-500/20' 
                    : 'bg-gold-500/20'
                }`}>
                  {isFiat(selectedWallet.asset_id) ? (
                    <span className="text-emerald-400 font-bold">{fiatSymbols[selectedWallet.asset_id]}</span>
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
