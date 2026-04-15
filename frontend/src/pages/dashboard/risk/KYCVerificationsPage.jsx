import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import {
  Shield, User, Building2, Search, RefreshCw, CheckCircle, XCircle,
  Clock, ExternalLink, Eye, FileText, AlertTriangle, ChevronDown, ChevronUp,
  Globe, Mail, Phone, Award
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  init: { label: 'Iniciado', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', icon: Clock },
  created: { label: 'Criado', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: FileText },
  pending: { label: 'Em Verificação', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: XCircle },
};

const TABS = [
  { key: 'pending', label: 'Em Verificação' },
  { key: 'init', label: 'Iniciados' },
  { key: 'approved', label: 'Aprovados' },
  { key: 'rejected', label: 'Rejeitados' },
  { key: 'all', label: 'Todos' },
];

const TYPE_TABS = [
  { key: 'all', label: 'Todos', icon: Shield },
  { key: 'kyc', label: 'KYC', icon: User },
  { key: 'kyb', label: 'KYB', icon: Building2 },
];

const KYCVerificationsPage = () => {
  const [verifications, setVerifications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('verification_type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await fetch(`${API}/api/risk-compliance/kyc-verifications?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.verifications || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar verificações');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchTerm]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const openDetail = async (userId) => {
    setSelectedUser(userId);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/api/risk-compliance/kyc-verifications/${userId}`, { headers: getHeaders() });
      if (res.ok) {
        setDetailData(await res.json());
      }
    } catch (e) {
      toast.error('Erro ao carregar detalhes');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshVerification = async (userId) => {
    setRefreshingId(userId);
    try {
      const res = await fetch(`${API}/api/risk-compliance/kyc-verifications/${userId}/refresh`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        toast.success('Status atualizado');
        fetchVerifications();
        if (selectedUser === userId) openDetail(userId);
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (e) {
      toast.error('Erro ao contactar Sumsub');
    } finally {
      setRefreshingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.init;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} border text-xs font-medium px-2.5 py-1 gap-1.5`}>
        <Icon size={12} />
        {cfg.label}
      </Badge>
    );
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleManualReview = async (userId, action) => {
    const reason = action === 'reject'
      ? window.prompt('Motivo da rejeição:')
      : window.prompt('Nota (opcional):') || '';
    
    if (action === 'reject' && !reason) return;

    try {
      const res = await fetch(`${API}/api/risk-compliance/kyc-verifications/${userId}/manual-review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action, reason: reason || '' })
      });
      if (res.ok) {
        toast.success(action === 'approve' ? 'Verificação aprovada manualmente' : 'Verificação rejeitada');
        fetchVerifications();
        if (selectedUser === userId) openDetail(userId);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao processar revisão');
      }
    } catch (e) {
      toast.error('Erro ao processar revisão manual');
    }
  };

  return (
    <div className="space-y-6" data-testid="kyc-verifications-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Risco & Conformidade</p>
          <h1 className="text-3xl text-zinc-50 font-light flex items-center gap-3">
            <Shield className="text-purple-400" size={28} />
            Verificações KYC/KYB
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Estado das verificações Sumsub em tempo real</p>
        </div>
        <Button
          onClick={fetchVerifications}
          variant="ghost"
          className="text-zinc-400 hover:text-white"
          data-testid="refresh-all-btn"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total || 0, color: 'text-zinc-300', border: 'border-zinc-700' },
          { label: 'Em Verificação', value: stats.pending || 0, color: 'text-amber-400', border: 'border-amber-500/20' },
          { label: 'Aprovados', value: stats.approved || 0, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Rejeitados', value: stats.rejected || 0, color: 'text-rose-400', border: 'border-rose-500/20' },
          { label: 'Iniciados', value: (stats.init || 0) + (stats.created || 0), color: 'text-blue-400', border: 'border-blue-500/20' },
        ].map(s => (
          <div key={s.label} className={`bg-zinc-900/60 border ${s.border} rounded-lg p-4`}>
            <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-light ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 items-center">
        {TYPE_TABS.map(tab => {
          const Icon = tab.icon;
          const count = tab.key === 'all' ? (stats.total || 0) : tab.key === 'kyc' ? (stats.kyc_count || 0) : (stats.kyb_count || 0);
          return (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                typeFilter === tab.key
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
              data-testid={`type-tab-${tab.key}`}
            >
              <Icon size={14} />
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Status Tabs + Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(tab => {
            const count = tab.key === 'all' ? verifications.length : verifications.filter(v => v.status === tab.key || (tab.key === 'init' && (v.status === 'init' || v.status === 'created'))).length;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
                data-testid={`status-tab-${tab.key}`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 h-9"
            data-testid="search-verifications"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : verifications.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center">
          <Shield className="mx-auto text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-400 font-medium">Nenhuma verificação encontrada</p>
          <p className="text-zinc-600 text-sm mt-1">Ajuste os filtros ou pesquise por outro termo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {verifications.map((v) => (
            <VerificationRow
              key={v.user_id}
              v={v}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              onView={() => openDetail(v.user_id)}
              onRefresh={() => refreshVerification(v.user_id)}
              refreshing={refreshingId === v.user_id}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setDetailData(null); }}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-light flex items-center gap-3">
              {detailData?.verification_type === 'kyb' ? (
                <Building2 className="text-purple-400" size={22} />
              ) : (
                <User className="text-blue-400" size={22} />
              )}
              Detalhe da Verificação
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-zinc-600" />
            </div>
          ) : detailData ? (
            <DetailView
              data={detailData}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              onRefresh={() => refreshVerification(detailData.user_id)}
              refreshing={refreshingId === detailData?.user_id}
              onManualReview={handleManualReview}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const VerificationRow = ({ v, getStatusBadge, formatDate, onView, onRefresh, refreshing }) => {
  const isKYB = v.verification_type === 'kyb';
  const isOTCLead = v.source === 'otc_lead';
  
  return (
    <Card
      className="bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700/60 transition-all cursor-pointer group"
      onClick={onView}
      data-testid={`verification-row-${v.user_id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isKYB ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
              {isKYB ? <Building2 className="text-purple-400" size={18} /> : <User className="text-blue-400" size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-200 truncate">{v.name || v.email}</p>
                <Badge className={`text-[10px] px-1.5 py-0 ${isKYB ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'} border`}>
                  {isKYB ? 'KYB' : 'KYC'}
                </Badge>
                {isOTCLead && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-gold-500/10 text-gold-400 border-gold-500/20 border">
                    OTC Lead
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500 truncate">{v.email}</p>
                {v.tier_fee && (
                  <span className="text-[10px] text-gold-400 font-medium">{v.tier_fee}</span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Country + Tier */}
          <div className="hidden md:flex items-center gap-4 text-xs text-zinc-500">
            {v.country && (
              <span className="flex items-center gap-1">
                <Globe size={12} />
                {v.country}
              </span>
            )}
            {v.membership_level && (
              <span className="flex items-center gap-1">
                <Award size={12} />
                {v.membership_level}
              </span>
            )}
          </div>

          {/* Right: Status + Date + Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {getStatusBadge(v.status)}
            <span className="text-xs text-zinc-600 hidden lg:block w-28 text-right">{formatDate(v.updated_at)}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isOTCLead && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 text-zinc-500 hover:text-amber-400"
                  onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                  disabled={refreshing}
                  title="Sincronizar com Sumsub"
                  data-testid={`refresh-${v.user_id}`}
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </Button>
              )}
              {v.sumsub_link && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 text-zinc-500 hover:text-blue-400"
                  onClick={(e) => { e.stopPropagation(); window.open(v.sumsub_link, '_blank'); }}
                  title="Abrir no Sumsub"
                  data-testid={`sumsub-link-${v.user_id}`}
                >
                  <ExternalLink size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailView = ({ data, getStatusBadge, formatDate, onRefresh, refreshing, onManualReview }) => {
  const isKYB = data.verification_type === 'kyb';
  const isOTCLead = data.source === 'otc_lead';
  const docsStatus = data.docs_status;
  const sumsubInfo = data.sumsub_data;

  const fixedInfo = sumsubInfo?.fixedInfo || {};
  const review = sumsubInfo?.review || {};
  const reviewResult = review.reviewResult || {};

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isKYB ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
              {isKYB ? <Building2 className="text-purple-400" size={22} /> : <User className="text-blue-400" size={22} />}
            </div>
            <div>
              <p className="text-lg font-medium text-zinc-100">{data.name || data.email}</p>
              {data.company_name && <p className="text-sm text-purple-400">{data.company_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(data.status)}
            {isOTCLead && (
              <Badge className="text-[10px] px-1.5 py-0.5 bg-gold-500/10 text-gold-400 border-gold-500/20 border">
                OTC Lead
              </Badge>
            )}
            {!isOTCLead && (
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 text-zinc-400 hover:text-white h-8"
                onClick={onRefresh}
                disabled={refreshing}
                data-testid="detail-refresh-btn"
              >
                <RefreshCw size={14} className={`mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem icon={Mail} label="Email" value={data.email} />
          <InfoItem icon={Phone} label="Telefone" value={data.phone || fixedInfo.phone} />
          <InfoItem icon={Globe} label="País" value={data.country || fixedInfo.country} />
          <InfoItem icon={Award} label="Tier" value={data.membership_level} />
          <InfoItem icon={FileText} label="Nível Sumsub" value={data.level_name} />
          <InfoItem icon={Clock} label="Criado em" value={formatDate(data.created_at)} />
          {isOTCLead && data.tier_fee && (
            <InfoItem icon={Award} label="Investimento Mínimo" value={data.tier_fee} />
          )}
        </div>

        {data.sumsub_link && (
          <a
            href={data.sumsub_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mt-2"
            data-testid="sumsub-dashboard-link"
          >
            <ExternalLink size={14} />
            Abrir no Dashboard Sumsub
          </a>
        )}

        {/* Manual Approval/Rejection */}
        {data.status !== 'approved' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1"
              onClick={() => onManualReview(data.user_id, 'approve')}
              data-testid="manual-approve-btn"
            >
              <CheckCircle size={14} className="mr-1.5" />
              Aprovar Manualmente
            </Button>
            {data.status !== 'rejected' && (
              <Button
                size="sm"
                variant="outline"
                className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 flex-1"
                onClick={() => onManualReview(data.user_id, 'reject')}
                data-testid="manual-reject-btn"
              >
                <XCircle size={14} className="mr-1.5" />
                Rejeitar
              </Button>
            )}
          </div>
        )}
        {data.manual_review && (
          <p className="text-xs text-zinc-500 mt-2">
            Revisão manual por {data.manual_review_by} {data.manual_review_reason ? `— ${data.manual_review_reason}` : ''}
          </p>
        )}
      </div>

      {/* Review Result */}
      {(data.review_answer || data.reject_labels) && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Shield size={16} className="text-purple-400" />
            Resultado da Verificação
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Resposta</p>
              <Badge className={`${data.review_answer === 'GREEN' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'} border`}>
                {data.review_answer || '—'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Review Status</p>
              <p className="text-zinc-300">{data.review_status || review.reviewStatus || '—'}</p>
            </div>
            {data.reviewed_at && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Data da Revisão</p>
                <p className="text-zinc-300">{formatDate(data.reviewed_at)}</p>
              </div>
            )}
            {data.reject_type && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Tipo Rejeição</p>
                <p className="text-rose-400 text-sm">{data.reject_type}</p>
              </div>
            )}
          </div>

          {data.reject_labels && data.reject_labels.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Motivos de Rejeição</p>
              <div className="flex flex-wrap gap-1.5">
                {data.reject_labels.map((label, i) => (
                  <Badge key={`reject-${label}-${i}`} className="bg-rose-500/10 text-rose-400 border-rose-500/20 border text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {data.moderation_comment && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Comentário do Moderador</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded p-3">{data.moderation_comment}</p>
            </div>
          )}

          {reviewResult.comment && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Comentário Sumsub</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded p-3">{reviewResult.comment}</p>
            </div>
          )}
        </div>
      )}

      {/* Documents Status */}
      {docsStatus && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            Estado dos Documentos
          </h3>
          <DocumentsGrid docsStatus={docsStatus} />
        </div>
      )}

      {/* Sumsub Raw Info */}
      {fixedInfo && Object.keys(fixedInfo).length > 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Eye size={16} className="text-blue-400" />
            Dados Sumsub
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {fixedInfo.firstName && <InfoItem label="Primeiro Nome" value={fixedInfo.firstName} />}
            {fixedInfo.lastName && <InfoItem label="Último Nome" value={fixedInfo.lastName} />}
            {fixedInfo.dob && <InfoItem label="Data Nascimento" value={fixedInfo.dob} />}
            {fixedInfo.country && <InfoItem label="País (Sumsub)" value={fixedInfo.country} />}
            {fixedInfo.nationality && <InfoItem label="Nacionalidade" value={fixedInfo.nationality} />}
            {fixedInfo.placeOfBirth && <InfoItem label="Local Nascimento" value={fixedInfo.placeOfBirth} />}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon size={14} className="text-zinc-600 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-[11px] text-zinc-600 uppercase tracking-wider">{label}</p>
        <p className="text-zinc-300 text-sm">{value}</p>
      </div>
    </div>
  );
};

const DocumentsGrid = ({ docsStatus }) => {
  if (!docsStatus) return null;

  const DOC_LABELS = {
    IDENTITY: 'Documento de Identidade',
    SELFIE: 'Selfie / Prova de Vida',
    PROOF_OF_RESIDENCE: 'Comprovativo de Morada',
    DRIVERS: 'Carta de Condução',
    ID_CARD: 'Cartão de Cidadão',
    PASSPORT: 'Passaporte',
    RESIDENCE_PERMIT: 'Título de Residência',
    UTILITY_BILL: 'Fatura de Serviços',
    BANK_STATEMENT: 'Extracto Bancário',
    COMPANY_DOC: 'Documento da Empresa',
    AGREEMENT: 'Contrato',
    CONTRACT: 'Contrato',
    DRIVERS_TRANSLATION: 'Tradução Carta',
    INVESTOR_DOC: 'Documento do Investidor',
    VEHICLE_REGISTRATION_CERTIFICATE: 'Certificado de Registo',
    INCOME_SOURCE: 'Comprovativo de Rendimentos',
    PAYMENT_METHOD: 'Método de Pagamento',
    OTHER: 'Outro',
  };

  const DOC_STATUS_COLORS = {
    not_uploaded: { bg: 'bg-zinc-800', text: 'text-zinc-500', label: 'Não enviado' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pendente' },
    reviewed: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Em análise' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Aprovado' },
    rejected: { bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Rejeitado' },
  };

  // Parse the documents status (can be an object or array)
  let documents = [];
  if (Array.isArray(docsStatus)) {
    documents = docsStatus;
  } else if (typeof docsStatus === 'object') {
    // Sumsub returns { IDENTITY: {...}, SELFIE: {...}, ... }
    Object.entries(docsStatus).forEach(([docType, docInfo]) => {
      if (typeof docInfo === 'object' && docInfo !== null) {
        // docInfo can have imageIds, reviewResult, country, etc.
        const reviewResult = docInfo.reviewResult || {};
        let docStatus = 'not_uploaded';
        if (reviewResult.reviewAnswer === 'GREEN') docStatus = 'approved';
        else if (reviewResult.reviewAnswer === 'RED') docStatus = 'rejected';
        else if (docInfo.imageIds && docInfo.imageIds.length > 0) docStatus = 'pending';
        
        documents.push({
          type: docType,
          label: DOC_LABELS[docType] || docType.replace(/_/g, ' '),
          status: docStatus,
          country: docInfo.country,
          imageIds: docInfo.imageIds || [],
          rejectLabels: reviewResult.rejectLabels || [],
          comment: reviewResult.comment,
        });
      }
    });
  }

  if (documents.length === 0) {
    return <p className="text-zinc-600 text-sm">Nenhum documento registado</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((doc, i) => {
        const statusCfg = DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.not_uploaded;
        return (
          <div key={doc.label || doc.idDocType || i} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-300">{doc.label}</p>
                {doc.imageIds?.length > 0 && (
                  <p className="text-[11px] text-zinc-600">{doc.imageIds.length} ficheiro(s)</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.rejectLabels?.length > 0 && (
                <span className="text-[10px] text-rose-400">{doc.rejectLabels.join(', ')}</span>
              )}
              <Badge className={`${statusCfg.bg} ${statusCfg.text} border-none text-[11px] px-2 py-0.5`}>
                {statusCfg.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KYCVerificationsPage;
