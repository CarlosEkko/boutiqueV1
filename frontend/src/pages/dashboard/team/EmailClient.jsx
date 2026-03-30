import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Send, Inbox, FileEdit, Trash2, Search, Plus, Bold, Italic, Underline,
  Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Type,
  Settings, ChevronDown, RefreshCw, Archive, Star, Palette, Image,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FOLDERS = [
  { key: 'sent', label: 'Enviados', icon: Send },
  { key: 'drafts', label: 'Rascunhos', icon: FileEdit },
];

const EmailClient = () => {
  const { token, user } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // State
  const [activeFolder, setActiveFolder] = useState('sent');
  const [emails, setEmails] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState({ signature_html: '', signature_name: '' });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeToName, setComposeToName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const editorRef = useRef(null);
  const signatureEditorRef = useRef(null);

  // Fetch data
  useEffect(() => {
    fetchEmails();
    fetchDrafts();
    fetchSignature();
  }, [token]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/emails?search=${searchQuery}&limit=200`, { headers });
      setEmails(res.data.emails || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchDrafts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/drafts`, { headers });
      setDrafts(res.data.drafts || []);
    } catch (err) { console.error(err); }
  };

  const fetchSignature = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/signature`, { headers });
      setSignature(res.data);
    } catch (err) { console.error(err); }
  };

  // Current list
  const currentList = activeFolder === 'drafts' ? drafts : emails;

  // Format commands
  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('URL:');
    if (url) execCmd('createLink', url);
  };

  const changeFontSize = (size) => {
    execCmd('fontSize', size);
  };

  const changeColor = (color) => {
    execCmd('foreColor', color);
  };

  // Send email
  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      toast.error('Preencha o destinatário e assunto');
      return;
    }
    setSending(true);
    try {
      let body = editorRef.current?.innerHTML || '';
      // Append signature
      if (signature.signature_html) {
        body += `<br/><br/>--<br/>${signature.signature_html}`;
      }
      await axios.post(`${API_URL}/api/team-hub/emails/send`, {
        to_email: composeTo,
        to_name: composeToName,
        subject: composeSubject,
        body_html: body,
      }, { headers });
      toast.success('Email enviado!');
      resetCompose();
      fetchEmails();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar');
    }
    setSending(false);
  };

  // Save draft
  const handleSaveDraft = async () => {
    try {
      await axios.post(`${API_URL}/api/team-hub/drafts`, {
        to_email: composeTo,
        to_name: composeToName,
        subject: composeSubject,
        body_html: editorRef.current?.innerHTML || '',
      }, { headers });
      toast.success('Rascunho guardado');
      fetchDrafts();
    } catch (err) { toast.error('Erro ao guardar rascunho'); }
  };

  const handleDeleteDraft = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/team-hub/drafts/${id}`, { headers });
      toast.success('Rascunho eliminado');
      fetchDrafts();
      if (selectedEmail?.id === id) setSelectedEmail(null);
    } catch (err) { toast.error('Erro'); }
  };

  const resetCompose = () => {
    setShowCompose(false);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject('');
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const openCompose = (prefill = null) => {
    setShowCompose(true);
    setSelectedEmail(null);
    if (prefill) {
      setComposeTo(prefill.to_email || '');
      setComposeToName(prefill.to_name || '');
      setComposeSubject(prefill.subject || '');
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = prefill.body_html || '';
      }, 100);
    }
  };

  // Save signature
  const handleSaveSignature = async () => {
    try {
      const html = signatureEditorRef.current?.innerHTML || '';
      await axios.put(`${API_URL}/api/team-hub/signature`, {
        signature_html: html,
        signature_name: signature.signature_name,
      }, { headers });
      setSignature(prev => ({ ...prev, signature_html: html }));
      toast.success('Assinatura guardada');
      setShowSignatureDialog(false);
    } catch (err) { toast.error('Erro ao guardar assinatura'); }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  const getSnippet = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').substring(0, 100);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden" data-testid="email-client">
      
      {/* ===== SIDEBAR (Column 1) ===== */}
      <div className="w-56 border-r border-zinc-800 flex flex-col bg-zinc-900/80 flex-shrink-0">
        {/* Account */}
        <div className="p-3 border-b border-zinc-800">
          <p className="text-gold-400 text-xs font-medium truncate">{user?.email || 'KBEX'}</p>
          <p className="text-gray-500 text-[10px]">via Brevo</p>
        </div>

        {/* Compose button */}
        <div className="p-3">
          <Button 
            onClick={() => openCompose()} 
            className="w-full bg-gold-500 hover:bg-gold-400 text-black text-sm"
            data-testid="compose-new-btn"
          >
            <Plus size={14} className="mr-1.5" /> Novo Email
          </Button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 space-y-0.5">
          {FOLDERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setActiveFolder(f.key); setSelectedEmail(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeFolder === f.key
                  ? 'bg-gold-500/15 text-gold-400'
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
              data-testid={`folder-${f.key}`}
            >
              <f.icon size={15} />
              <span className="flex-1 text-left">{f.label}</span>
              <span className="text-xs text-gray-500">
                {f.key === 'sent' ? emails.length : drafts.length}
              </span>
            </button>
          ))}
        </nav>

        {/* Signature settings */}
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={() => setShowSignatureDialog(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            data-testid="signature-settings-btn"
          >
            <Settings size={14} />
            Assinatura
          </button>
        </div>
      </div>

      {/* ===== EMAIL LIST (Column 2) ===== */}
      <div className="w-80 border-r border-zinc-800 flex flex-col flex-shrink-0">
        {/* Search */}
        <div className="p-3 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchEmails()}
              placeholder="Pesquisar..."
              className="pl-8 h-8 bg-zinc-800 border-zinc-700 text-sm"
              data-testid="email-search"
            />
          </div>
        </div>

        {/* Folder header */}
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-white text-sm font-medium">
            {FOLDERS.find(f => f.key === activeFolder)?.label}
          </span>
          <button onClick={() => { fetchEmails(); fetchDrafts(); }} className="text-gray-500 hover:text-white">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Email items */}
        <div className="flex-1 overflow-y-auto">
          {currentList.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">
              {loading ? 'A carregar...' : 'Sem emails'}
            </div>
          ) : (
            currentList.map(email => (
              <div
                key={email.id}
                onClick={() => { setSelectedEmail(email); setShowCompose(false); }}
                className={`px-3 py-3 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-gold-500/10 border-l-2 border-l-gold-400'
                    : 'hover:bg-zinc-800/50'
                }`}
                data-testid={`email-item-${email.id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium truncate max-w-[180px]">
                    {email.to_name || email.to_email?.split('@')[0] || 'Sem nome'}
                  </span>
                  <span className="text-gray-500 text-[11px] flex-shrink-0">{formatDate(email.sent_at || email.updated_at)}</span>
                </div>
                <p className="text-gray-300 text-xs font-medium truncate">{email.subject || '(Sem assunto)'}</p>
                <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">{getSnippet(email.body_html)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== CONTENT (Column 3) ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {showCompose ? (
          /* ---- COMPOSE VIEW ---- */
          <div className="flex-1 flex flex-col">
            {/* Compose header */}
            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm w-12">Para:</span>
                <Input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="email@exemplo.com" className="h-8 bg-zinc-800 border-zinc-700 text-sm flex-1" data-testid="compose-to" />
                <Input value={composeToName} onChange={e => setComposeToName(e.target.value)} placeholder="Nome" className="h-8 bg-zinc-800 border-zinc-700 text-sm w-40" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm w-12">Assunto:</span>
                <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Assunto do email" className="h-8 bg-zinc-800 border-zinc-700 text-sm flex-1" data-testid="compose-subject" />
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-1 flex-wrap">
              <button onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Negrito"><Bold size={14} /></button>
              <button onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Itálico"><Italic size={14} /></button>
              <button onClick={() => execCmd('underline')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Sublinhado"><Underline size={14} /></button>
              <div className="w-px h-5 bg-zinc-700 mx-1" />
              <button onClick={insertLink} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Link"><Link size={14} /></button>
              <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Lista"><List size={14} /></button>
              <button onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Lista numerada"><ListOrdered size={14} /></button>
              <div className="w-px h-5 bg-zinc-700 mx-1" />
              <button onClick={() => execCmd('justifyLeft')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><AlignLeft size={14} /></button>
              <button onClick={() => execCmd('justifyCenter')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><AlignCenter size={14} /></button>
              <button onClick={() => execCmd('justifyRight')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><AlignRight size={14} /></button>
              <div className="w-px h-5 bg-zinc-700 mx-1" />
              <select onChange={e => changeFontSize(e.target.value)} defaultValue="3" className="bg-zinc-800 border border-zinc-700 rounded text-xs text-gray-300 px-1.5 py-1">
                <option value="1">Pequeno</option>
                <option value="3">Normal</option>
                <option value="5">Grande</option>
                <option value="7">Muito Grande</option>
              </select>
              <input type="color" defaultValue="#ffffff" onChange={e => changeColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" title="Cor do texto" />
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
              <div
                ref={editorRef}
                contentEditable
                className="min-h-full p-4 text-white text-sm outline-none leading-relaxed"
                style={{ whiteSpace: 'pre-wrap' }}
                data-testid="compose-editor"
                suppressContentEditableWarning
              />
              {/* Signature preview */}
              {signature.signature_html && (
                <div className="px-4 pb-4 border-t border-zinc-800/30 mt-2 pt-2">
                  <p className="text-gray-600 text-xs mb-1">--</p>
                  <div className="text-gray-400 text-xs" dangerouslySetInnerHTML={{ __html: signature.signature_html }} />
                </div>
              )}
            </div>

            {/* Compose actions */}
            <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2">
              <Button onClick={handleSend} disabled={sending} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="send-email-btn">
                <Send size={14} className="mr-2" />{sending ? 'A enviar...' : 'Enviar'}
              </Button>
              <Button onClick={handleSaveDraft} variant="outline" className="border-zinc-600 text-gray-300">
                <FileEdit size={14} className="mr-2" />Guardar Rascunho
              </Button>
              <div className="flex-1" />
              <Button onClick={resetCompose} variant="ghost" className="text-gray-500">
                <Trash2 size={14} className="mr-2" />Descartar
              </Button>
            </div>
          </div>
        ) : selectedEmail ? (
          /* ---- EMAIL READING VIEW ---- */
          <div className="flex-1 flex flex-col">
            {/* Email header */}
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-white text-lg font-medium mb-3">{selectedEmail.subject || '(Sem assunto)'}</h2>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold-400 font-bold text-sm">
                      {(selectedEmail.from_name || selectedEmail.to_name || 'K')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{selectedEmail.from_name || 'KBEX'}</p>
                    <p className="text-gray-500 text-xs">
                      De: {selectedEmail.from_email} &rarr; Para: {selectedEmail.to_email}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-500 text-xs">{formatDate(selectedEmail.sent_at || selectedEmail.updated_at)}</p>
                  {selectedEmail.status && (
                    <Badge className={`mt-1 text-[10px] ${selectedEmail.status === 'sent' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {selectedEmail.status === 'sent' ? 'Enviado' : selectedEmail.status === 'failed' ? 'Erro' : 'Rascunho'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto p-4">
              <div
                className="text-gray-200 text-sm leading-relaxed email-content"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || '<p class="text-gray-500">(Sem conteúdo)</p>' }}
              />
            </div>

            {/* Actions */}
            {activeFolder === 'drafts' && (
              <div className="px-4 py-3 border-t border-zinc-800 flex gap-2">
                <Button onClick={() => openCompose(selectedEmail)} className="bg-gold-500 hover:bg-gold-400 text-black">
                  <FileEdit size={14} className="mr-2" />Editar Rascunho
                </Button>
                <Button onClick={() => handleDeleteDraft(selectedEmail.id)} variant="outline" className="border-red-600/50 text-red-400">
                  <Trash2 size={14} className="mr-2" />Eliminar
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ---- EMPTY STATE ---- */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <Inbox size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Selecione um email para ler</p>
              <p className="text-sm mt-1">ou clique em "Novo Email" para compor</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== SIGNATURE DIALOG ===== */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="text-gold-400" /> Configurar Assinatura de Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Nome da Assinatura</Label>
              <Input
                value={signature.signature_name}
                onChange={e => setSignature(prev => ({ ...prev, signature_name: e.target.value }))}
                placeholder="Ex: Assinatura Principal"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Conteúdo da Assinatura</Label>
              {/* Mini formatting toolbar */}
              <div className="flex items-center gap-1 mb-2">
                <button onClick={() => { document.execCommand('bold'); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Bold size={13} /></button>
                <button onClick={() => { document.execCommand('italic'); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Italic size={13} /></button>
                <button onClick={() => { document.execCommand('underline'); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Underline size={13} /></button>
                <button onClick={() => { const url = prompt('URL:'); if (url) document.execCommand('createLink', false, url); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Link size={13} /></button>
                <input type="color" defaultValue="#D4AF37" onChange={e => { document.execCommand('foreColor', false, e.target.value); signatureEditorRef.current?.focus(); }} className="w-5 h-5 rounded cursor-pointer bg-transparent border-none" />
              </div>
              <div
                ref={signatureEditorRef}
                contentEditable
                className="min-h-[120px] p-3 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm outline-none"
                dangerouslySetInnerHTML={{ __html: signature.signature_html }}
                suppressContentEditableWarning
                data-testid="signature-editor"
              />
              <p className="text-gray-500 text-xs">
                Dica: Inclua o seu nome, cargo, telefone e links de redes sociais
              </p>
            </div>
            {/* Preview */}
            {signature.signature_html && (
              <div className="space-y-2">
                <Label className="text-gray-400">Pré-visualização</Label>
                <div className="p-3 bg-zinc-800/50 rounded-md border border-zinc-700/50">
                  <p className="text-gray-500 text-xs mb-1">--</p>
                  <div className="text-gray-300 text-sm" dangerouslySetInnerHTML={{ __html: signature.signature_html }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureDialog(false)} className="border-zinc-600">Cancelar</Button>
            <Button onClick={handleSaveSignature} className="bg-gold-500 hover:bg-gold-400 text-black">Guardar Assinatura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailClient;
