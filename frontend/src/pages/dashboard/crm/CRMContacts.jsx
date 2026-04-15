import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
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
  Users,
  Mail,
  Phone,
  MapPin,
  Building2,
  RefreshCw,
  Save,
  MessageCircle,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

import { COUNTRIES } from '../../../utils/countries';

const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' }
];

const CRMContacts = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [filter, setFilter] = useState({ search: '' });
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    company_name: '',
    job_title: '',
    department: '',
    supplier_id: '',
    client_id: '',
    lead_id: '',
    address: '',
    city: '',
    country: '',
    preferred_contact_method: 'email',
    whatsapp: '',
    telegram: '',
    is_primary: false,
    notes: '',
    tags: []
  });

  useEffect(() => {
    fetchContacts();
    fetchSuppliers();
    fetchLeads();
  }, [filter]);

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      
      const response = await axios.get(`${API_URL}/api/crm/contacts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast.error('Erro ao carregar contactos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/suppliers?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/leads?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      company_name: '',
      job_title: '',
      department: '',
      supplier_id: '',
      client_id: '',
      lead_id: '',
      address: '',
      city: '',
      country: '',
      preferred_contact_method: 'email',
      whatsapp: '',
      telegram: '',
      is_primary: false,
      notes: '',
      tags: []
    });
    setEditingContact(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (contact) => {
    setForm({
      ...contact,
      tags: contact.tags || []
    });
    setEditingContact(contact.id);
    setShowModal(true);
  };

  const saveContact = async () => {
    try {
      const data = {
        ...form,
        supplier_id: form.supplier_id || null,
        lead_id: form.lead_id || null,
        client_id: form.client_id || null
      };

      if (editingContact) {
        await axios.put(`${API_URL}/api/crm/contacts/${editingContact}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Contacto atualizado!');
      } else {
        await axios.post(`${API_URL}/api/crm/contacts`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Contacto criado!');
      }
      
      setShowModal(false);
      resetForm();
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar contacto');
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Tem certeza que deseja eliminar este contacto?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/crm/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Contacto eliminado!');
      fetchContacts();
    } catch (err) {
      toast.error('Erro ao eliminar contacto');
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'email': return <Mail size={14} />;
      case 'phone': return <Phone size={14} />;
      case 'whatsapp': return <MessageCircle size={14} />;
      case 'telegram': return <MessageCircle size={14} />;
      default: return <Mail size={14} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contactos</h1>
          <p className="text-gray-400">Pessoas de contacto de fornecedores e leads</p>
        </div>
        <Button onClick={openNewModal} className="bg-gold-500 hover:bg-gold-400 text-black">
          <Plus size={16} className="mr-2" />
          Novo Contacto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar contactos..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <Button variant="outline" onClick={fetchContacts} className="border-zinc-700">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400">Nenhum contacto encontrado</p>
            <Button onClick={openNewModal} className="mt-4 bg-gold-500 hover:bg-gold-400 text-black">
              <Plus size={16} className="mr-2" /> Adicionar Primeiro Contacto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map(contact => (
            <Card key={contact.id} className="bg-zinc-900/50 border-zinc-800 hover:border-gold-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-medium text-lg">
                        {contact.first_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{contact.full_name}</span>
                        {contact.is_primary && (
                          <Star size={14} className="text-gold-400" fill="currentColor" />
                        )}
                      </div>
                      {contact.job_title && (
                        <p className="text-sm text-gray-400">{contact.job_title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(contact)}
                      className="text-gold-400 h-8 w-8 p-0"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteContact(contact.id)}
                      className="text-red-400 h-8 w-8 p-0"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {contact.company_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Building2 size={14} />
                    {contact.company_name}
                  </div>
                )}

                <div className="space-y-1">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Mail size={14} className="text-gray-500" />
                      <a href={`mailto:${contact.email}`} className="hover:text-white truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone size={14} className="text-gray-500" />
                      <a href={`tel:${contact.phone}`} className="hover:text-white">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MessageCircle size={14} className="text-green-500" />
                      <span>{contact.whatsapp}</span>
                    </div>
                  )}
                  {contact.country && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin size={14} className="text-gray-500" />
                      {contact.city ? `${contact.city}, ${contact.country}` : contact.country}
                    </div>
                  )}
                </div>

                {contact.preferred_contact_method && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <Badge className="bg-zinc-800 text-gray-300 border-0 text-xs">
                      {getMethodIcon(contact.preferred_contact_method)}
                      <span className="ml-1">{contact.preferred_contact_method}</span>
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contact Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Editar Contacto' : 'Novo Contacto'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome *</label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Primeiro nome"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Apelido</label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Apelido"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="text-sm text-gray-400 mb-1 block">Telemóvel</label>
                <Input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="+351 912 345 678"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">WhatsApp</label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="+351 912 345 678"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="text-sm text-gray-400 mb-1 block">Cargo</label>
                <Input
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  placeholder="CEO, CFO, etc."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Departamento</label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Financeiro, Trading, etc."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Related Entities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fornecedor</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Lead</label>
                <select
                  value={form.lead_id}
                  onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">Morada</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Endereço"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Cidade</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Lisboa"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="text-sm text-gray-400 mb-1 block">Método de Contacto Preferido</label>
                <select
                  value={form.preferred_contact_method}
                  onChange={(e) => setForm({ ...form, preferred_contact_method: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {CONTACT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4"
                />
                <Star size={16} className="text-gold-400" />
                Contacto Principal
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionais..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={saveContact} className="bg-emerald-500 hover:bg-emerald-600">
              <Save size={16} className="mr-2" />
              {editingContact ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMContacts;
