import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Coins, Rocket, Clock, CheckCircle, TrendingUp, ExternalLink,
  Loader2, FileText, ArrowRight,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fmtAmount = (val) => {
  const n = typeof val === 'number' ? val : parseFloat(val) || 0;
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (iso) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusConfig = {
  confirmed: { label: 'Confirmado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  pending: { label: 'Pendente', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: null },
};

const MyLaunchpadInvestments = () => {
  const { token } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [sales, setSales] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [subsRes, salesRes] = await Promise.all([
        axios.get(`${API_URL}/api/launchpad/my-subscriptions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/launchpad/sales`),
      ]);

      setSubscriptions(subsRes.data.subscriptions || []);

      const salesMap = {};
      (salesRes.data.sales || []).forEach(s => { salesMap[s.id] = s; });
      setSales(salesMap);
    } catch (err) {
      console.error('Failed to fetch launchpad data', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalInvested = subscriptions.reduce((sum, s) => sum + (s.amount_usd || 0), 0);
  const totalTokens = subscriptions.reduce((sum, s) => sum + (s.amount_tokens || 0), 0);
  const activeProjects = new Set(subscriptions.map(s => s.sale_id)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-launchpad-investments">
      {/* Header */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Launchpad</p>
        <h1 className="text-3xl text-zinc-50 font-light flex items-center gap-3">
          <Coins className="text-purple-400" size={28} />
          Meus Investimentos
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Os seus investimentos em Token Sales</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">Total Investido</span>
              <TrendingUp size={16} className="text-purple-400" />
            </div>
            <p className="text-2xl font-mono font-light text-purple-400">${fmtAmount(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">Total Tokens</span>
              <Coins size={16} className="text-gold-400" />
            </div>
            <p className="text-2xl font-mono font-light text-gold-400">{totalTokens.toLocaleString('pt-PT')}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">Projetos</span>
              <Rocket size={16} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-mono font-light text-emerald-400">{activeProjects}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Rocket size={40} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-400">Ainda nao investiu em nenhum projeto</p>
            <p className="text-zinc-600 text-sm mt-1">Explore os Token Sales disponiveis no Launchpad</p>
            <a href="/dashboard/launchpad" className="inline-flex items-center gap-2 mt-4 text-purple-400 hover:text-purple-300 text-sm">
              Ver Projetos <ArrowRight size={14} />
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => {
            const sale = sales[sub.sale_id] || {};
            const cfg = statusConfig[sub.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;

            return (
              <Card key={sub.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors" data-testid={`investment-${sub.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Project Icon */}
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Rocket size={24} className="text-purple-400" />
                      </div>

                      {/* Project Info */}
                      <div>
                        <h3 className="text-white font-medium text-base">{sale.project_name || sub.sale_id}</h3>
                        <p className="text-gray-500 text-xs mt-0.5">{sale.token_symbol || 'Token'} - {sale.network || ''}</p>

                        <div className="flex items-center gap-4 mt-3">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase">Tokens</p>
                            <p className="text-white font-mono">{(sub.amount_tokens || 0).toLocaleString('pt-PT')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase">Investido</p>
                            <p className="text-gold-400 font-mono">${fmtAmount(sub.amount_usd)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase">Preco/Token</p>
                            <p className="text-gray-300 font-mono">${sale.token_price?.toFixed(4) || '--'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase">Data</p>
                            <p className="text-gray-400">{fmtDate(sub.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${cfg.color} border text-xs`}>
                        {StatusIcon && <StatusIcon size={12} className="mr-1" />}
                        {cfg.label}
                      </Badge>
                      {sale.whitepaper_url && (
                        <a href={sale.whitepaper_url} target="_blank" rel="noopener noreferrer"
                          className="text-gray-500 hover:text-purple-400 flex items-center gap-1 text-xs">
                          <FileText size={12} /> Whitepaper
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {sale.total_supply && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>{((sale.tokens_sold || 0) / sale.total_supply * 100).toFixed(1)}% vendido</span>
                        <span>{(sale.tokens_sold || 0).toLocaleString('pt-PT')} / {sale.total_supply.toLocaleString('pt-PT')}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-gold-400 rounded-full transition-all"
                          style={{ width: `${Math.min((sale.tokens_sold || 0) / sale.total_supply * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyLaunchpadInvestments;
