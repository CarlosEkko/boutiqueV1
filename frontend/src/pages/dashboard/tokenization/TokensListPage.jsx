import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Gem, Plus, Flame, MoreHorizontal, Loader2, AlertCircle, ChevronDown, ChevronRight, Wallet, Send, Link2, Unlink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const TokensListPage = () => {
  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedToken, setExpandedToken] = useState(null);
  const [tokenDetails, setTokenDetails] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/collections`, { headers });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (e) { console.error('Fetch error:', e); }
    setLoading(false);
  };

  const toggleExpand = async (col) => {
    const colId = col.id || col.contractAddress;
    if (expandedToken === colId) {
      setExpandedToken(null);
      return;
    }
    setExpandedToken(colId);
    if (!tokenDetails[colId]) {
      try {
        const res = await fetch(`${API}/api/tokenization/collections/${colId}/tokens`, { headers });
        const data = await res.json();
        setTokenDetails(prev => ({ ...prev, [colId]: data.tokens || [] }));
      } catch (e) {
        setTokenDetails(prev => ({ ...prev, [colId]: [] }));
      }
    }
  };

  const handleUnlink = async (colId) => {
    try {
      toast.info('A deslinkar token...');
      setActiveMenu(null);
    } catch (e) { toast.error('Erro'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64" data-testid="tokens-loading">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="tokens-list-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Gem className="text-[#D4AF37]" size={28} />
            Tokens
          </h1>
          <p className="text-sm text-zinc-400 mt-1">{collections.length} tokens registados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/dashboard/tokenization/issue'} className="bg-[#D4AF37] hover:bg-[#C4A030] text-black" data-testid="add-token-btn">
            <Plus size={16} className="mr-2" /> Adicionar Token
          </Button>
          <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={fetchCollections}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-3" data-testid="tokens-container">
        {collections.length === 0 ? (
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Gem className="mx-auto text-zinc-600 mb-4" size={40} />
              <p className="text-zinc-400 text-lg">Sem tokens registados</p>
              <p className="text-xs text-zinc-500 mt-2">Clique em "Adicionar Token" para emitir ou linkar um token existente</p>
            </CardContent>
          </Card>
        ) : collections.map((col, i) => {
          const colId = col.id || col.contractAddress || `col-${i}`;
          const isExpanded = expandedToken === colId;
          const symbol = col.symbol || col.name?.substring(0, 4)?.toUpperCase() || '???';
          const totalSupply = col.totalSupply || col.total_supply || '—';
          const holding = col.holding || col.balance || '—';
          const issuerVault = col.issuerVaultId || col.vaultAccountId || col.issuer_vault || '—';
          const blockchain = col.blockchain || col.blockchainDescriptor || col.chain || 'EVM';

          return (
            <Card key={colId} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden" data-testid={`token-card-${i}`}>
              {/* Token Header */}
              <CardContent className="p-0">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Symbol Badge */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
                      <span className="text-[#D4AF37] font-bold text-sm">{symbol.substring(0, 4)}</span>
                    </div>
                    {/* Token Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-lg">{col.name || 'Token'}</h3>
                        <span className="text-zinc-500 text-sm">({symbol})</span>
                      </div>
                      <div className="flex items-center gap-6 mt-1.5">
                        <div>
                          <span className="text-white font-mono font-semibold text-sm">{totalSupply}</span>
                          <span className="text-zinc-500 text-xs ml-1.5">Total supply</span>
                        </div>
                        <div>
                          <span className="text-white font-mono font-semibold text-sm">{holding}</span>
                          <span className="text-zinc-500 text-xs ml-1.5">Holding</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 text-xs">Vault:</span>
                          <span className="text-white text-xs ml-1 font-mono">{typeof issuerVault === 'string' ? issuerVault.substring(0, 16) : issuerVault}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-xs px-2.5 py-1">{blockchain}</Badge>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs h-8"
                      onClick={() => window.location.href = `/dashboard/tokenization/mint-burn?collection=${colId}&action=mint`}>
                      <Plus size={14} className="mr-1" /> Mint
                    </Button>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10 text-xs h-8"
                      onClick={() => window.location.href = `/dashboard/tokenization/mint-burn?collection=${colId}&action=burn`}>
                      <Flame size={14} className="mr-1" /> Burn
                    </Button>
                    <div className="relative">
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white w-8 h-8 p-0"
                        onClick={() => setActiveMenu(activeMenu === colId ? null : colId)}>
                        <MoreHorizontal size={16} />
                      </Button>
                      {activeMenu === colId && (
                        <div className="absolute right-0 top-10 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[180px]"
                          onMouseLeave={() => setActiveMenu(null)}>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                            onClick={() => { setActiveMenu(null); }}>
                            <Send size={14} /> Transferir
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                            onClick={() => { setActiveMenu(null); }}>
                            <Wallet size={14} /> Adicionar Wallet
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                            onClick={() => { setActiveMenu(null); }}>
                            <Link2 size={14} /> Gerir Contrato
                          </button>
                          <div className="border-t border-zinc-700 my-1" />
                          <button className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                            onClick={() => handleUnlink(colId)}>
                            <Unlink size={14} /> Deslinkar Token
                          </button>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white w-8 h-8 p-0"
                      onClick={() => toggleExpand(col)}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                  </div>
                </div>

                {/* Expanded: Vaults holding this token */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-zinc-950/50 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        Vaults a deter {symbol}
                      </p>
                      <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs h-7">
                        <Plus size={12} className="mr-1" /> Adicionar Wallet
                      </Button>
                    </div>
                    {tokenDetails[colId] && tokenDetails[colId].length > 0 ? (
                      <div className="space-y-2">
                        {tokenDetails[colId].map((tk, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2.5 px-3 bg-zinc-900/60 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                                <Wallet className="text-[#D4AF37]" size={14} />
                              </div>
                              <span className="text-white text-sm">{tk.vaultAccountId || tk.name || `Vault ${idx + 1}`}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-white font-mono font-semibold text-sm">{tk.balance || tk.amount || '0'} {symbol}</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white w-7 h-7 p-0">
                                  <Send size={12} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-sm text-center py-4">Sem vaults associadas a este token</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TokensListPage;
