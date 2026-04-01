import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { ShieldCheck, Users, Plus, Trash2, Save, Clock, Settings, UserCheck, Mail } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const roleLabels = { admin: 'Admin', signer: 'Signer', viewer: 'Viewer' };
const roleColors = {
  admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  signer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  viewer: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const VaultSignatories = () => {
  const { token } = useAuth();
  const [signatories, setSignatories] = useState([]);
  const [settings, setSettings] = useState({ required_signatures: 2, transaction_timeout_hours: 48 });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSigner, setNewSigner] = useState({ email: '', name: '', role: 'signer' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [sigRes, setRes] = await Promise.all([
        axios.get(`${API_URL}/api/vault/signatories`, { headers }),
        axios.get(`${API_URL}/api/vault/settings`, { headers }),
      ]);
      setSignatories(sigRes.data.signatories || []);
      setSettings(setRes.data);
    } catch { }
    finally { setLoading(false); }
  };

  const addSignatory = async () => {
    if (!newSigner.email) { toast.error('Email é obrigatório'); return; }
    try {
      await axios.post(`${API_URL}/api/vault/signatories`, newSigner, { headers });
      toast.success('Signatário adicionado');
      setShowAddDialog(false);
      setNewSigner({ email: '', name: '', role: 'signer' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro'); }
  };

  const removeSignatory = async (id) => {
    if (!window.confirm('Remover este signatário?')) return;
    try {
      await axios.delete(`${API_URL}/api/vault/signatories/${id}`, { headers });
      toast.success('Removido');
      fetchAll();
    } catch { toast.error('Erro ao remover'); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/vault/settings`, settings, { headers });
      toast.success('Configurações guardadas');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro'); }
    finally { setSaving(false); }
  };

  const signers = signatories.filter(s => s.role !== 'viewer');

  if (loading) return <div className="text-center py-20 text-zinc-500">A carregar...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8" data-testid="vault-signatories-page">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/60 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light text-zinc-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Users size={22} className="text-amber-400" />
              </div>
              Signatários
            </h1>
            <p className="text-zinc-400 text-sm mt-2">Gerir os seus signatários autorizados e configurações de threshold</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full px-6" data-testid="add-signatory-btn">
            <Plus size={18} className="mr-2" /> Adicionar Signatário
          </Button>
        </div>
      </div>

      {/* Threshold Config */}
      <Card className="bg-zinc-900 border-zinc-800/50">
        <CardContent className="p-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2"><Settings size={14} /> Configuração de Threshold</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">Assinaturas Necessárias</Label>
              <Input type="number" step="any" min={1} max={10} value={settings.required_signatures}
                onChange={e => setSettings(s => ({ ...s, required_signatures: parseInt(e.target.value) || 2 }))}
                className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="threshold-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-sm">Timeout (horas)</Label>
              <Input type="number" step="any" min={1} max={168} value={settings.transaction_timeout_hours}
                onChange={e => setSettings(s => ({ ...s, transaction_timeout_hours: parseInt(e.target.value) || 48 }))}
                className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="timeout-input" />
            </div>
            <div className="flex items-end">
              <Button onClick={saveSettings} disabled={saving} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full px-8" data-testid="save-vault-settings-btn">
                <Save size={16} className="mr-2" /> {saving ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>
          {/* Visual threshold */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-zinc-500 text-xs">Threshold:</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.max(signers.length, settings.required_signatures) }).map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                  i < settings.required_signatures ? 'bg-amber-500 border-amber-400 text-zinc-950' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}>{i + 1}</div>
              ))}
            </div>
            <span className="text-amber-400 text-xs font-mono ml-2">{settings.required_signatures} de {signers.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Signatories List */}
      <div className="space-y-3">
        {signatories.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800/50">
            <CardContent className="p-12 text-center">
              <Users size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500">Nenhum signatário configurado</p>
              <Button onClick={() => setShowAddDialog(true)} variant="outline" className="mt-4 border-amber-500/30 text-amber-400 rounded-full">
                <Plus size={16} className="mr-1" /> Adicionar primeiro signatário
              </Button>
            </CardContent>
          </Card>
        ) : (
          signatories.map(s => (
            <Card key={s.id} className="bg-zinc-900 border-zinc-800/50 hover:border-zinc-700 transition-all" data-testid={`signatory-${s.id}`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold border-2 ${
                    s.role === 'admin' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                    s.role === 'signer' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}>
                    {s.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-zinc-100 font-medium">{s.name}</p>
                      {s.is_registered && <UserCheck size={14} className="text-emerald-400" title="Registado na plataforma" />}
                    </div>
                    <p className="text-zinc-500 text-xs flex items-center gap-1"><Mail size={10} /> {s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`${roleColors[s.role]} border rounded-full text-xs px-3`}>{roleLabels[s.role]}</Badge>
                  <button onClick={() => removeSignatory(s.id)} className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                    data-testid={`remove-signatory-${s.id}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Signatory Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md" data-testid="add-signatory-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-zinc-50 flex items-center gap-2">
              <Users className="text-amber-400" size={20} /> Adicionar Signatário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-sm">Email *</Label>
              <Input value={newSigner.email} onChange={e => setNewSigner(s => ({ ...s, email: e.target.value }))}
                placeholder="email@exemplo.com" className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="signatory-email-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-sm">Nome</Label>
              <Input value={newSigner.name} onChange={e => setNewSigner(s => ({ ...s, name: e.target.value }))}
                placeholder="Nome do signatário" className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="signatory-name-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-sm">Função</Label>
              <div className="flex gap-2">
                {['signer', 'admin', 'viewer'].map(r => (
                  <button key={r} onClick={() => setNewSigner(s => ({ ...s, role: r }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${
                      newSigner.role === r ? roleColors[r] + ' border' : 'bg-zinc-800/30 text-zinc-500 border-zinc-700/50'
                    }`} data-testid={`signatory-role-${r}`}>{roleLabels[r]}</button>
                ))}
              </div>
            </div>
            <Button onClick={addSignatory} className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full" data-testid="confirm-add-signatory-btn">
              <Plus size={16} className="mr-2" /> Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultSignatories;
