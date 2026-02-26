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
  AdminOpportunities,
  AdminTransparency,
  AdminInvites,
  AdminKYC,
  RegionalDashboard
} from "./pages/dashboard/admin";
import { KYCStatus, KYCForm, KYBForm } from "./pages/dashboard/kyc";
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider } from "./i18n";
import { AuthProvider, useAuth } from "./context/AuthContext";

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
        
        {/* Admin Routes */}
        <Route path="admin" element={<AdminOverview />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/opportunities" element={<AdminOpportunities />} />
        <Route path="admin/transparency" element={<AdminTransparency />} />
        <Route path="admin/invites" element={<AdminInvites />} />
        <Route path="admin/kyc" element={<AdminKYC />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="App">
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
