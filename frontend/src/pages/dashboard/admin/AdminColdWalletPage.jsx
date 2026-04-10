import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Shield, Usb, Copy, RefreshCw, Loader2, AlertCircle,
  CheckCircle, HardDrive, Wallet, Lock, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  initTrezor, getDeviceFeatures, getAddress, getAccountInfo,
  formatBalance, BLOCKCHAIN_CONFIG
} from '../../../utils/trezorConnect';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COIN_COLORS = {
  BTC: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-800/20' },
  ETH: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-800/20' },
  LTC: { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-800/20' },
};

const AdminColdWalletPage = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [device, setDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState({});
  const [loadingCoin, setLoadingCoin] = useState(null);
  const [treasuryAddresses, setTreasuryAddresses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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
      initTrezor();
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
      try {
        accountData = await getAccountInfo(coin);
      } catch { /* ok */ }

      const walletData = {
        address: addrResult.address,
        path: addrResult.serializedPath || addrResult.path,
        balance: accountData?.balance || '0',
        availableBalance: accountData?.availableBalance || '0',
      };

      setWallets(prev => ({ ...prev, [coin]: walletData }));

      // Save to backend as treasury
      try {
        await axios.post(`${API_URL}/api/cold-wallet/treasury`, {
          coin,
          address: walletData.address,
          path: walletData.path,
          balance: walletData.balance,
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
    } catch (err) {
      toast.error('Falha ao atualizar saldos');
    }
    setRefreshing(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  // Calculate totals
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700" onClick={refreshBalances} disabled={refreshing}>
            {refreshing ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
            Atualizar Saldos
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-orange-900/10 border-orange-800/20">
          <CardContent className="p-4">
            <p className="text-orange-400 text-xs uppercase">Bitcoin (BTC)</p>
            <p className="text-2xl font-bold text-orange-400 mt-1 font-mono">{totalBTC.toFixed(8)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/10 border-blue-800/20">
          <CardContent className="p-4">
            <p className="text-blue-400 text-xs uppercase">Ethereum (ETH)</p>
            <p className="text-2xl font-bold text-blue-400 mt-1 font-mono">{totalETH.toFixed(6)}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs uppercase">Endereços Ativos</p>
            <p className="text-2xl font-bold text-white mt-1">{treasuryAddresses.length}</p>
          </CardContent>
        </Card>
        <Card className={`border-zinc-800 ${device ? 'bg-emerald-900/10 border-emerald-800/20' : 'bg-zinc-900/50'}`}>
          <CardContent className="p-4">
            <p className={`text-xs uppercase ${device ? 'text-emerald-400' : 'text-gray-400'}`}>Dispositivo</p>
            <p className={`text-lg font-bold mt-1 ${device ? 'text-emerald-400' : 'text-gray-500'}`}>
              {device ? (device.label || 'Trezor') : 'Desconectado'}
            </p>
          </CardContent>
        </Card>
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
                  <>
                    <p className="text-white font-medium">{device.label || 'Trezor'} conectada</p>
                    <p className="text-gray-400 text-sm">
                      FW: {device.major_version}.{device.minor_version}.{device.patch_version}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white font-medium">Conectar Trezor da Tesouraria</p>
                    <p className="text-gray-400 text-sm">Conecte a cold wallet da empresa para derivar endereços e assinar transações</p>
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={connectDevice}
              disabled={connecting}
              className={device ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gold-600 hover:bg-gold-500 text-black'}
              data-testid="admin-connect-trezor-btn"
            >
              {connecting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Usb size={16} className="mr-2" />}
              {connecting ? 'A conectar...' : device ? 'Reconectar' : 'Conectar Trezor'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Derive Addresses */}
      {device && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Derivar Endereços</h2>
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
                            <button onClick={() => copyToClipboard(w.address)} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Saldo</p>
                          <p className="text-white font-mono text-lg">
                            {formatBalance(w.balance, cfg.decimals)} <span className="text-sm text-gray-400">{coin}</span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className={`w-full border-zinc-700 ${colors.text}`}
                        onClick={() => deriveAddress(coin)}
                        disabled={loadingCoin === coin}
                        data-testid={`admin-derive-${coin}-btn`}
                      >
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
              <Lock size={18} className="text-gold-400" />
              Endereços da Tesouraria
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
                      <span className="text-white font-mono text-sm">
                        {formatBalance(addr.balance || '0', cfg?.decimals || 8)} {addr.coin}
                      </span>
                      <button onClick={() => copyToClipboard(addr.address)} className="text-emerald-400 hover:text-emerald-300">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminColdWalletPage;
