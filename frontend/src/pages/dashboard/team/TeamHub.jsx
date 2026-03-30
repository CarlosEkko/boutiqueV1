import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import EmailClient from './EmailClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  Mail,
  Calendar,
  CheckSquare,
  Send,
  Plus,
  Search,
  Clock,
  User,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'bg-red-900/40 text-red-400', icon: ArrowUp },
  high: { label: 'Alta', color: 'bg-orange-900/40 text-orange-400', icon: ArrowUp },
  medium: { label: 'Média', color: 'bg-yellow-900/40 text-yellow-400', icon: ArrowRight },
  low: { label: 'Baixa', color: 'bg-blue-900/40 text-blue-400', icon: ArrowDown },
};

const STATUS_CONFIG = {
  todo: { label: 'A Fazer', color: 'bg-gray-900/40 text-gray-400' },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-900/40 text-blue-400' },
  done: { label: 'Concluída', color: 'bg-green-900/40 text-green-400' },
};

const TeamHub = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('email');
  const [stats, setStats] = useState({});

  // Email state - now handled by EmailClient component

  // Calendar state
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventData, setEventData] = useState({ title: '', description: '', start_date: '', end_date: '', location: '', color: '#D4AF37', all_day: false });

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('all');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', tags: [] });
  
  // Team members
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchTeamMembers();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'calendar') fetchEvents();
    if (activeTab === 'tasks') fetchTasks();
  }, [activeTab, token]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/stats`, { headers });
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, { headers });
      const users = res.data.users || res.data || [];
      setTeamMembers(users.filter(u => u.user_type === 'internal'));
    } catch (err) { console.error(err); }
  };

  // ==================== CALENDAR ====================
  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/events`, { headers });
      setEvents(res.data.events || []);
    } catch (err) { console.error(err); }
  };

  const handleSaveEvent = async () => {
    if (!eventData.title || !eventData.start_date) {
      toast.error('Preencha título e data de início');
      return;
    }
    try {
      if (selectedEvent) {
        await axios.put(`${API_URL}/api/team-hub/events/${selectedEvent.id}`, eventData, { headers });
        toast.success('Evento atualizado');
      } else {
        await axios.post(`${API_URL}/api/team-hub/events`, {
          ...eventData,
          end_date: eventData.end_date || eventData.start_date,
        }, { headers });
        toast.success('Evento criado');
      }
      setShowEventDialog(false);
      setSelectedEvent(null);
      setEventData({ title: '', description: '', start_date: '', end_date: '', location: '', color: '#D4AF37', all_day: false });
      fetchEvents();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Eliminar este evento?')) return;
    try {
      await axios.delete(`${API_URL}/api/team-hub/events/${id}`, { headers });
      toast.success('Evento eliminado');
      fetchEvents();
    } catch (err) { toast.error('Erro ao eliminar'); }
  };

  // ==================== TASKS ====================
  const fetchTasks = async () => {
    try {
      const params = taskFilter !== 'all' ? `?status=${taskFilter}` : '';
      const res = await axios.get(`${API_URL}/api/team-hub/tasks${params}`, { headers });
      setTasks(res.data.tasks || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (activeTab === 'tasks') fetchTasks(); }, [taskFilter]);

  const handleSaveTask = async () => {
    if (!taskData.title) { toast.error('Preencha o título'); return; }
    try {
      if (selectedTask) {
        await axios.put(`${API_URL}/api/team-hub/tasks/${selectedTask.id}`, taskData, { headers });
        toast.success('Tarefa atualizada');
      } else {
        await axios.post(`${API_URL}/api/team-hub/tasks`, taskData, { headers });
        toast.success('Tarefa criada');
      }
      setShowTaskDialog(false);
      setSelectedTask(null);
      setTaskData({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', tags: [] });
      fetchTasks();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    try {
      await axios.put(`${API_URL}/api/team-hub/tasks/${task.id}`, { status: nextStatus }, { headers });
      fetchTasks();
    } catch (err) { toast.error('Erro ao atualizar'); }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Eliminar esta tarefa?')) return;
    try {
      await axios.delete(`${API_URL}/api/team-hub/tasks/${id}`, { headers });
      toast.success('Tarefa eliminada');
      fetchTasks();
    } catch (err) { toast.error('Erro ao eliminar'); }
  };

  // ==================== CALENDAR HELPERS ====================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.start_date?.startsWith(dateStr));
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const tabs = [
    { key: 'email', label: 'Email', icon: Mail, count: stats.total_emails },
    { key: 'calendar', label: 'Calendário', icon: Calendar, count: stats.upcoming_events },
    { key: 'tasks', label: 'Tarefas', icon: CheckSquare, count: stats.pending_tasks },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Mail className="text-gold-400" />
            Team Hub
          </h1>
          <p className="text-gray-400 mt-1">Email, Calendário e Tarefas da equipa</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Emails Hoje</p>
            <p className="text-2xl font-mono text-gold-400">{stats.emails_today || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Emails</p>
            <p className="text-2xl font-mono text-white">{stats.total_emails || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Tarefas Pendentes</p>
            <p className="text-2xl font-mono text-orange-400">{stats.pending_tasks || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Eventos Futuros</p>
            <p className="text-2xl font-mono text-blue-400">{stats.upcoming_events || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-zinc-800 text-gold-400 border-b-2 border-gold-400'
                : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count > 0 && (
              <Badge className="bg-zinc-700 text-gray-300 text-xs ml-1">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ==================== EMAIL TAB ==================== */}
      {activeTab === 'email' && (
        <EmailClient />
      )}

      {/* ==================== CALENDAR TAB ==================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                <ChevronLeft size={18} />
              </Button>
              <h2 className="text-xl text-white font-medium min-w-[200px] text-center">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <Button variant="ghost" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                <ChevronRight size={18} />
              </Button>
            </div>
            <Button onClick={() => { setSelectedEvent(null); setEventData({ title: '', description: '', start_date: '', end_date: '', location: '', color: '#D4AF37', all_day: false }); setShowEventDialog(true); }} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="create-event-btn">
              <Plus size={16} className="mr-2" /> Novo Evento
            </Button>
          </div>

          <Card className="bg-zinc-900/50 border-gold-500/20">
            <CardContent className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="text-center text-gray-500 text-xs font-medium py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                  return (
                    <div
                      key={idx}
                      className={`min-h-[80px] p-1 rounded-lg border transition-colors ${
                        day ? (isToday ? 'border-gold-500/50 bg-gold-500/5' : 'border-zinc-800 hover:border-zinc-600') : 'border-transparent'
                      }`}
                      onClick={() => {
                        if (!day) return;
                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00`;
                        setSelectedEvent(null);
                        setEventData({ title: '', description: '', start_date: dateStr, end_date: dateStr.replace('09:00', '10:00'), location: '', color: '#D4AF37', all_day: false });
                        setShowEventDialog(true);
                      }}
                    >
                      {day && (
                        <>
                          <span className={`text-xs ${isToday ? 'text-gold-400 font-bold' : 'text-gray-400'}`}>{day}</span>
                          <div className="space-y-0.5 mt-0.5">
                            {dayEvents.slice(0, 2).map(ev => (
                              <div
                                key={ev.id}
                                className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer"
                                style={{ backgroundColor: ev.color + '30', color: ev.color }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                  setEventData({ title: ev.title, description: ev.description || '', start_date: ev.start_date, end_date: ev.end_date, location: ev.location || '', color: ev.color || '#D4AF37', all_day: ev.all_day });
                                  setShowEventDialog(true);
                                }}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && <span className="text-[10px] text-gray-500">+{dayEvents.length - 2}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming events list */}
          <Card className="bg-zinc-900/50 border-gold-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Clock size={18} className="text-gold-400" /> Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.filter(e => e.start_date >= new Date().toISOString()).length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">Sem eventos futuros</p>
              ) : (
                <div className="space-y-2">
                  {events.filter(e => e.start_date >= new Date().toISOString()).slice(0, 5).map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ev.color }} />
                        <div>
                          <p className="text-white text-sm font-medium">{ev.title}</p>
                          <p className="text-gray-500 text-xs">{formatDate(ev.start_date)} {ev.location && `- ${ev.location}`}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8 p-0" onClick={() => { setSelectedEvent(ev); setEventData({ title: ev.title, description: ev.description || '', start_date: ev.start_date, end_date: ev.end_date, location: ev.location || '', color: ev.color || '#D4AF37', all_day: ev.all_day }); setShowEventDialog(true); }}>
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => handleDeleteEvent(ev.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TASKS TAB ==================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all" className="text-white hover:bg-zinc-700">Todas</SelectItem>
                <SelectItem value="todo" className="text-white hover:bg-zinc-700">A Fazer</SelectItem>
                <SelectItem value="in_progress" className="text-white hover:bg-zinc-700">Em Progresso</SelectItem>
                <SelectItem value="done" className="text-white hover:bg-zinc-700">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button onClick={() => { setSelectedTask(null); setTaskData({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', tags: [] }); setShowTaskDialog(true); }} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="create-task-btn">
              <Plus size={16} className="mr-2" /> Nova Tarefa
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card className="bg-zinc-900/50 border-gold-500/20">
              <CardContent className="py-12 text-center text-gray-500">
                <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nenhuma tarefa encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const prioConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                const PrioIcon = prioConfig.icon;
                return (
                  <Card key={task.id} className="bg-zinc-900/50 border-gold-500/10 hover:border-gold-500/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            task.status === 'done' ? 'bg-green-600 border-green-600' : 'border-gray-600 hover:border-gold-400'
                          }`}
                          data-testid={`toggle-task-${task.id}`}
                        >
                          {task.status === 'done' && <CheckSquare size={14} className="text-white" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
                              {task.title}
                            </p>
                            <Badge className={prioConfig.color + ' text-xs'}>
                              <PrioIcon size={10} className="mr-1" />{prioConfig.label}
                            </Badge>
                            <Badge className={statusConfig.color + ' text-xs'}>{statusConfig.label}</Badge>
                          </div>
                          {task.description && <p className="text-gray-500 text-xs mt-1 truncate">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {task.assigned_to_name && (
                              <span className="text-gray-500 text-xs flex items-center gap-1"><User size={10} />{task.assigned_to_name}</span>
                            )}
                            {task.due_date && (
                              <span className="text-gray-500 text-xs flex items-center gap-1"><Clock size={10} />{new Date(task.due_date).toLocaleDateString('pt-PT')}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8 p-0" onClick={() => { setSelectedTask(task); setTaskData({ title: task.title, description: task.description || '', priority: task.priority, assigned_to: task.assigned_to || '', due_date: task.due_date || '', tags: task.tags || [] }); setShowTaskDialog(true); }}>
                            <Edit size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== EVENT DIALOG ==================== */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calendar className="text-gold-400" /> {selectedEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Título *</Label>
              <Input value={eventData.title} onChange={e => setEventData({...eventData, title: e.target.value})} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Início *</Label>
                <Input type="datetime-local" value={eventData.start_date} onChange={e => setEventData({...eventData, start_date: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Fim</Label>
                <Input type="datetime-local" value={eventData.end_date} onChange={e => setEventData({...eventData, end_date: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Local</Label>
              <Input value={eventData.location} onChange={e => setEventData({...eventData, location: e.target.value})} placeholder="Sala, Zoom, etc." className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Descrição</Label>
              <Textarea value={eventData.description} onChange={e => setEventData({...eventData, description: e.target.value})} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Cor</Label>
              <div className="flex gap-2">
                {['#D4AF37', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f97316'].map(c => (
                  <button key={c} onClick={() => setEventData({...eventData, color: c})} className={`w-8 h-8 rounded-full border-2 ${eventData.color === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {selectedEvent && (
              <Button variant="outline" className="border-red-600 text-red-400 mr-auto" onClick={() => { handleDeleteEvent(selectedEvent.id); setShowEventDialog(false); }}>
                <Trash2 size={16} className="mr-2" />Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowEventDialog(false)} className="border-gray-600">Cancelar</Button>
            <Button onClick={handleSaveEvent} className="bg-gold-500 hover:bg-gold-400 text-black">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== TASK DIALOG ==================== */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckSquare className="text-gold-400" /> {selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Título *</Label>
              <Input value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Descrição</Label>
              <Textarea value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Prioridade</Label>
                <Select value={taskData.priority} onValueChange={v => setTaskData({...taskData, priority: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="low" className="text-white hover:bg-zinc-700">Baixa</SelectItem>
                    <SelectItem value="medium" className="text-white hover:bg-zinc-700">Média</SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-zinc-700">Alta</SelectItem>
                    <SelectItem value="urgent" className="text-white hover:bg-zinc-700">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Data Limite</Label>
                <Input type="date" value={taskData.due_date} onChange={e => setTaskData({...taskData, due_date: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Atribuir a</Label>
              <Select value={taskData.assigned_to} onValueChange={v => setTaskData({...taskData, assigned_to: v})}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-white hover:bg-zinc-700">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)} className="border-gray-600">Cancelar</Button>
            <Button onClick={handleSaveTask} className="bg-gold-500 hover:bg-gold-400 text-black">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamHub;
