import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  Send, 
  Wallet, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Info,
  Shield,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Network logos
const NETWORK_LOGOS = {
  'ERC20': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  'TRC20': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
  'BEP20': 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
  'SOL': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  'ALGO': 'https://s2.coinmarketcap.com/static/img/coins/64x64/4030.png',
  'AVAX': 'https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png',
  'POLYGON': 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
  'ARB': 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png',
  'OP': 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png',
  'BASE': 'https://s2.coinmarketcap.com/static/img/coins/64x64/27716.png',
};

// Multi-network assets
const MULTI_NETWORK_ASSETS = ['USDT', 'USDC', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE'];

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

const CryptoWithdrawalPage = () => {
  const { token } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [step, setStep] = useState(1); // 1: Select asset, 2: Enter details, 3: Confirm
  
  // Network selection
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [selectedWhitelistEntry, setSelectedWhitelistEntry] = useState(null);
  const [note, setNote] = useState('');
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  
  // Fee estimate (mock - would come from backend)
  const networkFee = 0.0001;
  const platformFee = 0.001; // 0.1%

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletsRes, whitelistRes, withdrawalsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/wallets`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/crypto-wallets/whitelist`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/crypto-wallets/withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      // Filter for crypto wallets with balance
      const cryptoWallets = walletsRes.data.filter(w => 
        w.asset_type === 'crypto' && w.balance > 0
      );
      setWallets(cryptoWallets);
      setWhitelist(whitelistRes.data.whitelist || []);
      setPendingWithdrawals(withdrawalsRes.data.filter(w => 
        ['pending', 'approved', 'processing'].includes(w.status)
      ));
    } catch (err) {
      toast.error('Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getWhitelistForAsset = (asset) => {
    return whitelist.filter(w => w.asset === asset && w.is_active);
  };

  const calculateFees = () => {
    const amountNum = parseFloat(amount) || 0;
    const fee = amountNum * platformFee;
    const netAmount = amountNum - fee - networkFee;
    return {
      amount: amountNum,
      platformFee: fee,
      networkFee,
      netAmount: netAmount > 0 ? netAmount : 0
    };
  };

  const handleSelectAsset = async (wallet) => {
    setSelectedAsset(wallet);
    setStep(2);
    setAmount('');
    setDestinationAddress('');
    setSelectedWhitelistEntry(null);
    setNote('');
    setUseManualAddress(false);
    setManualAddress('');
    setNetworks([]);
    setSelectedNetwork(null);
    
    // Check if multi-network asset and fetch networks
    if (MULTI_NETWORK_ASSETS.includes(wallet.asset_id)) {
      setLoadingNetworks(true);
      try {
        const response = await axios.get(
          `${API_URL}/api/crypto-wallets/networks/${wallet.asset_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedNetworks = response.data.networks || [];
        setNetworks(fetchedNetworks);
        if (fetchedNetworks.length > 0) {
          setSelectedNetwork(fetchedNetworks[0]);
        }
      } catch (err) {
        console.error('Failed to fetch networks', err);
      } finally {
        setLoadingNetworks(false);
      }
    }
  };

  const handleSelectWhitelistAddress = (entry) => {
    setSelectedWhitelistEntry(entry);
    setDestinationAddress(entry.address);
    setUseManualAddress(false);
    setManualAddress('');
  };

  const handleManualAddressChange = (value) => {
    setManualAddress(value);
    setDestinationAddress(value);
    setSelectedWhitelistEntry(null);
  };

  const handleMaxAmount = () => {
    if (selectedAsset) {
      const maxAmount = selectedAsset.balance - networkFee - (selectedAsset.balance * platformFee);
      setAmount(maxAmount > 0 ? maxAmount.toFixed(8) : '0');
    }
  };

  const handleContinue = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Insira um valor válido');
      return;
    }
    
    if (parseFloat(amount) > selectedAsset.balance) {
      toast.error('Saldo insuficiente');
      return;
    }
    
    if (!destinationAddress) {
      toast.error('Selecione um endereço de destino');
      return;
    }
    
    setStep(3);
  };

  const handleSubmitWithdrawal = async () => {
    setSubmitting(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/crypto-wallets/withdraw`, {
        asset: selectedAsset.asset_id,
        amount: parseFloat(amount),
        destination_address: destinationAddress,
        note: note || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Solicitação de levantamento enviada!');
      setStep(1);
      setSelectedAsset(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao processar levantamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setStep(1);
    setSelectedAsset(null);
    setAmount('');
    setDestinationAddress('');
    setSelectedWhitelistEntry(null);
    setNote('');
    setUseManualAddress(false);
    setManualAddress('');
  };

  const fees = calculateFees();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">{t('dashboard.cryptoWithdrawal.title')}</h1>
        <p className="text-gray-400 mt-1">{t('dashboard.cryptoWithdrawal.subtitle')}</p>
      </div>

      {/* Pending Withdrawals Warning */}
      {pendingWithdrawals.length > 0 && (
        <Card className="bg-amber-900/20 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-400" size={20} />
            <div>
              <p className="text-amber-400 font-medium">
                {pendingWithdrawals.length} {t('dashboard.cryptoWithdrawal.pendingWithdrawals')}
              </p>
              <p className="text-amber-300/80 text-sm">
                {t('dashboard.cryptoWithdrawal.awaitingApproval')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-4 py-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-gold-500 text-black' : 'bg-zinc-700 text-gray-400'
            }`}>
              {s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-0.5 ${step > s ? 'bg-gold-500' : 'bg-zinc-700'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-8 text-sm text-gray-400 mb-6">
        <span className={step === 1 ? 'text-gold-400' : ''}>{t('dashboard.cryptoWithdrawal.selectAsset')}</span>
        <span className={step === 2 ? 'text-gold-400' : ''}>{t('dashboard.cryptoWithdrawal.details')}</span>
        <span className={step === 3 ? 'text-gold-400' : ''}>{t('dashboard.cryptoWithdrawal.confirm')}</span>
      </div>

      {/* Step 1: Select Asset */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.length === 0 ? (
            <Card className="col-span-full bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Wallet className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-gray-400">{t('dashboard.cryptoWithdrawal.noBalanceAvailable')}</p>
                <p className="text-gray-500 text-sm mt-1">{t('dashboard.cryptoWithdrawal.depositFirst')}</p>
              </CardContent>
            </Card>
          ) : (
            wallets.map((wallet) => {
              const logo = getCryptoLogo(wallet.asset_id);
              const hasWhitelist = getWhitelistForAsset(wallet.asset_id).length > 0;
              
              return (
                <Card 
                  key={wallet.id}
                  className="bg-zinc-900/50 border-gold-800/20 cursor-pointer transition-all hover:border-gold-500/50"
                  onClick={() => handleSelectAsset(wallet)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {logo && <img src={logo} alt={wallet.asset_id} className="w-10 h-10 rounded-full" />}
                      <div className="flex-1">
                        <p className="text-white font-medium">{wallet.asset_id}</p>
                        <p className="text-gray-400 text-sm">{wallet.asset_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{wallet.balance?.toFixed(8)}</p>
                        {hasWhitelist && (
                          <Badge className="bg-green-500/20 text-green-400 text-xs mt-1">
                            <Shield size={10} className="mr-1" /> {t('dashboard.cryptoWithdrawal.whitelist')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Step 2: Enter Details */}
      {step === 2 && selectedAsset && (
        <Card className="bg-zinc-900/50 border-gold-800/20 max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              {getCryptoLogo(selectedAsset.asset_id) && (
                <img 
                  src={getCryptoLogo(selectedAsset.asset_id)} 
                  alt={selectedAsset.asset_id} 
                  className="w-8 h-8 rounded-full"
                />
              )}
              {t('dashboard.cryptoWithdrawal.withdraw')} {selectedAsset.asset_id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Balance */}
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Saldo disponível</p>
              <p className="text-2xl text-white font-light">
                {selectedAsset.balance?.toFixed(8)} {selectedAsset.asset_id}
              </p>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-gray-300">Quantidade</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                  className="bg-zinc-800 border-zinc-700 text-white font-mono"
                  step="0.00000001"
                />
                <Button 
                  variant="outline" 
                  onClick={handleMaxAmount}
                  className="border-gold-500 text-gold-400 hover:bg-gold-500/10"
                >
                  MAX
                </Button>
              </div>
            </div>

            {/* Network Selection for multi-network assets */}
            {networks.length > 1 && (
              <div>
                <Label className="text-gray-300">Rede de Envio</Label>
                <p className="text-gray-500 text-xs mt-1 mb-2">
                  Certifique-se que o endereço de destino suporta esta rede
                </p>
                
                {loadingNetworks ? (
                  <div className="flex items-center gap-2 text-gray-400 py-2">
                    <RefreshCw className="animate-spin" size={14} />
                    Carregando redes...
                  </div>
                ) : (
                  <>
                    {/* Dropdown selector */}
                    <div className="relative mb-3">
                      <select
                        value={selectedNetwork?.network || ''}
                        onChange={(e) => {
                          const net = networks.find(n => n.network === e.target.value);
                          if (net) setSelectedNetwork(net);
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold-500 appearance-none cursor-pointer pr-10"
                      >
                        {networks.map((net) => (
                          <option key={net.network} value={net.network}>
                            {net.network} - {net.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                    
                    {/* Network buttons with logos */}
                    <div className="grid grid-cols-3 gap-2">
                      {networks.slice(0, 6).map((net) => (
                        <button
                          key={net.network}
                          onClick={() => setSelectedNetwork(net)}
                          className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                            selectedNetwork?.network === net.network
                              ? 'bg-gold-500/20 border-gold-500'
                              : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          {NETWORK_LOGOS[net.network] && (
                            <img 
                              src={NETWORK_LOGOS[net.network]} 
                              alt={net.network}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className={`text-xs ${
                            selectedNetwork?.network === net.network ? 'text-gold-400' : 'text-gray-400'
                          }`}>
                            {net.network}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Address Selection - Manual OR Whitelist */}
            <div>
              <Label className="text-gray-300">Endereço de Destino</Label>
              
              {/* Toggle between manual and whitelist */}
              <div className="flex gap-2 mt-2 mb-4">
                <button
                  onClick={() => {
                    setUseManualAddress(false);
                    setManualAddress('');
                    if (!selectedWhitelistEntry) {
                      setDestinationAddress('');
                    }
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !useManualAddress
                      ? 'bg-gold-500/20 border border-gold-500 text-gold-400'
                      : 'bg-zinc-800 border border-zinc-700 text-gray-400 hover:border-zinc-600'
                  }`}
                >
                  Whitelist
                </button>
                <button
                  onClick={() => {
                    setUseManualAddress(true);
                    setSelectedWhitelistEntry(null);
                    setDestinationAddress(manualAddress);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    useManualAddress
                      ? 'bg-gold-500/20 border border-gold-500 text-gold-400'
                      : 'bg-zinc-800 border border-zinc-700 text-gray-400 hover:border-zinc-600'
                  }`}
                >
                  Endereço Manual
                </button>
              </div>

              {/* Manual Address Input */}
              {useManualAddress && (
                <div className="space-y-2">
                  <Input
                    value={manualAddress}
                    onChange={(e) => handleManualAddressChange(e.target.value)}
                    placeholder={`Endereço ${selectedAsset.asset_id}...`}
                    className="bg-zinc-800 border-zinc-700 text-white font-mono"
                  />
                  <p className="text-amber-400 text-xs flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Verifique o endereço cuidadosamente. Transações são irreversíveis.
                  </p>
                </div>
              )}

              {/* Whitelist Selection */}
              {!useManualAddress && (
                <div className="space-y-2">
                  {getWhitelistForAsset(selectedAsset.asset_id).length > 0 ? (
                    getWhitelistForAsset(selectedAsset.asset_id).map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => handleSelectWhitelistAddress(entry)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedWhitelistEntry?.id === entry.id
                            ? 'bg-gold-500/20 border border-gold-500'
                            : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'
                        }`}
                      >
                        <p className="text-white font-medium">{entry.label}</p>
                        <p className="text-gray-400 text-sm font-mono truncate">{entry.address}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center">
                      <p className="text-gray-400 text-sm mb-2">
                        Nenhum endereço na whitelist para {selectedAsset.asset_id}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-gold-500/50 text-gold-400 hover:bg-gold-500/10"
                          onClick={() => setUseManualAddress(true)}
                        >
                          Usar endereço manual
                        </Button>
                        <Button 
                          variant="link" 
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => window.location.href = '/dashboard/whitelist'}
                        >
                          Adicionar à whitelist →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note (optional) */}
            <div>
              <Label className="text-gray-300">Nota (opcional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Descrição do levantamento"
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>

            {/* Fee Summary */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Quantidade</span>
                  <span className="text-white">{fees.amount.toFixed(8)} {selectedAsset.asset_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Taxa da plataforma (0.1%)</span>
                  <span className="text-red-400">-{fees.platformFee.toFixed(8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Taxa de rede (estimada)</span>
                  <span className="text-red-400">-{fees.networkFee.toFixed(8)}</span>
                </div>
                <div className="border-t border-zinc-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300 font-medium">Você receberá</span>
                    <span className="text-green-400 font-medium">
                      {fees.netAmount.toFixed(8)} {selectedAsset.asset_id}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleCancel} 
                className="flex-1 border-zinc-600 text-white hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleContinue}
                disabled={!amount || !destinationAddress}
                className="flex-1 bg-gold-500 hover:bg-gold-400 text-black"
              >
                Continuar <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selectedAsset && (
        <Card className="bg-zinc-900/50 border-gold-800/20 max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Confirmar Levantamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Ativo</span>
                <div className="flex items-center gap-2">
                  {getCryptoLogo(selectedAsset.asset_id) && (
                    <img 
                      src={getCryptoLogo(selectedAsset.asset_id)} 
                      alt={selectedAsset.asset_id} 
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-white font-medium">{selectedAsset.asset_id}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Quantidade</span>
                <span className="text-white">{parseFloat(amount).toFixed(8)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Taxa total</span>
                <span className="text-red-400">
                  -{(fees.platformFee + fees.networkFee).toFixed(8)}
                </span>
              </div>
              
              <div className="border-t border-zinc-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Valor final</span>
                  <span className="text-green-400 text-xl font-medium">
                    {fees.netAmount.toFixed(8)} {selectedAsset.asset_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-2">Endereço de destino</p>
              {selectedWhitelistEntry && (
                <p className="text-gold-400 font-medium mb-1">{selectedWhitelistEntry.label}</p>
              )}
              <p className="text-white font-mono text-sm break-all">{destinationAddress}</p>
            </div>

            {/* Warning */}
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-amber-400 font-medium">Importante</p>
                  <p className="text-amber-300/80 text-sm mt-1">
                    Verifique cuidadosamente o endereço. Transações na blockchain são irreversíveis.
                    Este levantamento requer aprovação de um administrador.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)} 
                className="flex-1 border-zinc-600 text-white hover:bg-zinc-800 hover:text-white"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleSubmitWithdrawal}
                disabled={submitting}
                className="flex-1 bg-gold-500 hover:bg-gold-400 text-black"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" size={16} />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Confirmar Levantamento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CryptoWithdrawalPage;
