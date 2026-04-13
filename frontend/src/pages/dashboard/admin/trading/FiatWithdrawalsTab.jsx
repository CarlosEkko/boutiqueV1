import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import {
  ArrowDownToLine, CheckCircle, XCircle, Clock, RefreshCw, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDate } from '../../../../utils/formatters';
import { SUPPORTED_CURRENCIES } from './useAdminTrading';

const FiatWithdrawalsTab = ({
  withdrawals, withdrawalsFilter, setWithdrawalsFilter, expandedWithdrawal, setExpandedWithdrawal,
  loading, fetchWithdrawals, processWithdrawal, approveWithdrawal, rejectWithdrawal,
}) => {
  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <ArrowDownToLine size={20} className="text-gold-400" />Pedidos de Levantamento
          </CardTitle>
          <div className="flex gap-2">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              value={withdrawalsFilter.status} onChange={(e) => setWithdrawalsFilter({...withdrawalsFilter, status: e.target.value})}>
              <option value="">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="processing">Em Processamento</option>
              <option value="completed">Concluido</option>
              <option value="rejected">Rejeitado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
              value={withdrawalsFilter.currency} onChange={(e) => setWithdrawalsFilter({...withdrawalsFilter, currency: e.target.value})}>
              <option value="">Todas as Moedas</option>
              {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchWithdrawals}><RefreshCw size={16} /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gold-400" size={32} /></div>
        ) : withdrawals.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhum pedido de levantamento encontrado</p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map(withdrawal => (
              <div key={withdrawal.id} className="bg-zinc-800/50 rounded-lg overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setExpandedWithdrawal(expandedWithdrawal === withdrawal.id ? null : withdrawal.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{SUPPORTED_CURRENCIES.find(c => c.code === withdrawal.currency)?.flag}</span>
                      <div>
                        <span className="text-white font-medium">{withdrawal.amount?.toFixed(2)} {withdrawal.currency}</span>
                        <span className="text-gray-400 ml-2 text-sm">(Liquido: {withdrawal.net_amount?.toFixed(2)})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">{withdrawal.user_email}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        withdrawal.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                        withdrawal.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {withdrawal.status === 'pending' ? 'Pendente' : withdrawal.status === 'processing' ? 'Processando' :
                         withdrawal.status === 'completed' ? 'Concluido' : withdrawal.status === 'rejected' ? 'Rejeitado' :
                         withdrawal.status === 'cancelled' ? 'Cancelado' : withdrawal.status}
                      </span>
                      {expandedWithdrawal === withdrawal.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>
                </div>
                {expandedWithdrawal === withdrawal.id && (
                  <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div><p className="text-gray-400">Valor Bruto</p><p className="text-white">{withdrawal.amount?.toFixed(2)} {withdrawal.currency}</p></div>
                      <div><p className="text-gray-400">Taxa</p><p className="text-white">{withdrawal.fee_amount?.toFixed(2)} {withdrawal.currency}</p></div>
                      <div><p className="text-gray-400">Valor Liquido</p><p className="text-green-400">{withdrawal.net_amount?.toFixed(2)} {withdrawal.currency}</p></div>
                      <div><p className="text-gray-400">Data do Pedido</p><p className="text-white">{formatDate(withdrawal.created_at, true)}</p></div>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
                      <h4 className="text-gold-400 font-medium mb-2">Dados Bancarios do Cliente</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-400">Banco</p><p className="text-white">{withdrawal.bank_name}</p></div>
                        <div><p className="text-gray-400">Titular</p><p className="text-white">{withdrawal.account_holder}</p></div>
                        {withdrawal.iban && <div><p className="text-gray-400">IBAN</p><p className="text-white font-mono">{withdrawal.iban}</p></div>}
                        {withdrawal.swift_bic && <div><p className="text-gray-400">SWIFT/BIC</p><p className="text-white font-mono">{withdrawal.swift_bic}</p></div>}
                        {withdrawal.account_number && <div><p className="text-gray-400">Nr Conta</p><p className="text-white">{withdrawal.account_number}</p></div>}
                        {withdrawal.routing_number && <div><p className="text-gray-400">Routing Number</p><p className="text-white">{withdrawal.routing_number}</p></div>}
                      </div>
                    </div>
                    {withdrawal.rejection_reason && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                        <p className="text-red-400 text-sm">Motivo da rejeicao: {withdrawal.rejection_reason}</p>
                      </div>
                    )}
                    {withdrawal.transaction_reference && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                        <p className="text-green-400 text-sm">Referencia: {withdrawal.transaction_reference}</p>
                      </div>
                    )}
                    {(withdrawal.status === 'pending' || withdrawal.status === 'processing') && (
                      <div className="flex gap-2">
                        {withdrawal.status === 'pending' && (
                          <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => processWithdrawal(withdrawal.id)}>
                            <Clock size={16} className="mr-1" />Marcar Processando
                          </Button>
                        )}
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => { const ref = window.prompt('Referencia da transferencia (opcional):'); approveWithdrawal(withdrawal.id, ref); }}>
                          <CheckCircle size={16} className="mr-1" />Aprovar e Concluir
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => rejectWithdrawal(withdrawal.id)}>
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

export default FiatWithdrawalsTab;
