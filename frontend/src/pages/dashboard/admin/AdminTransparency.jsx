import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { 
  Shield, 
  Plus,
  Wallet,
  FileText,
  ExternalLink,
  Copy,
  Trash2,
  Upload,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminTransparency = () => {
  const { token } = useAuth();
  const [reserves, setReserves] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallets');
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  
  const [walletForm, setWalletForm] = useState({
    asset_id: 'BTC',
    asset_name: 'Bitcoin',
    address: '',
    balance: '',
    label: 'Cold Storage'
  });

  const [reportForm, setReportForm] = useState({
    title: '',
    type: 'audit',
    summary: '',
    auditor: '',
    report_date: new Date().toISOString().split('T')[0],
    file_url: ''
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [reservesRes, reportsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/transparency/reserves`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/dashboard/transparency/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setReserves(reservesRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      console.error('Failed to load transparency data');
    } finally {
      setLoading(false);
    }
  };

  const addWallet = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams(walletForm).toString();
      await axios.post(`${API_URL}/api/admin/transparency/wallets?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Public wallet added');
      setShowWalletForm(false);
      setWalletForm({
        asset_id: 'BTC',
        asset_name: 'Bitcoin',
        address: '',
        balance: '',
        label: 'Cold Storage'
      });
      fetchData();
    } catch (err) {
      toast.error('Failed to add wallet');
    }
  };

  const addReport = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams(reportForm).toString();
      await axios.post(`${API_URL}/api/admin/transparency/reports?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Report added');
      setShowReportForm(false);
      setUploadedFileName('');
      setReportForm({
        title: '',
        type: 'audit',
        summary: '',
        auditor: '',
        report_date: new Date().toISOString().split('T')[0],
        file_url: ''
      });
      fetchData();
    } catch (err) {
      toast.error('Failed to add report');
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Tem certeza que deseja eliminar este relatório?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/transparency/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Relatório eliminado');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sem permissão para eliminar');
    }
  };

  const deleteWallet = async (walletId) => {
    if (!window.confirm('Tem certeza que deseja eliminar esta wallet?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/transparency/wallets/${walletId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Wallet eliminada');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar wallet');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Apenas ficheiros PDF são aceites');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ficheiro demasiado grande. Máximo 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const res = await axios.post(`${API_URL}/api/uploads/file-json`, {
          file_data: base64,
          filename: file.name,
          content_type: 'application/pdf',
          category: 'documents',
          description: `Audit Report: ${reportForm.title || file.name}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReportForm(prev => ({ ...prev, file_url: res.data.url }));
        setUploadedFileName(file.name);
        toast.success('PDF carregado com sucesso');
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Erro ao carregar ficheiro');
      setUploadingFile(false);
    }
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied');
  };

  const assetOptions = [
    { id: 'BTC', name: 'Bitcoin' },
    { id: 'ETH', name: 'Ethereum' },
    { id: 'USDT', name: 'Tether' },
    { id: 'USDC', name: 'USD Coin' },
    { id: 'SOL', name: 'Solana' }
  ];

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
        <h1 className="text-3xl font-light text-white">Transparency Management</h1>
        <p className="text-gray-400 mt-1">Manage public wallets and audit reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gold-800/20 pb-2">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'wallets'
              ? 'bg-gold-500/20 text-gold-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Wallet size={16} className="inline mr-2" />
          Public Wallets ({reserves?.wallets?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'reports'
              ? 'bg-gold-500/20 text-gold-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText size={16} className="inline mr-2" />
          Reports ({reports.length})
        </button>
      </div>

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowWalletForm(!showWalletForm)}
              className="bg-gold-500 hover:bg-gold-400"
            >
              <Plus size={18} className="mr-2" />
              {showWalletForm ? 'Cancel' : 'Add Public Wallet'}
            </Button>
          </div>

          {/* Add Wallet Form */}
          {showWalletForm && (
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader>
                <CardTitle className="text-white font-light">Add Public Wallet</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addWallet} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Asset</Label>
                    <select
                      value={walletForm.asset_id}
                      onChange={(e) => {
                        const asset = assetOptions.find(a => a.id === e.target.value);
                        setWalletForm({
                          ...walletForm,
                          asset_id: asset.id,
                          asset_name: asset.name
                        });
                      }}
                      className="w-full h-10 px-3 bg-zinc-800 border border-gold-800/30 text-white rounded-md mt-1"
                    >
                      {assetOptions.map(asset => (
                        <option key={asset.id} value={asset.id}>{asset.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-gray-300">Label</Label>
                    <select
                      value={walletForm.label}
                      onChange={(e) => setWalletForm({...walletForm, label: e.target.value})}
                      className="w-full h-10 px-3 bg-zinc-800 border border-gold-800/30 text-white rounded-md mt-1"
                    >
                      <option value="Cold Storage">Cold Storage</option>
                      <option value="Hot Wallet">Hot Wallet</option>
                      <option value="Treasury">Treasury</option>
                      <option value="Reserve">Reserve</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Wallet Address</Label>
                    <Input
                      value={walletForm.address}
                      onChange={(e) => setWalletForm({...walletForm, address: e.target.value})}
                      placeholder="e.g., bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                      required
                      className="bg-zinc-800 border-gold-800/30 text-white mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Balance</Label>
                    <Input
                      type="number" step="any"
                      step="0.00000001"
                      value={walletForm.balance}
                      onChange={(e) => setWalletForm({...walletForm, balance: e.target.value})}
                      placeholder="e.g., 125.5"
                      required
                      className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400">
                      Add Wallet
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Wallets List */}
          <div className="space-y-3">
            {reserves?.wallets?.length > 0 ? (
              reserves.wallets.map((wallet) => (
                <Card key={wallet.id} className="bg-zinc-900/50 border-gold-800/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                          <span className="text-gold-400 font-bold">{wallet.asset_id?.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{wallet.asset_name}</p>
                            <Badge className="bg-zinc-700 text-gray-300">{wallet.label}</Badge>
                          </div>
                          <p className="text-lg text-gold-400">{parseFloat(wallet.balance || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} {wallet.asset_id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <code className="text-sm text-gray-400 bg-zinc-800 px-3 py-2 rounded hidden md:block max-w-[300px] truncate">
                          {wallet.address}
                        </code>
                        <button
                          onClick={() => copyAddress(wallet.address)}
                          className="p-2 text-gray-400 hover:text-gold-400"
                          title="Copiar endereço"
                        >
                          <Copy size={18} />
                        </button>
                        <a
                          href={`https://blockchain.info/address/${wallet.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gold-400"
                          title="Ver no blockchain"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button
                          onClick={() => deleteWallet(wallet.id)}
                          className="p-2 text-red-500/50 hover:text-red-400 transition-colors"
                          title="Eliminar wallet"
                          data-testid={`delete-wallet-${wallet.id}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-zinc-900/50 border-gold-800/20">
                <CardContent className="p-12 text-center">
                  <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">No Public Wallets</h3>
                  <p className="text-gray-400">Add public wallet addresses for proof of reserves.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowReportForm(!showReportForm)}
              className="bg-gold-500 hover:bg-gold-400"
            >
              <Plus size={18} className="mr-2" />
              {showReportForm ? 'Cancel' : 'Add Report'}
            </Button>
          </div>

          {/* Add Report Form */}
          {showReportForm && (
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader>
                <CardTitle className="text-white font-light">Add Audit Report</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addReport} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={reportForm.title}
                      onChange={(e) => setReportForm({...reportForm, title: e.target.value})}
                      placeholder="e.g., Q4 2025 Audit Report"
                      required
                      className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Type</Label>
                    <select
                      value={reportForm.type}
                      onChange={(e) => setReportForm({...reportForm, type: e.target.value})}
                      className="w-full h-10 px-3 bg-zinc-800 border border-gold-800/30 text-white rounded-md mt-1"
                    >
                      <option value="audit">Audit</option>
                      <option value="proof_of_reserves">Proof of Reserves</option>
                      <option value="financial_report">Financial Report</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-gray-300">Auditor</Label>
                    <Input
                      value={reportForm.auditor}
                      onChange={(e) => setReportForm({...reportForm, auditor: e.target.value})}
                      placeholder="e.g., Deloitte"
                      className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Data do Relatório</Label>
                    <Input
                      type="date"
                      value={reportForm.report_date}
                      onChange={(e) => setReportForm({...reportForm, report_date: e.target.value})}
                      required
                      className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                      data-testid="report-date-input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Summary</Label>
                    <Input
                      value={reportForm.summary}
                      onChange={(e) => setReportForm({...reportForm, summary: e.target.value})}
                      placeholder="Brief summary of the report"
                      required
                      className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-gray-300">Ficheiro PDF</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="mt-1">
                      {uploadedFileName ? (
                        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                          <CheckCircle size={18} className="text-emerald-400" />
                          <span className="text-emerald-300 text-sm flex-1 truncate">{uploadedFileName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFileName('');
                              setReportForm(prev => ({ ...prev, file_url: '' }));
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-zinc-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          className="w-full flex items-center justify-center gap-2 bg-zinc-800 border border-dashed border-gold-800/30 rounded-lg px-4 py-6 text-gray-400 hover:text-gold-400 hover:border-gold-500/50 transition-colors"
                        >
                          {uploadingFile ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              <span>A carregar...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={18} />
                              <span>Clique para carregar PDF (máx. 10MB)</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400">
                      Add Report
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Reports List */}
          <div className="space-y-3">
            {reports.length > 0 ? (
              reports.map((report) => (
                <Card key={report.id} className="bg-zinc-900/50 border-gold-800/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                          <FileText className="text-blue-400" size={24} />
                        </div>
                        <div>
                          <p className="text-white font-medium">{report.title}</p>
                          <p className="text-sm text-gray-400">{report.summary}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-blue-900/30 text-blue-400">
                              {report.type?.replace('_', ' ')}
                            </Badge>
                            {report.auditor && (
                              <span className="text-xs text-gray-500">by {report.auditor}</span>
                            )}
                          </div>
                        </div>
                      </div>

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
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-2 text-red-500/50 hover:text-red-400 transition-colors"
                        title="Eliminar relatório"
                        data-testid={`delete-report-${report.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-zinc-900/50 border-gold-800/20">
                <CardContent className="p-12 text-center">
                  <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">No Reports</h3>
                  <p className="text-gray-400">Add audit and transparency reports.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransparency;
