import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import {
  Building2, CheckCircle, XCircle, RefreshCw, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDate } from '../../../../utils/formatters';

const TransfersTab = ({
  transfers, transfersFilter, setTransfersFilter, expandedTransfer, setExpandedTransfer,
  loading, fetchTransfers, approveTransfer, rejectTransfer,
}) => {
  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2"><Building2 size={20} className="text-gold-400" />Transferencias Bancarias</div>
          <Button variant="ghost" size="sm" onClick={fetchTransfers}><RefreshCw size={16} /></Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <select value={transfersFilter.status} onChange={(e) => setTransfersFilter({ ...transfersFilter, status: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" data-testid="transfers-status-filter">
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="awaiting_approval">Aguardando Aprovacao</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="completed">Completo</option>
          </select>
          <select value={transfersFilter.type} onChange={(e) => setTransfersFilter({ ...transfersFilter, type: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" data-testid="transfers-type-filter">
            <option value="">Todos os Tipos</option>
            <option value="deposit">Deposito</option>
            <option value="withdrawal">Saque</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-gold-400" size={32} /></div>
        ) : transfers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhuma transferencia encontrada</p>
        ) : (
          <div className="space-y-3">
            {transfers.map(transfer => (
              <div key={transfer.id} className="bg-zinc-800/50 rounded-lg overflow-hidden" data-testid={`transfer-card-${transfer.id}`}>
                <div className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setExpandedTransfer(expandedTransfer === transfer.id ? null : transfer.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2 py-1 rounded ${transfer.transfer_type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {transfer.transfer_type === 'deposit' ? 'Deposito' : 'Saque'}
                      </span>
                      <div>
                        <span className="text-white font-medium">
                          {transfer.currency} {parseFloat(transfer.amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                        </span>
                        <span className="text-gray-400 ml-2">Ref: {transfer.reference_code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        transfer.status === 'completed' || transfer.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        transfer.status === 'awaiting_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                        transfer.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {transfer.status === 'awaiting_approval' ? 'Aguardando Aprovacao' : transfer.status}
                      </span>
                      {expandedTransfer === transfer.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>
                </div>
                {expandedTransfer === transfer.id && (
                  <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div><span className="text-gray-400 block">Usuario</span><span className="text-white">{transfer.user_email}</span></div>
                      <div><span className="text-gray-400 block">Referencia</span><span className="text-gold-400 font-mono">{transfer.reference_code}</span></div>
                      <div><span className="text-gray-400 block">Data</span><span className="text-white">{formatDate(transfer.created_at, true)}</span></div>
                      {transfer.proof_document_url && (
                        <div className="col-span-full">
                          <span className="text-gray-400 block">Comprovante</span>
                          <a href={transfer.proof_document_url} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">Ver comprovante</a>
                        </div>
                      )}
                    </div>
                    {(transfer.status === 'pending' || transfer.status === 'awaiting_approval') && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => approveTransfer(transfer.id)} data-testid={`approve-transfer-${transfer.id}`}>
                          <CheckCircle size={16} className="mr-1" />Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => rejectTransfer(transfer.id)} data-testid={`reject-transfer-${transfer.id}`}>
                          <XCircle size={16} className="mr-1" />Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransfersTab;
