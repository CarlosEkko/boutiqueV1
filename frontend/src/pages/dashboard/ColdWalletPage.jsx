import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Shield, Usb, Copy, RefreshCw, Loader2, AlertCircle,
  CheckCircle, HardDrive, Wallet, ArrowUpRight, ArrowDownLeft, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  initTrezor, getDeviceFeatures, getAddress, getAccountInfo,
  formatBalance, BLOCKCHAIN_CONFIG
} from '../../utils/trezorConnect';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COIN_COLORS = {
  BTC: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-800/20' },
  ETH: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-800/20' },
  LTC: { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-800/20' },
};

const ColdWalletPage = () => {
  const { token } = useAuth();
  const [device, setDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState({});
  const [loadingCoin, setLoadingCoin] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);

  useEffect(() => {
    fetchSavedAddresses();
  }, [token]);

  const fetchSavedAddresses = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/cold-wallet/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedAddresses(res.data);
    } catch (err) {
      console.error('Failed to fetch saved addresses', err);
    }
  };

  const connectDevice = async () => {
    setConnecting(true);
    try {
      await initTrezor();
      const features = await getDeviceFeatures();
      setDevice(features);
      toast.success('Trezor conectada com sucesso!');
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
      } catch {
        // Balance fetch may fail, that's ok
      }

      const walletData = {
        address: addrResult.address,
        path: addrResult.serializedPath || addrResult.path,
        balance: accountData?.balance || '0',
        availableBalance: accountData?.availableBalance || '0',
      };

      setWallets(prev => ({ ...prev, [coin]: walletData }));

      // Save to backend
      try {
        await axios.post(`${API_URL}/api/cold-wallet/addresses`, {
          coin,
          address: walletData.address,
          path: walletData.path,
          balance: walletData.balance,
        }, { headers: { Authorization: `Bearer ${token}` } });
        fetchSavedAddresses();
      } catch {
        // Save failed silently
      }

      toast.success(`Endereço ${coin} derivado com sucesso`);
    } catch (err) {
      toast.error(err.message || `Falha ao derivar ${coin}`);
    }
    setLoadingCoin(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const config = BLOCKCHAIN_CONFIG;

  return (
    <div className="space-y-8" data-testid="cold-wallet-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <Shield className="text-gold-400" size={28} />
          Cold Wallet
        </h1>
        <p className="text-gray-400 mt-1">Conecte a sua Trezor para gerir os seus ativos em cold storage</p>
      </div>

      {/* Connection Card */}
      <Card className={`border-zinc-800 ${device ? 'bg-emerald-900/5 border-emerald-800/20' : 'bg-zinc-900/50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${device ? 'bg-emerald-500/15' : 'bg-zinc-800'}`}>
                {device ? <CheckCircle className="text-emerald-400" size={28} /> : <Usb className="text-gray-400" size={28} />}
              </div>
              <div>
                {device ? (
                  <>
                    <p className="text-white font-medium">{device.label || 'Trezor'}</p>
                    <p className="text-gray-400 text-sm">
                      Modelo: {device.model || 'Unknown'} &bull; Firmware: {device.major_version}.{device.minor_version}.{device.patch_version}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white font-medium">Nenhum dispositivo conectado</p>
                    <p className="text-gray-400 text-sm">Conecte a sua Trezor via USB para continuar</p>
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={connectDevice}
              disabled={connecting}
              className={device ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gold-600 hover:bg-gold-500 text-black'}
              data-testid="connect-trezor-btn"
            >
              {connecting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Usb size={16} className="mr-2" />
              )}
              {connecting ? 'A conectar...' : device ? 'Reconectar' : 'Conectar Trezor'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prerequisite Notice */}
      {!device && (
        <Card className="bg-amber-900/5 border-amber-800/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-amber-400 font-medium text-sm">Requisitos</p>
                <ul className="text-gray-400 text-sm mt-1 space-y-1 list-disc list-inside">
                  <li>Trezor Bridge instalado (<a href="https://suite.trezor.io/web/bridge/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Download</a>)</li>
                  <li>Dispositivo Trezor conectado via USB</li>
                  <li>PIN configurado no dispositivo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Addresses */}
      {device && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Carteiras</h2>
            <p className="text-gray-400 text-xs">Clique para derivar endereços da sua Trezor</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(config).map(([coin, cfg]) => {
              const w = wallets[coin];
              const colors = COIN_COLORS[coin] || COIN_COLORS.LTC;
              return (
                <Card key={coin} className={`bg-zinc-900/50 ${colors.border} hover:border-opacity-60 transition-colors`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${colors.text}`}>{cfg.icon}</span>
                        <span className="text-white font-medium">{cfg.name}</span>
                      </div>
                      <Badge className={`${colors.bg} ${colors.text} border-0 text-[10px]`}>{coin}</Badge>
                    </div>

                    {w ? (
                      <>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Endereço</p>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-mono text-xs truncate flex-1" data-testid={`address-${coin}`}>
                              {w.address}
                            </p>
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
                        className={`w-full border-zinc-700 ${colors.text} hover:${colors.bg}`}
                        onClick={() => deriveAddress(coin)}
                        disabled={loadingCoin === coin}
                        data-testid={`derive-${coin}-btn`}
                      >
                        {loadingCoin === coin ? (
                          <Loader2 className="animate-spin mr-2" size={14} />
                        ) : (
                          <HardDrive size={14} className="mr-2" />
                        )}
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

      {/* Saved Addresses History */}
      {savedAddresses.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Wallet size={18} className="text-gold-400" />
              Endereços Guardados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedAddresses.map((addr, i) => {
                const colors = COIN_COLORS[addr.coin] || COIN_COLORS.LTC;
                return (
                  <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>{addr.coin}</Badge>
                      <span className="text-white font-mono text-xs truncate max-w-[300px]">{addr.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">
                        {addr.balance ? formatBalance(addr.balance, BLOCKCHAIN_CONFIG[addr.coin]?.decimals || 8) : '0'} {addr.coin}
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

export default ColdWalletPage;
