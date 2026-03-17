import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import CryptoATMPage from "./pages/CryptoATMPage";
import MarketsPage from "./pages/MarketsPage";
import TradingPage from "./pages/TradingPage";
import EarnPage from "./pages/EarnPage";
import InstitutionalPage from "./pages/InstitutionalPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import {
  DashboardLayout,
  DashboardOverview,
  WalletsPage,
  TransactionsPage,
  InvestmentsPage,
  ROIPage,
  TransparencyPage
} from "./pages/dashboard";
import {
  AdminOverview,
  AdminUsers,
  AdminStaff,
  AdminOpportunities,
  AdminTransparency,
  AdminInvites,
  AdminKYC,
  RegionalDashboard,
  TicketsDashboard,
  AdminTradingPage,
  AdminPermissions,
  AdminOrders,
  AdminFiatDeposits,
  AdminFiatWithdrawals,
  AdminCryptoWithdrawals,
  AdminClients,
  AdminPipeline,
  AdminSettings,
  AdminReferrals
} from "./pages/dashboard/admin";
import ExchangePage from "./pages/dashboard/ExchangePage";
import FiatDepositPage from "./pages/dashboard/FiatDepositPage";
import FiatWithdrawalPage from "./pages/dashboard/FiatWithdrawalPage";
import CryptoDepositPage from "./pages/dashboard/CryptoDepositPage";
import CryptoWithdrawalPage from "./pages/dashboard/CryptoWithdrawalPage";
import SupportPage from "./pages/dashboard/SupportPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import AdminKnowledgeBase from "./pages/dashboard/admin/AdminKnowledgeBase";
import PublicSupportPage from "./pages/PublicSupportPage";
import { KYCStatus, KYCForm, KYBForm } from "./pages/dashboard/kyc";
import CRMDashboard from "./pages/dashboard/crm/CRMDashboard";
import CRMSuppliers from "./pages/dashboard/crm/CRMSuppliers";
import CRMLeads from "./pages/dashboard/crm/CRMLeads";
import CRMDeals from "./pages/dashboard/crm/CRMDeals";
import CRMContacts from "./pages/dashboard/crm/CRMContacts";
import CRMTasks from "./pages/dashboard/crm/CRMTasks";
import WhitelistPage from "./pages/dashboard/WhitelistPage";
import CryptoTransactionsPage from "./pages/dashboard/CryptoTransactionsPage";
import OnboardingPage from "./pages/OnboardingPage";
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider } from "./i18n";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CurrencyProvider } from "./context/CurrencyContext";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, needsOnboarding, user } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gold-400">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Don't redirect to onboarding if already on onboarding page
  const isOnboardingPage = location.pathname === '/onboarding';
  
  // Redirect to onboarding if user needs it (only for clients, not on onboarding page)
  if (needsOnboarding() && user?.user_type === 'client' && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/crypto-atm" element={<CryptoATMPage />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/trading" element={<TradingPage />} />
      <Route path="/earn" element={<EarnPage />} />
      <Route path="/institutional" element={<InstitutionalPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      } />
      
      {/* Dashboard Routes - Protected */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="wallets" element={<WalletsPage />} />
        <Route path="whitelist" element={<WhitelistPage />} />
        <Route path="crypto-transactions" element={<CryptoTransactionsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="roi" element={<ROIPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
        
        {/* KYC Routes */}
        <Route path="kyc" element={<KYCStatus />} />
        <Route path="kyc/kyc" element={<KYCForm />} />
        <Route path="kyc/kyb" element={<KYBForm />} />
        
        {/* Exchange */}
        <Route path="exchange" element={<ExchangePage />} />
        <Route path="fiat-deposit" element={<FiatDepositPage />} />
        <Route path="fiat-withdrawal" element={<FiatWithdrawalPage />} />
        <Route path="crypto-deposit" element={<CryptoDepositPage />} />
        <Route path="crypto-withdrawal" element={<CryptoWithdrawalPage />} />
        
        {/* Support */}
        <Route path="support" element={<SupportPage />} />
        
        {/* Admin Routes */}
        <Route path="admin" element={<AdminOverview />} />
        <Route path="admin/regional" element={<RegionalDashboard />} />
        <Route path="admin/staff" element={<AdminStaff />} />
        <Route path="admin/tickets" element={<TicketsDashboard />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/opportunities" element={<AdminOpportunities />} />
        <Route path="admin/transparency" element={<AdminTransparency />} />
        <Route path="admin/invites" element={<AdminInvites />} />
        <Route path="admin/kyc" element={<AdminKYC />} />
        <Route path="admin/trading" element={<AdminTradingPage />} />
        <Route path="admin/knowledge-base" element={<AdminKnowledgeBase />} />
        <Route path="admin/permissions" element={<AdminPermissions />} />
        <Route path="admin/orders" element={<AdminOrders />} />
        <Route path="admin/fiat-deposits" element={<AdminFiatDeposits />} />
        <Route path="admin/fiat-withdrawals" element={<AdminFiatWithdrawals />} />
        <Route path="admin/crypto-withdrawals" element={<AdminCryptoWithdrawals />} />
        <Route path="admin/clients" element={<AdminClients />} />
        <Route path="admin/pipeline" element={<AdminPipeline />} />
        <Route path="admin/settings" element={<AdminSettings />} />
        <Route path="admin/referrals" element={<AdminReferrals />} />
        
        {/* CRM Routes */}
        <Route path="crm" element={<CRMDashboard />} />
        <Route path="crm/dashboard" element={<CRMDashboard />} />
        <Route path="crm/suppliers" element={<CRMSuppliers />} />
        <Route path="crm/leads" element={<CRMLeads />} />
        <Route path="crm/deals" element={<CRMDeals />} />
        <Route path="crm/contacts" element={<CRMContacts />} />
        <Route path="crm/tasks" element={<CRMTasks />} />
      </Route>

      {/* Knowledge Base / Help - Public */}
      <Route path="/help" element={<KnowledgeBasePage />} />
      <Route path="/help/:categorySlug" element={<KnowledgeBasePage />} />
      <Route path="/help/article/:articleSlug" element={<KnowledgeBasePage />} />
      
      {/* Public Support Page */}
      <Route path="/support" element={<PublicSupportPage />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CurrencyProvider>
          <div className="App">
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Toaster />
          </div>
        </CurrencyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
