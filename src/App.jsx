import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
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
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Layouts
const UserLayout  = lazy(() => import('./layouts/UserLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// Auth
const Login          = lazy(() => import('./pages/auth/Login'));
const Signup         = lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/auth/ResetPassword'));

// User Pages
const Dashboard       = lazy(() => import('./pages/user/Dashboard'));
const NewEntry        = lazy(() => import('./pages/user/NewEntry'));
const AllEntries      = lazy(() => import('./pages/user/AllEntries'));
const PendingWork     = lazy(() => import('./pages/user/PendingWork'));
const PendingPayments = lazy(() => import('./pages/user/PendingPayments'));
const Invoice         = lazy(() => import('./pages/user/Invoice'));
const CustomerSearch  = lazy(() => import('./pages/user/CustomerSearch'));
const Reports         = lazy(() => import('./pages/user/Reports'));
const Profile         = lazy(() => import('./pages/user/Profile'));

// Admin Pages
const AdminDashboard       = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers           = lazy(() => import('./pages/admin/AdminUsers'));
const AdminServices        = lazy(() => import('./pages/admin/AdminServices'));
const AdminEntries         = lazy(() => import('./pages/admin/AdminEntries'));
const AdminPendingWork     = lazy(() => import('./pages/admin/AdminPendingWork'));
const AdminPendingPayments = lazy(() => import('./pages/admin/AdminPendingPayments'));
const AdminCustomerSearch  = lazy(() => import('./pages/admin/AdminCustomerSearch'));
const AdminReports         = lazy(() => import('./pages/admin/AdminReports'));
const AdminNotifications   = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSettings        = lazy(() => import('./pages/admin/AdminSettings'));

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
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/"                element={<LandingPage />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/signup"          element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Allow reset-password route even when logged in (for password recovery flow)
  if (window.location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/reset-password" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (showUserLayout) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
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
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
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
    </Suspense>
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