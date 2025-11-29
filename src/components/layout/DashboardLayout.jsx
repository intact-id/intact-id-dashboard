import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard,
    ShieldCheck,
    Key,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    User,
    FileText,
    Users,
    Bell,
    Activity,
    Code,
    Webhook,
    BookOpen,
    LifeBuoy,
    ShieldAlert,
    FileCheck,
    MessageSquare,
    DollarSign,
    BarChart2,
    AlertTriangle,
    CheckCircle,
    ClipboardCheck
} from 'lucide-react';
import './DashboardLayout.css';
import logoIcon from '../../assets/intact-logo.svg';
import { useState } from 'react';

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // State for collapsible sections
    const [expandedSections, setExpandedSections] = useState({
        'Developers': true,
        'Management': true,
        'Settings': true
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const toggleSection = (sectionTitle) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionTitle]: !prev[sectionTitle]
        }));
    };

    const navSections = [
        {
            title: 'Main',
            items: [
                { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
                { path: '/dashboard/verifications', label: 'Verifications', icon: ShieldCheck },
                { path: '/dashboard/documents', label: 'Documents', icon: FileText },
                { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
            ]
        },
        {
            title: 'Developers',
            collapsible: true,
            items: [
                { path: '/dashboard/api', label: 'API Keys', icon: Key },
                { path: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook, comingSoon: true },
                { path: '/dashboard/logs', label: 'Request Logs', icon: Code, comingSoon: true },
            ]
        },
        {
            title: 'Management',
            collapsible: true,
            items: [
                { path: '/dashboard/team', label: 'Team Members', icon: Users, comingSoon: true },
                { path: '/dashboard/notifications', label: 'Notifications', icon: Bell, comingSoon: true },
                { path: '/dashboard/checklists', label: 'Checklists', icon: ShieldAlert },
                { path: '/dashboard/approvals', label: 'Approvals', icon: ClipboardCheck },
            ]
        },
        {
            title: 'Settings',
            collapsible: true,
            items: [
                { path: '/dashboard/billing', label: 'Billing & Plan', icon: CreditCard },
                { path: '/dashboard/settings', label: 'Settings', icon: Settings },
            ]
        }
    ];

    const isActive = (path, exact = false) => {
        if (exact) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="dashboard-layout">
            {/* Mobile Header */}
            <div className="mobile-header">
                <div className="mobile-logo">
                    <img src={logoIcon} alt="Intact ID" className="mobile-logo-img" />
                    <span className="mobile-logo-text">Intact ID</span>
                </div>
                <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo-container">
                        <img src={logoIcon} alt="Intact ID" className="sidebar-logo-img" />
                        <h1 className="sidebar-logo-text">
                            <span className="logo-text">Intact</span>
                            <span className="logo-accent">ID</span>
                        </h1>
                    </div>
                    <p className="sidebar-tagline">Identity Verification Platform</p>
                </div>

                <nav className="sidebar-nav">
                    {navSections.map((section, index) => (
                        <div key={index} className="nav-section">
                            {section.collapsible ? (
                                <div
                                    className="nav-section-header"
                                    onClick={() => toggleSection(section.title)}
                                >
                                    <span className="nav-section-label">{section.title}</span>
                                    {expandedSections[section.title] ?
                                        <ChevronDown size={14} className="section-chevron" /> :
                                        <ChevronRight size={14} className="section-chevron" />
                                    }
                                </div>
                            ) : (
                                <div className="nav-section-header nav-section-header--static">
                                    <span className="nav-section-label">{section.title}</span>
                                </div>
                            )}

                            {(!section.collapsible || expandedSections[section.title]) && (
                                <ul className="nav-list">
                                    {section.items.map((item) => (
                                        <li key={item.path} className="nav-item">
                                            <Link
                                                to={item.path}
                                                className={`nav-link ${isActive(item.path, item.exact) ? 'nav-link--active' : ''} ${item.comingSoon ? 'nav-link--disabled' : ''}`}
                                                onClick={(e) => {
                                                    if (item.comingSoon) e.preventDefault();
                                                    setIsMobileMenuOpen(false);
                                                }}
                                            >
                                                <item.icon className="nav-icon" size={18} />
                                                <span className="nav-label">{item.label}</span>
                                                {isActive(item.path, item.exact) && <ChevronRight className="nav-arrow" size={16} />}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            <span className="user-initials">FK</span>
                        </div>
                        <div className="user-info">
                            <div className="user-name">Frank Kinyanjui</div>
                            <div className="user-email">{user?.email || 'frank.mwangi@dadanadagrou...'}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn-full">
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content bg-[#000000]">
                <div className="content-container">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}
        </div>
    );
}
