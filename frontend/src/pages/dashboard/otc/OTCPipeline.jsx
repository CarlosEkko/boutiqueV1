import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { 
  Kanban,
  RefreshCw,
  ArrowRight,
  Clock,
  DollarSign,
  User,
  Building,
  ChevronRight,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCPipeline = () => {
  const { token } = useAuth();
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealDialog, setShowDealDialog] = useState(false);

  const stages = [
    { key: 'rfq', label: 'RFQ', color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' },
    { key: 'quote', label: 'Quote', color: 'border-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' },
    { key: 'acceptance', label: 'Aceitação', color: 'border-gold-500', bgColor: 'bg-gold-500/10', textColor: 'text-gold-400' },
    { key: 'execution', label: 'Execução', color: 'border-orange-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-400' },
    { key: 'settlement', label: 'Liquidação', color: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
    { key: 'invoice', label: 'Invoice', color: 'border-teal-500', bgColor: 'bg-teal-500/10', textColor: 'text-teal-400' },
  ];

  useEffect(() => {
    fetchPipeline();
  }, [token]);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/otc/deals/pipeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPipeline(response.data);
    } catch (err) {
      console.error('Failed to fetch pipeline:', err);
      toast.error('Erro ao carregar pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStage = async (dealId, newStage) => {
    try {
      await axios.post(
        `${API_URL}/api/otc/deals/${dealId}/move-stage?new_stage=${newStage}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Deal movido para ' + newStage);
      fetchPipeline();
      setShowDealDialog(false);
    } catch (err) {
      toast.error('Erro ao mover deal');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNextStage = (currentStage) => {
    const idx = stages.findIndex(s => s.key === currentStage);
    if (idx >= 0 && idx < stages.length - 1) {
      return stages[idx + 1].key;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Kanban className="text-gold-400" />
            Pipeline OTC
          </h1>
          <p className="text-gray-400 mt-1">Visualização Kanban das operações OTC</p>
        </div>
        <Button
          onClick={fetchPipeline}
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageData = pipeline[stage.key] || { deals: [], count: 0, total_value: 0 };
          
          return (
            <div key={stage.key} className="flex-shrink-0 w-72">
              {/* Stage Header */}
              <div className={`p-3 rounded-t-lg border-t-4 ${stage.color} bg-zinc-900/80`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${stage.textColor}`}>{stage.label}</h3>
                  <Badge className="bg-zinc-700">{stageData.count}</Badge>
                </div>
                {stageData.total_value > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ${formatNumber(stageData.total_value)}
                  </p>
                )}
              </div>
              
              {/* Stage Cards */}
              <div className={`min-h-[400px] p-2 rounded-b-lg ${stage.bgColor} border border-t-0 border-zinc-800`}>
                <div className="space-y-2">
                  {stageData.deals && stageData.deals.length > 0 ? (
                    stageData.deals.map((deal) => (
                      <Card 
                        key={deal.id} 
                        className="bg-zinc-900 border-zinc-800 hover:border-gold-500/30 cursor-pointer transition-colors"
                        onClick={() => { setSelectedDeal(deal); setShowDealDialog(true); }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400 font-mono">{deal.deal_number}</span>
                            <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                              {deal.transaction_type?.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <p className="text-white font-medium text-sm mb-2">{deal.client_name}</p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                            <span className="text-gold-400 font-mono">
                              {formatNumber(deal.amount)} {deal.base_asset}
                            </span>
                            <ArrowRight size={12} />
                            <span>{deal.quote_asset}</span>
                          </div>
                          
                          {deal.total_value && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <DollarSign size={12} />
                              <span className="text-white">${formatNumber(deal.total_value)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <Clock size={12} />
                            <span>{formatDate(deal.created_at)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Sem deals
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Building size={20} />
              {selectedDeal?.deal_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Cliente</p>
                  <p className="text-white">{selectedDeal.client_name}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Tipo</p>
                  <Badge className={selectedDeal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                    {selectedDeal.transaction_type?.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Quantidade</p>
                  <p className="text-gold-400 font-mono">{formatNumber(selectedDeal.amount)} {selectedDeal.base_asset}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Moeda</p>
                  <p className="text-white">{selectedDeal.quote_asset}</p>
                </div>
                
                {selectedDeal.final_price && (
                  <>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-400 text-xs uppercase mb-1">Preço</p>
                      <p className="text-white font-mono">${formatNumber(selectedDeal.final_price)}</p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-400 text-xs uppercase mb-1">Valor Total</p>
                      <p className="text-gold-400 font-mono">${formatNumber(selectedDeal.total_value)}</p>
                    </div>
                  </>
                )}
                
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Stage</p>
                  <Badge className="bg-gold-900/30 text-gold-400">{selectedDeal.stage?.replace('_', ' ')}</Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Criado</p>
                  <p className="text-white text-sm">{formatDate(selectedDeal.created_at)}</p>
                </div>
              </div>
              
              {selectedDeal.notes && (
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Notas</p>
                  <p className="text-white whitespace-pre-wrap text-sm">{selectedDeal.notes}</p>
                </div>
              )}
              
              {/* Move to Next Stage */}
              {getNextStage(selectedDeal.stage) && (
                <div className="pt-4 border-t border-gold-800/20">
                  <Button
                    onClick={() => handleMoveStage(selectedDeal.id, getNextStage(selectedDeal.stage))}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <ChevronRight size={16} className="mr-2" />
                    Mover para {stages.find(s => s.key === getNextStage(selectedDeal.stage))?.label}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCPipeline;
