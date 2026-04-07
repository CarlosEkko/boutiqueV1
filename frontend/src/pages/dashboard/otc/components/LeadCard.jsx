import React from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { 
  FileText, Settings, Trash2, Shield, ArrowRight,
  TrendingUp, DollarSign, Globe, Calendar, CheckCircle
} from 'lucide-react';

const STATUS_STYLES = {
  new: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20', label: 'Novo' },
  contacted: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20', label: 'Contactado' },
  pre_qualified: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/20', label: 'Pré-Qualificado' },
  qualified: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20', label: 'Qualificado' },
  kyc_pending: { bg: 'bg-orange-400/10', text: 'text-orange-400', border: 'border-orange-400/20', label: 'KYC Pendente' },
  kyc_approved: { bg: 'bg-teal-400/10', text: 'text-teal-400', border: 'border-teal-400/20', label: 'KYC Aprovado' },
  setup_pending: { bg: 'bg-cyan-400/10', text: 'text-cyan-400', border: 'border-cyan-400/20', label: 'Setup Pendente' },
  active_client: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20', label: 'Cliente Ativo' },
  not_qualified: { bg: 'bg-rose-400/10', text: 'text-rose-400', border: 'border-rose-400/20', label: 'Não Qualificado' },
  rejected: { bg: 'bg-rose-400/10', text: 'text-rose-400', border: 'border-rose-400/20', label: 'Rejeitado' },
  archived: { bg: 'bg-zinc-400/10', text: 'text-zinc-400', border: 'border-zinc-400/20', label: 'Arquivado' },
};

const TIER_LABELS = {
  broker: 'Broker',
  standard: 'Standard',
  premium: 'Premium',
  vip: 'VIP',
  institutional: 'Institucional',
};

const formatVolume = (v) => {
  if (!v) return '-';
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const LeadCard = ({ lead, onClick, onPreQual, onSetup, onConvert, onDelete, onAdvanceKYC, onApproveKYC, t }) => {
  const style = STATUS_STYLES[lead.status] || STATUS_STYLES.new;

  return (
    <Card 
      className="bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
      data-testid={`lead-card-${lead.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-500 font-semibold text-sm shrink-0">
            {getInitials(lead.contact_name || lead.entity_name)}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-zinc-100 font-semibold text-sm truncate">
                {lead.entity_name}
              </h3>
              <Badge className={`text-[10px] px-2 py-0.5 border ${style.bg} ${style.text} ${style.border} font-medium`}>
                {style.label}
              </Badge>
              {lead.potential_tier && (
                <Badge className="text-[10px] px-2 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-500 font-medium">
                  {TIER_LABELS[lead.potential_tier] || lead.potential_tier}
                </Badge>
              )}
            </div>
            <p className="text-zinc-500 text-xs truncate">
              {lead.contact_name} · {lead.contact_email}
            </p>
          </div>

          {/* Metrics */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Volume</p>
              <p className="text-zinc-200 text-sm font-semibold">{formatVolume(lead.estimated_volume_usd)}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Ativo</p>
              <p className="text-amber-500 text-sm font-semibold">{lead.target_asset || '-'}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Criado</p>
              <p className="text-zinc-400 text-sm">{formatDate(lead.created_at)}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-zinc-800 hidden md:block" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(lead.status === 'new' || lead.status === 'contacted') && (
              <Button size="icon" variant="ghost" className="w-9 h-9 text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10"
                onClick={e => { e.stopPropagation(); onPreQual(lead); }} title="Pré-Qualificação" data-testid={`prequal-lead-${lead.id}`}>
                <FileText size={16} />
              </Button>
            )}
            {lead.status === 'pre_qualified' && (
              <Button size="icon" variant="ghost" className="w-9 h-9 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10"
                onClick={e => { e.stopPropagation(); onAdvanceKYC(lead.id); }} title="Avançar para KYC" data-testid={`advance-kyc-${lead.id}`}>
                <Shield size={16} />
              </Button>
            )}
            {lead.status === 'kyc_pending' && (
              <Button size="icon" variant="ghost" className="w-9 h-9 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10"
                onClick={e => { e.stopPropagation(); onApproveKYC(lead.id); }} title="Aprovar KYC" data-testid={`approve-kyc-${lead.id}`}>
                <CheckCircle size={16} />
              </Button>
            )}
            {lead.status === 'kyc_approved' && (
              <Button size="icon" variant="ghost" className="w-9 h-9 text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10"
                onClick={e => { e.stopPropagation(); onSetup(lead); }} title="Setup Operacional" data-testid={`setup-lead-${lead.id}`}>
                <Settings size={16} />
              </Button>
            )}
            {lead.status === 'setup_pending' && (
              <Button size="icon" variant="ghost" className="w-9 h-9 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10"
                onClick={e => { e.stopPropagation(); onConvert(lead.id); }} title="Converter a Cliente" data-testid={`convert-lead-${lead.id}`}>
                <CheckCircle size={16} />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="w-9 h-9 text-zinc-600 hover:text-rose-400 hover:bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={e => { e.stopPropagation(); onDelete(lead); }} title="Eliminar" data-testid={`delete-lead-${lead.id}`}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
