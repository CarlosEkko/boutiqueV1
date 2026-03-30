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
  Mail, Calendar, CheckSquare, Plus, Clock, User, Trash2, Edit,
  ChevronLeft, ChevronRight, ArrowUp, ArrowRight, ArrowDown, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'bg-red-900/40 text-red-400', icon: ArrowUp },
  high: { label: 'Alta', color: 'bg-orange-900/40 text-orange-400', icon: ArrowUp },
  medium: { label: 'Média', color: 'bg-yellow-900/40 text-yellow-400', icon: ArrowRight },
  normal: { label: 'Normal', color: 'bg-yellow-900/40 text-yellow-400', icon: ArrowRight },
  low: { label: 'Baixa', color: 'bg-blue-900/40 text-blue-400', icon: ArrowDown },
};

const STATUS_CONFIG = {
  todo: { label: 'A Fazer', color: 'bg-gray-900/40 text-gray-400' },
  notStarted: { label: 'A Fazer', color: 'bg-gray-900/40 text-gray-400' },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-900/40 text-blue-400' },
  inProgress: { label: 'Em Progresso', color: 'bg-blue-900/40 text-blue-400' },
  done: { label: 'Concluída', color: 'bg-green-900/40 text-green-400' },
  completed: { label: 'Concluída', color: 'bg-green-900/40 text-green-400' },
};

const TeamHub = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('email');
  const [stats, setStats] = useState({});
  const [o365Connected, setO365Connected] = useState(false);

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
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'normal', due_date: '' });
  const [taskLists, setTaskLists] = useState([]);
  const [activeTaskList, setActiveTaskList] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStats();
    checkO365();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'calendar') fetchEvents();
    if (activeTab === 'tasks') fetchTaskLists();
  }, [activeTab, token, o365Connected]);

  const checkO365 = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/o365/auth/status`, { headers });
      setO365Connected(res.data.connected);
    } catch { setO365Connected(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/team-hub/stats`, { headers });
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  // ==================== CALENDAR (O365) ====================
  const fetchEvents = async () => {
    if (!o365Connected) return;
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res = await axios.get(`${API_URL}/api/o365/calendar/events?start=${start}&end=${end}`, { headers });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to fetch O365 events:', err);
      toast.error('Erro ao carregar calendário');
    }
  };

  useEffect(() => {
    if (activeTab === 'calendar' && o365Connected) fetchEvents();
  }, [currentMonth]);

  const handleSaveEvent = async () => {
    if (!eventData.title || !eventData.start_date) {
      toast.error('Preencha título e data de início');
      return;
    }
    try {
      if (selectedEvent) {
        await axios.patch(`${API_URL}/api/o365/calendar/events/${selectedEvent.id}`, {
          subject: eventData.title,
          start_time: new Date(eventData.start_date).toISOString(),
          end_time: new Date(eventData.end_date || eventData.start_date).toISOString(),
          location: eventData.location,
          body: eventData.description,
        }, { headers });
        toast.success('Evento atualizado no Outlook');
      } else {
        await axios.post(`${API_URL}/api/o365/calendar/events`, {
          subject: eventData.title,
          start_time: new Date(eventData.start_date).toISOString(),
          end_time: new Date(eventData.end_date || eventData.start_date).toISOString(),
          location: eventData.location,
          body: eventData.description,
          is_all_day: eventData.all_day,
        }, { headers });
        toast.success('Evento criado no Outlook');
      }
      setShowEventDialog(false);
      setSelectedEvent(null);
      setEventData({ title: '', description: '', start_date: '', end_date: '', location: '', color: '#D4AF37', all_day: false });
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar evento');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Eliminar este evento do Outlook?')) return;
    try {
      await axios.delete(`${API_URL}/api/o365/calendar/events/${id}`, { headers });
      toast.success('Evento eliminado');
      fetchEvents();
    } catch (err) { toast.error('Erro ao eliminar'); }
  };

  // ==================== TASKS (O365 To Do) ====================
  const fetchTaskLists = async () => {
    if (!o365Connected) return;
    try {
      const res = await axios.get(`${API_URL}/api/o365/tasks/lists`, { headers });
      const lists = res.data.lists || [];
      setTaskLists(lists);
      if (lists.length > 0 && !activeTaskList) {
        const defaultList = lists.find(l => l.is_default) || lists[0];
        setActiveTaskList(defaultList);
        fetchTasks(defaultList.id);
      }
    } catch (err) {
      console.error('Failed to fetch task lists:', err);
    }
  };

  const fetchTasks = async (listId) => {
    if (!listId) return;
    try {
      const statusParam = taskFilter !== 'all' ? `?status=${taskFilter}` : '';
      const res = await axios.get(`${API_URL}/api/o365/tasks/lists/${listId}/tasks${statusParam}`, { headers });
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'tasks' && activeTaskList) fetchTasks(activeTaskList.id);
  }, [taskFilter, activeTaskList]);

  const handleSaveTask = async () => {
    if (!taskData.title) { toast.error('Preencha o título'); return; }
    const listId = activeTaskList?.id;
    if (!listId) { toast.error('Selecione uma lista de tarefas'); return; }
    try {
      if (selectedTask) {
        await axios.patch(`${API_URL}/api/o365/tasks/lists/${listId}/tasks/${selectedTask.id}`, {
          title: taskData.title,
          body: taskData.description,
          importance: taskData.priority,
          due_date: taskData.due_date ? new Date(taskData.due_date).toISOString() : null,
        }, { headers });
        toast.success('Tarefa atualizada no To Do');
      } else {
        await axios.post(`${API_URL}/api/o365/tasks/lists/${listId}/tasks`, {
          title: taskData.title,
          body: taskData.description,
          importance: taskData.priority,
          due_date: taskData.due_date ? new Date(taskData.due_date).toISOString() : null,
        }, { headers });
        toast.success('Tarefa criada no To Do');
      }
      setShowTaskDialog(false);
      setSelectedTask(null);
      setTaskData({ title: '', description: '', priority: 'normal', due_date: '' });
      fetchTasks(listId);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const listId = activeTaskList?.id;
    if (!listId) return;
    const next = task.status === 'completed' ? 'notStarted' : 'completed';
    try {
      await axios.patch(`${API_URL}/api/o365/tasks/lists/${listId}/tasks/${task.id}`, { status: next }, { headers });
      fetchTasks(listId);
    } catch (err) { toast.error('Erro ao atualizar'); }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Eliminar esta tarefa do To Do?')) return;
    const listId = activeTaskList?.id;
    if (!listId) return;
    try {
      await axios.delete(`${API_URL}/api/o365/tasks/lists/${listId}/tasks/${id}`, { headers });
      toast.success('Tarefa eliminada');
      fetchTasks(listId);
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
    return events.filter(e => (e.start_date || '').startsWith(dateStr));
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const tabs = [
    { key: 'email', label: 'Email', icon: Mail, count: stats.total_emails },
    { key: 'calendar', label: 'Calendário', icon: Calendar, count: stats.upcoming_events },
    { key: 'tasks', label: 'Tarefas', icon: CheckSquare, count: stats.pending_tasks },
  ];

  return (
    <div className="space-y-4">
      {/* Header + Tabs in one compact row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-light text-white flex items-center gap-2">
            <Mail size={22} className="text-gold-400" />
            Team Hub
          </h1>
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-gold-500/15 text-gold-400'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.count > 0 && (
                  <Badge className="bg-zinc-700 text-gray-300 text-[10px] ml-0.5 px-1.5 py-0">{tab.count}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
        {o365Connected && (
          <Badge className="bg-blue-900/30 text-blue-400 text-xs">Microsoft 365 Conectado</Badge>
        )}
      </div>

      {/* ==================== EMAIL TAB ==================== */}
      {activeTab === 'email' && <EmailClient />}

      {/* ==================== CALENDAR TAB ==================== */}
      {activeTab === 'calendar' && (
        !o365Connected ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-16 text-center">
              <Calendar size={40} className="mx-auto mb-4 text-blue-400 opacity-50" />
              <p className="text-white text-lg mb-2">Calendário Outlook</p>
              <p className="text-gray-400 text-sm mb-4">Conecte o Office 365 no separador Email para ver o calendário do Outlook.</p>
            </CardContent>
          </Card>
        ) : (
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
              <div className="flex gap-2">
                <Button onClick={fetchEvents} variant="outline" size="sm" className="border-zinc-700 text-gray-400">
                  <RefreshCw size={14} className="mr-2" /> Sincronizar
                </Button>
                <Button onClick={() => { setSelectedEvent(null); setEventData({ title: '', description: '', start_date: '', end_date: '', location: '', color: '#D4AF37', all_day: false }); setShowEventDialog(true); }} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="create-event-btn">
                  <Plus size={16} className="mr-2" /> Novo Evento
                </Button>
              </div>
            </div>

            <Card className="bg-zinc-900/50 border-gold-500/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="text-center text-gray-500 text-xs font-medium py-1">{d}</div>
                  ))}
                </div>
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
                                  className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer bg-blue-500/20 text-blue-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                    setEventData({
                                      title: ev.title, description: ev.body || '',
                                      start_date: ev.start_date ? ev.start_date.slice(0, 16) : '',
                                      end_date: ev.end_date ? ev.end_date.slice(0, 16) : '',
                                      location: ev.location || '', color: '#D4AF37', all_day: ev.all_day,
                                    });
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

            {/* Upcoming events */}
            <Card className="bg-zinc-900/50 border-gold-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Clock size={18} className="text-gold-400" /> Eventos do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">Sem eventos este mês</p>
                ) : (
                  <div className="space-y-2">
                    {events.slice(0, 10).map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <div>
                            <p className="text-white text-sm font-medium">{ev.title}</p>
                            <p className="text-gray-500 text-xs">{formatDate(ev.start_date)} {ev.location && `- ${ev.location}`}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8 p-0" onClick={() => {
                            setSelectedEvent(ev);
                            setEventData({
                              title: ev.title, description: ev.body || '',
                              start_date: ev.start_date ? ev.start_date.slice(0, 16) : '',
                              end_date: ev.end_date ? ev.end_date.slice(0, 16) : '',
                              location: ev.location || '', color: '#D4AF37', all_day: ev.all_day,
                            });
                            setShowEventDialog(true);
                          }}>
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
        )
      )}

      {/* ==================== TASKS TAB ==================== */}
      {activeTab === 'tasks' && (
        !o365Connected ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-16 text-center">
              <CheckSquare size={40} className="mx-auto mb-4 text-blue-400 opacity-50" />
              <p className="text-white text-lg mb-2">Tarefas Microsoft To Do</p>
              <p className="text-gray-400 text-sm mb-4">Conecte o Office 365 no separador Email para ver as tarefas do Microsoft To Do.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              {/* Task list selector */}
              {taskLists.length > 1 && (
                <Select value={activeTaskList?.id || ''} onValueChange={v => {
                  const list = taskLists.find(l => l.id === v);
                  setActiveTaskList(list);
                }}>
                  <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue placeholder="Lista" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30">
                    {taskLists.map(l => (
                      <SelectItem key={l.id} value={l.id} className="text-white hover:bg-zinc-700">{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-gold-500/30">
                  <SelectItem value="all" className="text-white hover:bg-zinc-700">Todas</SelectItem>
                  <SelectItem value="notStarted" className="text-white hover:bg-zinc-700">A Fazer</SelectItem>
                  <SelectItem value="completed" className="text-white hover:bg-zinc-700">Concluídas</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button onClick={() => activeTaskList && fetchTasks(activeTaskList.id)} variant="outline" size="sm" className="border-zinc-700 text-gray-400">
                <RefreshCw size={14} className="mr-2" /> Sincronizar
              </Button>
              <Button onClick={() => { setSelectedTask(null); setTaskData({ title: '', description: '', priority: 'normal', due_date: '' }); setShowTaskDialog(true); }} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="create-task-btn">
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
                  const prioConfig = PRIORITY_CONFIG[task.importance] || PRIORITY_CONFIG.normal;
                  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.notStarted;
                  const PrioIcon = prioConfig.icon;
                  return (
                    <Card key={task.id} className="bg-zinc-900/50 border-gold-500/10 hover:border-gold-500/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              task.status === 'completed' ? 'bg-green-600 border-green-600' : 'border-gray-600 hover:border-gold-400'
                            }`}
                            data-testid={`toggle-task-${task.id}`}
                          >
                            {task.status === 'completed' && <CheckSquare size={14} className="text-white" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                {task.title}
                              </p>
                              <Badge className={prioConfig.color + ' text-xs'}>
                                <PrioIcon size={10} className="mr-1" />{prioConfig.label}
                              </Badge>
                              <Badge className={statusConfig.color + ' text-xs'}>{statusConfig.label}</Badge>
                            </div>
                            {task.body && <p className="text-gray-500 text-xs mt-1 truncate">{task.body}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              {task.due_date && (
                                <span className="text-gray-500 text-xs flex items-center gap-1"><Clock size={10} />{new Date(task.due_date).toLocaleDateString('pt-PT')}</span>
                              )}
                              {task.categories?.length > 0 && task.categories.map(c => (
                                <span key={c} className="text-[10px] bg-zinc-700 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8 p-0" onClick={() => {
                              setSelectedTask(task);
                              setTaskData({
                                title: task.title, description: task.body || '',
                                priority: task.importance || 'normal',
                                due_date: task.due_date ? task.due_date.split('T')[0] : '',
                              });
                              setShowTaskDialog(true);
                            }}>
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
        )
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
                <Label className="text-gray-400">Importância</Label>
                <Select value={taskData.priority} onValueChange={v => setTaskData({...taskData, priority: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="low" className="text-white hover:bg-zinc-700">Baixa</SelectItem>
                    <SelectItem value="normal" className="text-white hover:bg-zinc-700">Normal</SelectItem>
                    <SelectItem value="high" className="text-white hover:bg-zinc-700">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Data Limite</Label>
                <Input type="date" value={taskData.due_date} onChange={e => setTaskData({...taskData, due_date: e.target.value})} className="bg-zinc-800 border-zinc-700" />
              </div>
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
