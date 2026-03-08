import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useServerTime } from './hooks/useServerTime';
import { activateServerTimeEnforcement } from './utils/serverTimeEnforcement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ImpersonationProvider, useImpersonation } from './contexts/ImpersonationContext';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import AIChatbot from './components/AIChatbot';

// 🔒 Activate server time enforcement
// Ensures database operations use server time, warns if local time detected
// Internal libraries (Supabase, React) can use Date.now() freely
activateServerTimeEnforcement();

// Landing
import LandingPage from './pages/LandingPage';

// Layouts
import UserLayout  from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth
import Login          from './pages/auth/Login';
import Signup         from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword  from './pages/auth/ResetPassword';

// User Pages
import Dashboard       from './pages/user/Dashboard';
import NewEntry        from './pages/user/NewEntry';
import AllEntries      from './pages/user/AllEntries';
import PendingWork     from './pages/user/PendingWork';
import PendingPayments from './pages/user/PendingPayments';
import Invoice         from './pages/user/Invoice';
import CustomerSearch  from './pages/user/CustomerSearch';
import Reports         from './pages/user/Reports';
import Profile         from './pages/user/Profile';

// Admin Pages
import AdminDashboard       from './pages/admin/AdminDashboard';
import AdminUsers           from './pages/admin/AdminUsers';
import AdminServices        from './pages/admin/AdminServices';
import AdminEntries         from './pages/admin/AdminEntries';
import AdminPendingWork     from './pages/admin/AdminPendingWork';
import AdminPendingPayments from './pages/admin/AdminPendingPayments';
import AdminCustomerSearch  from './pages/admin/AdminCustomerSearch';
import AdminReports         from './pages/admin/AdminReports';
import AdminNotifications   from './pages/admin/AdminNotifications';
import AdminSettings        from './pages/admin/AdminSettings';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';

// Wrapper component to ensure server time is initialized
function AppRoutesWithServerTime() {
  const { isLoading: serverTimeLoading, error: serverTimeError } = useServerTime();
  const { user, loading: authLoading } = useAuth();
  const { impersonatedUser } = useImpersonation();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const showUserLayout = !isAdmin || !!impersonatedUser;

  // Show error if server time initialization failed
  if (serverTimeError) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f8f9fa',
      }}>
        <div style={{
          maxWidth: '500px',
          padding: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '15px' }}>⚠️ Server Connection Error</h1>
          <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
            {serverTimeError.message}
          </p>
          <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
            This usually happens when your system clock is incorrect. Please:
          </p>
          <ul style={{ textAlign: 'left', color: '#666', marginBottom: '20px' }}>
            <li>Check your system date and time settings</li>
            <li>Sync your clock with an NTP server</li>
            <li>Refresh the page (<strong>Ctrl+R</strong> or <strong>Cmd+R</strong>)</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Wait for both auth and server time to initialize
  if (authLoading || serverTimeLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/"                element={<LandingPage />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (showUserLayout) {
    return (
      <Routes>
        <Route path="/" element={<UserLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="new-entry"        element={<NewEntry />} />
          <Route path="entries"          element={<AllEntries />} />
          <Route path="pending-work"     element={<PendingWork />} />
          <Route path="pending-payments" element={<PendingPayments />} />
          <Route path="invoice"          element={<Invoice />} />
          <Route path="customer-search"  element={<CustomerSearch />} />
          <Route path="reports"          element={<Reports />} />
          <Route path="profile"          element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index                   element={<AdminDashboard />} />
        <Route path="users"            element={<AdminUsers />} />
        <Route path="services"         element={<AdminServices />} />
        <Route path="entries"          element={<AdminEntries />} />
        <Route path="pending-work"     element={<AdminPendingWork />} />
        <Route path="pending-payments" element={<AdminPendingPayments />} />
        <Route path="customer-search"  element={<AdminCustomerSearch />} />
        <Route path="reports"          element={<AdminReports />} />
        <Route path="notifications"    element={<AdminNotifications />} />
        <Route path="settings"         element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  return <AppRoutesWithServerTime />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <AppRoutes />
              <Toaster position="top-right" richColors />
              <AIChatbot />
            </BrowserRouter>
          </ErrorBoundary>
        </ImpersonationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}