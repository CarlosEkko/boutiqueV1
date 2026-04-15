import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  DollarSign, TrendingUp, ArrowLeft, RefreshCw, FileText, BarChart3, Percent
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FeeLedger = ({ onBack }) => {
  const { token } = useAuth();
  const [ledger, setLedger] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ledgerRes, summaryRes, tiersRes] = await Promise.all([
        axios.get(`${API_URL}/api/escrow/fee-ledger`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/escrow/fee-ledger/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/escrow/volume-tiers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setLedger(ledgerRes.data);
      setSummary(summaryRes.data);
      setTiers(tiersRes.data.tiers || []);
    } catch (err) {
      toast.error('Erro ao carregar fee ledger');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" data-testid="fee-ledger-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  const totals = ledger?.totals || {};

  return (
    <div className="p-6 space-y-6" data-testid="fee-ledger-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="fee-ledger-back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fee Revenue Ledger</h1>
            <p className="text-sm text-muted-foreground mt-1">Receita KBEX de fees escrow</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-ledger-btn">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-emerald-500/20 bg-emerald-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita Total</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">${(totals.total_revenue || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-5 border border-blue-500/20 bg-blue-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">De Buyers</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">${(totals.total_from_buyers || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-5 border border-amber-500/20 bg-amber-500/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">De Sellers</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">${(totals.total_from_sellers || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-5 border border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume Total</span>
            <BarChart3 className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold">${(totals.total_volume || 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">{totals.deal_count || 0} deals liquidados</div>
        </Card>
      </div>

      {/* Revenue by Schedule */}
      {summary?.by_schedule?.length > 0 && (
        <Card className="p-5 border border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Receita por Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.by_schedule.map(item => (
              <div key={item.schedule} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-xs text-muted-foreground uppercase">{item.schedule}</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">${(item.revenue || 0).toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">
                  {item.count} deals &middot; Vol: ${(item.volume || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Volume Discount Tiers */}
      <Card className="p-5 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volume Discount Tiers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-muted-foreground">
                <th className="text-left py-2 px-3">Tier</th>
                <th className="text-left py-2 px-3">Volume Min</th>
                <th className="text-left py-2 px-3">Volume Max</th>
                <th className="text-left py-2 px-3">Desconto</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 px-3 font-medium">Tier {i + 1}</td>
                  <td className="py-2 px-3">${tier.min.toLocaleString()}</td>
                  <td className="py-2 px-3">{tier.max === null || tier.max === Infinity || tier.max > 1e14 ? '∞' : `$${tier.max.toLocaleString()}`}</td>
                  <td className="py-2 px-3">
                    <Badge className={tier.discount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}>
                      {(tier.discount * 100).toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Ledger Entries */}
      <Card className="p-5 border border-white/5 bg-white/[0.02]">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Fee Invoices ({ledger?.total || 0})
        </h3>
        {(ledger?.entries?.length || 0) === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma fee registada ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ledger.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{entry.deal_id}</span>
                    <Badge className="bg-white/5 text-muted-foreground text-[10px]">{entry.fee_schedule}</Badge>
                    {entry.volume_discount_pct > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">-{(entry.volume_discount_pct * 100).toFixed(0)}% vol</Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {entry.asset_a}/{entry.asset_b} &middot; {entry.buyer_name} &harr; {entry.seller_name} &middot; {formatDate(entry.settled_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">${(entry.fee_total || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">
                    B: ${(entry.fee_buyer || 0).toLocaleString()} | S: ${(entry.fee_seller || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FeeLedger;
