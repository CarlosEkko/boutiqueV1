import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { 
  Ticket,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Send,
  Filter,
  RefreshCw,
  ChevronRight,
  Globe,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TicketsDashboard = () => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);

  const statusOptions = [
    { value: 'open', label: 'Aberto', color: 'blue' },
    { value: 'in_progress', label: 'Em Progresso', color: 'gold' },
    { value: 'waiting_client', label: 'Aguardando Cliente', color: 'purple' },
    { value: 'resolved', label: 'Resolvido', color: 'green' },
    { value: 'closed', label: 'Fechado', color: 'gray' }
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Urgente', color: 'red' },
    { value: 'high', label: 'Alta', color: 'orange' },
    { value: 'medium', label: 'Média', color: 'gold' },
    { value: 'low', label: 'Baixa', color: 'gray' }
  ];

  const categoryLabels = {
    general: 'Geral',
    kyc: 'KYC',
    transaction: 'Transação',
    account: 'Conta',
    technical: 'Técnico',
    complaint: 'Reclamação'
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [token, statusFilter, priorityFilter, assignedToMe]);

  const fetchTickets = async () => {
    try {
      let url = `${API_URL}/api/tickets/internal/all?`;
      if (statusFilter && statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (priorityFilter && priorityFilter !== 'all') url += `priority=${priorityFilter}&`;
      if (assignedToMe) url += `assigned_to_me=true&`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (err) {
      toast.error('Falha ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tickets/internal/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const openTicketDetails = async (ticketId) => {
    try {
      const response = await axios.get(`${API_URL}/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicketDetails(response.data);
      setSelectedTicket(ticketId);
    } catch (err) {
      toast.error('Falha ao carregar detalhes do ticket');
    }
  };

  const assignToMe = async (ticketId) => {
    try {
      await axios.post(`${API_URL}/api/tickets/internal/${ticketId}/assign`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket atribuído a si');
      fetchTickets();
      if (selectedTicket === ticketId) {
        openTicketDetails(ticketId);
      }
    } catch (err) {
      toast.error('Falha ao atribuir ticket');
    }
  };

  const updateStatus = async (ticketId, newStatus) => {
    try {
      await axios.post(`${API_URL}/api/tickets/internal/${ticketId}/status/${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Estado atualizado');
      fetchTickets();
      fetchStats();
      if (selectedTicket === ticketId) {
        openTicketDetails(ticketId);
      }
    } catch (err) {
      toast.error('Falha ao atualizar estado');
    }
  };

  const updatePriority = async (ticketId, newPriority) => {
    try {
      await axios.post(`${API_URL}/api/tickets/internal/${ticketId}/priority/${newPriority}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Prioridade atualizada');
      fetchTickets();
      if (selectedTicket === ticketId) {
        openTicketDetails(ticketId);
      }
    } catch (err) {
      toast.error('Falha ao atualizar prioridade');
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setSending(true);
    try {
      await axios.post(
        `${API_URL}/api/tickets/${selectedTicket}/reply`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { message: replyMessage }
        }
      );
      toast.success('Resposta enviada');
      setReplyMessage('');
      openTicketDetails(selectedTicket);
    } catch (err) {
      toast.error('Falha ao enviar resposta');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = statusOptions.find(s => s.value === status) || { color: 'gray', label: status };
    const colorClasses = {
      blue: 'bg-blue-900/30 text-blue-400',
      gold: 'bg-gold-900/30 text-gold-400',
      purple: 'bg-purple-900/30 text-purple-400',
      green: 'bg-green-900/30 text-green-400',
      gray: 'bg-gray-900/30 text-gray-400'
    };
    return <Badge className={colorClasses[config.color]}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const config = priorityOptions.find(p => p.value === priority) || { color: 'gray', label: priority };
    const colorClasses = {
      red: 'bg-red-900/30 text-red-400 border border-red-800/30',
      orange: 'bg-orange-900/30 text-orange-400',
      gold: 'bg-gold-900/30 text-gold-400',
      gray: 'bg-gray-900/30 text-gray-400'
    };
    return <Badge className={colorClasses[config.color]}>{config.label}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const regionFlags = {
    europe: '🇪🇺',
    mena: '🌍',
    latam: '🌎',
    global: '🌐'
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Ticket className="text-gold-400" />
            Tickets de Suporte
          </h1>
          <p className="text-gray-400 mt-1">Gerir pedidos de suporte dos clientes</p>
        </div>
        <Button
          onClick={() => { fetchTickets(); fetchStats(); }}
          variant="outline"
          className="border-gold-800/30"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-900/20 border-blue-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-light text-blue-400">{stats?.by_status?.open || 0}</p>
            <p className="text-sm text-blue-300">Abertos</p>
          </CardContent>
        </Card>
        <Card className="bg-gold-900/20 border-gold-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-light text-gold-400">{stats?.by_status?.in_progress || 0}</p>
            <p className="text-sm text-gold-300">Em Progresso</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-900/20 border-purple-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-light text-purple-400">{stats?.by_status?.waiting_client || 0}</p>
            <p className="text-sm text-purple-300">Aguardando</p>
          </CardContent>
        </Card>
        <Card className={`${stats?.by_priority?.urgent > 0 ? 'bg-red-900/20 border-red-800/30' : 'bg-zinc-900/30 border-zinc-800/30'}`}>
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-light ${stats?.by_priority?.urgent > 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {stats?.by_priority?.urgent || 0}
            </p>
            <p className={`text-sm ${stats?.by_priority?.urgent > 0 ? 'text-red-300' : 'text-gray-500'}`}>Urgentes</p>
          </CardContent>
        </Card>
        <Card className="bg-green-900/20 border-green-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-light text-green-400">{stats?.by_status?.resolved || 0}</p>
            <p className="text-sm text-green-300">Resolvidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/30 border-gold-800/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">Filtros:</span>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-zinc-800 border-gold-800/30">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-800/30">
                <SelectItem value="all">Todos Estados</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40 bg-zinc-800 border-gold-800/30">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-800/30">
                <SelectItem value="all">Todas Prioridades</SelectItem>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setAssignedToMe(!assignedToMe)}
              variant={assignedToMe ? "default" : "outline"}
              size="sm"
              className={assignedToMe ? "bg-gold-500" : "border-gold-800/30"}
            >
              <UserCheck size={14} className="mr-1" />
              Meus Tickets
            </Button>

            {(statusFilter || priorityFilter || assignedToMe) && (
              <Button
                onClick={() => { setStatusFilter(''); setPriorityFilter(''); setAssignedToMe(false); }}
                variant="ghost"
                size="sm"
                className="text-gray-400"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <Card 
              key={ticket.id} 
              className={`border cursor-pointer transition-all hover:border-gold-600/40 ${
                ticket.priority === 'urgent' 
                  ? 'bg-red-950/20 border-red-800/30' 
                  : 'bg-zinc-900/50 border-gold-800/20'
              }`}
              onClick={() => openTicketDetails(ticket.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Priority Indicator */}
                    <div className={`w-2 h-12 rounded-full ${
                      ticket.priority === 'urgent' ? 'bg-red-500' :
                      ticket.priority === 'high' ? 'bg-orange-500' :
                      ticket.priority === 'medium' ? 'bg-gold-500' :
                      'bg-gray-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium truncate">{ticket.subject}</p>
                        <span className="text-lg">{regionFlags[ticket.region]}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {ticket.user_name}
                        </span>
                        <span>•</span>
                        <span>{categoryLabels[ticket.category] || ticket.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    
                    {ticket.assigned_name ? (
                      <Badge className="bg-zinc-800 text-gray-300">
                        {ticket.assigned_name}
                      </Badge>
                    ) : (
                      <Button
                        onClick={(e) => { e.stopPropagation(); assignToMe(ticket.id); }}
                        size="sm"
                        className="bg-gold-500 hover:bg-gold-400"
                      >
                        Atribuir a mim
                      </Button>
                    )}

                    <div className="flex items-center gap-1 text-gray-400">
                      <MessageSquare size={14} />
                      <span className="text-sm">{ticket.message_count}</span>
                    </div>

                    <ChevronRight className="text-gray-500" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <Ticket className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Tickets</h3>
              <p className="text-gray-400">Não existem tickets com os filtros selecionados.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ticket Details Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => { setSelectedTicket(null); setTicketDetails(null); }}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {ticketDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-lg">{regionFlags[ticketDetails.region]}</span>
                  <span className="truncate">{ticketDetails.subject}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="text-white">{ticketDetails.user_name}</p>
                    <p className="text-xs text-gray-400">{ticketDetails.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Categoria</p>
                    <p className="text-white">{categoryLabels[ticketDetails.category]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estado</p>
                    <Select 
                      value={ticketDetails.status} 
                      onValueChange={(value) => updateStatus(ticketDetails.id, value)}
                    >
                      <SelectTrigger className="mt-1 bg-zinc-700 border-gold-800/30 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-gold-800/30">
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prioridade</p>
                    <Select 
                      value={ticketDetails.priority} 
                      onValueChange={(value) => updatePriority(ticketDetails.id, value)}
                    >
                      <SelectTrigger className="mt-1 bg-zinc-700 border-gold-800/30 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-gold-800/30">
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assign */}
                {!ticketDetails.assigned_to && (
                  <Button
                    onClick={() => assignToMe(ticketDetails.id)}
                    className="w-full bg-gold-500 hover:bg-gold-400"
                  >
                    <UserCheck size={16} className="mr-2" />
                    Atribuir a Mim
                  </Button>
                )}

                {ticketDetails.assigned_name && (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                    <span className="text-gray-400 text-sm">Atribuído a:</span>
                    <Badge className="bg-gold-900/30 text-gold-400">{ticketDetails.assigned_name}</Badge>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3">
                  <h4 className="text-sm text-gray-400 flex items-center gap-2">
                    <MessageSquare size={14} />
                    Mensagens ({ticketDetails.messages?.length || 0})
                  </h4>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {ticketDetails.messages?.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 rounded-lg ${
                          msg.sender_type === 'internal' 
                            ? 'bg-gold-900/20 border border-gold-800/30 ml-4' 
                            : 'bg-zinc-800/50 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${
                            msg.sender_type === 'internal' ? 'text-gold-400' : 'text-white'
                          }`}>
                            {msg.sender_name}
                            {msg.sender_type === 'internal' && (
                              <Badge className="ml-2 bg-gold-800/30 text-gold-400 text-xs">Equipa</Badge>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Box */}
                {ticketDetails.status !== 'closed' && (
                  <div className="space-y-2">
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Escreva a sua resposta..."
                      className="bg-zinc-800 border-gold-800/30 min-h-20"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={sendReply}
                        disabled={!replyMessage.trim() || sending}
                        className="bg-gold-500 hover:bg-gold-400"
                      >
                        <Send size={16} className="mr-2" />
                        {sending ? 'Enviando...' : 'Enviar Resposta'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketsDashboard;
