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
  Link, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  RefreshCw, Archive, Paperclip, Reply, Forward, X, AlertOctagon,
  Mail, LogIn, Unplug, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Desired folder order + Portuguese labels
const FOLDER_ORDER = [
  { match: ['Inbox', 'Caixa de Entrada'], label: 'Inbox', icon: Inbox },
  { match: ['Drafts', 'Rascunhos'], label: 'Rascunhos', icon: FileEdit },
  { match: ['Sent Items', 'Itens Enviados'], label: 'Enviados', icon: Send },
  { match: ['Junk Email', 'E-mail de Lixo', 'Lixo Eletrônico'], label: 'Junk', icon: AlertOctagon },
  { match: ['Deleted Items', 'Itens Eliminados', 'Itens Excluídos'], label: 'Lixo', icon: Trash2 },
  { match: ['Archive', 'Arquivo'], label: 'Arquivo', icon: Archive },
  { match: ['Conversation History', 'Histórico de Conversas'], label: 'Conversações', icon: Mail },
];

const EmailClient = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [o365Status, setO365Status] = useState(null); // null=loading, false=not connected, object=connected
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageDetail, setMessageDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [composeTo, setComposeTo] = useState('');
  const [composeToName, setComposeToName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const editorRef = useRef(null);

  // Check O365 connection on mount
  useEffect(() => {
    checkO365Status();
  }, [token]);

  const checkO365Status = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/o365/auth/status`, { headers });
      if (res.data.connected) {
        setO365Status(res.data);
        fetchFolders();
      } else {
        setO365Status(false);
      }
    } catch (err) {
      console.error('O365 status check failed:', err);
      setO365Status(false);
    }
  };

  const connectO365 = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/o365/auth/url`, { headers });
      window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error('Erro ao iniciar autenticação O365');
    }
  };

  const disconnectO365 = async () => {
    if (!window.confirm('Desconectar a conta Office 365?')) return;
    try {
      await axios.delete(`${API_URL}/api/o365/auth/disconnect`, { headers });
      setO365Status(false);
      setFolders([]);
      setMessages([]);
      setSelectedMessage(null);
      toast.success('Conta O365 desconectada');
    } catch (err) {
      toast.error('Erro ao desconectar');
    }
  };

  // Fetch mail folders
  const fetchFolders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/o365/mail/folders`, { headers });
      const allFolders = res.data.folders || [];

      // Sort and label folders according to desired order
      const sorted = [];
      const used = new Set();
      for (const def of FOLDER_ORDER) {
        const found = allFolders.find(f => def.match.includes(f.name));
        if (found) {
          sorted.push({ ...found, display_label: def.label, display_icon: def.icon });
          used.add(found.id);
        }
      }
      // Add remaining folders not in our predefined list
      allFolders.forEach(f => {
        if (!used.has(f.id)) {
          sorted.push({ ...f, display_label: f.name, display_icon: FolderOpen });
        }
      });

      setFolders(sorted);
      // Auto-select Inbox
      const inbox = sorted.find(f => f.display_label === 'Inbox');
      if (inbox && !activeFolder) setActiveFolder(inbox);
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      if (err.response?.status === 401) setO365Status(false);
    }
  };

  // Fetch messages for active folder
  const fetchMessages = useCallback(async () => {
    if (!activeFolder) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder_id: activeFolder.id, top: '30' });
      if (searchQuery) params.append('search', searchQuery);
      const res = await axios.get(`${API_URL}/api/o365/mail/messages?${params}`, { headers });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      toast.error('Erro ao carregar emails');
    }
    setLoading(false);
  }, [activeFolder, searchQuery, token]);

  useEffect(() => {
    if (activeFolder) {
      fetchMessages();
      setSelectedMessage(null);
      setMessageDetail(null);
    }
  }, [activeFolder]);

  // Fetch message detail
  const openMessage = async (msg) => {
    setSelectedMessage(msg);
    setShowCompose(false);
    setLoadingDetail(true);
    try {
      const res = await axios.get(`${API_URL}/api/o365/mail/messages/${msg.id}`, { headers });
      setMessageDetail(res.data);
      // Update unread count in folder list
      if (!msg.is_read) {
        setFolders(prev => prev.map(f =>
          f.id === activeFolder?.id ? { ...f, unread_count: Math.max(0, f.unread_count - 1) } : f
        ));
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      }
    } catch (err) {
      toast.error('Erro ao abrir email');
    }
    setLoadingDetail(false);
  };

  // Refresh
  const refreshAll = () => {
    fetchFolders();
    fetchMessages();
    toast.success('Emails atualizados');
  };

  // Rich text commands
  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  // Send email via O365
  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      toast.error('Preencha o destinatário e assunto');
      return;
    }
    setSending(true);
    try {
      const body = editorRef.current?.innerHTML || '';
      const payload = {
        to_email: composeTo,
        to_name: composeToName,
        subject: composeSubject,
        body_html: body,
        cc: composeCc ? composeCc.split(',').map(e => e.trim()).filter(Boolean) : [],
      };
      await axios.post(`${API_URL}/api/o365/mail/send`, payload, { headers });
      toast.success('Email enviado via Office 365!');
      resetCompose();
      fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar');
    }
    setSending(false);
  };

  // Reply
  const handleReply = () => {
    if (!messageDetail) return;
    setShowCompose(true);
    setSelectedMessage(null);
    setComposeTo(messageDetail.from_email);
    setComposeToName(messageDetail.from_name || '');
    setComposeSubject(`Re: ${(messageDetail.subject || '').replace(/^(Re: |Fwd: )/i, '')}`);
    setComposeCc('');
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<br/><br/><div style="border-left:2px solid #D4AF37;padding-left:12px;margin-top:12px;color:#999;"><p style="margin:0;font-size:12px;"><b>${messageDetail.from_name || messageDetail.from_email}</b> escreveu:</p>${messageDetail.body_html || ''}</div>`;
      }
    }, 100);
  };

  // Forward
  const handleForward = () => {
    if (!messageDetail) return;
    setShowCompose(true);
    setSelectedMessage(null);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject(`Fwd: ${(messageDetail.subject || '').replace(/^(Re: |Fwd: )/i, '')}`);
    setComposeCc('');
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = `<br/><br/><div style="border-left:2px solid #D4AF37;padding-left:12px;margin-top:12px;color:#999;"><p style="margin:0;font-size:12px;">---------- Mensagem reencaminhada ----------<br/>De: ${messageDetail.from_name || ''} &lt;${messageDetail.from_email}&gt;<br/>Assunto: ${messageDetail.subject || ''}</p><br/>${messageDetail.body_html || ''}</div>`;
      }
    }, 100);
  };

  // Move to folder
  const handleMove = async (destFolderId) => {
    if (!selectedMessage && !messageDetail) return;
    const msgId = messageDetail?.id || selectedMessage?.id;
    try {
      await axios.post(`${API_URL}/api/o365/mail/messages/${msgId}/move`, { destination_folder_id: destFolderId }, { headers });
      toast.success('Email movido');
      setSelectedMessage(null);
      setMessageDetail(null);
      fetchMessages();
      fetchFolders();
    } catch (err) {
      toast.error('Erro ao mover email');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedMessage && !messageDetail) return;
    const msgId = messageDetail?.id || selectedMessage?.id;
    try {
      await axios.delete(`${API_URL}/api/o365/mail/messages/${msgId}`, { headers });
      toast.success('Email eliminado');
      setSelectedMessage(null);
      setMessageDetail(null);
      fetchMessages();
      fetchFolders();
    } catch (err) {
      toast.error('Erro ao eliminar');
    }
  };

  const resetCompose = () => {
    setShowCompose(false);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject('');
    setComposeCc('');
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const openCompose = () => {
    setShowCompose(true);
    setSelectedMessage(null);
    setMessageDetail(null);
    setComposeTo('');
    setComposeToName('');
    setComposeSubject('');
    setComposeCc('');
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  // ==================== NOT CONNECTED STATE ====================
  if (o365Status === null) {
    return (
      <div className="flex h-[calc(100vh-280px)] items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="text-center text-gray-500">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin opacity-30" />
          <p>A verificar conexão...</p>
        </div>
      </div>
    );
  }

  if (o365Status === false) {
    return (
      <div className="flex h-[calc(100vh-280px)] items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800" data-testid="o365-connect-prompt">
        <div className="text-center max-w-md px-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Mail size={28} className="text-blue-400" />
          </div>
          <h2 className="text-xl text-white font-medium mb-2">Conectar Microsoft 365</h2>
          <p className="text-gray-400 text-sm mb-6">
            Conecte a sua conta Office 365 para aceder ao email, calendário e tarefas diretamente no Team Hub.
          </p>
          <Button onClick={connectO365} className="bg-blue-600 hover:bg-blue-500 text-white px-6" data-testid="connect-o365-btn">
            <LogIn size={16} className="mr-2" /> Conectar Office 365
          </Button>
        </div>
      </div>
    );
  }

  // ==================== CONNECTED - FULL EMAIL CLIENT ====================
  return (
    <div className="flex h-[calc(100vh-280px)] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden" data-testid="email-client">

      {/* ===== SIDEBAR ===== */}
      <div className="w-52 border-r border-zinc-800 flex flex-col bg-zinc-900/80 flex-shrink-0">
        <div className="p-3 border-b border-zinc-800">
          <p className="text-blue-400 text-xs font-medium truncate">{o365Status.account_email}</p>
          <p className="text-gray-500 text-[10px]">Microsoft 365</p>
        </div>

        <div className="p-3">
          <Button onClick={openCompose} className="w-full bg-gold-500 hover:bg-gold-400 text-black text-sm" data-testid="compose-new-btn">
            <Plus size={14} className="mr-1.5" /> Novo Email
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {folders.map(f => {
            const Icon = f.display_icon || FolderOpen;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeFolder?.id === f.id ? 'bg-gold-500/15 text-gold-400' : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
                data-testid={`folder-${(f.display_label || f.name).toLowerCase().replace(/\s/g, '-')}`}
              >
                <Icon size={15} />
                <span className="flex-1 text-left truncate">{f.display_label || f.name}</span>
                {f.unread_count > 0 && (
                  <span className="text-[10px] bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">{f.unread_count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-zinc-800">
          <button onClick={disconnectO365} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-400 rounded-lg hover:bg-zinc-800" data-testid="disconnect-o365-btn">
            <Unplug size={14} /> Desconectar
          </button>
        </div>
      </div>

      {/* ===== EMAIL LIST ===== */}
      <div className="w-80 border-r border-zinc-800 flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-zinc-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchMessages()}
              placeholder="Pesquisar..."
              className="pl-8 h-8 bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>
          <Button onClick={refreshAll} variant="ghost" size="sm" className="text-gray-400 hover:text-gold-400 h-8 w-8 p-0" title="Atualizar" data-testid="refresh-emails-btn">
            <RefreshCw size={15} />
          </Button>
        </div>

        <div className="px-3 py-1.5 border-b border-zinc-800/50">
          <span className="text-white text-sm font-medium">{activeFolder?.display_label || activeFolder?.name || 'Email'}</span>
          <span className="text-gray-500 text-xs ml-2">({messages.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-600 text-sm">A carregar...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">
              <Mail size={32} className="mx-auto mb-2 opacity-20" />
              Sem emails
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`px-3 py-2.5 border-b border-zinc-800/40 cursor-pointer transition-colors ${
                  selectedMessage?.id === msg.id ? 'bg-gold-500/10 border-l-2 border-l-gold-400' : 'hover:bg-zinc-800/40'
                } ${!msg.is_read ? 'bg-zinc-900/50' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm truncate max-w-[180px] ${!msg.is_read ? 'text-white font-semibold' : 'text-gray-300 font-medium'}`}>
                    {msg.from_name || msg.from_email?.split('@')[0] || 'Desconhecido'}
                  </span>
                  <span className="text-gray-500 text-[11px] flex-shrink-0">{formatDate(msg.received_at)}</span>
                </div>
                <p className={`text-xs truncate ${!msg.is_read ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>{msg.subject || '(Sem assunto)'}</p>
                <p className="text-gray-500 text-[11px] mt-0.5 truncate">{msg.preview}</p>
                <div className="flex items-center gap-2 mt-1">
                  {msg.has_attachments && (
                    <span className="flex items-center gap-1"><Paperclip size={10} className="text-gray-500" /></span>
                  )}
                  {msg.importance === 'high' && (
                    <span className="text-red-400 text-[10px]">!</span>
                  )}
                </div>
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
                <span className="text-gray-400 text-sm w-14">Cc:</span>
                <Input value={composeCc} onChange={e => setComposeCc(e.target.value)} placeholder="cc1@email.com, cc2@email.com" className="h-8 bg-zinc-800 border-zinc-700 text-sm flex-1" />
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
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
              <div ref={editorRef} contentEditable className="min-h-full p-4 text-white text-sm outline-none leading-relaxed" style={{ whiteSpace: 'pre-wrap' }} data-testid="compose-editor" suppressContentEditableWarning />
            </div>

            {/* Actions */}
            <div className="px-3 py-2 border-t border-zinc-800 flex items-center gap-2">
              <Button onClick={handleSend} disabled={sending} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="send-email-btn">
                <Send size={14} className="mr-2" />{sending ? 'A enviar...' : 'Enviar'}
              </Button>
              <div className="flex-1" />
              <Button onClick={resetCompose} variant="ghost" className="text-gray-500"><Trash2 size={14} /></Button>
            </div>
          </div>

        ) : messageDetail ? (
          /* ---- READING PANE ---- */
          <div className="flex-1 flex flex-col">
            {/* Actions toolbar */}
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-1">
              <Button onClick={handleReply} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs h-8" data-testid="reply-btn">
                <Reply size={14} className="mr-1.5" />Responder
              </Button>
              <Button onClick={handleForward} variant="ghost" size="sm" className="text-gray-400 hover:text-white text-xs h-8" data-testid="forward-btn">
                <Forward size={14} className="mr-1.5" />Reencaminhar
              </Button>
              <div className="w-px h-5 bg-zinc-700 mx-1" />
              {/* Move to folders */}
              {folders.filter(f => f.name === 'Archive' || f.name === 'Arquivo').map(f => (
                <Button key={f.id} onClick={() => handleMove(f.id)} variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Arquivar">
                  <Archive size={14} />
                </Button>
              ))}
              {folders.filter(f => f.name === 'Junk Email' || f.name === 'E-mail de Lixo').map(f => (
                <Button key={f.id} onClick={() => handleMove(f.id)} variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0" title="Junk">
                  <AlertOctagon size={14} />
                </Button>
              ))}
              <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" title="Eliminar" data-testid="delete-btn">
                <Trash2 size={14} />
              </Button>
            </div>

            {/* Email header */}
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-white text-lg font-medium mb-3">{messageDetail.subject || '(Sem assunto)'}</h2>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold text-sm">
                      {(messageDetail.from_name || messageDetail.from_email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{messageDetail.from_name || messageDetail.from_email}</p>
                    <p className="text-gray-500 text-xs">
                      Para: {messageDetail.to?.join(', ') || ''}
                      {messageDetail.cc?.length > 0 && <span> | Cc: {messageDetail.cc.join(', ')}</span>}
                    </p>
                  </div>
                </div>
                <p className="text-gray-500 text-xs flex-shrink-0">{formatDate(messageDetail.received_at)}</p>
              </div>
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDetail ? (
                <div className="text-center py-8 text-gray-600">A carregar...</div>
              ) : (
                <div className="text-gray-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: messageDetail.body_html || '<p class="text-gray-500">(Sem conteúdo)</p>' }} />
              )}
            </div>
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
    </div>
  );
};

export default EmailClient;
