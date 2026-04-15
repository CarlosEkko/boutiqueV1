import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, formatDate} from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { 
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Shield,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupportPage = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('tickets');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // New ticket form
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/kb/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.description) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/api/kb/tickets`, newTicket, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Ticket ${response.data.ticket_number} criado com sucesso!`);
      setNewTicket({ subject: '', description: '', category: 'general', priority: 'medium' });
      setShowNewTicket(false);
      fetchTickets();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao criar ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (ticketId) => {
    if (!replyText.trim()) {
      toast.error('Escreva uma mensagem');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/kb/tickets/${ticketId}/reply`, 
        { message: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Mensagem enviada!');
      setReplyText('');
      
      // Reload ticket
      const response = await axios.get(`${API_URL}/api/kb/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(tickets.map(t => t.id === ticketId ? response.data : t));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao enviar mensagem'));
    } finally {
      setSubmitting(false);
    }
  };

  const closeTicket = async (ticketId) => {
    try {
      await axios.post(`${API_URL}/api/kb/tickets/${ticketId}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket fechado');
      fetchTickets();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao fechar ticket'));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Aberto' },
      in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Em Progresso' },
      waiting_customer: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Aguardando Resposta' },
      resolved: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Resolvido' },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Fechado' }
    };
    const style = styles[status] || styles.open;
    return <Badge className={`${style.bg} ${style.text} border-0`}>{style.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Baixa' },
      medium: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Média' },
      high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Alta' },
      urgent: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Urgente' }
    };
    const style = styles[priority] || styles.medium;
    return <Badge className={`${style.bg} ${style.text} border-0`}>{style.label}</Badge>;
  };

  const openTickets = tickets.filter(t => !['closed', 'resolved'].includes(t.status));
  const closedTickets = tickets.filter(t => ['closed', 'resolved'].includes(t.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Suporte</h1>
          <p className="text-gray-400">Gerir os seus pedidos de suporte</p>
        </div>
        <Button
          onClick={() => setShowNewTicket(true)}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus size={16} className="mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/help" className="block">
          <Card className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <HelpCircle className="text-emerald-400" size={20} />
              </div>
              <div>
                <div className="text-white font-medium">Base de Conhecimento</div>
                <div className="text-sm text-gray-400">Encontre respostas rápidas</div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewTicket(false)}
        >
          <Card 
            className="bg-zinc-900 border-zinc-800 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-white">Novo Pedido de Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTicket} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Assunto</label>
                  <Input
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="Descreva brevemente o seu problema"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Categoria</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="general">Geral</option>
                      <option value="technical">Técnico</option>
                      <option value="billing">Faturação</option>
                      <option value="kyc">KYC/Verificação</option>
                      <option value="trading">Trading</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Prioridade</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
                  <Textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Descreva o seu problema em detalhe..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                    rows={5}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewTicket(false)}
                    className="flex-1 border-zinc-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  >
                    {submitting ? 'A criar...' : 'Criar Ticket'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'tickets' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tickets')}
          className={activeTab === 'tickets' ? 'bg-emerald-500' : 'border-zinc-700'}
        >
          Abertos ({openTickets.length})
        </Button>
        <Button
          variant={activeTab === 'closed' ? 'default' : 'outline'}
          onClick={() => setActiveTab('closed')}
          className={activeTab === 'closed' ? 'bg-emerald-500' : 'border-zinc-700'}
        >
          Fechados ({closedTickets.length})
        </Button>
      </div>

      {/* Tickets List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">
            {activeTab === 'tickets' ? 'Tickets Abertos' : 'Tickets Fechados'}
          </CardTitle>
          <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchTickets}>
            <RefreshCw size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">A carregar...</div>
          ) : (activeTab === 'tickets' ? openTickets : closedTickets).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum ticket encontrado</p>
              {activeTab === 'tickets' && (
                <Button
                  variant="outline"
                  onClick={() => setShowNewTicket(true)}
                  className="mt-4 border-zinc-700"
                >
                  Criar Primeiro Ticket
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(activeTab === 'tickets' ? openTickets : closedTickets).map(ticket => (
                <div
                  key={ticket.id}
                  className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden"
                >
                  {/* Ticket Header */}
                  <button
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-emerald-400 font-mono">{ticket.ticket_number}</span>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <div className="text-white font-medium truncate">{ticket.subject}</div>
                        <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                          <Clock size={12} />
                          {formatDate(ticket.created_at)}
                          {ticket.messages && ticket.messages.length > 1 && (
                            <>
                              <span>•</span>
                              <MessageSquare size={12} />
                              {ticket.messages.length} mensagens
                            </>
                          )}
                        </div>
                      </div>
                      {expandedTicket === ticket.id ? (
                        <ChevronUp size={16} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedTicket === ticket.id && (
                    <div className="border-t border-zinc-700 p-4 space-y-4">
                      {/* Messages */}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {ticket.messages?.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              msg.sender_type === 'admin' ? 'bg-emerald-500/20' : 'bg-zinc-700'
                            }`}>
                              {msg.sender_type === 'admin' ? (
                                <Shield size={14} className="text-emerald-400" />
                              ) : (
                                <User size={14} className="text-gray-400" />
                              )}
                            </div>
                            <div className={`flex-1 ${msg.sender_type === 'admin' ? 'text-right' : ''}`}>
                              <div className="text-xs text-gray-400 mb-1">
                                {msg.sender_name} • {formatDate(msg.created_at, true)}
                              </div>
                              <div className={`inline-block p-3 rounded-lg ${
                                msg.sender_type === 'admin' 
                                  ? 'bg-emerald-500/20 text-white' 
                                  : 'bg-zinc-700 text-gray-200'
                              }`}>
                                {msg.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Reply Form */}
                      {!['closed', 'resolved'].includes(ticket.status) && (
                        <div className="flex gap-2 pt-4 border-t border-zinc-700">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva a sua resposta..."
                            className="bg-zinc-800 border-zinc-700 text-white flex-1"
                            rows={2}
                          />
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => sendReply(ticket.id)}
                              disabled={submitting}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <Send size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => closeTicket(ticket.id)}
                              className="border-zinc-700 text-gray-400"
                              title="Fechar ticket"
                            >
                              <CheckCircle size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportPage;
