import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import {
  FileSearch, Search, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle,
  Bitcoin, Eye, Shield, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const WALLET_STATUS = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Clock },
  verified: { label: 'Verificado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  flagged: { label: 'Sinalizado', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: AlertTriangle },
  failed: { label: 'Rejeitado', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
};

const KYTForensicPage = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [analysisForm, setAnalysisForm] = useState({ kyt_score: 0, kyt_flags: '', kyt_notes: '', kyt_status: 'pending' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchQueue = useCallback(async () => {
    try {
      const url = filterStatus === 'all' ? `${API}/api/risk-compliance/kyt/queue` : `${API}/api/risk-compliance/kyt/queue?status=${filterStatus}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) setQueue(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const openAnalysis = (wallet) => {
    setSelectedWallet(wallet);
    setAnalysisForm({
      kyt_score: wallet.kyt_score || 0,
      kyt_flags: (wallet.kyt_flags || []).join(', '),
      kyt_notes: wallet.kyt_notes || '',
      kyt_status: wallet.kyt_status || 'pending',
    });
  };

  const saveAnalysis = async () => {
    if (!selectedWallet) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({
        kyt_score: analysisForm.kyt_score,
        kyt_flags: analysisForm.kyt_flags,
        kyt_notes: analysisForm.kyt_notes,
        kyt_status: analysisForm.kyt_status,
      });
      const res = await fetch(
        `${API}/api/risk-compliance/kyt/analyze/${selectedWallet.deal_id}/${selectedWallet.wallet_id}?${params}`,
        { method: 'PUT', headers: getHeaders() }
      );
      if (res.ok) {
        toast.success('Análise KYT guardada');
        setSelectedWallet(null);
        fetchQueue();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao gravar');
      }
    } catch (e) { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  };

  const filtered = queue.filter(w => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return w.address?.toLowerCase().includes(s) || w.client_name?.toLowerCase().includes(s) || w.deal_number?.toLowerCase().includes(s);
    }
    return true;
  });

  const pendingCount = queue.filter(w => w.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2" data-testid="kyt-forensic-title">
            <FileSearch className="text-purple-400" size={24} />
            KYT Forensic
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Fila de verificação de carteiras — Análise forense</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-sm px-3 py-1" data-testid="kyt-pending-count">
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar endereço, cliente, negócio..." className="bg-zinc-900 border-zinc-800 text-white pl-10" data-testid="kyt-search" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white w-36" data-testid="kyt-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-white">Todos</SelectItem>
            <SelectItem value="pending" className="text-yellow-400">Pendentes</SelectItem>
            <SelectItem value="verified" className="text-emerald-400">Verificados</SelectItem>
            <SelectItem value="flagged" className="text-orange-400">Sinalizados</SelectItem>
            <SelectItem value="failed" className="text-red-400">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={fetchQueue} className="text-zinc-400 hover:text-white" data-testid="kyt-refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Queue */}
      <div className="space-y-3" data-testid="kyt-queue">
        {loading ? (
          <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-8 text-center text-zinc-500">A carregar...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-8 text-center text-zinc-500">Sem carteiras na fila</CardContent></Card>
        ) : filtered.map((wallet, i) => {
          const ws = WALLET_STATUS[wallet.status] || WALLET_STATUS.pending;
          const StatusIcon = ws.icon;
          return (
            <Card key={wallet.wallet_id || i} className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${wallet.status === 'pending' ? 'border-l-2 border-l-yellow-500' : ''}`} onClick={() => openAnalysis(wallet)} data-testid={`kyt-wallet-${wallet.wallet_id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Bitcoin className="text-orange-400" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-white text-sm font-mono">{wallet.address?.substring(0, 16)}...{wallet.address?.slice(-8)}</code>
                        <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{wallet.blockchain}</Badge>
                        <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{wallet.wallet_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="text-yellow-400 font-mono">{wallet.deal_number}</span>
                        <span>{wallet.client_name}</span>
                        <span>{wallet.deal_quantity} {wallet.deal_asset}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {wallet.kyt_score > 0 && (
                      <div className="text-right mr-3">
                        <span className={`text-lg font-bold ${wallet.kyt_score <= 3 ? 'text-emerald-400' : wallet.kyt_score <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {wallet.kyt_score}
                        </span>
                        <p className="text-zinc-600 text-[10px]">Score</p>
                      </div>
                    )}
                    {wallet.kyt_analyst && (
                      <div className="text-right mr-3">
                        <p className="text-zinc-400 text-xs">{wallet.kyt_analyst}</p>
                        <p className="text-zinc-600 text-[10px]">Analista</p>
                      </div>
                    )}
                    <Badge className={`${ws.color} text-xs border`}>
                      <StatusIcon size={12} className="mr-1" />{ws.label}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300" onClick={e => { e.stopPropagation(); navigate(`/dashboard/crm/compliance/${wallet.deal_id}`); }} data-testid={`kyt-goto-deal-${wallet.wallet_id}`}>
                      <Eye size={14} />
                    </Button>
                  </div>
                </div>

                {wallet.kyt_notes && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-zinc-400 text-xs">{wallet.kyt_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analysis Modal */}
      <Dialog open={!!selectedWallet} onOpenChange={() => setSelectedWallet(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="text-purple-400" size={20} />
              Análise Forense KYT
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {selectedWallet?.client_name} — {selectedWallet?.deal_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Wallet Info */}
            <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <Bitcoin className="text-orange-400" size={16} />
                <code className="text-white text-sm font-mono">{selectedWallet?.address}</code>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{selectedWallet?.blockchain}</Badge>
                <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{selectedWallet?.wallet_type}</Badge>
              </div>
            </div>

            {/* Score */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Score de Risco (0-10)</Label>
              <div className="flex items-center gap-4">
                <Input type="number" value={analysisForm.kyt_score} onChange={e => { const v = parseInt(e.target.value); if (e.target.value === '') { setAnalysisForm(f => ({ ...f, kyt_score: 0 })); return; } if (!isNaN(v) && v >= 0 && v <= 10) setAnalysisForm(f => ({ ...f, kyt_score: v })); }} onBlur={e => { const v = Math.min(10, Math.max(0, parseInt(e.target.value) || 0)); setAnalysisForm(f => ({ ...f, kyt_score: v })); }} className="bg-zinc-900 border-zinc-800 text-white w-24" min={0} max={10} step={1} data-testid="kyt-modal-score" />
                <div className="flex-1 bg-zinc-900 rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${analysisForm.kyt_score <= 3 ? 'bg-emerald-500' : analysisForm.kyt_score <= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(analysisForm.kyt_score / 10) * 100}%` }} />
                </div>
                <span className={`text-sm font-bold ${analysisForm.kyt_score <= 3 ? 'text-emerald-400' : analysisForm.kyt_score <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {analysisForm.kyt_score <= 3 ? 'Baixo' : analysisForm.kyt_score <= 6 ? 'Médio' : 'Alto'}
                </span>
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Flags (separadas por vírgula)</Label>
              <Input value={analysisForm.kyt_flags} onChange={e => setAnalysisForm(f => ({ ...f, kyt_flags: e.target.value }))} placeholder="Ex: Mixing, Darknet, Sanções, Exchange não-KYC..." className="bg-zinc-900 border-zinc-800 text-white" data-testid="kyt-modal-flags" />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Notas do Analista</Label>
              <textarea value={analysisForm.kyt_notes} onChange={e => setAnalysisForm(f => ({ ...f, kyt_notes: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white text-sm resize-none h-24 focus:border-purple-500/50 focus:outline-none" placeholder="Resultado da análise forense..." data-testid="kyt-modal-notes" />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Resultado</Label>
              <Select value={analysisForm.kyt_status} onValueChange={v => setAnalysisForm(f => ({ ...f, kyt_status: v }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="kyt-modal-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="pending" className="text-yellow-400">Pendente</SelectItem>
                  <SelectItem value="clean" className="text-emerald-400">Limpo</SelectItem>
                  <SelectItem value="flagged" className="text-orange-400">Sinalizado</SelectItem>
                  <SelectItem value="rejected" className="text-red-400">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={saveAnalysis} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-5" data-testid="kyt-modal-save">
              {saving ? 'A gravar...' : 'Guardar Análise'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KYTForensicPage;
