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
                <Route index element={<Overview />} />
                <Route path="verifications" element={<Verifications />} />
                <Route path="verifications/:id" element={<VerificationDetail />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="workflows/:id" element={<Suspense fallback={<div className="page"><div className="loading-state">Loading builder…</div></div>}><WorkflowBuilder /></Suspense>} />
                <Route path="documents" element={<Documents />} />
                <Route path="analytics" element={<Analytics />} />

                <Route path="api" element={<ApiManagement />} />
                <Route path="webhooks" element={<Webhooks />} />
                <Route path="logs" element={<RequestLogs />} />

                <Route path="users" element={<UserManagement />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="kyc-reviews" element={<KycReviews />} />
                <Route path="companies" element={<Companies />} />
                <Route path="services" element={<Services />} />
                <Route path="applications" element={<Applications />} />
                {/* Addresses from the old dashboard */}
                <Route path="approvals" element={<Navigate to="/dashboard/applications" replace />} />
                <Route path="maker-checker" element={<Navigate to="/dashboard/applications" replace />} />
                <Route path="catalog" element={<Navigate to="/dashboard/services" replace />} />
                <Route path="team" element={<Navigate to="/dashboard/users" replace />} />
                <Route path="usage" element={<Navigate to="/dashboard/api" replace />} />

                <Route path="risk-models" element={<RiskModels />} />
                <Route path="risk-models/:id" element={<RiskModelBuilder />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="screening" element={<Screening />} />

                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
