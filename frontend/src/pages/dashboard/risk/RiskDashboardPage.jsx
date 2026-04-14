import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Shield, AlertTriangle, CheckCircle, Clock, XCircle, Wallet,
  FileSearch, TrendingUp, RefreshCw, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const RiskDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/risk-compliance/dashboard`, { headers: getHeaders() });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2" data-testid="risk-dashboard-title">
            <Shield className="text-purple-400" size={24} />
            Risk & Compliance
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Visão geral de risco e conformidade</p>
        </div>
        <Button variant="ghost" onClick={fetchData} className="text-zinc-400 hover:text-white" data-testid="risk-refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-center py-8">A carregar...</div>
      ) : kpis && (
        <>
          {/* Deal KPIs */}
          <div>
            <h2 className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Negócios</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="risk-deal-kpis">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="text-zinc-500" size={18} />
                    <span className="text-zinc-600 text-xs">Total Activos</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{kpis.total_deals}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="text-emerald-400" size={18} />
                    <span className="text-zinc-600 text-xs">Conformes</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{kpis.compliant_deals}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-yellow-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="text-yellow-400" size={18} />
                    <span className="text-zinc-600 text-xs">Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{kpis.pending_deals}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="text-red-400" size={18} />
                    <span className="text-zinc-600 text-xs">Alto Risco</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{kpis.high_risk_deals}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wallet KPIs */}
          <div>
            <h2 className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Carteiras</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-testid="risk-wallet-kpis">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Wallet className="text-zinc-500" size={18} />
                    <span className="text-zinc-600 text-xs">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{kpis.total_wallets}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-yellow-500/20">
                <CardContent className="p-4 cursor-pointer hover:bg-zinc-800/50" onClick={() => navigate('/dashboard/risk/kyt-forensic')}>
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="text-yellow-400" size={18} />
                    <span className="text-zinc-600 text-xs">Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{kpis.pending_wallets}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="text-emerald-400" size={18} />
                    <span className="text-zinc-600 text-xs">Verificadas</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{kpis.verified_wallets}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="text-orange-400" size={18} />
                    <span className="text-zinc-600 text-xs">Sinalizadas</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{kpis.flagged_wallets}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="text-red-400" size={18} />
                    <span className="text-zinc-600 text-xs">Rejeitadas</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{kpis.rejected_wallets}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800 hover:border-purple-500/30 cursor-pointer transition-colors" onClick={() => navigate('/dashboard/risk/kyt-forensic')} data-testid="goto-kyt-forensic">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FileSearch className="text-purple-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">KYT Forensic</h3>
                  <p className="text-zinc-500 text-sm">Fila de verificação de carteiras</p>
                </div>
                {kpis.pending_wallets > 0 && (
                  <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    {kpis.pending_wallets} pendente{kpis.pending_wallets > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 hover:border-yellow-500/30 cursor-pointer transition-colors" onClick={() => navigate('/dashboard/crm/otc-deals')} data-testid="goto-otc-deals">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <TrendingUp className="text-yellow-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">Negócios OTC</h3>
                  <p className="text-zinc-500 text-sm">Gerir negociações e compliance</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          {data?.recent_analyses?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800" data-testid="recent-analyses">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base">Análises Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recent_analyses.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${a.status === 'clean' ? 'bg-emerald-400' : a.status === 'flagged' ? 'bg-orange-400' : a.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                        <div>
                          <code className="text-white text-xs font-mono">{a.address}</code>
                          <div className="flex gap-2 text-xs text-zinc-500 mt-0.5">
                            <span className="text-yellow-400">{a.deal_number}</span>
                            <span>{a.client_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${a.score > 60 ? 'text-emerald-400' : a.score > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {a.score}/100
                        </span>
                        <p className="text-zinc-600 text-[10px]">{a.analyst}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default RiskDashboardPage;
