import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  Mail, Calendar, CheckSquare, Clock, LayoutDashboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeamHubDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [o365Connected, setO365Connected] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStats();
    checkO365();
  }, [token]);

  useEffect(() => {
    if (o365Connected) {
      fetchEvents();
      fetchTasks();
    }
  }, [o365Connected]);

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

  const fetchEvents = async () => {
    try {
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const res = await axios.get(`${API_URL}/api/o365/calendar/events?start=${start}&end=${end}`, { headers });
      setEvents(res.data.events || []);
    } catch (err) { console.error(err); }
  };

  const fetchTasks = async () => {
    try {
      const listsRes = await axios.get(`${API_URL}/api/o365/tasks/lists`, { headers });
      const lists = listsRes.data.lists || [];
      const defaultList = lists.find(l => l.is_default) || lists[0];
      if (defaultList) {
        const res = await axios.get(`${API_URL}/api/o365/tasks/lists/${defaultList.id}/tasks`, { headers });
        setTasks(res.data.tasks || []);
      }
    } catch (err) { console.error(err); }
  };
  return (
    <div className="space-y-6" data-testid="team-hub-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-2">
            <LayoutDashboard size={22} className="text-gold-400" />
            Team Hub — Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do email, calendário e tarefas</p>
        </div>
        {o365Connected && (
          <Badge className="bg-blue-900/30 text-blue-400 text-xs">Microsoft 365 Conectado</Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-500/20 cursor-pointer hover:border-gold-500/40 transition-colors" onClick={() => navigate('/dashboard/team-hub')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Emails Hoje</p>
              <Mail size={18} className="text-gold-400" />
            </div>
            <p className="text-3xl font-mono text-gold-400">{stats.emails_today || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20 cursor-pointer hover:border-gold-500/40 transition-colors" onClick={() => navigate('/dashboard/team-hub')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Total Emails</p>
              <Mail size={18} className="text-gray-500" />
            </div>
            <p className="text-3xl font-mono text-white">{stats.total_emails || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20 cursor-pointer hover:border-gold-500/40 transition-colors" onClick={() => navigate('/dashboard/team-hub')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Tarefas Pendentes</p>
              <CheckSquare size={18} className="text-orange-400" />
            </div>
            <p className="text-3xl font-mono text-orange-400">{stats.pending_tasks || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20 cursor-pointer hover:border-gold-500/40 transition-colors" onClick={() => navigate('/dashboard/team-hub')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Eventos Futuros</p>
              <Calendar size={18} className="text-blue-400" />
            </div>
            <p className="text-3xl font-mono text-blue-400">{stats.upcoming_events || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick access sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Calendar size={16} className="text-gold-400" />Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!o365Connected ? (
              <p className="text-gray-500 text-sm py-3 text-center">Conecte o Office 365 para ver eventos</p>
            ) : events.length === 0 ? (
              <p className="text-gray-500 text-sm py-3 text-center">Sem eventos próximos</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 p-2.5 bg-zinc-800/50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{ev.title}</p>
                      <p className="text-gray-500 text-xs flex items-center gap-1">
                        <Clock size={10} />{formatDate(ev.start_date)}
                        {ev.location && <span className="ml-2">— {ev.location}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <CheckSquare size={16} className="text-gold-400" />Tarefas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!o365Connected ? (
              <p className="text-gray-500 text-sm py-3 text-center">Conecte o Office 365 para ver tarefas</p>
            ) : tasks.filter(t => t.status !== 'completed').length === 0 ? (
              <p className="text-gray-500 text-sm py-3 text-center">Sem tarefas pendentes</p>
            ) : (
              <div className="space-y-2">
                {tasks.filter(t => t.status !== 'completed').slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 bg-zinc-800/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.importance === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{t.title}</p>
                      {t.due_date && (
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock size={10} />{formatDate(t.due_date)}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-[10px] ${t.importance === 'high' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                      {t.importance === 'high' ? 'Alta' : 'Normal'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamHubDashboard;
