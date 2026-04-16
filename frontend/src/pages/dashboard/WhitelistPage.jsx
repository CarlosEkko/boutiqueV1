import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle,
  XCircle,
  Search,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRYPTO_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'LINK', name: 'Chainlink' },
];

const WhitelistPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAsset, setFilterAsset] = useState('');
  const [formData, setFormData] = useState({
    asset: '', label: '', address: '', network: '', is_active: true,
  });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchWhitelist();
  }, [token]);

  const fetchWhitelist = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crypto-wallets/whitelist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWhitelist(response.data.whitelist || []);
    } catch (err) {
      console.error('Failed to fetch whitelist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/crypto-wallets/whitelist`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('dashboard.whitelistPage.addAddress'));
      setShowAddModal(false);
      setFormData({ asset: '', label: '', address: '', network: '', is_active: true });
      fetchWhitelist();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/crypto-wallets/whitelist/${editId}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('dashboard.whitelistPage.save'));
      setShowEditModal(false);
      fetchWhitelist();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm(t('dashboard.whitelistPage.confirmDelete'))) return;
    try {
      await axios.delete(`${API_URL}/api/crypto-wallets/whitelist/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('OK');
      fetchWhitelist();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const openEditModal = (entry) => {
    setEditId(entry.id);
    setFormData({
      label: entry.label,
      is_active: entry.is_active !== false,
    });
    setShowEditModal(true);
  };

  const filteredWhitelist = whitelist.filter(entry => {
    const matchesSearch = entry.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAsset = !filterAsset || entry.asset === filterAsset;
    return matchesSearch && matchesAsset;
  });

  const groupedByAsset = filteredWhitelist.reduce((acc, entry) => {
    const asset = entry.asset;
    if (!acc[asset]) acc[asset] = [];
    acc[asset].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-white">{t('dashboard.whitelistPage.title')}</h1>
          <p className="text-gray-400 mt-1">{t('dashboard.whitelistPage.subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-gold-500 hover:bg-gold-400 text-black">
          <Plus size={18} className="mr-2" />
          {t('dashboard.whitelistPage.addAddress')}
        </Button>
      </div>

      <Card className="bg-amber-900/20 border-amber-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-400 mt-0.5" size={20} />
          <div>
            <p className="text-amber-400 font-medium">{t('dashboard.whitelistPage.protectionTitle')}</p>
            <p className="text-amber-300/80 text-sm mt-1">{t('dashboard.whitelistPage.protectionDesc')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input placeholder={t('dashboard.whitelistPage.searchPlaceholder')} value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
        </div>
        <select value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-4 text-white">
          <option value="">{t('dashboard.whitelistPage.allAssets')}</option>
          {CRYPTO_ASSETS.map(asset => (
            <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : filteredWhitelist.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto text-gray-500 mb-4" size={48} />
            <p className="text-gray-400">{t('dashboard.whitelistPage.noAddresses')}</p>
            <p className="text-gray-500 text-sm mt-1">{t('dashboard.whitelistPage.addAddressesHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAsset).map(([asset, entries]) => (
            <Card key={asset} className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Badge className="bg-gold-500/20 text-gold-400">{asset}</Badge>
                  <span className="text-gray-400 text-sm font-normal">({entries.length} {entries.length > 1 ? t('dashboard.whitelistPage.addressesPlural') : t('dashboard.whitelistPage.addresses')})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entries.map(entry => (
                    <div key={entry.id} className="bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{entry.label}</p>
                          {entry.is_active ? (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              <CheckCircle size={12} className="mr-1" /> {t('dashboard.whitelistPage.active')}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 text-xs">
                              <XCircle size={12} className="mr-1" /> {t('dashboard.whitelistPage.inactive')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 font-mono text-sm mt-1 break-all">{entry.address}</p>
                        {entry.network && (
                          <p className="text-gray-500 text-xs mt-1">{t('dashboard.whitelistPage.network')}: {entry.network}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(entry)} className="text-gray-400 hover:text-white">
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAddress(entry.id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-zinc-900 border-gold-800/30">
          <DialogHeader>
            <DialogTitle className="text-white">{t('dashboard.whitelistPage.addToWhitelist')}</DialogTitle>
            <DialogDescription className="text-gray-400">{t('dashboard.whitelistPage.addToWhitelistDesc')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAddress} className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-300">{t('dashboard.whitelistPage.asset')} *</Label>
              <select value={formData.asset} onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md p-2 text-white" required>
                <option value="">{t('dashboard.whitelistPage.selectAsset')}</option>
                {CRYPTO_ASSETS.map(asset => (
                  <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-300">{t('dashboard.whitelistPage.label')} *</Label>
              <Input value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder={t('dashboard.whitelistPage.labelPlaceholder')} className="bg-zinc-800 border-zinc-700 text-white" required />
            </div>
            <div>
              <Label className="text-gray-300">{t('dashboard.whitelistPage.address')} *</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('dashboard.whitelistPage.addressPlaceholder')} className="bg-zinc-800 border-zinc-700 text-white font-mono" required />
            </div>
            <div>
              <Label className="text-gray-300">{t('dashboard.whitelistPage.networkOptional')}</Label>
              <Input value={formData.network} onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                placeholder={t('dashboard.whitelistPage.networkPlaceholder')} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">{t('dashboard.whitelistPage.cancel')}</Button>
              <Button type="submit" className="flex-1 bg-gold-500 hover:bg-gold-400 text-black">{t('dashboard.whitelistPage.add')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Address Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-zinc-900 border-gold-800/30">
          <DialogHeader>
            <DialogTitle className="text-white">{t('dashboard.whitelistPage.editAddress')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAddress} className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-300">{t('dashboard.whitelistPage.label')}</Label>
              <Input value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="is_active" className="text-gray-300">{t('dashboard.whitelistPage.activeAddress')}</Label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">{t('dashboard.whitelistPage.cancel')}</Button>
              <Button type="submit" className="flex-1 bg-gold-500 hover:bg-gold-400 text-black">{t('dashboard.whitelistPage.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhitelistPage;
