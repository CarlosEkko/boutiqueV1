import React, { useState, useEffect, useRef } from 'react';
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
  Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Settings, RefreshCw, Archive, Paperclip, Reply, ReplyAll,
  Forward, X, AlertOctagon, ChevronDown, Mail,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FOLDERS = [
  { key: 'sent', label: 'Enviados', icon: Send },
  { key: 'drafts', label: 'Rascunhos', icon: FileEdit },
  { key: 'archive', label: 'Arquivo', icon: Archive },
  { key: 'junk', label: 'Junk', icon: AlertOctagon },
  { key: 'trash', label: 'Lixo', icon: Trash2 },
];

const EmailClient = () => {
  const { token, user } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

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
  const [folderCounts, setFolderCounts] = useState({});
  const [attachments, setAttachments] = useState([]);

  const [composeTo, setComposeTo] = useState('');
  const [composeToName, setComposeToName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const editorRef = useRef(null);
  const signatureEditorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSignature();
    fetchFolderCounts();
  }, [token]);

  useEffect(() => {
    if (activeFolder === 'drafts') { fetchDrafts(); }
    else { fetchEmails(); }
    setSelectedEmail(null);
  }, [activeFolder, token]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/emails?folder=${activeFolder}&search=${searchQuery}&limit=200`, { headers });
      setEmails(res.data.emails || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/drafts`, { headers });
      setDrafts(res.data.drafts || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchSignature = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/signature`, { headers });
      setSignature(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchFolderCounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/emails/folders/counts`, { headers });
      setFolderCounts(res.data);
    } catch (err) { console.error(err); }
  };

  const refreshAll = () => {
    if (activeFolder === 'drafts') fetchDrafts();
    else fetchEmails();
    fetchFolderCounts();
    toast.success('Emails atualizados');
  };

  const currentList = activeFolder === 'drafts' ? drafts : emails;

  // Rich text commands
  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  // Send email with attachments
  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      toast.error('Preencha o destinatário e assunto');
      return;
    }
    setSending(true);
    try {
      let body = editorRef.current?.innerHTML || '';
      if (signature.signature_html) {
        body += '<br/><br/><div style="border-top:1px solid #333;padding-top:10px;margin-top:10px;">--<br/>' + signature.signature_html + '</div>';
      }

      const formData = new FormData();
      formData.append('to_email', composeTo);
      formData.append('to_name', composeToName);
      formData.append('subject', composeSubject);
      formData.append('body_html', body);
      attachments.forEach(f => formData.append('files', f));

      await axios.post(`${API_URL}/api/team-hub/emails/send`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Email enviado!');
      resetCompose();
      fetchEmails();
      fetchFolderCounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar');
    }
    setSending(false);
  };

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
      fetchFolderCounts();
    } catch (err) { toast.error('Erro ao guardar rascunho'); }
  };

  const handleDeleteDraft = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/team-hub/drafts/${id}`, { headers });
      toast.success('Rascunho eliminado');
      fetchDrafts();
      fetchFolderCounts();
      if (selectedEmail?.id === id) setSelectedEmail(null);
    } catch (err) { toast.error('Erro'); }
  };

  const handleMoveEmail = async (emailId, folder) => {
    try {
      await axios.put(`${API_URL}/api/team-hub/emails/${emailId}/move`, { folder }, { headers });
      toast.success(`Email movido para ${FOLDERS.find(f => f.key === folder)?.label || folder}`);
      fetchEmails();
      fetchFolderCounts();
      setSelectedEmail(null);
    } catch (err) { toast.error('Erro ao mover email'); }
  };

  const handleDeletePermanently = async (emailId) => {
    if (!window.confirm('Eliminar permanentemente este email?')) return;
    try {
      await axios.delete(`${API_URL}/api/team-hub/emails/${emailId}`, { headers });
      toast.success('Email eliminado permanentemente');
      fetchEmails();
      fetchFolderCounts();
      setSelectedEmail(null);
    } catch (err) { toast.error('Erro'); }
  };

  const resetCompose = () => {
    setShowCompose(false);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject('');
    setAttachments([]);
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const openCompose = (prefill = null) => {
    setShowCompose(true);
    setSelectedEmail(null);
    setAttachments([]);
    if (prefill) {
      setComposeTo(prefill.to_email || '');
      setComposeToName(prefill.to_name || '');
      setComposeSubject(prefill.subject || '');
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = prefill.body_html || '';
      }, 100);
    }
  };

  const handleReply = (email) => {
    setShowCompose(true);
    setSelectedEmail(null);
    setAttachments([]);
    setComposeTo(email.from_email || email.to_email);
    setComposeToName(email.from_name || email.to_name || '');
    setComposeSubject(`Re: ${(email.subject || '').replace(/^(Re: |Fwd: )/i, '')}`);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<br/><br/><div style="border-left:2px solid #D4AF37;padding-left:12px;margin-top:12px;color:#888;"><p style="margin:0;font-size:12px;"><b>${email.from_name || email.from_email}</b> escreveu:</p>${email.body_html || ''}</div>`;
      }
    }, 100);
  };

  const handleForward = (email) => {
    setShowCompose(true);
    setSelectedEmail(null);
    setAttachments([]);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject(`Fwd: ${(email.subject || '').replace(/^(Re: |Fwd: )/i, '')}`);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<br/><br/><div style="border-left:2px solid #D4AF37;padding-left:12px;margin-top:12px;color:#888;"><p style="margin:0;font-size:12px;">---------- Mensagem reencaminhada ----------<br/>De: ${email.from_name || ''} &lt;${email.from_email || ''}&gt;<br/>Para: ${email.to_name || ''} &lt;${email.to_email || ''}&gt;<br/>Assunto: ${email.subject || ''}</p><br/>${email.body_html || ''}</div>`;
      }
    }, 100);
  };

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

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  const getSnippet = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').substring(0, 100);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden" data-testid="email-client">
      
      {/* ===== SIDEBAR ===== */}
      <div className="w-52 border-r border-zinc-800 flex flex-col bg-zinc-900/80 flex-shrink-0">
        <div className="p-3 border-b border-zinc-800">
          <p className="text-gold-400 text-xs font-medium truncate">{user?.email || 'KBEX'}</p>
          <p className="text-gray-500 text-[10px]">via Brevo SMTP</p>
        </div>

        <div className="p-3">
          <Button onClick={() => openCompose()} className="w-full bg-gold-500 hover:bg-gold-400 text-black text-sm" data-testid="compose-new-btn">
            <Plus size={14} className="mr-1.5" /> Novo Email
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {FOLDERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFolder(f.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeFolder === f.key ? 'bg-gold-500/15 text-gold-400' : 'text-gray-400 hover:text-white hover:bg-zinc-800'
              }`}
              data-testid={`folder-${f.key}`}
            >
              <f.icon size={15} />
              <span className="flex-1 text-left">{f.label}</span>
              {(folderCounts[f.key] || 0) > 0 && (
                <span className="text-[10px] bg-zinc-700 text-gray-300 px-1.5 py-0.5 rounded-full">{folderCounts[f.key]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-zinc-800 space-y-0.5">
          <button onClick={() => setShowSignatureDialog(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-zinc-800" data-testid="signature-settings-btn">
            <Settings size={14} /> Assinatura
          </button>
        </div>
      </div>

      {/* ===== EMAIL LIST ===== */}
      <div className="w-80 border-r border-zinc-800 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-zinc-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && (activeFolder === 'drafts' ? fetchDrafts() : fetchEmails())} placeholder="Pesquisar..." className="pl-8 h-8 bg-zinc-800 border-zinc-700 text-sm" />
          </div>
          <Button onClick={refreshAll} variant="ghost" size="sm" className="text-gray-400 hover:text-gold-400 h-8 w-8 p-0" title="Atualizar" data-testid="refresh-emails-btn">
            <RefreshCw size={15} />
          </Button>
        </div>

        <div className="px-3 py-1.5 border-b border-zinc-800/50">
          <span className="text-white text-sm font-medium">{FOLDERS.find(f => f.key === activeFolder)?.label}</span>
          <span className="text-gray-500 text-xs ml-2">({currentList.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-600 text-sm">A carregar...</div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">
              <Mail size={32} className="mx-auto mb-2 opacity-20" />
              Sem emails
            </div>
          ) : (
            currentList.map(email => (
              <div
                key={email.id}
                onClick={() => { setSelectedEmail(email); setShowCompose(false); }}
                className={`px-3 py-2.5 border-b border-zinc-800/40 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-gold-500/10 border-l-2 border-l-gold-400' : 'hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white text-sm font-medium truncate max-w-[180px]">
                    {email.to_name || email.to_email?.split('@')[0] || 'Sem nome'}
                  </span>
                  <span className="text-gray-500 text-[11px]">{formatDate(email.sent_at || email.updated_at)}</span>
                </div>
                <p className="text-gray-300 text-xs font-medium truncate">{email.subject || '(Sem assunto)'}</p>
                <p className="text-gray-500 text-[11px] mt-0.5 truncate">{getSnippet(email.body_html)}</p>
                {email.attachments?.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Paperclip size={10} className="text-gray-500" />
                    <span className="text-gray-500 text-[10px]">{email.attachments.length} anexo(s)</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== CONTENT PANE ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {showCompose ? (
          /* ---- COMPOSE ---- */
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-zinc-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm w-14">Para:</span>
                <Input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="email@exemplo.com" className="h-8 bg-zinc-800 border-zinc-700 text-sm flex-1" data-testid="compose-to" />
                <Input value={composeToName} onChange={e => setComposeToName(e.target.value)} placeholder="Nome" className="h-8 bg-zinc-800 border-zinc-700 text-sm w-40" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm w-14">Assunto:</span>
                <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Assunto do email" className="h-8 bg-zinc-800 border-zinc-700 text-sm flex-1" data-testid="compose-subject" />
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center gap-0.5 flex-wrap">
              <button onClick={() => execCmd('bold')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Negrito"><Bold size={14} /></button>
              <button onClick={() => execCmd('italic')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Itálico"><Italic size={14} /></button>
              <button onClick={() => execCmd('underline')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Sublinhado"><Underline size={14} /></button>
              <div className="w-px h-4 bg-zinc-700 mx-1" />
              <button onClick={() => { const u = prompt('URL:'); if (u) execCmd('createLink', u); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Link"><Link size={14} /></button>
              <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><List size={14} /></button>
              <button onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><ListOrdered size={14} /></button>
              <div className="w-px h-4 bg-zinc-700 mx-1" />
              <button onClick={() => execCmd('justifyLeft')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><AlignLeft size={14} /></button>
              <button onClick={() => execCmd('justifyCenter')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><AlignCenter size={14} /></button>
              <button onClick={() => execCmd('justifyRight')} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><AlignRight size={14} /></button>
              <div className="w-px h-4 bg-zinc-700 mx-1" />
              <select onChange={e => execCmd('fontSize', e.target.value)} defaultValue="3" className="bg-zinc-800 border border-zinc-700 rounded text-[11px] text-gray-300 px-1 py-0.5">
                <option value="1">Pequeno</option>
                <option value="3">Normal</option>
                <option value="5">Grande</option>
                <option value="7">Muito Grande</option>
              </select>
              <input type="color" defaultValue="#ffffff" onChange={e => execCmd('foreColor', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border-none" title="Cor" />
              <div className="w-px h-4 bg-zinc-700 mx-1" />
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white" title="Anexar ficheiro">
                <Paperclip size={14} />
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
            </div>

            {/* Attachments bar */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
                <Paperclip size={13} className="text-gray-500" />
                {attachments.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-zinc-800 text-gray-300 text-xs px-2 py-1 rounded">
                    {f.name}
                    <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
              <div ref={editorRef} contentEditable className="min-h-full p-4 text-white text-sm outline-none leading-relaxed" style={{ whiteSpace: 'pre-wrap' }} data-testid="compose-editor" suppressContentEditableWarning />
              {signature.signature_html && (
                <div className="px-4 pb-4 border-t border-zinc-800/30 mt-2 pt-2">
                  <p className="text-gray-600 text-xs mb-1">--</p>
                  <div className="text-gray-400 text-xs" dangerouslySetInnerHTML={{ __html: signature.signature_html }} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-3 py-2 border-t border-zinc-800 flex items-center gap-2">
              <Button onClick={handleSend} disabled={sending} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="send-email-btn">
                <Send size={14} className="mr-2" />{sending ? 'A enviar...' : 'Enviar'}
              </Button>
              <Button onClick={handleSaveDraft} variant="outline" className="border-zinc-600 text-gray-300">
                <FileEdit size={14} className="mr-2" />Rascunho
              </Button>
              <div className="flex-1" />
              <Button onClick={resetCompose} variant="ghost" className="text-gray-500"><Trash2 size={14} /></Button>
            </div>
          </div>
        ) : selectedEmail ? (
          /* ---- READING PANE ---- */
          <div className="flex-1 flex flex-col">
            {/* Email actions toolbar */}
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-1">
              <Button onClick={() => handleReply(selectedEmail)} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs h-8" data-testid="reply-btn">
                <Reply size={14} className="mr-1.5" />Responder
              </Button>
              <Button onClick={() => handleReply(selectedEmail)} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs h-8" data-testid="reply-all-btn">
                <ReplyAll size={14} className="mr-1.5" />Responder a Todos
              </Button>
              <Button onClick={() => handleForward(selectedEmail)} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs h-8" data-testid="forward-btn">
                <Forward size={14} className="mr-1.5" />Reencaminhar
              </Button>
              <div className="w-px h-5 bg-zinc-700 mx-1" />
              <Button onClick={() => handleMoveEmail(selectedEmail.id, 'archive')} variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Arquivar">
                <Archive size={14} />
              </Button>
              <Button onClick={() => handleMoveEmail(selectedEmail.id, 'junk')} variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Junk">
                <AlertOctagon size={14} />
              </Button>
              <Button onClick={() => handleMoveEmail(selectedEmail.id, 'trash')} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" title="Lixo" data-testid="trash-btn">
                <Trash2 size={14} />
              </Button>
              {activeFolder === 'trash' && (
                <Button onClick={() => handleDeletePermanently(selectedEmail.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs h-8 ml-1">
                  Eliminar Permanentemente
                </Button>
              )}
            </div>

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
                    <p className="text-gray-500 text-xs">Para: {selectedEmail.to_name || ''} &lt;{selectedEmail.to_email}&gt;</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-500 text-xs">{formatDate(selectedEmail.sent_at || selectedEmail.updated_at)}</p>
                  {selectedEmail.status && (
                    <Badge className={`mt-1 text-[10px] ${selectedEmail.status === 'sent' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {selectedEmail.status === 'sent' ? 'Enviado' : selectedEmail.folder === 'drafts' ? 'Rascunho' : 'Erro'}
                    </Badge>
                  )}
                </div>
              </div>
              {selectedEmail.attachments?.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Paperclip size={13} className="text-gray-500" />
                  {selectedEmail.attachments.map((name, i) => (
                    <span key={i} className="bg-zinc-800 text-gray-300 text-xs px-2 py-1 rounded">{name}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || '<p class="text-gray-500">(Sem conteúdo)</p>' }} />
            </div>

            {activeFolder === 'drafts' && (
              <div className="px-4 py-2 border-t border-zinc-800 flex gap-2">
                <Button onClick={() => openCompose(selectedEmail)} className="bg-gold-500 hover:bg-gold-400 text-black">
                  <FileEdit size={14} className="mr-2" />Editar
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
              <Inbox size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">Selecione um email</p>
              <p className="text-sm mt-1">ou clique em "Novo Email" para compor</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== SIGNATURE DIALOG ===== */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="text-gold-400" /> Configurar Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Nome da Assinatura</Label>
              <Input value={signature.signature_name} onChange={e => setSignature(prev => ({ ...prev, signature_name: e.target.value }))} placeholder="Ex: Assinatura Principal" className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Conteúdo</Label>
              <div className="flex items-center gap-1 mb-2">
                <button onClick={() => { document.execCommand('bold'); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Bold size={13} /></button>
                <button onClick={() => { document.execCommand('italic'); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Italic size={13} /></button>
                <button onClick={() => { document.execCommand('underline'); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Underline size={13} /></button>
                <button onClick={() => { const u = prompt('URL:'); if (u) document.execCommand('createLink', false, u); signatureEditorRef.current?.focus(); }} className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"><Link size={13} /></button>
                <input type="color" defaultValue="#D4AF37" onChange={e => { document.execCommand('foreColor', false, e.target.value); signatureEditorRef.current?.focus(); }} className="w-5 h-5 rounded cursor-pointer bg-transparent border-none" />
              </div>
              <div ref={signatureEditorRef} contentEditable className="min-h-[120px] p-3 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm outline-none" dangerouslySetInnerHTML={{ __html: signature.signature_html }} suppressContentEditableWarning data-testid="signature-editor" />
            </div>
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
            <Button onClick={handleSaveSignature} className="bg-gold-500 hover:bg-gold-400 text-black">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailClient;
