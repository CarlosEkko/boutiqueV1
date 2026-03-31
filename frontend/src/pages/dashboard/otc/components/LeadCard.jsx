import React from 'react';
import axios from 'axios';
import { formatNumber } from '../../../../utils/formatters';
import { Card, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
  UserPlus, Mail, Globe, TrendingUp, Building, CheckCircle, XCircle,
  Clock, Trash2, Archive, ChevronRight, UserCheck, FileText, Settings, Edit, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getStatusIcon = (status) => {
  switch (status) {
    case 'active_client': case 'kyc_approved':
      return { icon: CheckCircle, bgColor: 'bg-green-500/20', iconColor: 'text-green-400', borderColor: 'border-green-500/30' };
    case 'pre_qualified': case 'contacted':
      return { icon: Clock, bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400', borderColor: 'border-purple-500/30' };
    case 'kyc_pending':
      return { icon: Clock, bgColor: 'bg-yellow-500/20', iconColor: 'text-yellow-400', borderColor: 'border-yellow-500/30' };
    case 'not_qualified': case 'lost':
      return { icon: XCircle, bgColor: 'bg-red-500/20', iconColor: 'text-red-400', borderColor: 'border-red-500/30' };
    case 'archived':
      return { icon: Archive, bgColor: 'bg-gray-500/20', iconColor: 'text-gray-400', borderColor: 'border-gray-500/30' };
    default:
      return { icon: UserPlus, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400', borderColor: 'border-blue-500/30' };
  }
};

const getStatusBadge = (status) => {
  const colors = {
    new: 'bg-blue-900/30 text-blue-400', contacted: 'bg-purple-900/30 text-purple-400',
    pre_qualified: 'bg-gold-900/30 text-gold-400', not_qualified: 'bg-gray-900/30 text-gray-400',
    kyc_pending: 'bg-yellow-900/30 text-yellow-400', kyc_approved: 'bg-green-900/30 text-green-400',
    active_client: 'bg-green-900/30 text-green-400', lost: 'bg-red-900/30 text-red-400',
    archived: 'bg-zinc-900/30 text-zinc-400',
  };
  const labels = {
    new: 'Novo', contacted: 'Contactado', pre_qualified: 'Pré-Qualificado',
    not_qualified: 'Não Qualificado', kyc_pending: 'KYC Pendente', kyc_approved: 'KYC Aprovado',
    active_client: 'Cliente Ativo', lost: 'Perdido', archived: 'Arquivado',
  };
  return <Badge className={colors[status] || 'bg-gray-900/30 text-gray-400'}>{labels[status] || status}</Badge>;
};

const getRiskBadge = (lead) => {
  if (lead.trustfull_data?.combined_score == null) return null;
  const s = lead.trustfull_data.combined_score;
  const cfg = s >= 700 ? { bg: 'bg-green-900/40', text: 'text-green-400', label: 'Confiável' }
    : s >= 500 ? { bg: 'bg-emerald-900/40', text: 'text-emerald-400', label: 'Alto' }
    : s >= 300 ? { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'Revisão' }
    : s >= 150 ? { bg: 'bg-orange-900/40', text: 'text-orange-400', label: 'Baixo' }
    : { bg: 'bg-red-900/40', text: 'text-red-400', label: 'Risco' };
  return (
    <Badge className={`${cfg.bg} ${cfg.text} text-[10px] ml-1`} data-testid={`risk-score-${lead.id}`}>
      RI {s} — {cfg.label}
    </Badge>
  );
};

export const LeadCard = ({ lead, onVerify, onPreQual, onAdvanceKYC, onApproveKYC, onSetup, onConvert, onDetail, onDelete, onRiskScan }) => {
  const statusConfig = getStatusIcon(lead.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className={`bg-zinc-900/80 border ${statusConfig.borderColor} hover:bg-zinc-900 transition-all cursor-pointer`}
      onClick={() => onDetail(lead)}
      data-testid={`lead-card-${lead.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-xl ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
            <StatusIcon size={28} className={statusConfig.iconColor} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-medium text-lg">{lead.contact_name || 'Lead'}</h3>
              <span className="text-gray-500">·</span>
              <span className="flex items-center gap-1 text-gray-400 text-sm"><Building size={14} />{lead.entity_name}</span>
              {getRiskBadge(lead)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1"><Mail size={14} />{lead.contact_email}</span>
              <span className="flex items-center gap-1"><Globe size={14} />{lead.country || 'N/A'}</span>
              <span className="flex items-center gap-1 capitalize"><TrendingUp size={14} />{lead.source?.replace('_', ' ') || 'Website'}</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0 mr-4">
            <p className="text-gray-400 text-xs uppercase mb-1">Volume Estimado</p>
            <p className="text-gold-400 font-mono text-xl">$ {formatNumber(lead.estimated_volume_usd || 0)}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-zinc-700 text-gray-300 font-mono">{lead.target_asset || 'BTC'}</Badge>
          </div>

          <div className="flex-shrink-0">{getStatusBadge(lead.status)}</div>

          <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {lead.status === 'new' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-blue-500/30 text-blue-400 hover:bg-blue-900/20"
                onClick={e => { e.stopPropagation(); onVerify(lead.id); }} title="Verificar Cliente" data-testid={`verify-lead-${lead.id}`}><UserCheck size={18} /></Button>
            )}
            {lead.status === 'contacted' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-purple-500/30 text-purple-400 hover:bg-purple-900/20"
                onClick={e => { e.stopPropagation(); onPreQual(lead); }} title="Pré-Qualificação" data-testid={`prequal-lead-${lead.id}`}><FileText size={18} /></Button>
            )}
            {lead.status === 'pre_qualified' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-900/20"
                onClick={e => { e.stopPropagation(); onAdvanceKYC(lead.id); }} title="Avançar para KYC" data-testid={`kyc-lead-${lead.id}`}><ChevronRight size={18} /></Button>
            )}
            {lead.status === 'kyc_pending' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/20"
                onClick={e => { e.stopPropagation(); onApproveKYC(lead.id); }} title="Aprovar KYC" data-testid={`approve-kyc-${lead.id}`}><CheckCircle size={18} /></Button>
            )}
            {lead.status === 'kyc_approved' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20"
                onClick={e => { e.stopPropagation(); onSetup(lead); }} title="Setup Operacional" data-testid={`setup-lead-${lead.id}`}><Settings size={18} /></Button>
            )}
            {lead.status === 'setup_pending' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-green-500/30 text-green-400 hover:bg-green-900/20"
                onClick={e => { e.stopPropagation(); onConvert(lead.id); }} title="Converter para Cliente" data-testid={`convert-lead-${lead.id}`}><UserPlus size={18} /></Button>
            )}
            {!lead.trustfull_data && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-blue-500/30 text-blue-400 hover:bg-blue-900/20"
                onClick={e => { e.stopPropagation(); onRiskScan(lead.id); }} title="Risk Scan" data-testid={`risk-scan-${lead.id}`}><Shield size={18} /></Button>
            )}
            <Button size="icon" variant="outline" className="w-10 h-10 border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
              onClick={e => { e.stopPropagation(); onDetail(lead); }} title="Ver Detalhes" data-testid={`view-lead-${lead.id}`}><Edit size={18} /></Button>
            {lead.status !== 'active_client' && (
              <Button size="icon" variant="outline" className="w-10 h-10 border-red-500/30 text-red-400 hover:bg-red-900/20"
                onClick={e => { e.stopPropagation(); onDelete(lead.id); }} title="Eliminar Lead" data-testid={`delete-lead-${lead.id}`}><Trash2 size={18} /></Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
