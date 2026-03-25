import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, Plus, Edit, Trash2, CheckCircle, XCircle, 
  RefreshCw, Globe, Copy, Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COUNTRIES = [
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'DE', name: 'Alemanha', currency: 'EUR' },
  { code: 'FR', name: 'França', currency: 'EUR' },
  { code: 'ES', name: 'Espanha', currency: 'EUR' },
  { code: 'IT', name: 'Itália', currency: 'EUR' },
  { code: 'UK', name: 'Reino Unido', currency: 'GBP' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD' },
  { code: 'CH', name: 'Suíça', currency: 'CHF' },
  { code: 'AE', name: 'Emirados Árabes', currency: 'AED' },
  { code: 'BR', name: 'Brasil', currency: 'BRL' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'AED', 'BRL', 'CHF'];

const AdminCompanyAccounts = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState('');
  
  const [formData, setFormData] = useState({
    bank_name: '',
    account_holder: 'KBEX Financial Services',
    iban: '',
    swift_bic: '',
    account_number: '',
    sort_code: '',
    routing_number: '',
    pix_key: '',
    country: '',
    currency: 'EUR',
    is_active: true
  });

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/company-bank-accounts/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data || []);
    } catch (err) {
      console.error('Error fetching company accounts:', err);
      toast.error('Falha ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bank_name: '',
      account_holder: 'KBEX Financial Services',
      iban: '',
      swift_bic: '',
      account_number: '',
      sort_code: '',
      routing_number: '',
      pix_key: '',
      country: '',
      currency: 'EUR',
      is_active: true
    });
    setEditingAccount(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name || '',
      account_holder: account.account_holder || 'KBEX Financial Services',
      iban: account.iban || '',
      swift_bic: account.swift_bic || '',
      account_number: account.account_number || '',
      sort_code: account.sort_code || '',
      routing_number: account.routing_number || '',
      pix_key: account.pix_key || '',
      country: account.country || '',
      currency: account.currency || 'EUR',
      is_active: account.is_active !== false
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-set currency based on country
    if (name === 'country') {
      const country = COUNTRIES.find(c => c.code === value);
      if (country) {
        setFormData(prev => ({ ...prev, currency: country.currency }));
      }
    }
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = async () => {
    if (!formData.bank_name || !formData.country) {
      toast.error('Preencha o nome do banco e país');
      return;
    }

    if (!formData.iban && !formData.account_number && !formData.pix_key) {
      toast.error('Introduza IBAN, número de conta ou chave PIX');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAccount) {
        await axios.put(
          `${API_URL}/api/company-bank-accounts/admin/${editingAccount.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Conta atualizada!');
      } else {
        await axios.post(
          `${API_URL}/api/company-bank-accounts/admin`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Conta adicionada!');
      }
      setShowModal(false);
      resetForm();
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha na operação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      await axios.delete(
        `${API_URL}/api/company-bank-accounts/admin/${accountToDelete.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Conta eliminada!');
      setShowDeleteDialog(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao eliminar');
    }
  };

  const toggleActive = async (account) => {
    try {
      await axios.put(
        `${API_URL}/api/company-bank-accounts/admin/${account.id}`,
        { is_active: !account.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(account.is_active ? 'Conta desativada' : 'Conta ativada');
      fetchAccounts();
    } catch (err) {
      toast.error('Falha ao alterar estado');
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copiado!');
    setTimeout(() => setCopied(''), 2000);
  };

  const getCountryName = (code) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="text-gold-400" />
            Contas Bancárias da Empresa
          </h1>
          <p className="text-gray-400">Configurar contas para receber pagamentos de clientes</p>
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
            onClick={openAddModal}
            className="bg-gold-500 hover:bg-gold-400"
          >
            <Plus size={18} className="mr-2" />
            Adicionar Conta
          </Button>
        </div>
      </div>

      {/* Info */}
      <Card className="bg-blue-900/20 border-blue-800/30">
        <CardContent className="p-4">
          <p className="text-blue-400 text-sm">
            <strong>Nota:</strong> Estas são as contas bancárias da KBEX que serão apresentadas aos clientes 
            quando efetuarem pagamentos por transferência bancária. Apenas contas ativas serão visíveis.
          </p>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card 
              key={account.id} 
              className={`bg-zinc-900/50 border-zinc-800 ${!account.is_active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{account.bank_name}</h3>
                    {account.is_active ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                        <CheckCircle size={12} className="mr-1" /> Ativa
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-0">
                        <XCircle size={12} className="mr-1" /> Inativa
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => openEditModal(account)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      onClick={() => {
                        setAccountToDelete(account);
                        setShowDeleteDialog(true);
                      }}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-3">{account.account_holder}</p>

                <div className="space-y-2 text-sm">
                  {account.iban && (
                    <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                      <div>
                        <span className="text-gray-500">IBAN: </span>
                        <span className="text-white font-mono">{account.iban}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(account.iban, `iban-${account.id}`)}
                        className="text-gray-400 hover:text-gold-400"
                      >
                        {copied === `iban-${account.id}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                  {account.swift_bic && (
                    <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                      <div>
                        <span className="text-gray-500">SWIFT: </span>
                        <span className="text-white font-mono">{account.swift_bic}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(account.swift_bic, `swift-${account.id}`)}
                        className="text-gray-400 hover:text-gold-400"
                      >
                        {copied === `swift-${account.id}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                  {account.pix_key && (
                    <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                      <div>
                        <span className="text-gray-500">PIX: </span>
                        <span className="text-emerald-400 font-mono">{account.pix_key}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(account.pix_key, `pix-${account.id}`)}
                        className="text-gray-400 hover:text-gold-400"
                      >
                        {copied === `pix-${account.id}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                  {account.account_number && !account.iban && (
                    <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                      <div>
                        <span className="text-gray-500">Conta: </span>
                        <span className="text-white font-mono">{account.account_number}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    <Globe size={12} className="mr-1" />
                    {getCountryName(account.country)}
                  </Badge>
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    {account.currency}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                  <span className="text-gray-400 text-sm">Estado</span>
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={() => toggleActive(account)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <h3 className="text-xl text-white mb-2">Sem Contas Configuradas</h3>
            <p className="text-gray-400 mb-4">
              Adicione as contas bancárias da empresa para receber pagamentos.
            </p>
            <Button onClick={openAddModal} className="bg-gold-500 hover:bg-gold-400">
              <Plus size={18} className="mr-2" />
              Adicionar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="text-gold-400" size={20} />
              {editingAccount ? 'Editar Conta' : 'Adicionar Conta'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure os dados bancários para receber pagamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Nome do Banco *</Label>
              <Input
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Ex: Millennium BCP"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Titular da Conta</Label>
              <Input
                name="account_holder"
                value={formData.account_holder}
                onChange={handleChange}
                placeholder="KBEX Financial Services"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">País *</Label>
                <Select value={formData.country} onValueChange={(v) => handleSelectChange('country', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar" />
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

            <div className="space-y-2">
              <Label className="text-gray-400">IBAN</Label>
              <Input
                name="iban"
                value={formData.iban}
                onChange={handleChange}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                className="bg-zinc-800 border-zinc-700 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">SWIFT/BIC</Label>
              <Input
                name="swift_bic"
                value={formData.swift_bic}
                onChange={handleChange}
                placeholder="BCOMPTPL"
                className="bg-zinc-800 border-zinc-700 font-mono uppercase"
              />
            </div>

            {(formData.country === 'BR') && (
              <div className="space-y-2">
                <Label className="text-gray-400">Chave PIX</Label>
                <Input
                  name="pix_key"
                  value={formData.pix_key}
                  onChange={handleChange}
                  placeholder="email@empresa.com ou CNPJ"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            )}

            {(formData.country === 'US' || formData.country === 'UK') && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-400">Número da Conta</Label>
                  <Input
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    placeholder="1234567890"
                    className="bg-zinc-800 border-zinc-700 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">
                    {formData.country === 'UK' ? 'Sort Code' : 'Routing Number'}
                  </Label>
                  <Input
                    name={formData.country === 'UK' ? 'sort_code' : 'routing_number'}
                    value={formData.country === 'UK' ? formData.sort_code : formData.routing_number}
                    onChange={handleChange}
                    placeholder={formData.country === 'UK' ? '00-00-00' : '021000021'}
                    className="bg-zinc-800 border-zinc-700 font-mono"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <Label className="text-gray-400">Conta Ativa</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={handleSwitchChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-gold-500 hover:bg-gold-400">
              {submitting ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
              {editingAccount ? 'Guardar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 size={20} />
              Eliminar Conta
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Tem a certeza que deseja eliminar a conta <strong>{accountToDelete?.bank_name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompanyAccounts;
