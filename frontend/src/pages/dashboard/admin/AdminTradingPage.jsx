import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminTrading } from './trading/useAdminTrading';
import CryptoFeesTab from './trading/CryptoFeesTab';
import FiatFeesTab from './trading/FiatFeesTab';
import LimitsTab from './trading/LimitsTab';
import OrdersTab from './trading/OrdersTab';
import TransfersTab from './trading/TransfersTab';
import FiatWithdrawalsTab from './trading/FiatWithdrawalsTab';
import CryptoWithdrawalsTab from './trading/CryptoWithdrawalsTab';
import { Settings, CheckCircle, AlertCircle, Coins, DollarSign, Users, ArrowRight, Archive } from 'lucide-react';

const TabButton = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button
    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
      activeTab === id
        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
        : 'text-gray-400 hover:text-white hover:bg-zinc-800'
    }`}
    onClick={() => setActiveTab(id)}
    data-testid={`tab-${id}`}
  >
    <Icon size={18} />{label}
  </button>
);

const AdminTradingPage = () => {
  const hook = useAdminTrading();
  const { activeTab, setActiveTab, message } = hook;

  return (
    <div className="space-y-6" data-testid="admin-trading-page">
      <div>
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <Settings className="text-gold-400" />Configuracoes
        </h1>
        <p className="text-gray-400 mt-1">Configure taxas e limites de trading</p>
      </div>

      {/* Migration notice — unified pricing moved to Tarifário Unificado */}
      <div className="rounded-xl border border-amber-700/40 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Archive size={18} />
          </div>
          <div className="flex-1">
            <h3 className="text-amber-200 font-medium text-sm mb-1">
              Página migrada para o Tarifário Unificado
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Os fees por criptomoeda e fiat foram consolidados na nova matriz <strong className="text-gold-400">KBEX Spread</strong> (produto × tier × ativo).
              Esta página mantém-se acessível como <strong>safety-net</strong> durante a transição — edite os fees no novo local para garantir consistência.
            </p>
            <Link
              to="/dashboard/admin/tarifario"
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gold-500 hover:bg-gold-400 text-black font-medium transition-colors"
              data-testid="trading-migrate-banner-cta"
            >
              Abrir Tarifário Unificado <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <TabButton id="crypto-fees" icon={Coins} label="Taxas Crypto" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="fees" icon={DollarSign} label="Taxas Fiat" activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="limits" icon={Users} label="Limites" activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {activeTab === 'crypto-fees' && (
        <CryptoFeesTab
          cryptoFees={hook.cryptoFees} selectedCrypto={hook.selectedCrypto}
          setSelectedCrypto={hook.setSelectedCrypto} cryptoSearch={hook.cryptoSearch}
          setCryptoSearch={hook.setCryptoSearch} savingCrypto={hook.savingCrypto}
          saveCryptoFees={hook.saveCryptoFees} updateCryptoFeeField={hook.updateCryptoFeeField}
        />
      )}

      {activeTab === 'fees' && (
        <FiatFeesTab
          allFees={hook.allFees} selectedFeeCurrency={hook.selectedFeeCurrency}
          setSelectedFeeCurrency={hook.setSelectedFeeCurrency} savingCurrency={hook.savingCurrency}
          saveFees={hook.saveFees} updateFeeField={hook.updateFeeField}
        />
      )}

      {activeTab === 'limits' && (
        <LimitsTab
          limits={hook.limits} selectedTier={hook.selectedTier}
          setSelectedTier={hook.setSelectedTier} saving={hook.saving}
          saveLimits={hook.saveLimits} updateLimitField={hook.updateLimitField}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersTab
          orders={hook.orders} ordersFilter={hook.ordersFilter}
          setOrdersFilter={hook.setOrdersFilter} expandedOrder={hook.expandedOrder}
          setExpandedOrder={hook.setExpandedOrder} loading={hook.loading}
          fetchOrders={hook.fetchOrders} completeOrder={hook.completeOrder}
          cancelOrder={hook.cancelOrder}
        />
      )}

      {activeTab === 'transfers' && (
        <TransfersTab
          transfers={hook.transfers} transfersFilter={hook.transfersFilter}
          setTransfersFilter={hook.setTransfersFilter} expandedTransfer={hook.expandedTransfer}
          setExpandedTransfer={hook.setExpandedTransfer} loading={hook.loading}
          fetchTransfers={hook.fetchTransfers} approveTransfer={hook.approveTransfer}
          rejectTransfer={hook.rejectTransfer}
        />
      )}

      {activeTab === 'withdrawals' && (
        <FiatWithdrawalsTab
          withdrawals={hook.withdrawals} withdrawalsFilter={hook.withdrawalsFilter}
          setWithdrawalsFilter={hook.setWithdrawalsFilter} expandedWithdrawal={hook.expandedWithdrawal}
          setExpandedWithdrawal={hook.setExpandedWithdrawal} loading={hook.loading}
          fetchWithdrawals={hook.fetchWithdrawals} processWithdrawal={hook.processWithdrawal}
          approveWithdrawal={hook.approveWithdrawal} rejectWithdrawal={hook.rejectWithdrawal}
        />
      )}

      {activeTab === 'crypto-withdrawals' && (
        <CryptoWithdrawalsTab
          cryptoWithdrawals={hook.cryptoWithdrawals} cryptoWithdrawalsFilter={hook.cryptoWithdrawalsFilter}
          setCryptoWithdrawalsFilter={hook.setCryptoWithdrawalsFilter}
          expandedCryptoWithdrawal={hook.expandedCryptoWithdrawal}
          setExpandedCryptoWithdrawal={hook.setExpandedCryptoWithdrawal} loading={hook.loading}
          fetchCryptoWithdrawals={hook.fetchCryptoWithdrawals}
          approveCryptoWithdrawal={hook.approveCryptoWithdrawal}
          rejectCryptoWithdrawal={hook.rejectCryptoWithdrawal}
        />
      )}
    </div>
  );
};

export default AdminTradingPage;
