import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
  AdminPipeline
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
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider } from "./i18n";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CurrencyProvider } from "./context/CurrencyContext";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
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
