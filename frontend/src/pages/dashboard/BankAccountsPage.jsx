import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Landmark, Plus, Trash2, CheckCircle, Clock, XCircle, 
  Building, CreditCard, Globe, AlertTriangle, Edit, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

import { COUNTRIES } from '../../utils/countries';

const COUNTRY_CURRENCIES = {
  PT: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', EE: 'EUR', LV: 'EUR',
  LT: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR',
  GB: 'GBP', US: 'USD', CH: 'CHF', AE: 'AED', BR: 'BRL', SA: 'SAR', QA: 'QAR',
  JP: 'JPY', CN: 'CNY', IN: 'INR', AU: 'AUD', CA: 'CAD', SG: 'SGD', HK: 'HKD',
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'BRL', 'AED', 'CHF'];

const BankAccountsPage = () => {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    account_holder: '',
    bank_name: '',
    iban: '',
    swift_bic: '',
    account_number: '',
    sort_code: '',
    routing_number: '',
    country: '',
    currency: 'EUR',
    is_primary: false
  });

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      // Don't show error toast on 404 - just means no accounts yet
      if (err.response?.status !== 404) {
        toast.error('Falha ao carregar contas bancárias');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-set currency based on country
    if (name === 'country') {
      const currency = COUNTRY_CURRENCIES[value];
      if (currency) {
        setFormData(prev => ({ ...prev, currency }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      account_holder: user?.name || '',
      bank_name: '',
      iban: '',
      swift_bic: '',
      account_number: '',
      sort_code: '',
      routing_number: '',
      country: '',
      currency: 'EUR',
      is_primary: accounts.length === 0
    });
  };

  const handleAddAccount = async () => {
    if (!formData.bank_name || !formData.country) {
      toast.error('Preencha pelo menos o nome do banco e país');
      return;
    }

    // Validate IBAN or account number
    if (!formData.iban && !formData.account_number) {
      toast.error('Introduza o IBAN ou número da conta');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/bank-accounts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Conta bancária adicionada! Aguarda validação.');
      setShowAddModal(false);
      resetForm();
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao adicionar conta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      await axios.delete(`${API_URL}/api/bank-accounts/${accountToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Conta bancária removida');
      setShowDeleteDialog(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao remover conta');
    }
  };

  const handleSetPrimary = async (accountId) => {
    try {
      await axios.put(`${API_URL}/api/bank-accounts/${accountId}/set-primary`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Conta definida como principal');
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao definir conta principal');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-0"><CheckCircle size={12} className="mr-1" /> Verificada</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-0"><Clock size={12} className="mr-1" /> Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-0"><XCircle size={12} className="mr-1" /> Rejeitada</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-0"><Clock size={12} className="mr-1" /> Pendente</Badge>;
    }
  };

  const getCountryName = (code) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  const maskIBAN = (iban) => {
    if (!iban || iban.length < 8) return iban;
    return iban.slice(0, 4) + ' •••• •••• ' + iban.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Landmark className="text-gold-400" />
            Dados Bancários
          </h1>
          <p className="text-gray-400">Gerir contas bancárias para depósitos e levantamentos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700"
            onClick={fetchAccounts}
          >
            <RefreshCw size={14} className="mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="bg-gold-500 hover:bg-gold-400"
          >
            <Plus size={18} className="mr-2" />
            Adicionar Conta
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-800/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-blue-400 mt-0.5" size={20} />
            <div>
              <p className="text-blue-300 text-sm font-medium">Informação Importante</p>
              <p className="text-blue-400/80 text-sm mt-1">
                Todas as contas bancárias adicionadas serão verificadas pela nossa equipa antes de poderem ser utilizadas para levantamentos. 
                Este processo pode demorar até 24 horas úteis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts List */}
      {accounts.length > 0 ? (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gold-500/20 flex items-center justify-center">
                      <Building className="text-gold-400" size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{account.bank_name}</h3>
                        {account.is_primary && (
                          <Badge className="bg-gold-500/20 text-gold-400 border-0 text-xs">Principal</Badge>
                        )}
                        {getStatusBadge(account.status)}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{account.account_holder}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                        {account.iban && (
                          <span className="text-gray-500">
                            <span className="text-gray-400">IBAN:</span> {maskIBAN(account.iban)}
                          </span>
                        )}
                        {account.swift_bic && (
                          <span className="text-gray-500">
                            <span className="text-gray-400">SWIFT:</span> {account.swift_bic}
                          </span>
                        )}
                        {account.account_number && !account.iban && (
                          <span className="text-gray-500">
                            <span className="text-gray-400">Conta:</span> •••• {account.account_number.slice(-4)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          <Globe size={12} className="mr-1" />
                          {getCountryName(account.country)}
                        </Badge>
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          {account.currency}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!account.is_primary && account.status === 'verified' && (
                      <Button
                        onClick={() => handleSetPrimary(account.id)}
                        size="sm"
                        variant="outline"
                        className="border-gold-800/30 text-gold-400 hover:bg-gold-900/30"
                      >
                        Definir Principal
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setAccountToDelete(account);
                        setShowDeleteDialog(true);
                      }}
                      size="sm"
                      variant="outline"
                      className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {account.status === 'rejected' && account.rejection_reason && (
                  <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                    <p className="text-red-400 text-sm">
                      <strong>Motivo da rejeição:</strong> {account.rejection_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Landmark className="mx-auto mb-4 text-gray-500" size={48} />
            <h3 className="text-xl text-white mb-2">Sem Contas Bancárias</h3>
            <p className="text-gray-400 mb-4">
              Adicione uma conta bancária para poder efetuar levantamentos.
            </p>
            <Button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="bg-gold-500 hover:bg-gold-400"
            >
              <Plus size={18} className="mr-2" />
              Adicionar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Account Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="text-gold-400" size={20} />
              Adicionar Conta Bancária
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Introduza os dados da sua conta bancária para verificação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Account Holder */}
            <div className="space-y-2">
              <Label className="text-gray-400">Titular da Conta *</Label>
              <Input
                name="account_holder"
                value={formData.account_holder}
                onChange={handleChange}
                placeholder="Nome completo conforme conta bancária"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Bank Name */}
            <div className="space-y-2">
              <Label className="text-gray-400">Nome do Banco *</Label>
              <Input
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Ex: Millennium BCP, Santander, etc."
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Country & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">País *</Label>
                <Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar país" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code} className="text-white hover:bg-zinc-700">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Moeda</Label>
                <Select value={formData.currency} onValueChange={(v) => handleSelectChange('currency', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c} className="text-white hover:bg-zinc-700">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IBAN */}
            <div className="space-y-2">
              <Label className="text-gray-400">IBAN</Label>
              <Input
                name="iban"
                value={formData.iban}
                onChange={handleChange}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                className="bg-zinc-800 border-zinc-700 font-mono"
              />
              <p className="text-xs text-gray-500">Para contas europeias, introduza o IBAN completo</p>
            </div>

            {/* SWIFT/BIC */}
            <div className="space-y-2">
              <Label className="text-gray-400">SWIFT/BIC</Label>
              <Input
                name="swift_bic"
                value={formData.swift_bic}
                onChange={handleChange}
                placeholder="Ex: BCOMPTPL"
                className="bg-zinc-800 border-zinc-700 font-mono uppercase"
              />
            </div>

            {/* Account Number (for non-IBAN countries) */}
            <div className="space-y-2">
              <Label className="text-gray-400">Número da Conta</Label>
              <Input
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                placeholder="Número da conta (se não tiver IBAN)"
                className="bg-zinc-800 border-zinc-700 font-mono"
              />
            </div>

            {/* Sort Code (UK) / Routing Number (US) */}
            {(formData.country === 'UK' || formData.country === 'US') && (
              <div className="space-y-2">
                <Label className="text-gray-400">
                  {formData.country === 'UK' ? 'Sort Code' : 'Routing Number'}
                </Label>
                <Input
                  name={formData.country === 'UK' ? 'sort_code' : 'routing_number'}
                  value={formData.country === 'UK' ? formData.sort_code : formData.routing_number}
                  onChange={handleChange}
                  placeholder={formData.country === 'UK' ? '00-00-00' : '000000000'}
                  className="bg-zinc-800 border-zinc-700 font-mono"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddAccount}
              className="bg-emerald-500 hover:bg-emerald-600"
              disabled={saving}
            >
              {saving ? 'A guardar...' : 'Adicionar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 size={20} />
              Remover Conta Bancária
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-300">
              Tem a certeza que deseja remover esta conta bancária?
            </p>
            {accountToDelete && (
              <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-white font-medium">{accountToDelete.bank_name}</p>
                <p className="text-gray-400 text-sm">{accountToDelete.account_holder}</p>
                {accountToDelete.iban && (
                  <p className="text-gray-500 text-sm font-mono mt-1">{maskIBAN(accountToDelete.iban)}</p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setAccountToDelete(null);
              }}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-500"
            >
              <Trash2 size={16} className="mr-2" />
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankAccountsPage;
