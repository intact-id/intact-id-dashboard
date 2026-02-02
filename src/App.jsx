import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/Toast';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Verifications from './pages/Verifications';
import ApiManagement from './pages/ApiManagement';
import Webhooks from './pages/Webhooks';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Documents from './pages/Documents';
import Analytics from './pages/Analytics';
import VerificationDetail from './pages/VerificationDetail';
import Checklists from './pages/Checklists';
import Approvals from './pages/Approvals';
import Companies from './pages/Companies';
import Notifications from './pages/Notifications';
import TeamMembers from './pages/TeamMembers';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#d1d5db'
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

// Public Route (redirect if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#d1d5db'
      }}>
        Loading...
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Overview />} />
        <Route path="verifications" element={<Verifications />} />
        <Route path="verifications/:id" element={<VerificationDetail />} />
        <Route path="documents" element={<Documents />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="companies" element={<Companies />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="team" element={<TeamMembers />} />
        <Route path="api" element={<ApiManagement />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

