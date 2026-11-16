import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Verifications from './pages/Verifications';
import VerificationDetail from './pages/VerificationDetail';
import Documents from './pages/Documents';
import Analytics from './pages/Analytics';
import ApiManagement from './pages/ApiManagement';
import Webhooks from './pages/Webhooks';
import RequestLogs from './pages/RequestLogs';
import UserManagement from './pages/UserManagement';
import Notifications from './pages/Notifications';
import KycReviews from './pages/KycReviews';
import Companies from './pages/Companies';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import RiskModels from './pages/cra/RiskModels';
import Workflows from './pages/workflows/Workflows';
import Services from './pages/services/Services';
import Applications from './pages/Applications';
import WaitingPeople from './pages/WaitingPeople';
import Allowed from './components/Allowed';
import { useAuth } from './contexts/AuthContext';
import { can } from './utils/access';

// The overview for those who may see it; everyone else starts at workflows, which any signed-in person can read
function Home() {
    const { user } = useAuth();
    return can(user, 'overview') ? <Overview /> : <Navigate to="/dashboard/workflows" replace />;
}
import Monitoring from './pages/Monitoring';
import TopUps from './pages/TopUps';
import KybSettings from './pages/KybSettings';
import DataRetention from './pages/DataRetention';
// The builder pulls in the canvas library; load it only when a workflow is opened.
const WorkflowBuilder = lazy(() => import('./pages/workflows/WorkflowBuilder'));
import RiskModelBuilder from './pages/cra/builder/RiskModelBuilder';
import Assessments from './pages/cra/Assessments';
import Screening from './pages/cra/Screening';

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Home />} />
                <Route path="verifications" element={<Allowed to="verifications"><Verifications /></Allowed>} />
                <Route path="verifications/:id" element={<Allowed to="verifications"><VerificationDetail /></Allowed>} />
                <Route path="workflows" element={<Allowed to="workflows"><Workflows /></Allowed>} />
                <Route path="workflows/:id" element={<Suspense fallback={<div className="page"><div className="loading-state">Loading builder…</div></div>}><WorkflowBuilder /></Suspense>} />
                <Route path="documents" element={<Allowed to="documents"><Documents /></Allowed>} />
                <Route path="analytics" element={<Allowed to="analytics"><Analytics /></Allowed>} />

                <Route path="api" element={<Allowed to="api"><ApiManagement /></Allowed>} />
                <Route path="webhooks" element={<Allowed to="webhooks"><Webhooks /></Allowed>} />
                <Route path="logs" element={<Allowed to="logs"><RequestLogs /></Allowed>} />

                <Route path="users" element={<Allowed to="users"><UserManagement /></Allowed>} />
                <Route path="notifications" element={<Allowed to="notifications"><Notifications /></Allowed>} />
                <Route path="kyc-reviews" element={<Allowed to="kyc-reviews"><KycReviews /></Allowed>} />
                <Route path="companies" element={<Allowed to="companies"><Companies /></Allowed>} />
                <Route path="services" element={<Allowed to="services"><Services /></Allowed>} />
                <Route path="applications" element={<Allowed to="applications"><Applications /></Allowed>} />
                <Route path="waiting" element={<Allowed to="waiting"><WaitingPeople /></Allowed>} />
                <Route path="monitoring" element={<Allowed to="monitoring"><Monitoring /></Allowed>} />
                <Route path="top-ups" element={<Allowed to="top-ups"><TopUps /></Allowed>} />
                <Route path="kyb-settings" element={<Allowed to="kyb-settings"><KybSettings /></Allowed>} />
                <Route path="data-retention" element={<Allowed to="data-retention"><DataRetention /></Allowed>} />
                {/* Addresses from the old dashboard */}
                <Route path="approvals" element={<Navigate to="/dashboard/applications" replace />} />
                <Route path="maker-checker" element={<Navigate to="/dashboard/applications" replace />} />
                <Route path="catalog" element={<Navigate to="/dashboard/services" replace />} />
                <Route path="team" element={<Navigate to="/dashboard/users" replace />} />
                <Route path="usage" element={<Navigate to="/dashboard/api" replace />} />

                <Route path="risk-models" element={<Allowed to="risk-models"><RiskModels /></Allowed>} />
                <Route path="risk-models/:id" element={<Allowed to="risk-models"><RiskModelBuilder /></Allowed>} />
                <Route path="assessments" element={<Allowed to="assessments"><Assessments /></Allowed>} />
                <Route path="screening" element={<Allowed to="screening"><Screening /></Allowed>} />

                <Route path="billing" element={<Allowed to="billing"><Billing /></Allowed>} />
                <Route path="settings" element={<Allowed to="settings"><Settings /></Allowed>} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
