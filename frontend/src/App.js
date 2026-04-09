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
  AdminReferrals,
  AdminAdmissionFees,
  AdminClientMenus,
  SecurityDashboardPage,
  AdminKBEXRates,
  AdminEscrowFees
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
import SumsubKYC from "./pages/dashboard/kyc/SumsubKYC";
import CRMDashboard from "./pages/dashboard/crm/CRMDashboard";
import CRMSuppliers from "./pages/dashboard/crm/CRMSuppliers";
import CRMLeads from "./pages/dashboard/crm/CRMLeads";
import CRMDeals from "./pages/dashboard/crm/CRMDeals";
import CRMContacts from "./pages/dashboard/crm/CRMContacts";
import CRMTasks from "./pages/dashboard/crm/CRMTasks";
import CRMClients from "./pages/dashboard/crm/CRMClients";
import CRMAdvancedDashboard from "./pages/dashboard/crm/CRMAdvancedDashboard";
import TeamHub from "./pages/dashboard/team/TeamHub";
import TeamHubDashboard from "./pages/dashboard/team/TeamHubDashboard";
import O365Callback from "./pages/auth/O365Callback";
import OTCDashboard from "./pages/dashboard/otc/OTCDashboard";
import OTCLeads from "./pages/dashboard/otc/OTCLeads";
import OTCPipeline from "./pages/dashboard/otc/OTCPipeline";
import OTCQuotes from "./pages/dashboard/otc/OTCQuotes";
import OTCExecution from "./pages/dashboard/otc/OTCExecution";
import OTCSettlement from "./pages/dashboard/otc/OTCSettlement";
import OTCPrototypes from "./pages/prototypes/OTCPrototypes";
import OTCDealsPage from "./pages/dashboard/crm/OTCDealsPage";
import CommissionsPage from "./pages/dashboard/crm/CommissionsPage";
import CompliancePage from "./pages/dashboard/crm/CompliancePage";
import KYTForensicPage from "./pages/dashboard/risk/KYTForensicPage";
import RiskDashboardPage from "./pages/dashboard/risk/RiskDashboardPage";
import KYCVerificationsPage from "./pages/dashboard/risk/KYCVerificationsPage";
import OTCInvoices from "./pages/dashboard/otc/OTCInvoices";
import OTCClients from "./pages/dashboard/otc/OTCClients";
import ClientOTCPortal from "./pages/dashboard/ClientOTCPortal";
import WhitelistPage from "./pages/dashboard/WhitelistPage";
import CryptoTransactionsPage from "./pages/dashboard/CryptoTransactionsPage";
import OnboardingPage from "./pages/OnboardingPage";
import BankAccountsPage from "./pages/dashboard/BankAccountsPage";
import SecurityPage from "./pages/dashboard/SecurityPage";
import AdminBankAccounts from "./pages/dashboard/admin/AdminBankAccounts";
import AdminCompanyAccounts from "./pages/dashboard/admin/AdminCompanyAccounts";
import FinancialDashboard from "./pages/dashboard/admin/FinancialDashboard";
import BalanceAdjustmentsPage from "./pages/dashboard/finance/BalanceAdjustmentsPage";
import AdminMultiSignClients from "./pages/dashboard/admin/AdminMultiSignClients";
import RegisterPage from "./pages/RegisterPage";
import StakingPage from "./pages/dashboard/investments/StakingPage";
import TokenizationPage from "./pages/dashboard/investments/TokenizationPage";
import TokensListPage from "./pages/dashboard/tokenization/TokensListPage";
import IssueTokenPage from "./pages/dashboard/tokenization/IssueTokenPage";
import MintBurnPage from "./pages/dashboard/tokenization/MintBurnPage";
import TokenPricingPage from "./pages/dashboard/tokenization/TokenPricingPage";
import TokenManagementPage from "./pages/dashboard/tokenization/TokenManagementPage";
import ApprovalsPage from "./pages/dashboard/approvals/ApprovalsPage";
import ApprovalDetailPage from "./pages/dashboard/approvals/ApprovalDetailPage";
import ApprovalSettingsPage from "./pages/dashboard/approvals/ApprovalSettingsPage";
import VaultDashboard from "./pages/dashboard/vault/VaultDashboard";
import VaultTransactionDetail from "./pages/dashboard/vault/VaultTransactionDetail";
import VaultSignatories from "./pages/dashboard/vault/VaultSignatories";
import VaultCreateTransaction from "./pages/dashboard/vault/VaultCreateTransaction";
import VaultWallets from "./pages/dashboard/vault/VaultWallets";
import EscrowDashboard from "./pages/dashboard/escrow/EscrowDashboard";
import EscrowDeals from "./pages/dashboard/escrow/EscrowDeals";
import FeeLedger from "./pages/dashboard/escrow/FeeLedger";
import EscrowReports from "./pages/dashboard/escrow/EscrowReports";
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider } from "./i18n";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { DemoProvider } from "./context/DemoContext";
import { ThemeProvider } from "./context/ThemeContext";

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
      <Route path="/auth/o365/callback" element={<O365Callback />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/prototypes/otc" element={<OTCPrototypes />} />
      <Route path="/login" element={<AuthPage />} />
      {/* Redirect old /profile to new location */}
      <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
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
        <Route path="staking" element={<StakingPage />} />
        <Route path="tokenization" element={<TokensListPage />} />
        <Route path="tokenization/issue" element={<IssueTokenPage />} />
        <Route path="tokenization/mint-burn" element={<MintBurnPage />} />
        <Route path="tokenization/pricing" element={<TokenPricingPage />} />
        <Route path="tokenization/management" element={<TokenManagementPage />} />
        <Route path="roi" element={<ROIPage />} />
        <Route path="transparency" element={<TransparencyPage />} />
        
        {/* Profile Route - inside dashboard layout */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="bank-accounts" element={<BankAccountsPage />} />
        <Route path="security" element={<SecurityPage />} />
        
        {/* KYC Routes */}
        <Route path="kyc" element={<KYCStatus />} />
        <Route path="kyc/kyc" element={<SumsubKYC />} />
        <Route path="kyc/kyb" element={<KYBForm />} />
        <Route path="kyc/sumsub" element={<SumsubKYC />} />
        <Route path="kyc/individual" element={<SumsubKYC />} />
        
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
        <Route path="admin/security" element={<SecurityDashboardPage />} />
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
                <Route path="admin/kbex-rates" element={<AdminKBEXRates />} />
                <Route path="admin/escrow-fees" element={<AdminEscrowFees />} />
        <Route path="admin/referrals" element={<AdminReferrals />} />
        <Route path="admin/admission-fees" element={<AdminAdmissionFees />} />
        <Route path="admin/client-menus" element={<AdminClientMenus />} />
        <Route path="admin/bank-accounts" element={<AdminBankAccounts />} />
        <Route path="admin/company-accounts" element={<AdminCompanyAccounts />} />
        <Route path="admin/finance" element={<FinancialDashboard />} />
        <Route path="finance/balance-adjustments" element={<BalanceAdjustmentsPage />} />
        <Route path="admin/multisign-clients" element={<AdminMultiSignClients />} />
        
        {/* CRM Routes */}
        <Route path="crm" element={<CRMDashboard />} />
        <Route path="crm/dashboard" element={<CRMDashboard />} />
        <Route path="crm/advanced" element={<CRMAdvancedDashboard />} />
        <Route path="crm/suppliers" element={<CRMSuppliers />} />
        <Route path="crm/leads" element={<CRMLeads />} />
        <Route path="crm/deals" element={<CRMDeals />} />
        <Route path="crm/contacts" element={<CRMContacts />} />
        <Route path="crm/tasks" element={<CRMTasks />} />
        <Route path="crm/clients" element={<CRMClients />} />
        <Route path="crm/otc-deals" element={<OTCDealsPage />} />
        <Route path="crm/commissions" element={<CommissionsPage />} />
        <Route path="crm/compliance/:dealId" element={<CompliancePage />} />
        
        {/* Risk & Compliance Routes */}
        <Route path="risk/dashboard" element={<RiskDashboardPage />} />
        <Route path="risk/kyc-verifications" element={<KYCVerificationsPage />} />
        <Route path="risk/kyt-forensic" element={<KYTForensicPage />} />
        
        {/* OTC Desk Routes */}
        <Route path="otc" element={<OTCDashboard />} />

        {/* Team Hub */}
        <Route path="team-hub" element={<TeamHub />} />
        <Route path="team-hub/dashboard" element={<TeamHubDashboard />} />
        <Route path="otc/leads" element={<OTCLeads />} />
        <Route path="otc/pipeline" element={<OTCPipeline />} />
        <Route path="otc/quotes" element={<OTCQuotes />} />
        <Route path="otc/execution" element={<OTCExecution />} />
        <Route path="otc/settlement" element={<OTCSettlement />} />
        <Route path="otc/invoices" element={<OTCInvoices />} />
        <Route path="otc/clients" element={<OTCClients />} />
        <Route path="otc/deals" element={<OTCPipeline />} />
        
        {/* Client OTC Portal */}
        <Route path="otc-trading" element={<ClientOTCPortal />} />

        {/* Multi-Sign Approvals (Internal) */}
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="approvals/settings" element={<ApprovalSettingsPage />} />
        <Route path="approvals/:id" element={<ApprovalDetailPage />} />

        {/* Vault Multi-Sign (Client) */}
        <Route path="vault" element={<VaultDashboard />} />
        <Route path="vault/wallets" element={<VaultWallets />} />
        <Route path="vault/new" element={<VaultCreateTransaction />} />
        <Route path="vault/signatories" element={<VaultSignatories />} />
        <Route path="vault/:id" element={<VaultTransactionDetail />} />

        {/* Escrow Routes */}
        <Route path="escrow" element={<EscrowDashboard />} />
        <Route path="escrow/deals" element={<EscrowDeals />} />
        <Route path="escrow/fees" element={<FeeLedger />} />
        <Route path="escrow/reports" element={<EscrowReports onBack={() => window.history.back()} />} />
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
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CurrencyProvider>
            <DemoProvider>
              <div className="App">
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
                <Toaster />
              </div>
            </DemoProvider>
          </CurrencyProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
