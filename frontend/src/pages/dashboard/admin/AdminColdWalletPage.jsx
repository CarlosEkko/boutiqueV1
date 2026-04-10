import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Shield, Usb, Copy, RefreshCw, Loader2, AlertCircle,
  CheckCircle, HardDrive, Wallet, Lock, ArrowUpRight,
  ArrowDownLeft, X, ExternalLink, Zap, Clock, Snail
} from 'lucide-react';
import { toast } from 'sonner';
import {
  initTrezor, getDeviceFeatures, getAddress, getAccountInfo,
  formatBalance, BLOCKCHAIN_CONFIG, signBtcTransaction,
  signEthTransaction, composeInputs, composeOutputs,
  ethToWei, toHex
} from '../../../utils/trezorConnect';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COIN_COLORS = {
  BTC: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-800/20', accent: '#f97316' },
  ETH: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-800/20', accent: '#60a5fa' },
  LTC: { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-800/20', accent: '#9ca3af' },
};

const EXPLORER_URLS = {
  BTC: 'https://blockstream.info/tx/',
  ETH: 'https://etherscan.io/tx/',
  LTC: 'https://blockchair.com/litecoin/transaction/',
};

// ─── Receive Modal ───────────────────────────────────────────
const ReceiveModal = ({ coin, address, onClose }) => {
  const colors = COIN_COLORS[coin] || COIN_COLORS.LTC;
  const cfg = BLOCKCHAIN_CONFIG[coin];
  const qrValue = coin === 'ETH' ? `ethereum:${address}` : coin === 'BTC' ? `bitcoin:${address}` : `litecoin:${address}`;

  const copyAddr = () => {
    navigator.clipboard.writeText(address);
    toast.success('Endereço copiado!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 space-y-6" onClick={e => e.stopPropagation()} data-testid="admin-receive-modal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowDownLeft className={colors.text} size={22} />
            <h3 className="text-white text-lg font-medium">Receber {cfg?.name} (Tesouraria)</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={qrValue} size={200} level="M" />
          </div>
          <Badge className={`${colors.bg} ${colors.text} border-0 text-sm px-3 py-1`}>{coin}</Badge>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">Endereço {coin}</Label>
          <div className="flex items-center gap-2 bg-zinc-800/70 rounded-lg p-3 border border-zinc-700">
            <p className="text-white font-mono text-xs break-all flex-1">{address}</p>
            <button onClick={copyAddr} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
              <Copy size={16} />
            </button>
          </div>
        </div>

        <Button onClick={copyAddr} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600">
          <Copy size={14} className="mr-2" /> Copiar Endereço
        </Button>
      </div>
    </div>
  );
};

// ─── Send Modal (Treasury) ───────────────────────────────────
const SendModal = ({ coin, wallet, token, onClose, onSuccess }) => {
  const colors = COIN_COLORS[coin] || COIN_COLORS.LTC;
  const cfg = BLOCKCHAIN_CONFIG[coin];
  const isEth = coin === 'ETH';

  const [step, setStep] = useState(1);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [feeLevel, setFeeLevel] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState(null);
  const [ethParams, setEthParams] = useState(null);
  const [utxos, setUtxos] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const loadData = async () => {
      try {
        const feeRes = await axios.get(`${API_URL}/api/cold-wallet/admin/fee-estimate/${coin}`, { headers });
        setFees(feeRes.data);
        if (isEth) {
          const ethRes = await axios.get(`${API_URL}/api/cold-wallet/admin/eth-params/${wallet.address}`, { headers });
          setEthParams(ethRes.data);
        } else {
          const utxoRes = await axios.get(`${API_URL}/api/cold-wallet/admin/utxos/${wallet.address}?coin=${coin}`, { headers });
          setUtxos(utxoRes.data.utxos || []);
        }
      } catch (err) {
        console.error('Failed to load send data', err);
      }
    };
    loadData();
  }, [coin, wallet.address]);

  const getAvailableBalance = () => {
    if (isEth && ethParams) return ethParams.balance_eth;
    return parseFloat(formatBalance(wallet.balance, cfg.decimals));
  };

  const getEstimatedFee = () => {
    if (!fees) return '...';
    if (isEth) {
      const gasPrice = fees.gas_price_gwei || 20;
      return `${((gasPrice * 21000) / 1e9).toFixed(6)} ETH`;
    }
    const feeRate = fees[feeLevel] || 10;
    return `${((feeRate * 250) / 1e8).toFixed(8)} ${coin}`;
  };

  const handleReview = () => {
    setError('');
    if (!toAddress.trim()) { setError('Insira o endereço de destino'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Insira um montante válido'); return; }
    if (parseFloat(amount) > getAvailableBalance()) { setError('Saldo insuficiente'); return; }
    setStep(2);
  };

  const handleSend = async () => {
    setStep(3);
    setLoading(true);
    setError('');
    try {
      let signedHex;
      if (isEth) {
        const gasPrice = ethParams?.gas_price || 20000000000;
        const nonce = ethParams?.nonce || 0;
        const txParams = {
          to: toAddress, value: ethToWei(amount),
          gasLimit: toHex(21000), gasPrice: toHex(gasPrice), nonce: toHex(nonce), chainId: 1,
        };
        const sig = await signEthTransaction(cfg.path, txParams);
        signedHex = sig.serializedTx || `${sig.v}${sig.r}${sig.s}`;
      } else {
        const amountSat = Math.round(parseFloat(amount) * 10 ** cfg.decimals);
        const feeRate = fees?.[feeLevel] || 10;
        const feeSat = feeRate * 250;
        if (!utxos || utxos.length === 0) throw new Error('Nenhum UTXO disponível');
        const { inputs, totalInput } = composeInputs(utxos, amountSat, feeSat, cfg.path);
        const outputs = composeOutputs(toAddress, amountSat, totalInput, feeSat, wallet.address);
        const result = await signBtcTransaction(inputs, outputs, cfg.coin);
        signedHex = result.serializedTx;
      }

      const broadcastRes = await axios.post(`${API_URL}/api/cold-wallet/admin/broadcast`, {
        coin, hex_tx: signedHex, from_address: wallet.address,
        to_address: toAddress, amount, wallet_type: 'treasury',
      }, { headers });

      setTxResult(broadcastRes.data);
      setStep(4);
      toast.success('Transação da Tesouraria transmitida!');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Falha ao assinar/transmitir transação');
      setStep(2);
      toast.error(err.message || 'Falha na transação');
    } finally {
      setLoading(false);
    }
  };

  const feeLevels = [
    { key: 'fast', label: 'Rápida', icon: Zap, desc: '~10 min' },
    { key: 'medium', label: 'Normal', icon: Clock, desc: '~30 min' },
    { key: 'slow', label: 'Económica', icon: Snail, desc: '~60 min' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg mx-4 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="admin-send-modal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowUpRight className={colors.text} size={22} />
            <h3 className="text-white text-lg font-medium">Enviar {cfg?.name} (Tesouraria)</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-2">
          {[1,2,3,4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-gold-500' : 'bg-zinc-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-gray-400 text-sm">Saldo Tesouraria</span>
              <span className="text-white font-mono">{getAvailableBalance()} {coin}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Endereço de Destino</Label>
              <Input value={toAddress} onChange={e => setToAddress(e.target.value)}
                placeholder={isEth ? '0x...' : 'bc1...'} className="bg-zinc-800/50 border-zinc-700 text-white font-mono text-sm" data-testid="admin-send-to" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Montante ({coin})</Label>
              <div className="relative">
                <Input type="number" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" className="bg-zinc-800/50 border-zinc-700 text-white font-mono pr-16" data-testid="admin-send-amount" />
                <button onClick={() => setAmount(String(getAvailableBalance()))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gold-400 text-xs font-medium hover:text-gold-300">MAX</button>
              </div>
            </div>
            {!isEth && (
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Velocidade</Label>
                <div className="grid grid-cols-3 gap-2">
                  {feeLevels.map(fl => {
                    const Icon = fl.icon;
                    const active = feeLevel === fl.key;
                    return (
                      <button key={fl.key} onClick={() => setFeeLevel(fl.key)}
                        className={`p-3 rounded-lg border text-center transition-colors ${active ? 'border-gold-500/50 bg-gold-500/10 text-gold-400' : 'border-zinc-700 bg-zinc-800/30 text-gray-400 hover:border-zinc-600'}`}>
                        <Icon size={16} className="mx-auto mb-1" />
                        <p className="text-xs font-medium">{fl.label}</p>
                        <p className="text-[10px] opacity-70">{fl.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="bg-zinc-800/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-gray-400 text-sm">Taxa Estimada</span>
              <span className="text-white text-sm font-mono">{getEstimatedFee()}</span>
            </div>
            {error && <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3"><p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</p></div>}
            <Button onClick={handleReview} className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-white py-5" data-testid="admin-send-review">Rever Transação</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">De (Tesouraria)</span><span className="text-white font-mono text-xs truncate max-w-[250px]">{wallet.address}</span></div>
              <div className="flex items-center justify-center"><ArrowUpRight className="text-gold-400" size={20} /></div>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Para</span><span className="text-white font-mono text-xs truncate max-w-[250px]">{toAddress}</span></div>
              <hr className="border-zinc-700" />
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Montante</span><span className={`font-mono text-lg font-bold ${colors.text}`}>{amount} {coin}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Taxa Estimada</span><span className="text-white text-sm font-mono">{getEstimatedFee()}</span></div>
            </div>
            <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-3">
              <p className="text-amber-400/80 text-xs flex items-start gap-2"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" />Confirme a transação no dispositivo Trezor da Tesouraria.</p>
            </div>
            {error && <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3"><p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</p></div>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-600" onClick={() => { setStep(1); setError(''); }}>Voltar</Button>
              <Button onClick={handleSend} className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 text-white" data-testid="admin-send-confirm"><Shield size={14} className="mr-2" />Assinar com Trezor</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center animate-pulse"><Loader2 className="text-gold-400 animate-spin" size={32} /></div>
            <h4 className="text-white font-medium">A assinar na Trezor...</h4>
            <p className="text-gray-400 text-sm text-center">Confirme a transação no dispositivo Trezor da Tesouraria.</p>
          </div>
        )}

        {step === 4 && txResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center"><CheckCircle className="text-emerald-400" size={32} /></div>
              <h4 className="text-white font-medium">Transação Transmitida!</h4>
              <p className="text-gray-400 text-sm text-center">{amount} {coin} enviado da Tesouraria.</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3"><div className="flex items-center justify-between"><span className="text-gray-400 text-xs">TX ID</span><span className="text-white font-mono text-xs truncate max-w-[250px]">{txResult.txid}</span></div></div>
            <a href={`${EXPLORER_URLS[coin] || '#'}${txResult.txid}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-gold-400 hover:text-gold-300 text-sm"><ExternalLink size={14} />Ver no Explorer</a>
            <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600">Fechar</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Admin Page ─────────────────────────────────────────
const AdminColdWalletPage = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [device, setDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState({});
  const [loadingCoin, setLoadingCoin] = useState(null);
  const [treasuryAddresses, setTreasuryAddresses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [receiveModal, setReceiveModal] = useState(null);
  const [sendModal, setSendModal] = useState(null);

  useEffect(() => {
    fetchTreasuryAddresses();
  }, [token]);

  const fetchTreasuryAddresses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/cold-wallet/treasury`, { headers });
      setTreasuryAddresses(res.data);
    } catch (err) {
      console.error('Failed to fetch treasury addresses', err);
    }
  };

  const connectDevice = async () => {
    setConnecting(true);
    try {
      await initTrezor();
      const features = await getDeviceFeatures();
      setDevice(features);
      toast.success('Trezor da Tesouraria conectada!');
    } catch (err) {
      toast.error(err.message || 'Falha ao conectar Trezor');
    }
    setConnecting(false);
  };

  const deriveAddress = async (coin) => {
    setLoadingCoin(coin);
    try {
      const addrResult = await getAddress(coin, null, true);
      let accountData = null;
      try { accountData = await getAccountInfo(coin); } catch { /* ok */ }

      const walletData = {
        address: addrResult.address,
        path: addrResult.serializedPath || addrResult.path,
        balance: accountData?.balance || '0',
        availableBalance: accountData?.availableBalance || '0',
      };
      setWallets(prev => ({ ...prev, [coin]: walletData }));

      try {
        await axios.post(`${API_URL}/api/cold-wallet/treasury`, {
          coin, address: walletData.address, path: walletData.path, balance: walletData.balance,
        }, { headers });
        fetchTreasuryAddresses();
      } catch { /* silent */ }

      toast.success(`${coin} Treasury address derived`);
    } catch (err) {
      toast.error(err.message || `Failed to derive ${coin}`);
    }
    setLoadingCoin(null);
  };

  const refreshBalances = async () => {
    setRefreshing(true);
    try {
      const res = await axios.post(`${API_URL}/api/cold-wallet/treasury/refresh`, {}, { headers });
      toast.success(`${res.data.updated || 0} saldos atualizados`);
      fetchTreasuryAddresses();
    } catch { toast.error('Falha ao atualizar saldos'); }
    setRefreshing(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const totalBTC = treasuryAddresses.filter(a => a.coin === 'BTC').reduce((s, a) => s + parseFloat(formatBalance(a.balance || '0', 8)), 0);
  const totalETH = treasuryAddresses.filter(a => a.coin === 'ETH').reduce((s, a) => s + parseFloat(formatBalance(a.balance || '0', 18)), 0);

  return (
    <div className="space-y-8" data-testid="admin-cold-wallet-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="text-gold-400" />
            Cold Wallet — Tesouraria Crypto
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestão da cold wallet da empresa via Trezor</p>
        </div>
        <Button variant="outline" size="sm" className="border-zinc-700" onClick={refreshBalances} disabled={refreshing}>
          {refreshing ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
          Atualizar Saldos
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-900/10 border-orange-800/20"><CardContent className="p-4"><p className="text-orange-400 text-xs uppercase">Bitcoin (BTC)</p><p className="text-2xl font-bold text-orange-400 mt-1 font-mono">{totalBTC.toFixed(8)}</p></CardContent></Card>
        <Card className="bg-blue-900/10 border-blue-800/20"><CardContent className="p-4"><p className="text-blue-400 text-xs uppercase">Ethereum (ETH)</p><p className="text-2xl font-bold text-blue-400 mt-1 font-mono">{totalETH.toFixed(6)}</p></CardContent></Card>
        <Card className="bg-zinc-900/50 border-zinc-800"><CardContent className="p-4"><p className="text-gray-400 text-xs uppercase">Endereços Ativos</p><p className="text-2xl font-bold text-white mt-1">{treasuryAddresses.length}</p></CardContent></Card>
        <Card className={`border-zinc-800 ${device ? 'bg-emerald-900/10 border-emerald-800/20' : 'bg-zinc-900/50'}`}><CardContent className="p-4"><p className={`text-xs uppercase ${device ? 'text-emerald-400' : 'text-gray-400'}`}>Dispositivo</p><p className={`text-lg font-bold mt-1 ${device ? 'text-emerald-400' : 'text-gray-500'}`}>{device ? (device.label || 'Trezor') : 'Desconectado'}</p></CardContent></Card>
      </div>

      {/* Connection Card */}
      <Card className={`border-zinc-800 ${device ? 'bg-emerald-900/5 border-emerald-800/20' : 'bg-zinc-900/50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${device ? 'bg-emerald-500/15' : 'bg-zinc-800'}`}>
                {device ? <CheckCircle className="text-emerald-400" size={28} /> : <Lock className="text-gray-400" size={28} />}
              </div>
              <div>
                {device ? (
                  <><p className="text-white font-medium">{device.label || 'Trezor'} conectada</p><p className="text-gray-400 text-sm">FW: {device.major_version}.{device.minor_version}.{device.patch_version}</p></>
                ) : (
                  <><p className="text-white font-medium">Conectar Trezor da Tesouraria</p><p className="text-gray-400 text-sm">Conecte para derivar endereços e assinar transações</p></>
                )}
              </div>
            </div>
            <Button onClick={connectDevice} disabled={connecting}
              className={device ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gold-600 hover:bg-gold-500 text-black'} data-testid="admin-connect-trezor-btn">
              {connecting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Usb size={16} className="mr-2" />}
              {connecting ? 'A conectar...' : device ? 'Reconectar' : 'Conectar Trezor'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Derive + Send/Receive */}
      {device && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Carteiras da Tesouraria</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(BLOCKCHAIN_CONFIG).map(([coin, cfg]) => {
              const w = wallets[coin];
              const colors = COIN_COLORS[coin] || COIN_COLORS.LTC;
              return (
                <Card key={coin} className={`bg-zinc-900/50 ${colors.border}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${colors.text}`}>{cfg.icon}</span>
                        <span className="text-white font-medium">{cfg.name}</span>
                      </div>
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>{coin}</Badge>
                    </div>
                    {w ? (
                      <>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Endereço</p>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-mono text-xs truncate flex-1">{w.address}</p>
                            <button onClick={() => copyToClipboard(w.address)} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0"><Copy size={14} /></button>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Saldo</p>
                          <p className="text-white font-mono text-lg">{formatBalance(w.balance, cfg.decimals)} <span className="text-sm text-gray-400">{coin}</span></p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" size="sm"
                            className="flex-1 border-emerald-800/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => setReceiveModal({ coin, address: w.address })}
                            data-testid={`admin-receive-${coin}-btn`}>
                            <ArrowDownLeft size={14} className="mr-1.5" />Receber
                          </Button>
                          <Button variant="outline" size="sm"
                            className={`flex-1 border-zinc-700 ${colors.text} hover:bg-zinc-800`}
                            onClick={() => setSendModal({ coin })}
                            data-testid={`admin-send-${coin}-btn`}>
                            <ArrowUpRight size={14} className="mr-1.5" />Enviar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button variant="outline" className={`w-full border-zinc-700 ${colors.text}`}
                        onClick={() => deriveAddress(coin)} disabled={loadingCoin === coin} data-testid={`admin-derive-${coin}-btn`}>
                        {loadingCoin === coin ? <Loader2 className="animate-spin mr-2" size={14} /> : <HardDrive size={14} className="mr-2" />}
                        {loadingCoin === coin ? 'A derivar...' : `Derivar ${coin}`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Treasury Addresses Table */}
      {treasuryAddresses.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Lock size={18} className="text-gold-400" /> Endereços da Tesouraria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {treasuryAddresses.map((addr, i) => {
                const colors = COIN_COLORS[addr.coin] || COIN_COLORS.LTC;
                const cfg = BLOCKCHAIN_CONFIG[addr.coin];
                return (
                  <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>{addr.coin}</Badge>
                      <div>
                        <p className="text-white font-mono text-xs">{addr.address}</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">Path: {addr.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-mono text-sm">{formatBalance(addr.balance || '0', cfg?.decimals || 8)} {addr.coin}</span>
                      <button onClick={() => copyToClipboard(addr.address)} className="text-emerald-400 hover:text-emerald-300"><Copy size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {receiveModal && <ReceiveModal coin={receiveModal.coin} address={receiveModal.address} onClose={() => setReceiveModal(null)} />}
      {sendModal && wallets[sendModal.coin] && <SendModal coin={sendModal.coin} wallet={wallets[sendModal.coin]} token={token} onClose={() => setSendModal(null)} onSuccess={fetchTreasuryAddresses} />}
    </div>
  );
};

export default AdminColdWalletPage;
