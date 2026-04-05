import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Calendar, Clock, Video, Trash2, User, Mail, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDate } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ScheduleMeetingDialog = ({ open, onClose, lead, leadType }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [form, setForm] = useState({
    subject: '',
    date: '',
    time: '10:00',
    duration: 30,
    notes: '',
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (open && lead) {
      const name = leadType === 'otc'
        ? (lead.contact_name || lead.entity_name || '')
        : (lead.name || '');
      setForm(f => ({
        ...f,
        subject: `Reunião KBEX — ${name}`,
      }));
      fetchMeetings();
    }
  }, [open, lead]);

  const fetchMeetings = async () => {
    if (!lead) return;
    const id = leadType === 'otc' ? lead.id : lead.id;
    try {
      const res = await axios.get(`${API_URL}/api/o365/meetings?lead_id=${id}&lead_type=${leadType}`, { headers });
      setMeetings(res.data.meetings || []);
    } catch { /* silent */ }
  };

  const handleSchedule = async () => {
    if (!form.date || !form.time) {
      toast.error('Selecione data e hora');
      return;
    }

    const email = leadType === 'otc' ? lead.contact_email : lead.email;
    const name = leadType === 'otc' ? (lead.contact_name || lead.entity_name) : lead.name;

    if (!email) {
      toast.error('Lead sem email para enviar convite');
      return;
    }

    setLoading(true);
    try {
      const startTime = `${form.date}T${form.time}:00`;
      const res = await axios.post(`${API_URL}/api/o365/meetings/schedule`, {
        subject: form.subject,
        start_time: startTime,
        duration_minutes: form.duration,
        attendee_email: email,
        attendee_name: name || '',
        notes: form.notes,
        lead_id: lead.id,
        lead_type: leadType,
      }, { headers });

      if (res.data.teams_link) {
        toast.success('Reunião agendada com link Teams!');
      } else {
        toast.success('Reunião agendada!');
      }
      setForm(f => ({ ...f, date: '', time: '10:00', duration: 30, notes: '' }));
      fetchMeetings();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao agendar reunião';
      if (msg.includes('O365 não conectada') || msg.includes('Conta O365')) {
        toast.error('Conecte a sua conta Office 365 no Team Hub primeiro');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelMeeting = async (meetingId) => {
    if (!window.confirm('Cancelar esta reunião?')) return;
    try {
      await axios.delete(`${API_URL}/api/o365/meetings/${meetingId}`, { headers });
      toast.success('Reunião cancelada');
      fetchMeetings();
    } catch {
      toast.error('Erro ao cancelar reunião');
    }
  };

  const leadName = leadType === 'otc'
    ? (lead?.contact_name || lead?.entity_name || '')
    : (lead?.name || '');
  const leadEmail = leadType === 'otc' ? lead?.contact_email : lead?.email;

  const activeMeetings = meetings.filter(m => m.status === 'scheduled');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto" data-testid="schedule-meeting-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-light text-white flex items-center gap-2">
            <Video className="text-blue-400" size={20} />
            Agendar Reunião
          </DialogTitle>
        </DialogHeader>

        {/* Lead info */}
        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
            {leadName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{leadName}</p>
            <p className="text-gray-400 text-xs flex items-center gap-1"><Mail size={10} /> {leadEmail || 'Sem email'}</p>
          </div>
          <Badge className="ml-auto bg-zinc-700 text-gray-300 text-[10px]">{leadType === 'otc' ? 'OTC' : 'CRM'}</Badge>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-gray-300 text-xs">Assunto</Label>
            <Input
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white text-sm"
              data-testid="meeting-subject-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs flex items-center gap-1"><Calendar size={12} /> Data *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white text-sm"
                data-testid="meeting-date-input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs flex items-center gap-1"><Clock size={12} /> Hora *</Label>
              <Input
                type="time"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white text-sm"
                data-testid="meeting-time-input"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300 text-xs">Duração</Label>
            <div className="flex gap-2">
              {[15, 30, 45, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setForm({ ...form, duration: d })}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${
                    form.duration === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                  }`}
                  data-testid={`meeting-duration-${d}`}
                >
                  {d}min
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300 text-xs flex items-center gap-1"><FileText size={12} /> Notas</Label>
            <Input
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Agenda da reunião..."
              className="bg-zinc-800 border-zinc-700 text-white text-sm"
              data-testid="meeting-notes-input"
            />
          </div>

          <Button
            onClick={handleSchedule}
            disabled={loading || !form.date}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="schedule-meeting-btn"
          >
            <Video size={16} className="mr-2" />
            {loading ? 'A agendar...' : 'Agendar Reunião Teams'}
          </Button>
        </div>

        {/* Scheduled meetings for this lead */}
        {activeMeetings.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Reuniões Agendadas</p>
            {activeMeetings.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50" data-testid={`meeting-item-${m.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-900/50 flex items-center justify-center">
                    <Video size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm">{m.subject}</p>
                    <p className="text-gray-500 text-xs">
                      {formatDate(m.start_time)} {new Date(m.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} — {m.duration_minutes}min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {m.teams_link && (
                    <a href={m.teams_link} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded" title="Abrir Teams">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button onClick={() => cancelMeeting(m.id)}
                    className="p-1.5 text-red-400 hover:bg-red-900/30 rounded" title="Cancelar" data-testid={`cancel-meeting-${m.id}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingDialog;
