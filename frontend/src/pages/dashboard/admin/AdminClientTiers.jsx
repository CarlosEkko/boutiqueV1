import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Crown,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import OTCPoliciesSection from './OTCPoliciesSection';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIER_ORDER = ['broker', 'standard', 'premium', 'vip', 'institucional'];

// Parse a cell input: "true"/"false"/"x"/"-"/"" or number or string
const parseCellInput = (raw) => {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim();
  if (s === '' || s === '-' || s === '—') return false;
  const lower = s.toLowerCase();
  if (['x', 'true', 'yes', 'sim', '✓'].includes(lower)) return true;
  if (['false', 'no', 'não', 'nao', '0'].includes(lower) && s !== '0') return false;
  const n = Number(s);
  if (!Number.isNaN(n) && s.match(/^-?\d+(\.\d+)?$/)) return n;
  return s; // keep as string (e.g. "24h", "ilimitado")
};

const formatCellDisplay = (value) => {
  if (value === true) return 'x';
  if (value === false || value === null || value === undefined) return '';
  return String(value);
};

const AdminClientTiers = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/client-tiers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfig(res.data);
      setDirty(false);
    } catch (err) {
      toast.error(t('tiers.admin.loadError', 'Falha ao carregar configuração'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const loadRequests = async () => {
    setRequestsOpen(true);
    setLoadingReq(true);
    try {
      const res = await axios.get(`${API_URL}/api/client-tiers/upgrade-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data.requests || []);
    } catch {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoadingReq(false);
    }
  };

  const updateTierMin = (tierId, value) => {
    setConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t2) => (t2.id === tierId ? { ...t2, min_allocation: Number(value) || 0 } : t2)),
    }));
    setDirty(true);
  };

  const updateCell = (sectionId, featureId, tierId, rawValue) => {
    const parsed = parseCellInput(rawValue);
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              features: s.features.map((f) =>
                f.id !== featureId ? f : { ...f, values: { ...f.values, [tierId]: parsed } }
              ),
            }
      ),
    }));
    setDirty(true);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/client-tiers`,
        { tiers: config.tiers, sections: config.sections },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('tiers.admin.saved', 'Configuração guardada'));
      setDirty(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm(t('tiers.admin.resetConfirm', 'Restaurar valores por defeito? Todas as alterações serão perdidas.'))) {
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/client-tiers/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('tiers.admin.resetSuccess', 'Restaurado para valores padrão'));
      await load();
    } catch {
      toast.error('Falha ao restaurar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6" data-testid="admin-tiers-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-400/80 mb-2">
            <Crown size={14} />
            <span>{t('tiers.admin.eyebrow', 'Gestão de Tiers')}</span>
          </div>
          <h1 className="text-3xl font-light text-white">
            {t('tiers.admin.title', 'Client Tiers & Features')}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {t('tiers.admin.subtitle', 'Edite alocações mínimas, benefícios e limites por tier.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            data-testid="view-upgrade-requests-btn"
          >
            <Inbox size={14} className="mr-1.5" />
            {t('tiers.admin.requests', 'Pedidos de Upgrade')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetDefaults}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            data-testid="reset-tiers-btn"
          >
            <RotateCcw size={14} className="mr-1.5" />
            {t('tiers.admin.reset', 'Restaurar')}
          </Button>
          <Button
            onClick={save}
            disabled={!dirty || saving}
            className="bg-gold-500 hover:bg-gold-600 text-black font-medium disabled:opacity-50"
            data-testid="save-tiers-btn"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} className="mr-1.5" />}
            {t('tiers.admin.save', 'Guardar')}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 px-4 py-2 text-sm text-amber-300">
          {t('tiers.admin.dirtyWarning', 'Existem alterações não guardadas.')}
        </div>
      )}

      {/* Min allocations */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
        <h2 className="text-sm uppercase tracking-widest text-gold-400 mb-4">
          {t('tiers.admin.allocationsTitle', 'Alocação Inicial Mínima')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {config.tiers.map((tier) => (
            <div key={tier.id} className="space-y-2">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">{tier.label}</label>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-sm">€</span>
                <Input
                  type="number"
                  value={tier.min_allocation}
                  onChange={(e) => updateTierMin(tier.id, e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  data-testid={`min-allocation-${tier.id}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(100px,1fr))] bg-zinc-900 border-b border-zinc-800">
          <div className="p-3 text-xs uppercase tracking-widest text-zinc-500">
            {t('tiers.feature', 'Característica')}
          </div>
          {TIER_ORDER.map((id) => {
            const tier = config.tiers.find((t2) => t2.id === id);
            if (!tier) return null;
            return (
              <div key={id} className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-gold-400 border-l border-zinc-800">
                {tier.label}
              </div>
            );
          })}
        </div>

        {config.sections.map((section) => (
          <div key={section.id}>
            <div className="px-3 py-2 bg-zinc-900/70 border-b border-zinc-800">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold-400/80 font-semibold">
                {section.label}
              </div>
            </div>
            {section.features.map((feat, idx) => (
              <div
                key={feat.id}
                className={`grid grid-cols-[minmax(200px,1.5fr)_repeat(5,minmax(100px,1fr))] ${
                  idx % 2 === 0 ? 'bg-zinc-950/30' : 'bg-zinc-900/20'
                }`}
              >
                <div className="p-2.5 text-sm text-zinc-200 font-light flex items-center">
                  {feat.label}
                </div>
                {TIER_ORDER.map((tierId) => (
                  <div key={tierId} className="p-1.5 border-l border-zinc-800/60">
                    <Input
                      value={formatCellDisplay(feat.values[tierId])}
                      onChange={(e) => updateCell(section.id, feat.id, tierId, e.target.value)}
                      placeholder="-"
                      className="h-8 bg-zinc-900/50 border-zinc-800 text-center text-xs text-white"
                      data-testid={`cell-${section.id}-${feat.id}-${tierId}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="text-xs text-zinc-500 px-1">
        {t(
          'tiers.admin.valueHint',
          'Valores aceites: "x" (disponível), vazio ou "-" (indisponível), número (ex: 4), ou texto livre (ex: "24h", "ilimitado").'
        )}
      </div>

      {/* Tier-based OTC service model matrix */}
      <OTCPoliciesSection token={token} />

      {/* Upgrade Requests Dialog */}
      <Dialog open={requestsOpen} onOpenChange={setRequestsOpen}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-400">
              <Inbox size={18} />
              {t('tiers.admin.requestsTitle', 'Pedidos de Upgrade')}
            </DialogTitle>
          </DialogHeader>
          {loadingReq ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gold-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              {t('tiers.admin.noRequests', 'Sem pedidos pendentes.')}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-800 p-4 space-y-2 bg-zinc-900/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{r.user_name}</div>
                      <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Mail size={12} />
                        {r.user_email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {r.current_tier}
                      </Badge>
                      <span className="text-zinc-600">→</span>
                      <Badge className="bg-gold-500/15 text-gold-300 border-gold-500/30">
                        {r.target_tier}
                      </Badge>
                    </div>
                  </div>
                  {r.message && (
                    <p className="text-sm text-zinc-300 bg-zinc-950 rounded p-2 border border-zinc-800">
                      {r.message}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{new Date(r.created_at).toLocaleString('pt-PT')}</span>
                    <Badge variant="outline" className={r.status === 'pending' ? 'border-amber-600/40 text-amber-400' : 'border-emerald-600/40 text-emerald-400'}>
                      {r.status === 'pending' ? <XCircle size={10} className="mr-1" /> : <CheckCircle2 size={10} className="mr-1" />}
                      {r.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientTiers;
