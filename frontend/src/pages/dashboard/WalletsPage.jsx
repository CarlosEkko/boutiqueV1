import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  QrCode,
  RefreshCw,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WalletsPage = () => {
  const { token } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);

  useEffect(() => {
    fetchWallets();
  }, [token]);

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

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const formatBalance = (balance, asset) => {
    const decimals = ['BTC', 'ETH'].includes(asset) ? 8 : 2;
    return parseFloat(balance || 0).toFixed(decimals);
  };

  // Mock prices for display
  const prices = {
    BTC: 95000,
    ETH: 3200,
    USDT: 1,
    USDC: 1,
    SOL: 180
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-amber-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">My Wallets</h1>
          <p className="text-gray-400 mt-1">Manage your cryptocurrency wallets</p>
        </div>
        <Button 
          className="bg-amber-600 hover:bg-amber-500 text-white"
          disabled
        >
          <Plus size={18} className="mr-2" />
          Add Wallet (Coming Soon)
        </Button>
      </div>

      {/* Wallets Grid */}
      {wallets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => {
            const usdValue = (wallet.balance || 0) * (prices[wallet.asset_id] || 1);
            
            return (
              <Card 
                key={wallet.id}
                className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-900/20 hover:border-amber-600/50 transition-all cursor-pointer"
                onClick={() => setSelectedWallet(wallet)}
              >
                <CardContent className="p-6">
                  {/* Asset Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600/30 to-amber-700/30 flex items-center justify-center">
                        <span className="text-amber-400 font-bold">{wallet.asset_id?.slice(0, 2)}</span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{wallet.asset_name}</h3>
                        <p className="text-sm text-gray-400">{wallet.asset_id}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-900/30 text-green-400">Active</Badge>
                  </div>

                  {/* Balance */}
                  <div className="space-y-1 mb-4">
                    <p className="text-2xl font-light text-white">
                      {formatBalance(wallet.balance, wallet.asset_id)} {wallet.asset_id}
                    </p>
                    <p className="text-sm text-gray-400">
                      ≈ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Address */}
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
                          className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors"
                        >
                          <Copy size={14} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors">
                          <QrCode size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Available/Pending */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Available</p>
                      <p className="text-white">{formatBalance(wallet.available_balance, wallet.asset_id)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Pending</p>
                      <p className="text-amber-400">{formatBalance(wallet.pending_balance, wallet.asset_id)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-amber-900/20">
          <CardContent className="p-12 text-center">
            <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
            <h3 className="text-xl text-white mb-2">No Wallets Yet</h3>
            <p className="text-gray-400 mb-4">
              Your wallets will appear here once your account is fully approved.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Wallet Details Modal - TODO: Implement */}
      {selectedWallet && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWallet(null)}
        >
          <Card 
            className="bg-zinc-900 border-amber-900/30 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                  <span className="text-amber-400 font-bold">{selectedWallet.asset_id?.slice(0, 2)}</span>
                </div>
                {selectedWallet.asset_name} Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Balance</p>
                <p className="text-3xl font-light text-white">
                  {formatBalance(selectedWallet.balance, selectedWallet.asset_id)} {selectedWallet.asset_id}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Deposit Address</p>
                <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                  <p className="text-white font-mono text-sm break-all">{selectedWallet.address}</p>
                  <button
                    onClick={() => copyAddress(selectedWallet.address)}
                    className="ml-2 p-2 text-amber-400 hover:text-amber-300"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-green-600 hover:bg-green-500" disabled>
                  Deposit
                </Button>
                <Button className="flex-1 bg-amber-600 hover:bg-amber-500" disabled>
                  Withdraw
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Deposit and withdrawal features coming with Fireblocks integration
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WalletsPage;
