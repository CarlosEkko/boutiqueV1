import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import {
  Coins, CheckCircle, XCircle, RefreshCw, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDate } from '../../../../utils/formatters';

const CryptoWithdrawalsTab = ({
  cryptoWithdrawals, cryptoWithdrawalsFilter, setCryptoWithdrawalsFilter,
  expandedCryptoWithdrawal, setExpandedCryptoWithdrawal,
  loading, fetchCryptoWithdrawals, approveCryptoWithdrawal, rejectCryptoWithdrawal,
}) => {
  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Coins size={20} className="text-gold-400" />Levantamentos Crypto Pendentes
        </CardTitle>
        <div className="flex items-center gap-2">
          <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-white text-sm"
            value={cryptoWithdrawalsFilter.status} onChange={(e) => setCryptoWithdrawalsFilter({ ...cryptoWithdrawalsFilter, status: e.target.value })}>
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="processing">Processando</option>
            <option value="completed">Concluido</option>
            <option value="failed">Falhado</option>
            <option value="rejected">Rejeitado</option>
          </select>
          <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchCryptoWithdrawals}><RefreshCw size={14} /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gold-400" size={32} /></div>
        ) : cryptoWithdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Coins size={32} className="mx-auto mb-2 opacity-50" /><p>Nenhum levantamento crypto encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cryptoWithdrawals.map(w => (
              <div key={w.id} className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
                <button onClick={() => setExpandedCryptoWithdrawal(expandedCryptoWithdrawal === w.id ? null : w.id)} className="w-full p-4 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center"><Coins size={20} className="text-gold-400" /></div>
                      <div>
                        <div className="font-medium text-white">{w.amount} {w.asset}</div>
                        <div className="text-xs text-gray-400">{w.user_email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        w.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                        w.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {w.status === 'pending' ? 'Pendente' : w.status === 'processing' ? 'Processando' :
                         w.status === 'completed' ? 'Concluido' : w.status === 'rejected' ? 'Rejeitado' : 'Falhado'}
                      </span>
                      {expandedCryptoWithdrawal === w.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </button>
                {expandedCryptoWithdrawal === w.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-700 pt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-400">Quantidade:</span><span className="text-white ml-2">{w.amount} {w.asset}</span></div>
                      <div><span className="text-gray-400">Taxa:</span><span className="text-yellow-400 ml-2">{w.fee_amount?.toFixed(8)} {w.asset}</span></div>
                      <div><span className="text-gray-400">Valor Liquido:</span><span className="text-emerald-400 ml-2">{w.net_amount?.toFixed(8)} {w.asset}</span></div>
                      <div><span className="text-gray-400">Data:</span><span className="text-white ml-2">{formatDate(w.created_at)}</span></div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Endereco Destino:</span>
                      <code className="text-xs text-white bg-zinc-900 px-2 py-1 rounded ml-2 break-all">{w.destination_address}</code>
                    </div>
                    {w.fireblocks_tx_id && (
                      <div className="text-sm"><span className="text-gray-400">TX ID:</span><code className="text-xs text-emerald-400 ml-2">{w.fireblocks_tx_id}</code></div>
                    )}
                    {w.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => approveCryptoWithdrawal(w.id)}>
                          <CheckCircle size={14} className="mr-1" />Aprovar e Enviar
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => rejectCryptoWithdrawal(w.id)}>
                          <XCircle size={14} className="mr-1" />Rejeitar
                        </Button>
                      </div>
                    )}
                    {w.admin_note && (
                      <div className="text-sm bg-zinc-900 p-2 rounded"><span className="text-gray-400">Nota:</span><p className="text-white">{w.admin_note}</p></div>
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

export default CryptoWithdrawalsTab;
