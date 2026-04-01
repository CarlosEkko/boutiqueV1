import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { ShieldCheck, Settings, Users, Save, Plus, Trash2, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ApprovalSettingsPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    required_approvals: 3,
    approval_timeout_hours: 48,
    approver_ids: [],
  });
  const [approvers, setApprovers] = useState([]);
  const [internalUsers, setInternalUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSettings();
    fetchInternalUsers();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/approvals/settings`, { headers });
      setSettings({
        required_approvals: res.data.required_approvals || 3,
        approval_timeout_hours: res.data.approval_timeout_hours || 48,
        approver_ids: res.data.approver_ids || [],
      });
      setApprovers(res.data.approvers || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const fetchInternalUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/users?user_type=internal`, { headers });
      setInternalUsers((res.data.users || res.data || []).filter(u => u.user_type === 'internal'));
    } catch { /* silent */ }
  };

  const addApprover = () => {
    if (!selectedUserId) return;
    if (settings.approver_ids.includes(selectedUserId)) {
      toast.error('Utilizador já é aprovador');
      return;
    }
    const user = internalUsers.find(u => u.id === selectedUserId);
    if (user) {
      setSettings(s => ({ ...s, approver_ids: [...s.approver_ids, selectedUserId] }));
      setApprovers(a => [...a, { id: user.id, name: user.name, email: user.email, internal_role: user.internal_role }]);
      setSelectedUserId('');
    }
  };

  const removeApprover = (userId) => {
    setSettings(s => ({ ...s, approver_ids: s.approver_ids.filter(id => id !== userId) }));
    setApprovers(a => a.filter(ap => ap.id !== userId));
  };

  const handleSave = async () => {
    if (settings.approver_ids.length < settings.required_approvals) {
      toast.error(`Precisa de pelo menos ${settings.required_approvals} aprovadores`);
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/approvals/settings`, settings, { headers });
      toast.success('Configurações guardadas');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar');
    } finally { setSaving(false); }
  };

  const availableUsers = internalUsers.filter(u => !settings.approver_ids.includes(u.id));

  if (loading) return <div className="text-center py-16 text-gray-500">A carregar...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="approval-settings-page">
      <div>
        <h1 className="text-2xl font-light text-white flex items-center gap-3">
          <Settings className="text-indigo-400" size={28} />
          Configurações Multi-Sign
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configure o processo de aprovação de transações</p>
      </div>

      {/* General Settings */}
      <Card className="bg-zinc-900/70 border-zinc-800">
        <CardContent className="p-6 space-y-5">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Regras de Aprovação</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-1"><ShieldCheck size={14} /> Aprovações Necessárias</Label>
              <Input
                type="number" step="any"
                min={1}
                max={10}
                value={settings.required_approvals}
                onChange={e => setSettings(s => ({ ...s, required_approvals: parseInt(e.target.value) || 3 }))}
                className="bg-zinc-800 border-zinc-700 text-white"
                data-testid="required-approvals-input"
              />
              <p className="text-xs text-gray-500">Número mínimo de aprovações para executar uma transação</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-1"><Clock size={14} /> Timeout (horas)</Label>
              <Input
                type="number" step="any"
                min={1}
                max={168}
                value={settings.approval_timeout_hours}
                onChange={e => setSettings(s => ({ ...s, approval_timeout_hours: parseInt(e.target.value) || 48 }))}
                className="bg-zinc-800 border-zinc-700 text-white"
                data-testid="timeout-hours-input"
              />
              <p className="text-xs text-gray-500">Tempo máximo para recolher aprovações antes de expirar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approvers */}
      <Card className="bg-zinc-900/70 border-zinc-800">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} /> Aprovadores ({approvers.length})
            </h3>
            <Badge className="bg-indigo-900/40 text-indigo-400 text-xs">
              Mínimo: {settings.required_approvals}
            </Badge>
          </div>

          {/* Add approver */}
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
              data-testid="select-approver"
            >
              <option value="">Selecionar utilizador interno...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <Button onClick={addApprover} disabled={!selectedUserId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="add-approver-btn">
              <Plus size={16} className="mr-1" /> Adicionar
            </Button>
          </div>

          {/* Approvers list */}
          <div className="space-y-2">
            {approvers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum aprovador configurado</p>
              </div>
            ) : (
              approvers.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-400 text-xs font-medium">
                      {a.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-white text-sm">{a.name}</p>
                      <p className="text-gray-500 text-xs">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.internal_role && (
                      <Badge className="bg-zinc-700 text-gray-300 text-[10px]">{a.internal_role}</Badge>
                    )}
                    <button onClick={() => removeApprover(a.id)}
                      className="p-1.5 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                      data-testid={`remove-approver-${a.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8" data-testid="save-approval-settings-btn">
          <Save size={16} className="mr-2" /> {saving ? 'A guardar...' : 'Guardar Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default ApprovalSettingsPage;
