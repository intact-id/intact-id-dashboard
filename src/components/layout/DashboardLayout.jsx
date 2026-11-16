import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    LayoutDashboard, ShieldCheck, FileText, BarChart2, Key, Webhook, Code,
    Users, Bell, ClipboardCheck, Building2, Gauge, ListChecks, Radar, CreditCard,
    Settings, LogOut, Menu, X, Search, ShieldCheck as Logo, Workflow, Boxes, Inbox,
    Hourglass, Briefcase, Archive, BellRing, Banknote,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { roleLabel } from '../../utils/roles';
import { can } from '../../utils/access';
import Topbar from './Topbar';
import './DashboardLayout.css';

const NAV_SECTIONS = [
    {
        title: 'Main',
        items: [
            { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true, access: 'overview' },
            { path: '/dashboard/verifications', label: 'Verifications', icon: ShieldCheck, access: 'verifications' },
            { path: '/dashboard/waiting', label: 'Waiting for people', icon: Hourglass, access: 'waiting' },
            { path: '/dashboard/workflows', label: 'Workflows', icon: Workflow, access: 'workflows' },
            { path: '/dashboard/kyb-settings', label: 'KYB settings', icon: Briefcase, access: 'kyb-settings' },
            { path: '/dashboard/documents', label: 'Documents', icon: FileText, access: 'documents' },
            { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart2, access: 'analytics' },
        ],
    },
    {
        title: 'Developers',
        items: [
            { path: '/dashboard/api', label: 'API Keys', icon: Key, access: 'api' },
            { path: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook, access: 'webhooks' },
            { path: '/dashboard/logs', label: 'Audit Logs', icon: Code, access: 'logs' },
        ],
    },
    {
        title: 'Management',
        items: [
            { path: '/dashboard/users', label: 'User Management', icon: Users, access: 'users' },
            { path: '/dashboard/notifications', label: 'Notifications', icon: Bell, access: 'notifications' },
            { path: '/dashboard/kyc-reviews', label: 'Manual Review', icon: ClipboardCheck, access: 'kyc-reviews' },
            { path: '/dashboard/applications', label: 'Applications', icon: Inbox, access: 'applications' },
            { path: '/dashboard/companies', label: 'Companies', icon: Building2, access: 'companies' },
            { path: '/dashboard/services', label: 'Services', icon: Boxes, access: 'services' },
        ],
    },
    {
        title: 'Customer Risk Assessment',
        items: [
            { path: '/dashboard/risk-models', label: 'Risk Models', icon: Gauge, access: 'risk-models' },
            { path: '/dashboard/assessments', label: 'Assessments', icon: ListChecks, access: 'assessments' },
            { path: '/dashboard/screening', label: 'Screening', icon: Radar, access: 'screening' },
            { path: '/dashboard/monitoring', label: 'Monitoring', icon: BellRing, access: 'monitoring' },
        ],
    },
    {
        title: 'Data protection',
        items: [
            { path: '/dashboard/data-retention', label: 'Data retention', icon: Archive, access: 'data-retention' },
        ],
    },
    {
        title: 'Account',
        items: [
            { path: '/dashboard/billing', label: 'Billing & Plan', icon: CreditCard, access: 'billing' },
            { path: '/dashboard/top-ups', label: 'Top-ups', icon: Banknote, access: 'top-ups' },
            { path: '/dashboard/settings', label: 'Settings', icon: Settings, access: 'settings' },
        ],
    },
];

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path, exact) => (exact ? location.pathname === path : location.pathname.startsWith(path));

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : '';

    return (
        <div className="app-shell">
            <div className="mobile-header">
                <div className="mobile-brand">
                    <Logo size={18} />
                    <span>Intact ID</span>
                </div>
                <button className="icon-btn" onClick={() => setMobileOpen((o) => !o)}>
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar-brand">
                    <span className="brand-mark"><Logo size={16} /></span>
                    <span className="wordmark">Intact ID</span>
                </div>

                <button className="sidebar-search" type="button">
                    <Search size={14} />
                    <span>Search docs</span>
                </button>

                <nav className="sidebar-nav">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.title} className="nav-group">
                            <div className="nav-label">{section.title}</div>
                            <ul>
                                {section.items.filter((item) => can(user, item.access)).map((item) => (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`nav-link ${isActive(item.path, item.exact) ? 'is-active' : ''}`}
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <item.icon size={17} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <span className="avatar">{initials}</span>
                        <div className="user-text">
                            <div className="user-name">{user ? `${user.firstName} ${user.lastName}` : ''}</div>
                            <div className="user-role">{roleLabel(user)}</div>
                        </div>
                        <button className="icon-btn" onClick={handleLogout} aria-label="Log out">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="app-main">
                <Topbar />
                <Outlet />
            </main>

            {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
        </div>
    );
}
