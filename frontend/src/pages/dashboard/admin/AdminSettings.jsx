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
  Info
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
    min_payout_amount: 50,
    payout_currency: 'EUR'
  });
  
  // Admission Fee State
  const [admissionFee, setAdmissionFee] = useState({
    // Standard
    standard_eur: 500,
    standard_usd: 550,
    standard_aed: 2000,
    standard_brl: 2750,
    // Premium
    premium_eur: 2500,
    premium_usd: 2750,
    premium_aed: 10000,
    premium_brl: 13750,
    // VIP
    vip_eur: 10000,
    vip_usd: 11000,
    vip_aed: 40000,
    vip_brl: 55000,
    // General
    is_active: true,
    grace_period_days: 7
  });

  useEffect(() => {
    fetchSettings();
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
                  type="number"
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
                  type="number"
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
                  type="number"
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
              <Label className="text-gray-300">Taxa de Admissão (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
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
                <span className="text-gray-500 text-sm w-24">da taxa</span>
              </div>
              <p className="text-xs text-gray-500">% da taxa de admissão que vai para o referenciador quando o cliente paga</p>
            </div>

            {/* Min Payout */}
            <div className="space-y-2">
              <Label className="text-gray-300">Pagamento Mínimo</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
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
              Configurar taxa de entrada por tipo de cliente
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

            {/* Standard Tier */}
            <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <div className="text-white font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-gray-500/20 text-gray-300">Standard</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['eur', 'usd', 'aed', 'brl'].map(cur => (
                  <div key={`standard_${cur}`} className="space-y-1">
                    <Label className="text-gray-400 text-xs">{cur.toUpperCase()}</Label>
                    <Input
                      type="number"
                      value={admissionFee[`standard_${cur}`]}
                      onChange={(e) => setAdmissionFee({
                        ...admissionFee,
                        [`standard_${cur}`]: parseFloat(e.target.value) || 0
                      })}
                      min={0}
                      className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Tier */}
            <div className="p-3 bg-gold-900/20 rounded-lg border border-gold-700/30">
              <div className="text-white font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-gold-500/20 text-gold-400">Premium</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['eur', 'usd', 'aed', 'brl'].map(cur => (
                  <div key={`premium_${cur}`} className="space-y-1">
                    <Label className="text-gray-400 text-xs">{cur.toUpperCase()}</Label>
                    <Input
                      type="number"
                      value={admissionFee[`premium_${cur}`]}
                      onChange={(e) => setAdmissionFee({
                        ...admissionFee,
                        [`premium_${cur}`]: parseFloat(e.target.value) || 0
                      })}
                      min={0}
                      className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* VIP Tier */}
            <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-700/30">
              <div className="text-white font-medium mb-3 flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-400">VIP</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['eur', 'usd', 'aed', 'brl'].map(cur => (
                  <div key={`vip_${cur}`} className="space-y-1">
                    <Label className="text-gray-400 text-xs">{cur.toUpperCase()}</Label>
                    <Input
                      type="number"
                      value={admissionFee[`vip_${cur}`]}
                      onChange={(e) => setAdmissionFee({
                        ...admissionFee,
                        [`vip_${cur}`]: parseFloat(e.target.value) || 0
                      })}
                      min={0}
                      className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Grace Period */}
            <div className="space-y-2">
              <Label className="text-gray-300">Período de Carência (dias)</Label>
              <Input
                type="number"
                value={admissionFee.grace_period_days}
                onChange={(e) => setAdmissionFee({
                  ...admissionFee,
                  grace_period_days: parseInt(e.target.value) || 7
                })}
                min={0}
                max={30}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-gray-500">Dias após registo para efetuar pagamento</p>
            </div>

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
