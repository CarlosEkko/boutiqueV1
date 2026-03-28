import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowDownLeft,
  Copy,
  Wallet,
  RefreshCw,
  QrCode,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Network logos
const NETWORK_LOGOS = {
  'ERC20': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png', // ETH
  'TRC20': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png', // TRX
  'BEP20': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png', // BNB
  'SOL': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png', // SOL
  'ALGO': 'https://s2.coinmarketcap.com/static/img/coins/64x64/4030.png', // ALGO
  'AVAX': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png', // AVAX
  'POLYGON': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png', // MATIC
  'ARB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png', // ARB
  'OP': 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png', // OP
  'BASE': 'https://s2.coinmarketcap.com/static/img/coins/64x64/27716.png', // BASE
};

// Multi-network assets
const MULTI_NETWORK_ASSETS = ['USDT', 'USDC', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE'];

const CryptoDepositPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [vaultStatus, setVaultStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [depositAddress, setDepositAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  
  // Network selection
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [loadingNetworks, setLoadingNetworks] = useState(false);

  // Popular cryptos to show first
  const popularCryptos = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'MATIC'];

  useEffect(() => {
    fetchVaultStatus();
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

  const initializeWallet = async () => {
    setInitializing(true);
    try {
      await axios.post(
        `${API_URL}/api/crypto-wallets/initialize`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Carteira crypto inicializada!');
      fetchVaultStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao inicializar carteira');
    } finally {
      setInitializing(false);
    }
  };

  const getDepositAddress = async (symbol, network = null) => {
    setSelectedAsset(symbol);
    setLoadingAddress(true);
    setDepositAddress(null);
    setQrCode(null);

    // Check if multi-network asset and fetch networks
    if (MULTI_NETWORK_ASSETS.includes(symbol)) {
      setLoadingNetworks(true);
      try {
        const netResponse = await axios.get(
          `${API_URL}/api/crypto-wallets/networks/${symbol}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedNetworks = netResponse.data.networks || [];
        setNetworks(fetchedNetworks);
        
        // Use provided network or default to first
        const networkToUse = network || fetchedNetworks[0]?.network;
        setSelectedNetwork(fetchedNetworks.find(n => n.network === networkToUse) || fetchedNetworks[0]);
        
        // Fetch address for selected network
        if (networkToUse) {
          await fetchAddressForNetwork(symbol, networkToUse);
        }
      } catch (err) {
        console.error('Failed to fetch networks', err);
        // Fallback to default fetch
        await fetchDefaultAddress(symbol);
      } finally {
        setLoadingNetworks(false);
      }
    } else {
      // Single network asset
      setNetworks([]);
      setSelectedNetwork(null);
      await fetchDefaultAddress(symbol);
    }
    
    setLoadingAddress(false);
  };

  const fetchAddressForNetwork = async (symbol, network) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/crypto-wallets/deposit-address/${symbol}/${network}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepositAddress(response.data);
      
      // Generate QR code
      if (response.data.address) {
        const qr = await QRCode.toDataURL(response.data.address, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQrCode(qr);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao obter endereço');
    }
  };

  const fetchDefaultAddress = async (symbol) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/crypto-wallets/deposit-address/${symbol}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepositAddress(response.data);

      // Generate QR code
      if (response.data.address) {
        const qr = await QRCode.toDataURL(response.data.address, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQrCode(qr);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao obter endereço');
    }
  };

  const handleNetworkChange = async (network) => {
    const net = networks.find(n => n.network === network);
    if (net) {
      setSelectedNetwork(net);
      setLoadingAddress(true);
      await fetchAddressForNetwork(selectedAsset, network);
      setLoadingAddress(false);
    }
  };

  const copyAddress = () => {
    if (depositAddress?.address) {
      navigator.clipboard.writeText(depositAddress.address);
      toast.success('Endereço copiado!');
    }
  };

  // Get sorted list of cryptos
  const getSortedCryptos = () => {
    const allSymbols = Object.keys(cryptoPrices);
    
    // Filter by search
    const filtered = allSymbols.filter(symbol => {
      const crypto = cryptoPrices[symbol];
      const term = searchTerm.toLowerCase();
      return symbol.toLowerCase().includes(term) || 
             crypto?.name?.toLowerCase().includes(term);
    });

    // Sort: popular first, then alphabetically
    return filtered.sort((a, b) => {
      const aPopular = popularCryptos.indexOf(a);
      const bPopular = popularCryptos.indexOf(b);
      
      if (aPopular >= 0 && bPopular >= 0) return aPopular - bPopular;
      if (aPopular >= 0) return -1;
      if (bPopular >= 0) return 1;
      return a.localeCompare(b);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  // Wallet not initialized
  if (!vaultStatus?.has_vault) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard.cryptoDeposit.title')}</h1>
          <p className="text-gray-400">{t('dashboard.cryptoDeposit.subtitle')}</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Wallet size={48} className="text-gold-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('dashboard.cryptoDeposit.initializeWallet')}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {t('dashboard.cryptoDeposit.initializeDesc')}
            </p>
            <Button
              onClick={initializeWallet}
              disabled={initializing}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              {initializing ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  {t('dashboard.cryptoDeposit.initializing')}
                </>
              ) : (
                <>
                  <Wallet size={16} className="mr-2" />
                  {t('dashboard.cryptoDeposit.initializeBtn')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedCryptos = getSortedCryptos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('dashboard.cryptoDeposit.title')}</h1>
        <p className="text-gray-400">{t('dashboard.cryptoDeposit.selectCurrencyToSee')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crypto Selection */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search size={20} />
              {t('dashboard.cryptoDeposit.selectCurrency')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder={t('dashboard.cryptoDeposit.searchCurrency')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
              {sortedCryptos.map(symbol => {
                const crypto = cryptoPrices[symbol];
                const isSelected = selectedAsset === symbol;
                const isPopular = popularCryptos.includes(symbol);

                return (
                  <button
                    key={symbol}
                    onClick={() => getDepositAddress(symbol)}
                    className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500'
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {crypto?.logo && (
                        <img 
                          src={crypto.logo} 
                          alt={symbol}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div className="text-left">
                        <div className="font-medium text-white flex items-center gap-2">
                          {symbol}
                          {isPopular && (
                            <Badge className="bg-gold-500/20 text-gold-400 text-xs border-0">
                              {t('dashboard.cryptoDeposit.popular')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{crypto?.name}</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle size={16} className="text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Address */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowDownLeft size={20} />
              {t('dashboard.cryptoDeposit.depositAddress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAsset ? (
              <div className="text-center py-12 text-gray-400">
                <QrCode size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('dashboard.cryptoDeposit.selectCurrencyToSee')}</p>
              </div>
            ) : loadingAddress ? (
              <div className="text-center py-12">
                <RefreshCw size={32} className="animate-spin text-gold-400 mx-auto mb-4" />
                <p className="text-gray-400">{t('dashboard.cryptoDeposit.generatingAddress')}</p>
              </div>
            ) : depositAddress ? (
              <div className="space-y-6">
                {/* Selected Asset */}
                <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                  {cryptoPrices[selectedAsset]?.logo && (
                    <img 
                      src={cryptoPrices[selectedAsset].logo} 
                      alt={selectedAsset}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-white text-lg">{selectedAsset}</div>
                    <div className="text-sm text-gray-400">{cryptoPrices[selectedAsset]?.name}</div>
                  </div>
                </div>

                {/* Network Selector for multi-network assets */}
                {networks.length > 1 && (
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">{t('dashboard.cryptoDeposit.selectNetwork')}</label>
                    
                    {/* Network cards with logos */}
                    <div className="grid grid-cols-3 gap-2">
                      {networks.slice(0, 6).map((net) => (
                        <button
                          key={net.network}
                          onClick={() => handleNetworkChange(net.network)}
                          disabled={loadingAddress}
                          className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                            selectedNetwork?.network === net.network
                              ? 'bg-gold-500/20 border-gold-500'
                              : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          {NETWORK_LOGOS[net.network] && (
                            <img 
                              src={NETWORK_LOGOS[net.network]} 
                              alt={net.network}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className={`text-sm font-medium ${
                            selectedNetwork?.network === net.network ? 'text-gold-400' : 'text-gray-400'
                          }`}>
                            {net.network}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR Code */}
                {qrCode && (
                  <div className="flex justify-center mt-6">
                    <div className="bg-white p-3 rounded-lg">
                      <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                  </div>
                )}

                {/* Address */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">{t('dashboard.cryptoDeposit.address')}</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={depositAddress.address || t('dashboard.cryptoDeposit.generatingAddress')}
                      readOnly
                      className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={copyAddress}
                      className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>

                {/* Network Info */}
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">{t('dashboard.cryptoDeposit.network')}</span>
                    <div className="flex items-center gap-2">
                      {selectedNetwork && NETWORK_LOGOS[selectedNetwork.network] && (
                        <img 
                          src={NETWORK_LOGOS[selectedNetwork.network]} 
                          alt={selectedNetwork.network}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="text-white">{depositAddress.network || selectedNetwork?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
                  <div className="text-sm">
                    <p className="text-yellow-400 font-medium mb-1">{t('dashboard.cryptoDeposit.important')}</p>
                    <p className="text-gray-400">
                      {t('dashboard.cryptoDeposit.sendOnly').replace('{asset}', selectedAsset)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertTriangle size={32} className="mx-auto mb-2 text-red-400" />
                <p>{t('dashboard.cryptoDeposit.errorGettingAddress')}</p>
                <Button
                  variant="outline"
                  onClick={() => getDepositAddress(selectedAsset)}
                  className="mt-4 border-zinc-700"
                >
                  {t('dashboard.cryptoDeposit.tryAgain')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CryptoDepositPage;
