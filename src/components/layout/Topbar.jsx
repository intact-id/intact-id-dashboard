import { useLocation } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import { ChevronRight, Search } from 'lucide-react';
import './Topbar.css';

const ROUTE_LABELS = {
    '/dashboard': 'Overview',
    '/dashboard/verifications': 'Verifications',
    '/dashboard/documents': 'Documents',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/api': 'API keys',
    '/dashboard/workflows': 'Workflows',
    '/dashboard/webhooks': 'Webhooks',
    '/dashboard/logs': 'Audit logs',
    '/dashboard/users': 'User management',
    '/dashboard/notifications': 'Notifications',
    '/dashboard/kyc-reviews': 'Manual review',
    '/dashboard/applications': 'Applications',
    '/dashboard/companies': 'Companies',
    '/dashboard/services': 'Services',
    '/dashboard/risk-models': 'Risk models',
    '/dashboard/assessments': 'Assessments',
    '/dashboard/screening': 'Screening',
    '/dashboard/billing': 'Billing & plan',
    '/dashboard/settings': 'Settings',
};

function currentLabel(pathname) {
    if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
    const match = Object.keys(ROUTE_LABELS)
        .filter((p) => pathname.startsWith(p) && p !== '/dashboard')
        .sort((a, b) => b.length - a.length)[0];
    return match ? ROUTE_LABELS[match] : 'Dashboard';
}

export default function Topbar() {
    const { pathname } = useLocation();
    return (
        <div className="topbar">
            <div className="topbar-crumbs">
                <span className="crumb-root">Dashboard</span>
                <ChevronRight size={14} />
                <span className="crumb-current">{currentLabel(pathname)}</span>
            </div>
            <div className="topbar-actions">
                <div className="topbar-search">
                    <Search size={15} />
                    <span>Search verifications</span>
                </div>
                <NotificationBell />
            </div>
        </div>
    );
}
