import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Handshake,
  CheckCircle,
  XCircle,
  Wallet,
  MapPin,
  Mail,
  Phone,
  Globe,
  RefreshCw,
  Save,
  X,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRYPTOCURRENCIES = [
  'BTC', 'ETH', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE'
];

import { COUNTRIES } from '../../../utils/countries';
import { useLanguage } from '../../../i18n';

const REGIONS = ['Europe', 'Middle East', 'LATAM', 'North America', 'Asia', 'Other'];

const CRMSuppliers = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [expandedSupplier, setExpandedSupplier] = useState(null);
  const [filter, setFilter] = useState({ search: '', category: '', is_active: '' });
  
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    country: '',
    region: '',
    registered_on_kryptobox: false,
    kryptobox_user_id: '',
    cryptocurrencies: [],
    category: 'MIXED',
    gross_discount: '',
    net_discount: '',
    min_volume: '',
    max_volume: '',
    preferred_currency: 'EUR',
    handshake_wallet: { address: '', network: '', description: '', availability: 'available', forensic_status: 'not_verified' },
    transaction_wallet: { address: '', network: '', description: '', availability: 'available', forensic_status: 'not_verified' },
    delivery_map: '',
    delivery_countries: [],
    delivery_time_hours: '',
    is_active: true,
    is_verified: false,
    notes: '',
    tags: []
  });

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
  }, [filter]);

  const fetchSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.category) params.append('category', filter.category);
      if (filter.is_active !== '') params.append('is_active', filter.is_active);
      
      const response = await axios.get(`${API_URL}/api/crm/suppliers?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/enums/supplier-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      country: '',
      region: '',
      registered_on_kryptobox: false,
      kryptobox_user_id: '',
      cryptocurrencies: [],
      category: 'MIXED',
      gross_discount: '',
      net_discount: '',
      min_volume: '',
      max_volume: '',
      preferred_currency: 'EUR',
      handshake_wallet: { address: '', network: '', description: '', availability: 'available', forensic_status: 'not_verified' },
      transaction_wallet: { address: '', network: '', description: '', availability: 'available', forensic_status: 'not_verified' },
      delivery_map: '',
      delivery_countries: [],
      delivery_time_hours: '',
      is_active: true,
      is_verified: false,
      notes: '',
      tags: []
    });
    setEditingSupplier(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setForm({
      ...supplier,
      gross_discount: supplier.gross_discount || '',
      net_discount: supplier.net_discount || '',
      min_volume: supplier.min_volume || '',
      max_volume: supplier.max_volume || '',
      delivery_time_hours: supplier.delivery_time_hours || '',
      handshake_wallet: supplier.handshake_wallet || { address: '', network: '', description: '', availability: 'available', forensic_status: 'not_verified' },
      transaction_wallet: supplier.transaction_wallet || { address: '', network: '', description: '', availability: 'available', forensic_status: 'not_verified' },
      delivery_countries: supplier.delivery_countries || [],
      tags: supplier.tags || []
    });
    setEditingSupplier(supplier.id);
    setShowModal(true);
  };

  const saveSupplier = async () => {
    try {
      const data = {
        ...form,
        gross_discount: form.gross_discount ? parseFloat(form.gross_discount) : null,
        net_discount: form.net_discount ? parseFloat(form.net_discount) : null,
        min_volume: form.min_volume ? parseFloat(form.min_volume) : null,
        max_volume: form.max_volume ? parseFloat(form.max_volume) : null,
        delivery_time_hours: form.delivery_time_hours ? parseInt(form.delivery_time_hours) : null
      };

      if (editingSupplier) {
        await axios.put(`${API_URL}/api/crm/suppliers/${editingSupplier}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fornecedor atualizado!');
      } else {
        await axios.post(`${API_URL}/api/crm/suppliers`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fornecedor criado!');
      }
      
      setShowModal(false);
      resetForm();
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar fornecedor');
    }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm('Tem certeza que deseja eliminar este fornecedor?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/crm/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Fornecedor eliminado!');
      fetchSuppliers();
    } catch (err) {
      toast.error('Erro ao eliminar fornecedor');
    }
  };

  const toggleCrypto = (crypto) => {
    setForm(prev => ({
      ...prev,
      cryptocurrencies: prev.cryptocurrencies.includes(crypto)
        ? prev.cryptocurrencies.filter(c => c !== crypto)
        : [...prev.cryptocurrencies, crypto]
    }));
  };

  const toggleDeliveryCountry = (country) => {
    setForm(prev => ({
      ...prev,
      delivery_countries: prev.delivery_countries.includes(country)
        ? prev.delivery_countries.filter(c => c !== country)
        : [...prev.delivery_countries, country]
    }));
  };

  const getForensicBadge = (status) => {
    const badges = {
      not_verified: { color: 'bg-gray-500/20 text-gray-400', label: 'Não Verificada' },
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pendente' },
      verified_clean: { color: 'bg-green-500/20 text-green-400', label: 'Limpa' },
      verified_flagged: { color: 'bg-red-500/20 text-red-400', label: 'Sinalizada' },
      rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejeitada' }
    };
    return badges[status] || badges.not_verified;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fornecedores</h1>
          <p className="text-gray-400">Gerir parceiros OTC e fornecedores de criptomoedas</p>
        </div>
        <Button onClick={openNewModal} className="bg-gold-500 hover:bg-gold-400 text-black">
          <Plus size={16} className="mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar fornecedores..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Todas Categorias</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        <select
          value={filter.is_active}
          onChange={(e) => setFilter({ ...filter, is_active: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Todos Status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <Button variant="outline" onClick={fetchSuppliers} className="border-zinc-700">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Suppliers List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Handshake size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400">Nenhum fornecedor encontrado</p>
            <Button onClick={openNewModal} className="mt-4 bg-gold-500 hover:bg-gold-400 text-black">
              <Plus size={16} className="mr-2" /> Adicionar Primeiro Fornecedor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suppliers.map(supplier => (
            <Card key={supplier.id} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                {/* Main Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      supplier.is_verified ? 'bg-green-500/20' : 'bg-zinc-800'
                    }`}>
                      {supplier.is_verified ? (
                        <Shield size={24} className="text-green-400" />
                      ) : (
                        <Handshake size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{supplier.name}</span>
                        {supplier.company_name && (
                          <span className="text-gray-400 text-sm">({supplier.company_name})</span>
                        )}
                        {supplier.registered_on_kryptobox && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">KBEX</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                        {supplier.country && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {supplier.country}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">
                            {supplier.category?.replace('_', ' ')}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Cryptos */}
                    <div className="hidden md:flex items-center gap-1">
                      {supplier.cryptocurrencies?.slice(0, 3).map(crypto => (
                        <Badge key={crypto} className="bg-zinc-800 text-gray-300 border-0 text-xs">
                          {crypto}
                        </Badge>
                      ))}
                      {supplier.cryptocurrencies?.length > 3 && (
                        <Badge className="bg-zinc-800 text-gray-500 border-0 text-xs">
                          +{supplier.cryptocurrencies.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Discounts */}
                    {(supplier.gross_discount || supplier.net_discount) && (
                      <div className="hidden md:block text-right">
                        {supplier.gross_discount && (
                          <div className="text-xs text-gray-400">Bruto: {supplier.gross_discount}%</div>
                        )}
                        {supplier.net_discount && (
                          <div className="text-xs text-emerald-400">Líquido: {supplier.net_discount}%</div>
                        )}
                      </div>
                    )}

                    {/* Status */}
                    <Badge className={`border-0 ${supplier.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {supplier.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedSupplier(expandedSupplier === supplier.id ? null : supplier.id)}
                        className="text-gray-400"
                      >
                        {expandedSupplier === supplier.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(supplier)}
                        className="border-gold-600/50 text-gold-400"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSupplier(supplier.id)}
                        className="border-red-600/50 text-red-400"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedSupplier === supplier.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Contact Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Contacto</h4>
                      <div className="space-y-2">
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Mail size={14} className="text-gray-500" /> {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Phone size={14} className="text-gray-500" /> {supplier.phone}
                          </div>
                        )}
                        {supplier.region && (
                          <div className="flex items-center gap-2 text-sm text-white">
                            <Globe size={14} className="text-gray-500" /> {supplier.region}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Wallets */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Carteiras</h4>
                      <div className="space-y-2">
                        {supplier.handshake_wallet?.address && (
                          <div className="p-2 bg-zinc-800/50 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Aperto de Mão</span>
                              <Badge className={`border-0 text-xs ${getForensicBadge(supplier.handshake_wallet.forensic_status).color}`}>
                                {getForensicBadge(supplier.handshake_wallet.forensic_status).label}
                              </Badge>
                            </div>
                            <code className="text-xs text-white break-all">
                              {supplier.handshake_wallet.address.slice(0, 20)}...
                            </code>
                          </div>
                        )}
                        {supplier.transaction_wallet?.address && (
                          <div className="p-2 bg-zinc-800/50 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Transação</span>
                              <Badge className={`border-0 text-xs ${getForensicBadge(supplier.transaction_wallet.forensic_status).color}`}>
                                {getForensicBadge(supplier.transaction_wallet.forensic_status).label}
                              </Badge>
                            </div>
                            <code className="text-xs text-white break-all">
                              {supplier.transaction_wallet.address.slice(0, 20)}...
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Entregas</h4>
                      {supplier.delivery_countries?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {supplier.delivery_countries.map(c => (
                            <Badge key={c} className="bg-zinc-800 text-gray-300 border-0 text-xs">{c}</Badge>
                          ))}
                        </div>
                      )}
                      {supplier.delivery_time_hours && (
                        <p className="text-sm text-gray-400">
                          Tempo: {supplier.delivery_time_hours}h
                        </p>
                      )}
                      {supplier.delivery_map && (
                        <p className="text-sm text-gray-400 mt-1">
                          {supplier.delivery_map}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? t('tier23Modals.crmSupplier.edit') : t('tier23Modals.crmSupplier.new')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do fornecedor"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Empresa</label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Nome da empresa"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email</label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+351 123 456 789"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">País</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Região</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Crypto & Category */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Criptomoedas</label>
              <div className="flex flex-wrap gap-2">
                {CRYPTOCURRENCIES.map(crypto => (
                  <Badge
                    key={crypto}
                    className={`cursor-pointer transition-colors ${
                      form.cryptocurrencies.includes(crypto)
                        ? 'bg-gold-500 text-black'
                        : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                    }`}
                    onClick={() => toggleCrypto(crypto)}
                  >
                    {crypto}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Desconto Bruto (%)</label>
                <Input
                  type="number" step="any"
                  step="0.1"
                  value={form.gross_discount}
                  onChange={(e) => setForm({ ...form, gross_discount: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Desconto Líquido (%)</label>
                <Input
                  type="number" step="any"
                  step="0.1"
                  value={form.net_discount}
                  onChange={(e) => setForm({ ...form, net_discount: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Volume & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Volume Mínimo</label>
                <Input
                  type="number" step="any"
                  value={form.min_volume}
                  onChange={(e) => setForm({ ...form, min_volume: e.target.value })}
                  placeholder="10000"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Volume Máximo</label>
                <Input
                  type="number" step="any"
                  value={form.max_volume}
                  onChange={(e) => setForm({ ...form, max_volume: e.target.value })}
                  placeholder="1000000"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Moeda Preferida</label>
                <select
                  value={form.preferred_currency}
                  onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>

            {/* Wallets */}
            <div className="border border-zinc-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <Wallet size={16} /> Carteiras
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Handshake Wallet */}
                <div className="space-y-3">
                  <h5 className="text-sm text-gray-400">Carteira de Aperto de Mão</h5>
                  <Input
                    value={form.handshake_wallet.address}
                    onChange={(e) => setForm({ ...form, handshake_wallet: { ...form.handshake_wallet, address: e.target.value } })}
                    placeholder="Endereço da carteira"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.handshake_wallet.network}
                      onChange={(e) => setForm({ ...form, handshake_wallet: { ...form.handshake_wallet, network: e.target.value } })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Rede</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="TRC20">TRC20</option>
                      <option value="ERC20">ERC20</option>
                    </select>
                    <select
                      value={form.handshake_wallet.forensic_status}
                      onChange={(e) => setForm({ ...form, handshake_wallet: { ...form.handshake_wallet, forensic_status: e.target.value } })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="not_verified">Não Verificada</option>
                      <option value="pending">Pendente</option>
                      <option value="verified_clean">Limpa</option>
                      <option value="verified_flagged">Sinalizada</option>
                      <option value="rejected">Rejeitada</option>
                    </select>
                  </div>
                  <Input
                    value={form.handshake_wallet.description}
                    onChange={(e) => setForm({ ...form, handshake_wallet: { ...form.handshake_wallet, description: e.target.value } })}
                    placeholder="Descrição da carteira"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                {/* Transaction Wallet */}
                <div className="space-y-3">
                  <h5 className="text-sm text-gray-400">Carteira de Transação</h5>
                  <Input
                    value={form.transaction_wallet.address}
                    onChange={(e) => setForm({ ...form, transaction_wallet: { ...form.transaction_wallet, address: e.target.value } })}
                    placeholder="Endereço da carteira"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.transaction_wallet.network}
                      onChange={(e) => setForm({ ...form, transaction_wallet: { ...form.transaction_wallet, network: e.target.value } })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Rede</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="TRC20">TRC20</option>
                      <option value="ERC20">ERC20</option>
                    </select>
                    <select
                      value={form.transaction_wallet.forensic_status}
                      onChange={(e) => setForm({ ...form, transaction_wallet: { ...form.transaction_wallet, forensic_status: e.target.value } })}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="not_verified">Não Verificada</option>
                      <option value="pending">Pendente</option>
                      <option value="verified_clean">Limpa</option>
                      <option value="verified_flagged">Sinalizada</option>
                      <option value="rejected">Rejeitada</option>
                    </select>
                  </div>
                  <Input
                    value={form.transaction_wallet.description}
                    onChange={(e) => setForm({ ...form, transaction_wallet: { ...form.transaction_wallet, description: e.target.value } })}
                    placeholder="Descrição da carteira"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Países de Entrega</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COUNTRIES.map(c => (
                  <Badge
                    key={c.code}
                    className={`cursor-pointer transition-colors ${
                      form.delivery_countries.includes(c.name)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                    }`}
                    onClick={() => toggleDeliveryCountry(c.name)}
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Tempo de Entrega (horas)</label>
                  <Input
                    type="number" step="any"
                    value={form.delivery_time_hours}
                    onChange={(e) => setForm({ ...form, delivery_time_hours: e.target.value })}
                    placeholder="24"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Mapa de Entregas</label>
                  <Input
                    value={form.delivery_map}
                    onChange={(e) => setForm({ ...form, delivery_map: e.target.value })}
                    placeholder="Descrição do processo de entrega"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Status & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_verified}
                    onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Shield size={16} className="text-green-400" />
                  Verificado
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.registered_on_kryptobox}
                    onChange={(e) => setForm({ ...form, registered_on_kryptobox: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Registado na KBEX
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionais sobre o fornecedor..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={saveSupplier} className="bg-emerald-500 hover:bg-emerald-600">
              <Save size={16} className="mr-2" />
              {editingSupplier ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMSuppliers;
