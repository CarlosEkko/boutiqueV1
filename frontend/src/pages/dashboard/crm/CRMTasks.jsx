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
  CheckSquare,
  Calendar,
  Clock,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  User,
  Handshake,
  Target,
  Phone,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';
import { useLanguage } from '../../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TASK_TYPES = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'call', label: 'Chamada' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'other', label: 'Outro' }
];

const CRMTasks = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState({ search: '', status: '', priority: '', overdue_only: false });
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    lead_id: '',
    supplier_id: '',
    client_id: '',
    deal_id: '',
    contact_id: '',
    priority: 'medium',
    status: 'pending',
    task_type: 'follow_up',
    due_date: '',
    reminder_date: '',
    assigned_to: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    fetchTasks();
    fetchPriorities();
    fetchStatuses();
    fetchSuppliers();
    fetchLeads();
    fetchDeals();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      if (filter.overdue_only) params.append('overdue_only', 'true');
      
      const response = await axios.get(`${API_URL}/api/crm/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriorities = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/enums/task-priorities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPriorities(response.data);
    } catch (err) {
      console.error('Error fetching priorities:', err);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/enums/task-statuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatuses(response.data);
    } catch (err) {
      console.error('Error fetching statuses:', err);
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

  const fetchDeals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/deals?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(response.data);
    } catch (err) {
      console.error('Error fetching deals:', err);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      lead_id: '',
      supplier_id: '',
      client_id: '',
      deal_id: '',
      contact_id: '',
      priority: 'medium',
      status: 'pending',
      task_type: 'follow_up',
      due_date: '',
      reminder_date: '',
      assigned_to: '',
      notes: '',
      tags: []
    });
    setEditingTask(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setForm({
      ...task,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      reminder_date: task.reminder_date ? task.reminder_date.split('T')[0] : '',
      tags: task.tags || []
    });
    setEditingTask(task.id);
    setShowModal(true);
  };

  const saveTask = async () => {
    try {
      const data = {
        ...form,
        due_date: form.due_date || null,
        reminder_date: form.reminder_date || null,
        lead_id: form.lead_id || null,
        supplier_id: form.supplier_id || null,
        deal_id: form.deal_id || null
      };

      if (editingTask) {
        await axios.put(`${API_URL}/api/crm/tasks/${editingTask}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tarefa atualizada!');
      } else {
        await axios.post(`${API_URL}/api/crm/tasks`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tarefa criada!');
      }
      
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar tarefa');
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Tem certeza que deseja eliminar esta tarefa?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/crm/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tarefa eliminada!');
      fetchTasks();
    } catch (err) {
      toast.error('Erro ao eliminar tarefa');
    }
  };

  const completeTask = async (task) => {
    try {
      await axios.put(`${API_URL}/api/crm/tasks/${task.id}`, {
        ...task,
        status: 'completed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tarefa concluída!');
      fetchTasks();
    } catch (err) {
      toast.error('Erro ao concluir tarefa');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-500/20 text-gray-400 border-gray-600',
      medium: 'bg-blue-500/20 text-blue-400 border-blue-600',
      high: 'bg-orange-500/20 text-orange-400 border-orange-600',
      urgent: 'bg-red-500/20 text-red-400 border-red-600'
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-400 border-gray-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      in_progress: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Progresso',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  };

  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'call': return <Phone size={14} />;
      case 'email': return <Mail size={14} />;
      case 'meeting': return <User size={14} />;
      default: return <CheckSquare size={14} />;
    }
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tarefas</h1>
          <p className="text-gray-400">Follow-ups, chamadas, reuniões e outras tarefas</p>
        </div>
        <Button onClick={openNewModal} className="bg-gold-500 hover:bg-gold-400 text-black">
          <Plus size={16} className="mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Todos Status</option>
          {statuses.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filter.priority}
          onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Todas Prioridades</option>
          {priorities.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={filter.overdue_only}
            onChange={(e) => setFilter({ ...filter, overdue_only: e.target.checked })}
            className="w-4 h-4"
          />
          <AlertCircle size={16} className="text-red-400" />
          Apenas Atrasadas
        </label>
        <Button variant="outline" onClick={fetchTasks} className="border-zinc-700">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Tasks Board */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <CheckSquare size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400">Nenhuma tarefa encontrada</p>
            <Button onClick={openNewModal} className="mt-4 bg-gold-500 hover:bg-gold-400 text-black">
              <Plus size={16} className="mr-2" /> Criar Primeira Tarefa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-600/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-yellow-400" />
                <span className="text-white font-medium">Pendentes</span>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-0">{pendingTasks.length}</Badge>
            </div>
            {pendingTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onEdit={openEditModal} 
                onDelete={deleteTask}
                onComplete={completeTask}
                getPriorityColor={getPriorityColor}
                getTaskTypeIcon={getTaskTypeIcon}
              />
            ))}
          </div>

          {/* In Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-600/30 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-blue-400" />
                <span className="text-white font-medium">Em Progresso</span>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-0">{inProgressTasks.length}</Badge>
            </div>
            {inProgressTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onEdit={openEditModal} 
                onDelete={deleteTask}
                onComplete={completeTask}
                getPriorityColor={getPriorityColor}
                getTaskTypeIcon={getTaskTypeIcon}
              />
            ))}
          </div>

          {/* Completed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-600/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                <span className="text-white font-medium">Concluídas</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-0">{completedTasks.length}</Badge>
            </div>
            {completedTasks.slice(0, 10).map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onEdit={openEditModal} 
                onDelete={deleteTask}
                onComplete={completeTask}
                getPriorityColor={getPriorityColor}
                getTaskTypeIcon={getTaskTypeIcon}
                isCompleted
              />
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? t('tier23Modals.crmTask.edit') : t('tier23Modals.crmTask.new')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Título *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="O que precisa ser feito?"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes da tarefa..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={2}
              />
            </div>

            {/* Type, Priority, Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Tipo</label>
                <select
                  value={form.task_type}
                  onChange={(e) => setForm({ ...form, task_type: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {TASK_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Prioridade</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Data Limite</label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Lembrete</label>
                <Input
                  type="date"
                  value={form.reminder_date}
                  onChange={(e) => setForm({ ...form, reminder_date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Related Entities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Negociação</label>
                <select
                  value={form.deal_id}
                  onChange={(e) => setForm({ ...form, deal_id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionais..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={saveTask} className="bg-emerald-500 hover:bg-emerald-600">
              <Save size={16} className="mr-2" />
              {editingTask ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task, onEdit, onDelete, onComplete, getPriorityColor, getTaskTypeIcon, isCompleted }) => {
  return (
    <Card className={`bg-zinc-900/50 border-zinc-800 ${task.is_overdue ? 'border-red-600/50' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${getPriorityColor(task.priority)}`}>
              {getTaskTypeIcon(task.task_type)}
            </div>
            <h4 className={`text-white font-medium text-sm ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </h4>
          </div>
          {!isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComplete(task)}
              className="text-green-400 h-6 w-6 p-0"
              title="Marcar como concluída"
            >
              <CheckCircle size={14} />
            </Button>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1 text-xs mb-2 ${task.is_overdue ? 'text-red-400' : 'text-gray-400'}`}>
            {task.is_overdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
            {formatDate(task.due_date)}
            {task.is_overdue && <span className="ml-1">(Atrasada)</span>}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
          <Badge className={`border-0 text-xs ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="text-gold-400 h-6 w-6 p-0"
            >
              <Edit size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="text-red-400 h-6 w-6 p-0"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CRMTasks;
