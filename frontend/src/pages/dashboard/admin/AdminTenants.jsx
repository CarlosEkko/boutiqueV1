import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Globe, Plus, Trash2, Edit, Save, Loader2, Shield, Palette, Mail,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const emptyTenant = () => ({
  slug: '',
  domains: [''],
  branding: {
    platform_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#d4af37',
    accent_color: '#0b0b0b',
    tagline: '',
  },
  email: { sender_email: '', sender_name: '' },
  supported_fiat: ['EUR', 'USD', 'GBP'],
});

export default function AdminTenants() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [domainsDraft, setDomainsDraft] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/tenants/`, { headers });
      setTenants(res.data);
    } catch (e) {
      toast.error('Falha ao carregar tenants');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const openEdit = (t) => {
    const draft = t
      ? {
          ...t,
          branding: { ...t.branding },
          email: { ...(t.email || {}) },
        }
      : emptyTenant();
    setEditing(draft);
    setDomainsDraft((draft.domains || []).join(', '));
  };

  const save = async () => {
    if (!editing) return;
    const domains = domainsDraft
      .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

    setSaving(true);
    try {
      const payload = {
        domains,
        branding: editing.branding,
        email: editing.email,
        supported_fiat: editing.supported_fiat,
      };
      if (editing.slug && tenants.find(t => t.slug === editing.slug)) {
        // Update
        await axios.put(`${API_URL}/api/tenants/${editing.slug}`, payload, { headers });
        toast.success('Tenant actualizado');
      } else {
        // Create
        await axios.post(`${API_URL}/api/tenants/`, { slug: editing.slug, ...payload }, { headers });
        toast.success('Tenant criado');
      }
      setEditing(null);
      fetchTenants();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slug) => {
    if (!window.confirm(`Eliminar tenant '${slug}'? Esta acção é irreversível.`)) return;
    try {
      await axios.delete(`${API_URL}/api/tenants/${slug}`, { headers });
      toast.success('Tenant eliminado');
      fetchTenants();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao eliminar');
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-tenants">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe size={24} className="text-gold-500" /> Tenants (White-label)
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gerir deployments white-label por domínio. Cada tenant tem a sua própria identidade visual, email e moedas suportadas.
          </p>
        </div>
        <Button onClick={() => openEdit(null)} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="new-tenant-btn">
          <Plus size={14} className="mr-1.5" /> Novo Tenant
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gold-500" size={30} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tenants.map((t) => (
            <Card key={t.slug} className="bg-zinc-900/50 border-zinc-800" data-testid={`tenant-card-${t.slug}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium text-lg">{t.branding?.platform_name || t.slug}</h3>
                      {t.is_default && (
                        <Badge className="bg-gold-500/10 text-gold-300 border border-gold-700/30 text-[10px]">
                          DEFAULT
                        </Badge>
                      )}
                      {!t.is_active && (
                        <Badge className="bg-red-500/10 text-red-300 border border-red-700/30 text-[10px]">
                          INACTIVE
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <Shield size={10} /> <code>{t.slug}</code>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)} data-testid={`edit-${t.slug}`}>
                      <Edit size={14} />
                    </Button>
                    {!t.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(t.slug)}
                        className="text-red-400 hover:bg-red-500/10"
                        data-testid={`delete-${t.slug}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                    <Globe size={10} /> Domínios
                  </div>
                  {t.domains?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {t.domains.map(d => (
                        <span key={d} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600">Nenhum domínio configurado</span>
                  )}
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                      <Palette size={10} /> Cores
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded border border-zinc-700" style={{ background: t.branding?.primary_color }} title="Primary" />
                      <div className="w-5 h-5 rounded border border-zinc-700" style={{ background: t.branding?.accent_color }} title="Accent" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                      <Mail size={10} /> Sender
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {t.email?.sender_email || 'global default'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe size={18} className="text-gold-400" />
              {editing?.is_default ? `Editar ${editing.slug}` : editing?.slug ? `Editar ${editing.slug}` : 'Novo Tenant'}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              {!tenants.find(t => t.slug === editing.slug) && (
                <div>
                  <Label className="text-xs text-zinc-400">Slug (identificador único, e.g. `bancox`)</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    placeholder="bancox"
                    className="bg-zinc-800 border-zinc-700 mt-1"
                    data-testid="tenant-slug-input"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs text-zinc-400">Domínios (separados por vírgula)</Label>
                <Input
                  value={domainsDraft}
                  onChange={(e) => setDomainsDraft(e.target.value)}
                  placeholder="custody.bancox.com, www.bancox-custody.com"
                  className="bg-zinc-800 border-zinc-700 mt-1"
                  data-testid="tenant-domains-input"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Estes domínios devem ter A-record a apontar para o IP do VPS KBEX.
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <h4 className="text-sm font-semibold text-gold-400 mb-3 flex items-center gap-1.5">
                  <Palette size={14} /> Branding
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">Nome da Plataforma</Label>
                    <Input
                      value={editing.branding.platform_name}
                      onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, platform_name: e.target.value } })}
                      placeholder="Banco X Custody"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Tagline</Label>
                    <Input
                      value={editing.branding.tagline || ''}
                      onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, tagline: e.target.value } })}
                      placeholder="Private Digital Asset Custody"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Logo URL</Label>
                    <Input
                      value={editing.branding.logo_url || ''}
                      onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, logo_url: e.target.value } })}
                      placeholder="https://bancox.com/logo.svg"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Favicon URL</Label>
                    <Input
                      value={editing.branding.favicon_url || ''}
                      onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, favicon_url: e.target.value } })}
                      placeholder="https://bancox.com/favicon.ico"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Cor Primária</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={editing.branding.primary_color}
                        onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, primary_color: e.target.value } })}
                        className="h-9 w-12 rounded cursor-pointer border border-zinc-700 bg-zinc-800"
                      />
                      <Input
                        value={editing.branding.primary_color}
                        onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, primary_color: e.target.value } })}
                        className="bg-zinc-800 border-zinc-700 flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Cor de Fundo/Accent</Label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={editing.branding.accent_color}
                        onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, accent_color: e.target.value } })}
                        className="h-9 w-12 rounded cursor-pointer border border-zinc-700 bg-zinc-800"
                      />
                      <Input
                        value={editing.branding.accent_color}
                        onChange={(e) => setEditing({ ...editing, branding: { ...editing.branding, accent_color: e.target.value } })}
                        className="bg-zinc-800 border-zinc-700 flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <h4 className="text-sm font-semibold text-gold-400 mb-3 flex items-center gap-1.5">
                  <Mail size={14} /> Email Remetente (opcional)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">From Email</Label>
                    <Input
                      value={editing.email.sender_email || ''}
                      onChange={(e) => setEditing({ ...editing, email: { ...editing.email, sender_email: e.target.value } })}
                      placeholder="no-reply@bancox.com"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">From Name</Label>
                    <Input
                      value={editing.email.sender_name || ''}
                      onChange={(e) => setEditing({ ...editing, email: { ...editing.email, sender_name: e.target.value } })}
                      placeholder="Banco X Custody"
                      className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800">
                <Label className="text-xs text-zinc-400">Moedas Fiat Suportadas (separadas por vírgula)</Label>
                <Input
                  value={(editing.supported_fiat || []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, supported_fiat: e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) })}
                  className="bg-zinc-800 border-zinc-700 mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-tenant-btn">
              {saving ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Save size={14} className="mr-1.5" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
