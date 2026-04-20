import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import {
  Settings,
  Percent,
  DollarSign,
  Users,
  Save,
  RefreshCw,
  CheckCircle,
  Info,
  Vault
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  
  // Referral Fees State
  const [referralFees, setReferralFees] = useState({
    trading_fee_percent: 10,
    deposit_fee_percent: 5,
    withdrawal_fee_percent: 5,
    admission_fee_percent: 0,
    annual_commission_percent: 0,
    min_payout_amount: 50,
    payout_currency: 'EUR'
  });
  
  // Admission Fee State - EUR as reference, 5 profiles
  const [admissionFee, setAdmissionFee] = useState({
    broker_eur: 0,
    standard_eur: 500,
    premium_eur: 2500,
    vip_eur: 10000,
    institucional_eur: 25000,
    is_active: true
  });

  // Tier Limits State (read-only, sourced from client_tiers_config)
  const [tierLimits, setTierLimits] = useState({
    broker: 1, standard: 3, premium: 10, vip: 20, institucional: 50
  });

  useEffect(() => {
    fetchSettings();
    fetchTierLimits();
  }, [token]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/referrals/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      if (response.data.referral_fees) {
        setReferralFees(response.data.referral_fees);
      }
      if (response.data.admission_fee) {
        setAdmissionFee(response.data.admission_fee);
      }
    } catch (err) {
      toast.error('Falha ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchTierLimits = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/omnibus/tier-limits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.tier_limits) setTierLimits(res.data.tier_limits);
    } catch (err) { console.error('Failed to load tier limits', err); }
  };

  const saveReferralFees = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/referrals/settings/referral-fees`,
        referralFees,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Taxas de referência atualizadas');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao atualizar taxas');
    } finally {
      setSaving(false);
    }
  };

  const saveAdmissionFee = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/referrals/settings/admission-fee`,
        admissionFee,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Taxa de admissão atualizada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao atualizar taxa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <Settings className="text-gold-400" />
            Configurações da Plataforma
          </h1>
          <p className="text-gray-400 mt-1">Gerir taxas de referência e admissão</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchSettings}
          className="border-zinc-700 text-gray-300"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referral Fees Card */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Percent className="text-gold-400" size={20} />
              Taxas de Referência
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configurar percentagens de comissão para referenciadores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trading Fee */}
            <div className="space-y-2">
              <Label className="text-gray-300">Taxa de Trading (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="any"
                  value={referralFees.trading_fee_percent}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    trading_fee_percent: parseFloat(e.target.value) || 0
                  })}
                  min={0}
                  max={100}
                  step={0.1}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <span className="text-gray-500 text-sm w-24">da taxa</span>
              </div>
              <p className="text-xs text-gray-500">% da taxa de trading que vai para o referenciador</p>
            </div>

            {/* Deposit Fee */}
            <div className="space-y-2">
              <Label className="text-gray-300">Taxa de Depósito (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="any"
                  value={referralFees.deposit_fee_percent}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    deposit_fee_percent: parseFloat(e.target.value) || 0
                  })}
                  min={0}
                  max={100}
                  step={0.1}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <span className="text-gray-500 text-sm w-24">da taxa</span>
              </div>
            </div>

            {/* Withdrawal Fee */}
            <div className="space-y-2">
              <Label className="text-gray-300">Taxa de Levantamento (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="any"
                  value={referralFees.withdrawal_fee_percent}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    withdrawal_fee_percent: parseFloat(e.target.value) || 0
                  })}
                  min={0}
                  max={100}
                  step={0.1}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <span className="text-gray-500 text-sm w-24">da taxa</span>
              </div>
            </div>

            {/* Admission Fee Commission */}
            <div className="space-y-2">
              <Label className="text-gray-300">Comissão Admissão Inicial (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="any"
                  value={referralFees.admission_fee_percent}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    admission_fee_percent: parseFloat(e.target.value) || 0
                  })}
                  min={0}
                  max={100}
                  step={0.1}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  data-testid="admission-fee-percent-input"
                />
                <span className="text-gray-500 text-sm w-24">1ª entrada</span>
              </div>
              <p className="text-xs text-gray-500">% da taxa de admissão paga ao referenciador no onboarding inicial</p>
            </div>

            {/* Annual Commission */}
            <div className="space-y-2">
              <Label className="text-gray-300">Comissão Renovação Anual (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="any"
                  value={referralFees.annual_commission_percent ?? 0}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    annual_commission_percent: parseFloat(e.target.value) || 0
                  })}
                  min={0}
                  max={100}
                  step={0.1}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  data-testid="annual-commission-percent-input"
                />
                <span className="text-gray-500 text-sm w-24">recorrente</span>
              </div>
              <p className="text-xs text-gray-500">% da taxa anual paga ao referenciador nas renovações</p>
            </div>

            {/* Min Payout */}
            <div className="space-y-2">
              <Label className="text-gray-300">Pagamento Mínimo</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="any"
                  value={referralFees.min_payout_amount}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    min_payout_amount: parseFloat(e.target.value) || 0
                  })}
                  min={0}
                  step={10}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <select
                  value={referralFees.payout_currency}
                  onChange={(e) => setReferralFees({
                    ...referralFees,
                    payout_currency: e.target.value
                  })}
                  className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">Valor mínimo para solicitar pagamento de comissões</p>
            </div>

            <Button 
              onClick={saveReferralFees}
              disabled={saving}
              className="w-full bg-gold-500 hover:bg-gold-400 text-black mt-4"
            >
              {saving ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Guardar Taxas de Referência
            </Button>
          </CardContent>
        </Card>

        {/* Admission Fee Card */}
        <Card className="bg-zinc-900/50 border-emerald-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="text-emerald-400" size={20} />
              Taxa de Admissão Anual
            </CardTitle>
            <CardDescription className="text-gray-400">
              Valor de referência em EUR por perfil de cliente. Outras moedas calculadas automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Taxa Ativa</p>
                <p className="text-sm text-gray-400">Exigir pagamento no onboarding</p>
              </div>
              <Switch
                checked={admissionFee.is_active}
                onCheckedChange={(checked) => setAdmissionFee({
                  ...admissionFee,
                  is_active: checked
                })}
              />
            </div>

            {/* Tiers - EUR only */}
            {[
              { key: 'broker', label: 'Broker', color: 'bg-sky-500/20 text-sky-400', border: 'border-sky-700/30' },
              { key: 'standard', label: 'Standard', color: 'bg-gray-500/20 text-gray-300', border: 'border-zinc-700' },
              { key: 'premium', label: 'Premium', color: 'bg-amber-500/20 text-amber-400', border: 'border-amber-700/30' },
              { key: 'vip', label: 'VIP', color: 'bg-purple-500/20 text-purple-400', border: 'border-purple-700/30' },
              { key: 'institucional', label: 'Institucional', color: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-700/30' },
            ].map(tier => (
              <div key={tier.key} className={`flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border ${tier.border}`}>
                <Badge className={`${tier.color} text-xs`}>{tier.label}</Badge>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="any"
                    value={admissionFee[`${tier.key}_eur`]}
                    onChange={(e) => setAdmissionFee({
                      ...admissionFee,
                      [`${tier.key}_eur`]: parseFloat(e.target.value) || 0
                    })}
                    min={0}
                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm w-32"
                    data-testid={`admission-fee-${tier.key}`}
                  />
                  <span className="text-zinc-500 text-sm font-medium">EUR</span>
                </div>
              </div>
            ))}

            <Button 
              onClick={saveAdmissionFee}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-4"
            >
              {saving ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Guardar Taxa de Admissão
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tier Limits - moved to /admin/tiers */}
      <Card className="bg-zinc-900 border-zinc-800/50" data-testid="tier-limits-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="text-amber-400" size={20} />
            <span className="text-white">Limites de Cofres por Tier</span>
            <Badge className="ml-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] tracking-wider">Movido</Badge>
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Esta configuração foi unificada em <span className="text-gold-400">Gestão → Níveis de Cliente</span>.
            Os limites aplicam-se a todos os cofres (OTC e endereços Multi-Sign adicionais) que ficam armazenados na estrutura Omnibus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(tierLimits).map(([tier, limit]) => (
              <div key={tier} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{tier}</div>
                <div className="text-lg font-semibold text-white tabular-nums">{limit}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => window.location.assign('/dashboard/admin/tiers')}
              className="border-gold-600/40 text-gold-300 hover:bg-gold-500/10"
              data-testid="goto-tiers-admin-btn"
            >
              <Vault size={14} className="mr-2" /> Editar em Níveis de Cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="text-blue-400 mt-0.5" size={20} />
          <div>
            <p className="text-blue-400 font-medium">Informação</p>
            <p className="text-blue-300/80 text-sm mt-1">
              As taxas de referência são aplicadas automaticamente quando um cliente referenciado realiza transações.
              Os referenciadores podem ver suas comissões no painel de referências.
              A taxa de admissão é cobrada durante o processo de onboarding do cliente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
