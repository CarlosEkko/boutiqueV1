import React from 'react';
import { useAdminTrading } from './trading/useAdminTrading';
import CryptoFeesTab from './trading/CryptoFeesTab';
import FiatFeesTab from './trading/FiatFeesTab';
import LimitsTab from './trading/LimitsTab';
import OrdersTab from './trading/OrdersTab';
import TransfersTab from './trading/TransfersTab';
import FiatWithdrawalsTab from './trading/FiatWithdrawalsTab';
import CryptoWithdrawalsTab from './trading/CryptoWithdrawalsTab';
import { Settings, CheckCircle, AlertCircle, Coins, DollarSign, Users } from 'lucide-react';

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
