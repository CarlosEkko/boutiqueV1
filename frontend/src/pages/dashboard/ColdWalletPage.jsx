import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Shield, Usb, Copy, Loader2, AlertCircle,
  CheckCircle, HardDrive, ArrowUpRight, ArrowDownLeft,
  X, ExternalLink, Zap, Clock, Snail, Activity,
  Settings, Plus, ChevronRight, Unplug
} from 'lucide-react';
import { toast } from 'sonner';
import {
  initTrezor, getDeviceFeatures, getAddress, getAccountInfo,
  formatBalance, BLOCKCHAIN_CONFIG, signBtcTransaction,
  signEthTransaction, composeInputs, composeOutputs,
  ethToWei, toHex
} from '../../utils/trezorConnect';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COIN_META = {
  BTC: { color: '#F7931A', bg: 'bg-[#F7931A]/15', text: 'text-[#F7931A]', border: 'border-[#F7931A]/20', label: 'Bitcoin', icon: '/crypto-icons/btc.svg' },
  ETH: { color: '#627EEA', bg: 'bg-[#627EEA]/15', text: 'text-[#627EEA]', border: 'border-[#627EEA]/20', label: 'Ethereum', icon: '/crypto-icons/eth.svg' },
  LTC: { color: '#BFBBBB', bg: 'bg-[#BFBBBB]/15', text: 'text-[#BFBBBB]', border: 'border-[#BFBBBB]/20', label: 'Litecoin', icon: '/crypto-icons/ltc.svg' },
};

const EXPLORER_URLS = {
  BTC: 'https://blockstream.info/tx/',
  ETH: 'https://etherscan.io/tx/',
  LTC: 'https://blockchair.com/litecoin/transaction/',
};

// ─── Receive Modal ───────────────────────────────────────────
const ReceiveModal = ({ coin, address, onClose }) => {
  const meta = COIN_META[coin];
  const cfg = BLOCKCHAIN_CONFIG[coin];
  const qrValue = coin === 'ETH' ? `ethereum:${address}` : coin === 'BTC' ? `bitcoin:${address}` : `litecoin:${address}`;

  const copyAddr = () => {
    navigator.clipboard.writeText(address);
    toast.success('Endereço copiado!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 space-y-6" onClick={e => e.stopPropagation()} data-testid="receive-modal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
              <ArrowDownLeft style={{ color: meta.color }} size={18} />
            </div>
            <h3 className="text-white text-lg font-medium">Receber {cfg?.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={qrValue} size={200} level="M" />
          </div>
          <Badge className={`${meta.bg} ${meta.text} border-0 text-sm px-3 py-1`}>{coin}</Badge>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400 text-xs uppercase tracking-wider">Endereço {coin}</Label>
          <div className="flex items-center gap-2 bg-zinc-800/70 rounded-lg p-3 border border-zinc-700">
            <p className="text-white font-mono text-xs break-all flex-1" data-testid="receive-address">{address}</p>
            <button onClick={copyAddr} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0" data-testid="copy-receive-address">
              <Copy size={16} />
            </button>
          </div>
        </div>

        <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-3">
          <p className="text-amber-400/80 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            Envie apenas {cfg?.name} ({coin}) para este endereço. Enviar outro ativo pode resultar em perda permanente.
          </p>
        </div>

        <Button onClick={copyAddr} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600">
          <Copy size={14} className="mr-2" /> Copiar Endereço
        </Button>
      </div>
    </div>
  );
};

// ─── Send Modal ──────────────────────────────────────────────
const SendModal = ({ coin, wallet, token, onClose, onSuccess }) => {
  const meta = COIN_META[coin];
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
        const feeRes = await axios.get(`${API_URL}/api/cold-wallet/fee-estimate/${coin}`, { headers });
        setFees(feeRes.data);
        if (isEth) {
          const ethRes = await axios.get(`${API_URL}/api/cold-wallet/eth-params/${wallet.address}`, { headers });
          setEthParams(ethRes.data);
        } else {
          const utxoRes = await axios.get(`${API_URL}/api/cold-wallet/utxos/${wallet.address}?coin=${coin}`, { headers });
          setUtxos(utxoRes.data.utxos || []);
        }
      } catch (err) { console.error('Failed to load send data', err); }
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
    const feeRate = fees[feeLevel] || fees.medium || 10;
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
    setStep(3); setLoading(true); setError('');
    try {
      let signedHex;
      if (isEth) {
        const gasPrice = ethParams?.gas_price || 20000000000;
        const nonce = ethParams?.nonce || 0;
        const txParams = { to: toAddress, value: ethToWei(amount), gasLimit: toHex(21000), gasPrice: toHex(gasPrice), nonce: toHex(nonce), chainId: 1 };
        const sig = await signEthTransaction(cfg.path, txParams);
        signedHex = sig.serializedTx || `${sig.v}${sig.r}${sig.s}`;
      } else {
        const amountSat = Math.round(parseFloat(amount) * 10 ** cfg.decimals);
        const feeRate = fees?.[feeLevel] || 10;
        const feeSat = feeRate * 250;
        if (!utxos || utxos.length === 0) throw new Error('Nenhum UTXO disponivel');
        const { inputs, totalInput } = composeInputs(utxos, amountSat, feeSat, cfg.path);
        const outputs = composeOutputs(toAddress, amountSat, totalInput, feeSat, wallet.address);
        const result = await signBtcTransaction(inputs, outputs, cfg.coin);
        signedHex = result.serializedTx;
      }
      const broadcastRes = await axios.post(`${API_URL}/api/cold-wallet/broadcast`, {
        coin, hex_tx: signedHex, from_address: wallet.address, to_address: toAddress, amount, wallet_type: 'client',
      }, { headers });
      setTxResult(broadcastRes.data); setStep(4);
      toast.success('Transacao transmitida com sucesso!');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Falha ao assinar/transmitir transacao');
      setStep(2); toast.error(err.message || 'Falha na transacao');
    } finally { setLoading(false); }
  };

  const feeLevels = [
    { key: 'fast', label: 'Rapida', icon: Zap, desc: '~10 min' },
    { key: 'medium', label: 'Normal', icon: Clock, desc: '~30 min' },
    { key: 'slow', label: 'Economica', icon: Snail, desc: '~60 min' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg mx-4 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="send-modal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
              <ArrowUpRight style={{ color: meta.color }} size={18} />
            </div>
            <h3 className="text-white text-lg font-medium">Enviar {cfg?.name}</h3>
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
              <span className="text-gray-400 text-sm">Saldo Disponivel</span>
              <span className="text-white font-mono">{getAvailableBalance()} {coin}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Endereco de Destino</Label>
              <Input value={toAddress} onChange={e => setToAddress(e.target.value)}
                placeholder={isEth ? '0x...' : coin === 'BTC' ? 'bc1...' : 'ltc1...'}
                className="bg-zinc-800/50 border-zinc-700 text-white font-mono text-sm placeholder:text-gray-600"
                data-testid="send-to-address" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Montante ({coin})</Label>
              <div className="relative">
                <Input type="number" step="any" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" className="bg-zinc-800/50 border-zinc-700 text-white font-mono placeholder:text-gray-600 pr-16"
                  data-testid="send-amount" />
                <button onClick={() => setAmount(String(getAvailableBalance()))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gold-400 text-xs font-medium hover:text-gold-300"
                  data-testid="send-max-btn">MAX</button>
              </div>
            </div>
            {!isEth && (
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Velocidade da Transacao</Label>
                <div className="grid grid-cols-3 gap-2">
                  {feeLevels.map(fl => {
                    const Icon = fl.icon;
                    const active = feeLevel === fl.key;
                    return (
                      <button key={fl.key} onClick={() => setFeeLevel(fl.key)}
                        className={`p-3 rounded-lg border text-center transition-colors ${active ? 'border-gold-500/50 bg-gold-500/10 text-gold-400' : 'border-zinc-700 bg-zinc-800/30 text-gray-400 hover:border-zinc-600'}`}
                        data-testid={`fee-${fl.key}`}>
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
            <Button onClick={handleReview} className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white py-5" data-testid="send-review-btn">
              Rever Transacao
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">De</span><span className="text-white font-mono text-xs truncate max-w-[250px]">{wallet.address}</span></div>
              <div className="flex items-center justify-center"><ArrowUpRight className="text-gold-400" size={20} /></div>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Para</span><span className="text-white font-mono text-xs truncate max-w-[250px]">{toAddress}</span></div>
              <hr className="border-zinc-700" />
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Montante</span><span className={`font-mono text-lg font-bold ${meta.text}`}>{amount} {coin}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-400 text-sm">Taxa Estimada</span><span className="text-white text-sm font-mono">{getEstimatedFee()}</span></div>
            </div>
            <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-3">
              <p className="text-amber-400/80 text-xs flex items-start gap-2"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" />Ao confirmar, a Trezor pedira que verifique e aprove a transacao no dispositivo.</p>
            </div>
            {error && <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3"><p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle size={14} /> {error}</p></div>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-600 text-gray-300 hover:text-white" onClick={() => { setStep(1); setError(''); }}>Voltar</Button>
              <Button onClick={handleSend} className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white" data-testid="send-confirm-btn">
                <Shield size={14} className="mr-2" /> Assinar com Trezor
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center animate-pulse"><Loader2 className="text-gold-400 animate-spin" size={32} /></div>
            <h4 className="text-white font-medium">A assinar na Trezor...</h4>
            <p className="text-gray-400 text-sm text-center">Confirme a transacao no seu dispositivo Trezor.<br />Verifique o endereco e o montante no ecra do dispositivo.</p>
          </div>
        )}

        {step === 4 && txResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center"><CheckCircle className="text-emerald-400" size={32} /></div>
              <h4 className="text-white font-medium">Transacao Transmitida!</h4>
              <p className="text-gray-400 text-sm text-center">{amount} {coin} enviado para o endereco de destino.</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">TX ID</span><span className="text-white font-mono text-xs truncate max-w-[250px]">{txResult.txid}</span></div>
            </div>
            <a href={`${EXPLORER_URLS[coin] || '#'}${txResult.txid}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-gold-400 hover:text-gold-300 text-sm" data-testid="view-explorer-link">
              <ExternalLink size={14} /> Ver no Explorer
            </a>
            <Button onClick={onClose} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600">Fechar</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sidebar Account Item ────────────────────────────────────
const AccountItem = ({ coin, wallet, isActive, onClick }) => {
  const meta = COIN_META[coin];
  const cfg = BLOCKCHAIN_CONFIG[coin];
  const balance = wallet ? formatBalance(wallet.balance, cfg.decimals) : '0';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left group ${
        isActive ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-800/50 border border-transparent'
      }`}
      data-testid={`account-${coin}`}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}20` }}>
        <span className="text-base font-bold" style={{ color: meta.color }}>{cfg.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{meta.label}</p>
        <p className="text-gray-500 text-xs font-mono">{balance} {coin}</p>
      </div>
    </button>
  );
};

// ─── Main Cold Wallet Page ───────────────────────────────────
const ColdWalletPage = () => {
  const { token } = useAuth();
  const [device, setDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState({});
  const [loadingCoin, setLoadingCoin] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const [activeCoin, setActiveCoin] = useState('BTC');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [receiveModal, setReceiveModal] = useState(null);
  const [sendModal, setSendModal] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSavedAddresses();
    fetchTxHistory();
  }, [token]);

  const fetchSavedAddresses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/cold-wallet/addresses`, { headers });
      setSavedAddresses(res.data);
    } catch (err) { console.error('Failed to fetch saved addresses', err); }
  };

  const fetchTxHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/cold-wallet/transactions`, { headers });
      setTxHistory(res.data);
    } catch (err) { console.error('Failed to fetch tx history', err); }
  };

  const connectDevice = async () => {
    setConnecting(true);
    try {
      await initTrezor();
      const features = await getDeviceFeatures();
      setDevice(features);
      toast.success('Trezor conectada com sucesso!');
    } catch (err) { toast.error(err.message || 'Falha ao conectar Trezor'); }
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
        await axios.post(`${API_URL}/api/cold-wallet/addresses`, { coin, address: walletData.address, path: walletData.path, balance: walletData.balance }, { headers });
        fetchSavedAddresses();
      } catch { /* silent */ }
      toast.success(`Endereco ${coin} derivado com sucesso`);
    } catch (err) { toast.error(err.message || `Falha ao derivar ${coin}`); }
    setLoadingCoin(null);
  };

  const deriveAll = async () => {
    for (const coin of Object.keys(BLOCKCHAIN_CONFIG)) {
      if (!wallets[coin]) await deriveAddress(coin);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const activeWallet = wallets[activeCoin];
  const activeMeta = COIN_META[activeCoin];
  const activeCfg = BLOCKCHAIN_CONFIG[activeCoin];

  const totalBalanceUSD = 0; // Would come from price API in production

  const coinTxHistory = txHistory.filter(tx => tx.coin === activeCoin);

  const sidebarTabs = [
    { key: 'dashboard', label: 'Dashboard', icon: HardDrive },
    { key: 'activity', label: 'Atividade', icon: Activity },
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] -mx-6 -mt-6" data-testid="cold-wallet-page">
      {/* ─── Left Sidebar ─── */}
      <div className="w-[240px] flex-shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
        {/* Device Status */}
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={connectDevice}
            disabled={connecting}
            className="w-full flex items-center gap-3 group"
            data-testid="connect-trezor-btn"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              device ? 'bg-emerald-500/15' : 'bg-zinc-800 group-hover:bg-zinc-700'
            }`}>
              {connecting ? (
                <Loader2 className="text-gold-400 animate-spin" size={20} />
              ) : device ? (
                <CheckCircle className="text-emerald-400" size={20} />
              ) : (
                <Usb className="text-gray-400 group-hover:text-gold-400 transition-colors" size={20} />
              )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {device ? (device.label || 'Trezor') : 'KBEX Vault'}
              </p>
              <p className={`text-xs flex items-center gap-1.5 ${device ? 'text-emerald-400' : 'text-gray-500'}`}>
                {device ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Conectado</>
                ) : (
                  <><Unplug size={10} /> Desconectado</>
                )}
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="p-3 space-y-1">
          {sidebarTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-zinc-800 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Accounts Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-4 pb-2 flex items-center justify-between">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Contas</p>
            {device && (
              <button
                onClick={deriveAll}
                className="text-gray-500 hover:text-gold-400 transition-colors"
                title="Adicionar todas as contas"
                data-testid="add-accounts-btn"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          <div className="px-2 space-y-1">
            {Object.entries(BLOCKCHAIN_CONFIG).map(([coin]) => (
              <AccountItem
                key={coin}
                coin={coin}
                wallet={wallets[coin]}
                isActive={activeCoin === coin}
                onClick={() => setActiveCoin(coin)}
              />
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        {!device && (
          <div className="p-3 border-t border-zinc-800">
            <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg p-3">
              <p className="text-amber-400/80 text-[11px] leading-relaxed">
                Conecte a Trezor via USB para gerir os seus ativos.
              </p>
              <a href="https://suite.trezor.io/web/bridge/" target="_blank" rel="noreferrer"
                className="text-gold-400 text-[11px] hover:underline mt-1 inline-block">
                Trezor Bridge
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Action Bar */}
        <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light text-white tracking-tight">
              {activeTab === 'dashboard' ? 'Dashboard' : 'Atividade'}
            </h1>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!device) { toast.error('Conecte a Trezor primeiro'); return; }
                  if (!activeWallet) { toast.error(`Derive o endereco ${activeCoin} primeiro`); return; }
                  setSendModal({ coin: activeCoin });
                }}
                className="border-zinc-700 text-white hover:bg-zinc-800 gap-2 h-9 px-4"
                data-testid="action-send-btn"
              >
                <ArrowUpRight size={15} /> Enviar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!device) { toast.error('Conecte a Trezor primeiro'); return; }
                  if (!activeWallet) { toast.error(`Derive o endereco ${activeCoin} primeiro`); return; }
                  setReceiveModal({ coin: activeCoin, address: activeWallet.address });
                }}
                className="border-zinc-700 text-white hover:bg-zinc-800 gap-2 h-9 px-4"
                data-testid="action-receive-btn"
              >
                <ArrowDownLeft size={15} /> Receber
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* ─── Dashboard Tab ─── */}
          {activeTab === 'dashboard' && (
            <>
              {/* Portfolio Overview */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <p className="text-gray-400 text-sm mb-2">Portfolio</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-light text-white tracking-tight">
                    {activeWallet ? formatBalance(activeWallet.balance, activeCfg.decimals) : '0'}
                  </span>
                  <span className="text-xl text-gray-500 mb-1 ml-1">{activeCoin}</span>
                </div>
                {activeWallet && (
                  <p className="text-gray-500 text-sm mt-2 font-mono">
                    {activeWallet.address.substring(0, 12)}...{activeWallet.address.substring(activeWallet.address.length - 8)}
                  </p>
                )}
              </div>

              {/* Quick Actions for Selected Coin (when no wallet derived) */}
              {device && !activeWallet && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${activeMeta.color}15` }}>
                    <span className="text-3xl" style={{ color: activeMeta.color }}>{activeCfg.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-medium">{activeMeta.label}</h3>
                    <p className="text-gray-500 text-sm mt-1">Derive o endereco para comecar a usar esta carteira</p>
                  </div>
                  <Button
                    onClick={() => deriveAddress(activeCoin)}
                    disabled={loadingCoin === activeCoin}
                    className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white px-8"
                    data-testid={`derive-${activeCoin}-btn`}
                  >
                    {loadingCoin === activeCoin ? (
                      <><Loader2 className="animate-spin mr-2" size={16} /> A derivar...</>
                    ) : (
                      <><HardDrive size={16} className="mr-2" /> Derivar Endereco {activeCoin}</>
                    )}
                  </Button>
                </div>
              )}

              {/* Not connected state */}
              {!device && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center space-y-5">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800 mx-auto flex items-center justify-center">
                    <Shield className="text-gold-400" size={36} />
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-medium">Conecte a sua Trezor</h3>
                    <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                      Para gerir os seus ativos em cold storage, conecte o seu dispositivo Trezor via USB.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={connectDevice}
                      disabled={connecting}
                      className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white px-8 py-5"
                    >
                      {connecting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Usb size={16} className="mr-2" />}
                      {connecting ? 'A conectar...' : 'Conectar Trezor'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-6 text-gray-500 text-xs pt-2">
                    <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> Trezor Bridge</span>
                    <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> USB Conectado</span>
                    <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-500" /> PIN Configurado</span>
                  </div>
                </div>
              )}

              {/* My Assets Section */}
              {device && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-white">Meus Ativos</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deriveAll}
                      className="border-zinc-700 text-gray-400 hover:text-white hover:bg-zinc-800 gap-2 h-8 text-xs"
                      data-testid="activate-assets-btn"
                    >
                      <Plus size={14} /> Ativar mais ativos
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.entries(BLOCKCHAIN_CONFIG).map(([coin, cfg]) => {
                      const w = wallets[coin];
                      const meta = COIN_META[coin];
                      const balance = w ? formatBalance(w.balance, cfg.decimals) : null;

                      return (
                        <div
                          key={coin}
                          className={`bg-zinc-900/50 border rounded-2xl p-5 transition-all duration-200 cursor-pointer group ${
                            activeCoin === coin ? `${meta.border} border-opacity-60` : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                          onClick={() => setActiveCoin(coin)}
                          data-testid={`asset-card-${coin}`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}15` }}>
                                <span className="text-lg font-bold" style={{ color: meta.color }}>{cfg.icon}</span>
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">{meta.label}</p>
                                <p className="text-gray-500 text-xs">{coin}</p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                          </div>

                          {w ? (
                            <div>
                              <p className="text-2xl font-light text-white tracking-tight">
                                {balance} <span className="text-sm text-gray-500">{coin}</span>
                              </p>
                              <div className="flex gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setSendModal({ coin }); }}
                                  className="flex-1 border-zinc-700 text-gray-300 hover:text-white hover:bg-zinc-800 text-xs h-8"
                                  data-testid={`send-${coin}-btn`}
                                >
                                  <ArrowUpRight size={12} className="mr-1" /> Enviar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setReceiveModal({ coin, address: w.address }); }}
                                  className="flex-1 border-zinc-700 text-gray-300 hover:text-white hover:bg-zinc-800 text-xs h-8"
                                  data-testid={`receive-${coin}-btn`}
                                >
                                  <ArrowDownLeft size={12} className="mr-1" /> Receber
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); deriveAddress(coin); }}
                              disabled={loadingCoin === coin}
                              className={`w-full border-zinc-700 ${meta.text} hover:bg-zinc-800 text-xs h-8 mt-2`}
                              data-testid={`derive-${coin}-btn`}
                            >
                              {loadingCoin === coin ? <Loader2 className="animate-spin mr-1" size={12} /> : <HardDrive size={12} className="mr-1" />}
                              {loadingCoin === coin ? 'A derivar...' : 'Ativar'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Transactions Preview */}
              {coinTxHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-white">Transacoes Recentes</h2>
                    <button onClick={() => setActiveTab('activity')} className="text-gold-400 text-sm hover:text-gold-300 flex items-center gap-1">
                      Ver tudo <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                    {coinTxHistory.slice(0, 3).map((tx, i) => {
                      const txMeta = COIN_META[tx.coin] || COIN_META.LTC;
                      return (
                        <div key={i} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-zinc-800' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${txMeta.color}15` }}>
                              <ArrowUpRight style={{ color: txMeta.color }} size={16} />
                            </div>
                            <div>
                              <p className="text-white text-sm">{tx.amount} {tx.coin}</p>
                              <p className="text-gray-500 text-xs font-mono truncate max-w-[200px]">Para: {tx.to_address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">{tx.status}</Badge>
                            <a href={`${EXPLORER_URLS[tx.coin] || '#'}${tx.txid}`} target="_blank" rel="noreferrer" className="text-gold-400 hover:text-gold-300">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Activity Tab ─── */}
          {activeTab === 'activity' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-white">
                  Historico de Transacoes
                  {activeCoin && <span className="text-gray-500 ml-2">({activeCoin})</span>}
                </h2>
                <Badge className="bg-zinc-800 text-gray-400 border-0">
                  {coinTxHistory.length} transacoes
                </Badge>
              </div>

              {coinTxHistory.length === 0 ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
                  <Activity className="text-gray-600 mx-auto mb-4" size={40} />
                  <p className="text-gray-400 text-sm">Nenhuma transacao encontrada para {COIN_META[activeCoin]?.label || activeCoin}</p>
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-800/30 text-gray-500 text-xs uppercase tracking-wider">
                    <div className="col-span-1">Tipo</div>
                    <div className="col-span-2">Montante</div>
                    <div className="col-span-4">Destino</div>
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-2">TX ID</div>
                    <div className="col-span-1"></div>
                  </div>

                  {coinTxHistory.map((tx, i) => {
                    const txMeta = COIN_META[tx.coin] || COIN_META.LTC;
                    return (
                      <div key={i} className={`grid grid-cols-12 gap-4 px-5 py-4 items-center ${i > 0 ? 'border-t border-zinc-800/50' : ''} hover:bg-zinc-800/20 transition-colors`}>
                        <div className="col-span-1">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${txMeta.color}15` }}>
                            <ArrowUpRight size={14} style={{ color: txMeta.color }} />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-white text-sm font-mono">{tx.amount} {tx.coin}</p>
                        </div>
                        <div className="col-span-4">
                          <p className="text-gray-400 text-xs font-mono truncate">{tx.to_address}</p>
                        </div>
                        <div className="col-span-2">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">{tx.status}</Badge>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500 text-xs font-mono truncate">{tx.txid?.substring(0, 12)}...</p>
                        </div>
                        <div className="col-span-1 text-right">
                          <a href={`${EXPLORER_URLS[tx.coin] || '#'}${tx.txid}`} target="_blank" rel="noreferrer"
                            className="text-gold-400 hover:text-gold-300 inline-flex">
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* All Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-white mb-4">Enderecos Guardados</h2>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                    {savedAddresses.map((addr, i) => {
                      const addrMeta = COIN_META[addr.coin] || COIN_META.LTC;
                      return (
                        <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${addrMeta.color}15` }}>
                              <span className="text-sm font-bold" style={{ color: addrMeta.color }}>{BLOCKCHAIN_CONFIG[addr.coin]?.icon}</span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-mono truncate max-w-[320px]">{addr.address}</p>
                              <p className="text-gray-500 text-xs">{addrMeta.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400 text-sm font-mono">
                              {addr.balance ? formatBalance(addr.balance, BLOCKCHAIN_CONFIG[addr.coin]?.decimals || 8) : '0'} {addr.coin}
                            </span>
                            <button onClick={() => copyToClipboard(addr.address)} className="text-gray-500 hover:text-gold-400 transition-colors">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {receiveModal && (
        <ReceiveModal coin={receiveModal.coin} address={receiveModal.address} onClose={() => setReceiveModal(null)} />
      )}
      {sendModal && wallets[sendModal.coin] && (
        <SendModal coin={sendModal.coin} wallet={wallets[sendModal.coin]} token={token}
          onClose={() => setSendModal(null)} onSuccess={() => { fetchTxHistory(); fetchSavedAddresses(); }} />
      )}
    </div>
  );
};

export default ColdWalletPage;
