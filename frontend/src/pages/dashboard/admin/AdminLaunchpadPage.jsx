import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  Rocket,
  Plus,
  Edit,
  Trash2,
  Users,
  Loader2,
  X,
  CheckCircle,
  RefreshCw,
  DollarSign,
  Coins,
  ArrowRight,
  Ban,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusCfg = {
  upcoming: { label: 'Em Breve', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  active: { label: 'Ativo', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  completed: { label: 'Concluído', color: 'text-gray-400', bg: 'bg-gray-500/15' },
  sold_out: { label: 'Esgotado', color: 'text-red-400', bg: 'bg-red-500/15' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/15' },
};

const AdminLaunchpadPage = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubs, setShowSubs] = useState(null);
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [form, setForm] = useState({
    name: '', symbol: '', description: '', price: '', total_supply: '',
    hard_cap: '', soft_cap: '', min_allocation: '', max_allocation: '',
    start_date: '', end_date: '', distribution_date: '',
    whitepaper_url: '', website_url: '', network: 'Ethereum', token_type: 'ERC-20',
    logo_url: '', banner_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const handleImageUpload = async (file, field) => {
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Ficheiro demasiado grande. Máximo 5MB.');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Tipo de ficheiro não permitido. Use JPG, PNG ou WebP.');
      return;
    }

    const setUploading = field === 'logo_url' ? setUploadingLogo : setUploadingBanner;
    setUploading(true);

    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await axios.post(`${API_URL}/api/uploads/file-json`, {
        file_data: base64,
        filename: file.name,
        content_type: file.type,
        category: 'launchpad',
      }, { headers });

      const fullUrl = `${API_URL}${res.data.url}`;
      setForm(prev => ({ ...prev, [field]: fullUrl }));
      toast.success(field === 'logo_url' ? 'Logo carregado' : 'Banner carregado');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const fetchSales = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/launchpad/sales`);
      setSales(res.data.sales || []);
    } catch (err) {
      toast.error('Erro ao carregar token sales');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const resetForm = () => {
    setForm({
      name: '', symbol: '', description: '', price: '', total_supply: '',
      hard_cap: '', soft_cap: '', min_allocation: '', max_allocation: '',
      start_date: '', end_date: '', distribution_date: '',
      whitepaper_url: '', website_url: '', network: 'Ethereum', token_type: 'ERC-20',
      logo_url: '', banner_url: '',
    });
  };

  const handleCreate = async () => {
    if (!form.name || !form.symbol || !form.price || !form.total_supply || !form.hard_cap || !form.start_date || !form.end_date) {
      toast.error('Preencha os campos obrigatórios'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        total_supply: parseFloat(form.total_supply),
        hard_cap: parseFloat(form.hard_cap),
        soft_cap: form.soft_cap ? parseFloat(form.soft_cap) : 0,
        min_allocation: form.min_allocation ? parseFloat(form.min_allocation) : 0,
        max_allocation: form.max_allocation ? parseFloat(form.max_allocation) : 0,
      };
      if (editSale) {
        await axios.put(`${API_URL}/api/launchpad/admin/sales/${editSale.id}`, payload, { headers });
        toast.success('Token sale atualizado');
      } else {
        await axios.post(`${API_URL}/api/launchpad/admin/sales`, payload, { headers });
        toast.success('Token sale criado com sucesso');
      }
      setShowCreate(false);
      setEditSale(null);
      resetForm();
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (saleId) => {
    if (!window.confirm('Tem certeza que deseja eliminar?')) return;
    try {
      await axios.delete(`${API_URL}/api/launchpad/admin/sales/${saleId}`, { headers });
      toast.success('Token sale eliminado');
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar');
    }
  };

  const handleStatusChange = async (saleId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/launchpad/admin/sales/${saleId}`, { status: newStatus }, { headers });
      toast.success(`Status atualizado para ${newStatus}`);
      fetchSales();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const openEdit = (sale) => {
    setEditSale(sale);
    setForm({
      name: sale.name || '', symbol: sale.symbol || '', description: sale.description || '',
      price: String(sale.price || ''), total_supply: String(sale.total_supply || ''),
      hard_cap: String(sale.hard_cap || ''), soft_cap: String(sale.soft_cap || ''),
      min_allocation: String(sale.min_allocation || ''), max_allocation: String(sale.max_allocation || ''),
      start_date: sale.start_date?.slice(0, 16) || '', end_date: sale.end_date?.slice(0, 16) || '',
      distribution_date: sale.distribution_date?.slice(0, 16) || '',
      whitepaper_url: sale.whitepaper_url || '', website_url: sale.website_url || '',
      network: sale.network || 'Ethereum', token_type: sale.token_type || 'ERC-20',
      logo_url: sale.logo_url || '', banner_url: sale.banner_url || '',
    });
    setShowCreate(true);
  };

  const viewSubscriptions = async (saleId) => {
    setShowSubs(saleId);
    setSubsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/launchpad/admin/sales/${saleId}/subscriptions`, { headers });
      setSubs(res.data.subscriptions || []);
    } catch (err) {
      toast.error('Erro ao carregar subscrições');
    } finally {
      setSubsLoading(false);
    }
  };

  const distributeSubscription = async (subId) => {
    try {
      await axios.put(`${API_URL}/api/launchpad/admin/subscriptions/${subId}/distribute`, {}, { headers });
      toast.success('Tokens distribuídos');
      viewSubscriptions(showSubs);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const refundSubscription = async (subId) => {
    if (!window.confirm('Reembolsar esta subscrição?')) return;
    try {
      await axios.put(`${API_URL}/api/launchpad/admin/subscriptions/${subId}/refund`, {}, { headers });
      toast.success('Subscrição reembolsada');
      viewSubscriptions(showSubs);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-gold-400 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-launchpad-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-2">
            <Rocket size={24} className="text-gold-400" /> Launchpad Admin
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gerir token sales e subscrições</p>
        </div>
        <Button onClick={() => { resetForm(); setEditSale(null); setShowCreate(true); }} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="create-sale-btn">
          <Plus size={16} className="mr-1" /> Novo Token Sale
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', value: sales.length, icon: Rocket, color: 'text-gold-400' },
          { label: 'Ativos', value: sales.filter(s => s.computed_status === 'active').length, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Capital Levantado', value: `$${(sales.reduce((a, s) => a + (s.raised_amount || 0), 0)).toLocaleString()}`, icon: DollarSign, color: 'text-blue-400' },
          { label: 'Tokens Vendidos', value: sales.reduce((a, s) => a + (s.tokens_sold || 0), 0).toLocaleString(), icon: Coins, color: 'text-amber-400' },
        ].map((kpi, i) => (
          <Card key={i} className="border-zinc-800 bg-zinc-900/40">
            <CardContent className="p-4">
              <kpi.icon size={18} className={`${kpi.color} mb-2`} />
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-gray-500">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {sales.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-xl">
            <Rocket size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum token sale criado</p>
            <Button onClick={() => setShowCreate(true)} variant="outline" className="mt-3 border-gold-500/30 text-gold-400">
              <Plus size={14} className="mr-1" /> Criar Primeiro Sale
            </Button>
          </div>
        ) : (
          sales.map(sale => {
            const cfg = statusCfg[sale.computed_status] || statusCfg.upcoming;
            return (
              <Card key={sale.id} className="border-zinc-800 bg-zinc-900/40" data-testid={`admin-sale-${sale.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center">
                        {sale.logo_url ? (
                          <img src={sale.logo_url} alt={sale.symbol} className="w-10 h-10 rounded-lg" />
                        ) : (
                          <Coins size={24} className="text-gold-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{sale.name}</h3>
                          <Badge className={`${cfg.bg} ${cfg.color} border-0 text-[10px]`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {sale.symbol} &middot; ${sale.price}/token &middot; {sale.network}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Progress */}
                      <div className="hidden md:block w-40">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">${(sale.raised_amount || 0).toLocaleString()}</span>
                          <span className="text-gold-400">{sale.progress_pct}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full">
                          <div className="h-full bg-gold-500 rounded-full" style={{ width: `${Math.min(sale.progress_pct, 100)}%` }} />
                        </div>
                      </div>

                      <div className="hidden md:block text-right">
                        <p className="text-white font-medium">{sale.tokens_sold?.toLocaleString() || 0} / {sale.total_supply?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">tokens vendidos</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={() => viewSubscriptions(sale.id)} data-testid={`view-subs-${sale.id}`}>
                          <Users size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-400" onClick={() => openEdit(sale)}>
                          <Edit size={16} />
                        </Button>
                        {sale.computed_status === 'upcoming' && (
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-emerald-400" onClick={() => handleStatusChange(sale.id, 'active')} title="Ativar">
                            <CheckCircle size={16} />
                          </Button>
                        )}
                        {sale.computed_status === 'active' && (
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-amber-400" onClick={() => handleStatusChange(sale.id, 'completed')} title="Completar">
                            <Ban size={16} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400" onClick={() => handleDelete(sale.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowCreate(false); setEditSale(null); }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="create-sale-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{editSale ? 'Editar' : 'Novo'} Token Sale</h3>
              <button onClick={() => { setShowCreate(false); setEditSale(null); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name', label: 'Nome *', type: 'text', span: 1 },
                { key: 'symbol', label: 'Símbolo *', type: 'text', span: 1 },
                { key: 'price', label: 'Preço (USD) *', type: 'number', span: 1 },
                { key: 'total_supply', label: 'Supply Total *', type: 'number', span: 1 },
                { key: 'hard_cap', label: 'Hard Cap (USD) *', type: 'number', span: 1 },
                { key: 'soft_cap', label: 'Soft Cap (USD)', type: 'number', span: 1 },
                { key: 'min_allocation', label: 'Min. Alocação', type: 'number', span: 1 },
                { key: 'max_allocation', label: 'Max. Alocação', type: 'number', span: 1 },
                { key: 'start_date', label: 'Data Início *', type: 'datetime-local', span: 1 },
                { key: 'end_date', label: 'Data Fim *', type: 'datetime-local', span: 1 },
                { key: 'distribution_date', label: 'Data Distribuição', type: 'datetime-local', span: 2 },
                { key: 'network', label: 'Network', type: 'text', span: 1 },
                { key: 'token_type', label: 'Token Type', type: 'text', span: 1 },
                { key: 'whitepaper_url', label: 'Whitepaper URL', type: 'text', span: 1 },
                { key: 'website_url', label: 'Website URL', type: 'text', span: 1 },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <Input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white text-sm"
                    data-testid={`field-${f.key}`}
                  />
                </div>
              ))}

              {/* Logo Upload */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Logo do Token</label>
                <input
                  type="file"
                  ref={logoInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={e => handleImageUpload(e.target.files?.[0], 'logo_url')}
                />
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border border-dashed border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-gold-500/50 transition-colors flex items-center gap-3"
                  data-testid="upload-logo"
                >
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <ImageIcon size={20} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {uploadingLogo ? (
                      <div className="flex items-center gap-2 text-gold-400 text-sm">
                        <Loader2 size={14} className="animate-spin" /> A carregar...
                      </div>
                    ) : form.logo_url ? (
                      <p className="text-sm text-emerald-400 truncate">Logo carregado</p>
                    ) : (
                      <p className="text-sm text-gray-400">Clique para carregar</p>
                    )}
                    <p className="text-[10px] text-gray-600">JPG, PNG, WebP - Max 5MB</p>
                  </div>
                  <Upload size={16} className="text-gray-500" />
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Banner</label>
                <input
                  type="file"
                  ref={bannerInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={e => handleImageUpload(e.target.files?.[0], 'banner_url')}
                />
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="border border-dashed border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-gold-500/50 transition-colors flex items-center gap-3"
                  data-testid="upload-banner"
                >
                  {form.banner_url ? (
                    <img src={form.banner_url} alt="Banner" className="w-16 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-16 h-10 rounded bg-zinc-800 flex items-center justify-center">
                      <ImageIcon size={18} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {uploadingBanner ? (
                      <div className="flex items-center gap-2 text-gold-400 text-sm">
                        <Loader2 size={14} className="animate-spin" /> A carregar...
                      </div>
                    ) : form.banner_url ? (
                      <p className="text-sm text-emerald-400 truncate">Banner carregado</p>
                    ) : (
                      <p className="text-sm text-gray-400">Clique para carregar</p>
                    )}
                    <p className="text-[10px] text-gray-600">JPG, PNG, WebP - Max 5MB</p>
                  </div>
                  <Upload size={16} className="text-gray-500" />
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-md p-2.5 min-h-[80px]"
                  data-testid="field-description"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditSale(null); }} className="border-zinc-700 text-gray-400">Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="save-sale-btn">
                {saving ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                {editSale ? 'Guardar' : 'Criar'} Token Sale
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Modal */}
      {showSubs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSubs(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="subs-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Subscrições</h3>
              <button onClick={() => setShowSubs(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            {subsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>
            ) : subs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhuma subscrição</p>
            ) : (
              <div className="space-y-2">
                {subs.map(sub => (
                  <div key={sub.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between" data-testid={`admin-sub-${sub.id}`}>
                    <div>
                      <p className="text-white text-sm font-medium">{sub.user_name || sub.user_email}</p>
                      <p className="text-gray-400 text-xs">{sub.amount_tokens?.toLocaleString()} {sub.sale_symbol} &middot; ${sub.amount_usd?.toLocaleString()}</p>
                      <p className="text-gray-500 text-xs">{new Date(sub.created_at).toLocaleString('pt-PT')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${(sub.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' : sub.status === 'distributed' ? 'bg-blue-500/15 text-blue-400' : sub.status === 'refunded' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400')} border-0 text-[10px]`}>
                        {sub.status}
                      </Badge>
                      {sub.status === 'confirmed' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 text-xs" onClick={() => distributeSubscription(sub.id)}>
                            <ArrowRight size={12} className="mr-1" /> Distribuir
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 text-xs" onClick={() => refundSubscription(sub.id)}>
                            <RefreshCw size={12} className="mr-1" /> Reembolsar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLaunchpadPage;
