import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/table';
import {
  ShieldCheck, Users, Vault, Plus, Loader2, RefreshCw, Eye,
  ChevronRight, Power, PowerOff, ArrowLeft, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const tierColors = {
  broker: 'bg-sky-500/15 text-sky-400 border-sky-700/30',
  standard: 'bg-zinc-500/15 text-zinc-300 border-zinc-600',
  premium: 'bg-amber-500/15 text-amber-400 border-amber-700/30',
  vip: 'bg-purple-500/15 text-purple-400 border-purple-700/30',
  institucional: 'bg-emerald-500/15 text-emerald-400 border-emerald-700/30',
};

const AdminMultiSignClients = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [activating, setActivating] = useState(false);

  // Activate form
  const [activateForm, setActivateForm] = useState({
    user_id: '', required_signatures: 2, transaction_timeout_hours: 48,
    cofre_name: 'Cofre Principal',
  });

  // Detail view
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/multisign/clients`, { headers });
      setClients(res.data.clients || []);
    } catch (err) {
      toast.error('Erro ao carregar clientes Multi-Sign');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openActivateModal = async () => {
    setShowActivateModal(true);
    setLoadingAvailable(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/multisign/available-clients`, { headers });
      setAvailableClients(res.data.clients || []);
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleActivate = async () => {
    if (!activateForm.user_id) { toast.error('Selecione um cliente'); return; }
    setActivating(true);
    try {
      await axios.post(`${API_URL}/api/admin/multisign/activate`, activateForm, { headers });
      toast.success('Multi-Sign ativado com sucesso');
      setShowActivateModal(false);
      setActivateForm({ user_id: '', required_signatures: 2, transaction_timeout_hours: 48, cofre_name: 'Cofre Principal' });
      await fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao ativar');
    } finally {
      setActivating(false);
    }
  };

  const viewDetail = async (userId) => {
    setSelectedClient(userId);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/multisign/clients/${userId}`, { headers });
      setClientDetail(res.data);
    } catch {
      toast.error('Erro ao carregar detalhe');
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleActive = async (userId, currentActive) => {
    try {
      if (currentActive) {
        await axios.delete(`${API_URL}/api/admin/multisign/clients/${userId}`, { headers });
        toast.success('Multi-Sign desativado');
      } else {
        await axios.put(`${API_URL}/api/admin/multisign/clients/${userId}`, { is_active: true }, { headers });
        toast.success('Multi-Sign reativado');
      }
      await fetchClients();
      if (selectedClient === userId) viewDetail(userId);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  // ============ DETAIL VIEW ============
  if (selectedClient && clientDetail) {
    const { user, settings, signatories, cofres, transactions } = clientDetail;
    return (
      <div className="space-y-6" data-testid="multisign-client-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setClientDetail(null); }} className="text-zinc-400 hover:text-white" data-testid="back-btn">
            <ArrowLeft size={16} className="mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-light text-white">{user?.name || 'Cliente'}</h1>
          <Badge className={`border ${tierColors[user?.membership_level] || tierColors.standard}`}>
            {user?.membership_level?.toUpperCase() || 'STANDARD'}
          </Badge>
          <Badge className={settings?.is_active !== false ? 'bg-emerald-500/15 text-emerald-400 border-emerald-700/30 border' : 'bg-rose-500/15 text-rose-400 border-rose-700/30 border'}>
            {settings?.is_active !== false ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <p className="text-sm text-zinc-500">{user?.email}</p>

        {/* Settings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800/50">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldCheck size={20} className="text-amber-500" />
              <div>
                <p className="text-xs text-zinc-500 uppercase">Assinaturas Requeridas</p>
                <p className="text-xl text-white font-light">{settings?.required_signatures || 2}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Users size={20} className="text-blue-500" />
              <div>
                <p className="text-xs text-zinc-500 uppercase">Signatários</p>
                <p className="text-xl text-white font-light">{signatories?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Vault size={20} className="text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500 uppercase">Cofres</p>
                <p className="text-xl text-white font-light">{cofres?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signatories */}
        <Card className="bg-zinc-900 border-zinc-800/50" data-testid="client-signatories">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-amber-500" /> Signatários
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs">Nome</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Email</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(signatories || []).map(s => (
                  <TableRow key={s.id} className="border-zinc-800/30 hover:bg-zinc-800/30">
                    <TableCell className="text-white text-sm py-2">{s.name}</TableCell>
                    <TableCell className="text-zinc-400 text-sm py-2">{s.email}</TableCell>
                    <TableCell className="py-2">
                      <Badge className={s.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : s.role === 'viewer' ? 'bg-zinc-500/15 text-zinc-400' : 'bg-blue-500/15 text-blue-400'}>
                        {s.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!signatories || signatories.length === 0) && (
                  <TableRow><TableCell colSpan={3} className="text-center text-zinc-500 py-6">Sem signatários</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cofres */}
        <Card className="bg-zinc-900 border-zinc-800/50" data-testid="client-cofres">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Vault size={14} className="text-amber-500" /> Cofres
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs">Nome</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Ativos</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cofres || []).map(c => {
                  const totalBal = (c.assets || []).reduce((s, a) => s + (a.balance || 0), 0);
                  return (
                    <TableRow key={c._id} className="border-zinc-800/30 hover:bg-zinc-800/30">
                      <TableCell className="text-white text-sm py-2">{c.cofre_name}</TableCell>
                      <TableCell className="text-zinc-400 text-sm py-2">
                        {(c.assets || []).map(a => a.asset).join(', ')}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {(c.assets || []).filter(a => a.balance > 0).map(a => (
                          <span key={a.asset} className="text-white font-mono text-sm mr-3">
                            {a.balance.toFixed(a.balance < 1 ? 6 : 2)} {a.asset}
                          </span>
                        ))}
                        {totalBal === 0 && <span className="text-zinc-600 text-sm">Vazio</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!cofres || cofres.length === 0) && (
                  <TableRow><TableCell colSpan={3} className="text-center text-zinc-500 py-6">Sem cofres</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="bg-zinc-900 border-zinc-800/50" data-testid="client-transactions">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={14} className="text-amber-500" /> Transações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs">Ordem</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Ativo</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Valor</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions || []).map(tx => (
                  <TableRow key={tx.id} className="border-zinc-800/30 hover:bg-zinc-800/30">
                    <TableCell className="text-zinc-300 text-sm py-2 font-mono">{tx.order_number}</TableCell>
                    <TableCell className="text-white text-sm py-2">{tx.asset}</TableCell>
                    <TableCell className="text-right text-white font-mono text-sm py-2">{tx.amount}</TableCell>
                    <TableCell className="text-right py-2">
                      <Badge className={`text-[10px] ${
                        tx.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                        tx.status === 'pending_signatures' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-zinc-500/15 text-zinc-400'
                      }`}>{tx.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="text-center text-zinc-500 py-6">Sem transações</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ LIST VIEW ============
  return (
    <div className="space-y-6" data-testid="multisign-clients-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight" data-testid="multisign-clients-title">
            Clientes Multi-Sign
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Gerir o serviço Multi-Sign para clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchClients} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-full" data-testid="refresh-btn">
            <RefreshCw size={14} className="mr-2" /> Atualizar
          </Button>
          <Button onClick={openActivateModal} className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg" data-testid="activate-multisign-btn">
            <Plus size={16} className="mr-2" /> Ativar Multi-Sign
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : clients.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800/50">
          <CardContent className="py-16 text-center">
            <ShieldCheck size={40} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-500">Nenhum cliente com Multi-Sign ativo</p>
            <Button onClick={openActivateModal} variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="activate-empty-btn">
              <Plus size={16} className="mr-2" /> Ativar para um Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <Card
              key={c.user_id}
              className="bg-zinc-900 border-zinc-800/50 hover:border-zinc-700 transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => viewDetail(c.user_id)}
              data-testid={`client-card-${c.user_id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">{c.name}</h3>
                    <p className="text-zinc-500 text-xs truncate">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`border text-[10px] ${tierColors[c.membership_level] || tierColors.standard}`}>
                      {c.membership_level?.toUpperCase()}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(c.user_id, c.is_active); }}
                      className={`p-1 rounded ${c.is_active ? 'text-emerald-400 hover:text-emerald-300' : 'text-rose-400 hover:text-rose-300'}`}
                      data-testid={`toggle-${c.user_id}`}
                    >
                      {c.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-zinc-800/50 rounded-lg py-2">
                    <p className="text-lg text-white font-light">{c.signatories_count}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">Signatários</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg py-2">
                    <p className="text-lg text-white font-light">{c.cofres_count}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">Cofres</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg py-2">
                    <p className="text-lg text-white font-light">{c.transactions_count}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">Transações</p>
                  </div>
                </div>
                {c.pending_transactions > 0 && (
                  <div className="mt-3 flex items-center justify-between bg-amber-500/10 rounded-lg px-3 py-1.5 border border-amber-700/20">
                    <span className="text-amber-400 text-xs">{c.pending_transactions} pendente{c.pending_transactions > 1 ? 's' : ''}</span>
                    <ChevronRight size={14} className="text-amber-500" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Activate Modal */}
      <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-light flex items-center gap-2">
              <ShieldCheck size={20} className="text-amber-500" /> Ativar Multi-Sign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-400 text-sm">Cliente</Label>
              {loadingAvailable ? (
                <div className="flex items-center gap-2 py-3 text-zinc-500"><Loader2 size={14} className="animate-spin" /> A carregar...</div>
              ) : availableClients.length === 0 ? (
                <p className="text-zinc-500 text-sm py-2">Todos os clientes já têm Multi-Sign ativo</p>
              ) : (
                <Select value={activateForm.user_id} onValueChange={v => setActivateForm(f => ({ ...f, user_id: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="select-client">
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {availableClients.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                        {c.name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-sm">Assinaturas Requeridas</Label>
                <Input type="number" step="any" min={1} max={10} value={activateForm.required_signatures}
                  onChange={e => setActivateForm(f => ({ ...f, required_signatures: parseInt(e.target.value) || 2 }))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="required-sigs-input" />
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Timeout (horas)</Label>
                <Input type="number" step="any" min={1} max={168} value={activateForm.transaction_timeout_hours}
                  onChange={e => setActivateForm(f => ({ ...f, transaction_timeout_hours: parseInt(e.target.value) || 48 }))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="timeout-input" />
              </div>
            </div>
            <div>
              <Label className="text-zinc-400 text-sm">Nome do Cofre Inicial</Label>
              <Input value={activateForm.cofre_name}
                onChange={e => setActivateForm(f => ({ ...f, cofre_name: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="cofre-name-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateModal(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleActivate} disabled={activating || !activateForm.user_id}
              className="bg-amber-600 hover:bg-amber-500 text-white" data-testid="confirm-activate-btn">
              {activating ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShieldCheck size={16} className="mr-2" />}
              Ativar Multi-Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMultiSignClients;
