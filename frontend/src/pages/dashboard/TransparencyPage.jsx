import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Shield, 
  FileText, 
  Wallet,
  ExternalLink,
  Copy,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TransparencyPage = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [reserves, setReserves] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reserves');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [reportsRes, reservesRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/transparency/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/dashboard/transparency/reserves`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setReports(reportsRes.data);
      setReserves(reservesRes.data);
    } catch (err) {
      console.error('Failed to load transparency data');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">Transparency</h1>
        <p className="text-gray-400 mt-1">Prova de reservas e relatórios de auditoria</p>
      </div>

      {/* Trust Banner */}
      <Card className="bg-gradient-to-r from-gold-800/20 to-gold-500/10 border-gold-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="text-gold-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl text-white mb-2">Committed to Transparency</h3>
              <p className="text-gray-300">
                At KBEX, we believe in complete transparency. Our proof of reserves is updated regularly, 
                and all our wallets are publicly verifiable on the blockchain.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gold-800/20 pb-2">
        <button
          onClick={() => setActiveTab('reserves')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'reserves'
              ? 'bg-gold-500/20 text-gold-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Prova de Reservas
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'reports'
              ? 'bg-gold-500/20 text-gold-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Audit Reports ({reports.length})
        </button>
      </div>

      {/* Reserves Tab */}
      {activeTab === 'reserves' && (
        <div className="space-y-6">
          {/* Totals Summary */}
          {reserves?.totals_by_asset && Object.keys(reserves.totals_by_asset).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reserves.totals_by_asset).map(([asset, balance]) => (
                <Card key={asset} className="bg-zinc-900/50 border-gold-800/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-light text-white">{parseFloat(balance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</p>
                    <p className="text-gold-400 font-medium">{asset}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Public Wallets */}
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardHeader>
              <CardTitle className="text-white font-light flex items-center gap-2">
                <Wallet size={20} className="text-gold-400" />
                Public Wallet Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reserves?.wallets?.length > 0 ? (
                <div className="space-y-4">
                  {reserves.wallets.map((wallet) => (
                    <div 
                      key={wallet.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                          <span className="text-gold-400 font-bold">{wallet.asset_id?.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{wallet.asset_name}</p>
                            <Badge className="bg-zinc-700 text-gray-300">{wallet.label}</Badge>
                          </div>
                          <p className="text-sm text-gray-400">
                            Balance: <span className="text-white">{wallet.parseFloat(balance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} {wallet.asset_id}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <code className="text-sm text-gray-400 bg-zinc-900 px-3 py-2 rounded max-w-[200px] md:max-w-[300px] truncate">
                          {wallet.address}
                        </code>
                        <button
                          onClick={() => copyAddress(wallet.address)}
                          className="p-2 text-gray-400 hover:text-gold-400 transition-colors"
                        >
                          <Copy size={16} />
                        </button>
                        <a
                          href={`https://blockchain.info/address/${wallet.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gold-400 transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Wallet className="mx-auto mb-4" size={48} />
                  <p>Public wallet addresses will be displayed here</p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-gray-500 text-center">
            Last updated: {formatDate(reserves?.last_updated)}
          </p>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.map((report) => (
              <Card key={report.id} className="bg-zinc-900/50 border-gold-800/20">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="text-blue-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg text-white">{report.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{report.summary}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {report.auditor && (
                            <span className="text-gray-400">
                              Auditor: <span className="text-white">{report.auditor}</span>
                            </span>
                          )}
                          <span className="text-gray-400">
                            Date: <span className="text-white">{formatDate(report.report_date)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={`${
                        report.type === 'audit' 
                          ? 'bg-green-900/30 text-green-400'
                          : report.type === 'proof_of_reserves'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-gold-800/30 text-gold-400'
                      }`}>
                        {report.type?.replace('_', ' ')}
                      </Badge>
                      {report.file_url && (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gold-400 hover:text-gold-300 bg-gold-500/20 rounded-lg"
                        >
                          <ExternalLink size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardContent className="p-12 text-center">
                <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                <h3 className="text-xl text-white mb-2">No Reports Yet</h3>
                <p className="text-gray-400">Audit and transparency reports will be published here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default TransparencyPage;
