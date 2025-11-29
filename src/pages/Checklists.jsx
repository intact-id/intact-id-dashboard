import { useState, useEffect } from 'react';
import { Building2, Search, Filter, RefreshCw, MoreVertical, ShieldCheck, Globe, Users } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import { useToast } from '../contexts/ToastContext';
import './Checklists.css';

export default function Checklists() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // Simulating API fetch for companies
        setTimeout(() => {
            setCompanies([
                { id: 'CMP-001', name: 'TechCorp Ltd', industry: 'Fintech', region: 'North America', status: 'active', users: 12, verificationLevel: 'Level 3' },
                { id: 'CMP-002', name: 'Global Logistics Inc', industry: 'Logistics', region: 'Europe', status: 'active', users: 45, verificationLevel: 'Level 2' },
                { id: 'CMP-003', name: 'HealthPlus Care', industry: 'Healthcare', region: 'Asia Pacific', status: 'pending_review', users: 8, verificationLevel: 'Level 1' },
                { id: 'CMP-004', name: 'FinanceHub', industry: 'Banking', region: 'North America', status: 'active', users: 150, verificationLevel: 'Level 3' },
                { id: 'CMP-005', name: 'RetailConnect', industry: 'Retail', region: 'South America', status: 'suspended', users: 3, verificationLevel: 'Level 1' },
            ]);
            setLoading(false);
        }, 800);
    }, []);

    const getStatusBadge = (status) => {
        const map = {
            active: 'success',
            pending_review: 'warning',
            suspended: 'error'
        };
        return map[status] || 'info';
    };

    const columns = [
        {
            key: 'id',
            label: 'ID',
            width: '120px',
            render: (value) => <span style={{ fontFamily: 'monospace', color: '#e5e7eb' }}>{value}</span>
        },
        {
            key: 'name',
            label: 'Name',
            render: (value) => <span style={{ fontWeight: 500, color: '#ffffff' }}>{value}</span>
        },
        {
            key: 'industry',
            label: 'Type',
            width: '150px'
        },
        {
            key: 'region',
            label: 'Country',
            width: '150px'
        },
        {
            key: 'status',
            label: 'Status',
            width: '120px',
            render: (value) => (
                <span className={`status-badge ${value}`}>
                    {value === 'pending_review' ? 'PENDING' : value.toUpperCase()}
                </span>
            )
        },
        {
            key: 'verificationLevel',
            label: 'Confidence',
            width: '140px',
            render: (value) => <span>{value === 'Level 3' ? '98.5%' : value === 'Level 2' ? '85.0%' : '45.0%'}</span>
        },
        {
            key: 'users',
            label: 'Date',
            width: '180px',
            render: () => <span>Nov 28, 2024</span>
        },
        {
            key: 'actions',
            label: 'Action',
            width: '100px',
            render: () => (
                <button className="action-btn">
                    View
                </button>
            )
        }
    ];

    const [activeTab, setActiveTab] = useState('all');

    const stats = {
        all: companies.length,
        active: companies.filter(c => c.status === 'active').length,
        pending: companies.filter(c => c.status === 'pending_review').length,
        suspended: companies.filter(c => c.status === 'suspended').length
    };

    const filteredCompanies = activeTab === 'all'
        ? companies
        : companies.filter(c => {
            if (activeTab === 'pending') return c.status === 'pending_review';
            return c.status === activeTab;
        });

    const tabs = [
        { id: 'all', label: 'All', count: stats.all },
        { id: 'active', label: 'Active', count: stats.active },
        { id: 'suspended', label: 'Suspended', count: stats.suspended },
        { id: 'pending', label: 'Pending', count: stats.pending }
    ];

    return (
        <div className="checklists-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        Registered Companies
                    </h1>
                    <p className="page-subtitle">
                        View and manage all registered entities
                    </p>
                </div>
            </div>

            <div className="content-card">
                <div className="card-header">
                    <div className="tabs-list">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label} <span className="tab-count">({tab.count})</span>
                            </button>
                        ))}
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredCompanies}
                    loading={loading}
                    onRowClick={(row) => toast.info(`Clicked ${row.name}`)}
                />
            </div>
        </div>
    );
}
