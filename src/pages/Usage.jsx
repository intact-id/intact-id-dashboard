import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, Gauge, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import apiKeyService from '../services/apiKeyService';
import companyService from '../services/companyService';
import './Usage.css';

export default function Usage() {
    const { user } = useAuth();
    const [usage, setUsage] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isSuperAdmin = useMemo(
        () => Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN'),
        [user?.roles]
    );

    useEffect(() => {
        if (!isSuperAdmin) return;
        loadCompanies();
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!isSuperAdmin) return;
        loadUsage();
    }, [isSuperAdmin, selectedCompanyId]);

    const loadCompanies = async () => {
        try {
            const response = await companyService.getAllCompanies({}, { page: 0, size: 300 });
            if (response.success) {
                setCompanies(response.data.content || []);
            }
        } catch (err) {
            console.error('Error loading companies:', err);
        }
    };

    const loadUsage = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiKeyService.getUsage(selectedCompanyId || undefined);
            if (response.success) {
                setUsage(response.data);
            } else {
                setError(response.responseMessage || 'Failed to load usage');
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to load usage');
        } finally {
            setLoading(false);
        }
    };

    const safePct = (ok = 0, total = 0) => {
        if (!total) return 0;
        return Math.round((ok / total) * 100);
    };

    const totalRequests = (usage?.devTotalRequests || 0) + (usage?.prodTotalRequests || 0);
    const totalSuccess = (usage?.devTotalSuccessfulRequests || 0) + (usage?.prodTotalSuccessfulRequests || 0);
    const totalFailed = (usage?.devTotalFailedRequests || 0) + (usage?.prodTotalFailedRequests || 0);
    const overallSuccessRate = safePct(totalSuccess, totalRequests);

    if (!isSuperAdmin) {
        return (
            <div className="usage-page">
                <div className="page-header">
                    <h1>Usage</h1>
                </div>
                <Card className="usage-restricted">This page is available to `SUPER_ADMIN` users only.</Card>
            </div>
        );
    }

    return (
        <div className="usage-page">
            <div className="page-header usage-header">
                <div>
                    <h1>Usage Overview</h1>
                    <p className="page-subtitle">API consumption and quality metrics across environments.</p>
                </div>
                <div className="usage-controls">
                    <label htmlFor="companyFilter">
                        <Building2 size={14} />
                        <span>Company</span>
                    </label>
                    <select
                        id="companyFilter"
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                    >
                        <option value="">Auto (Your Scope)</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.legalName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="usage-stats-strip">
                <Card className="usage-stat-card">
                    <div className="usage-stat-icon usage-stat-icon--blue"><Activity size={18} /></div>
                    <div><div className="usage-stat-label">Total Requests</div><div className="usage-stat-value">{totalRequests.toLocaleString()}</div></div>
                </Card>
                <Card className="usage-stat-card">
                    <div className="usage-stat-icon usage-stat-icon--green"><CheckCircle2 size={18} /></div>
                    <div><div className="usage-stat-label">Success</div><div className="usage-stat-value">{totalSuccess.toLocaleString()}</div></div>
                </Card>
                <Card className="usage-stat-card">
                    <div className="usage-stat-icon usage-stat-icon--red"><AlertTriangle size={18} /></div>
                    <div><div className="usage-stat-label">Failed</div><div className="usage-stat-value">{totalFailed.toLocaleString()}</div></div>
                </Card>
                <Card className="usage-stat-card">
                    <div className="usage-stat-icon usage-stat-icon--cyan"><Gauge size={18} /></div>
                    <div><div className="usage-stat-label">Success Rate</div><div className="usage-stat-value">{overallSuccessRate}%</div></div>
                </Card>
            </div>

            {loading ? (
                <Card className="usage-empty">Loading usage metrics...</Card>
            ) : error ? (
                <Card className="usage-error">{error}</Card>
            ) : (
                <div className="usage-grid">
                    <Card className="usage-card">
                        <div className="usage-card-header">
                            <h3>Development</h3>
                            <Badge variant="info">DEV</Badge>
                        </div>
                        <div className="usage-metric"><span>Total Requests</span><strong>{(usage?.devTotalRequests || 0).toLocaleString()}</strong></div>
                        <div className="usage-metric"><span>Successful</span><strong>{(usage?.devTotalSuccessfulRequests || 0).toLocaleString()}</strong></div>
                        <div className="usage-metric"><span>Failed</span><strong>{(usage?.devTotalFailedRequests || 0).toLocaleString()}</strong></div>
                        <div className="usage-metric"><span>Success Rate</span><strong>{safePct(usage?.devTotalSuccessfulRequests, usage?.devTotalRequests)}%</strong></div>
                        <div className="usage-metric"><span>Last Used</span><strong>{usage?.devLastUsedAt ? new Date(usage.devLastUsedAt).toLocaleString() : 'Never'}</strong></div>
                        <div className="usage-rate-grid">
                            <div><label>Per Hour</label><strong>{usage?.devRateLimitPerHour || 0}</strong></div>
                            <div><label>Per Day</label><strong>{usage?.devRateLimitPerDay || 0}</strong></div>
                            <div><label>Per Month</label><strong>{usage?.devRateLimitPerMonth || 0}</strong></div>
                        </div>
                    </Card>

                    <Card className="usage-card">
                        <div className="usage-card-header">
                            <h3>Production</h3>
                            <Badge variant="success">PROD</Badge>
                        </div>
                        <div className="usage-metric"><span>Total Requests</span><strong>{(usage?.prodTotalRequests || 0).toLocaleString()}</strong></div>
                        <div className="usage-metric"><span>Successful</span><strong>{(usage?.prodTotalSuccessfulRequests || 0).toLocaleString()}</strong></div>
                        <div className="usage-metric"><span>Failed</span><strong>{(usage?.prodTotalFailedRequests || 0).toLocaleString()}</strong></div>
                        <div className="usage-metric"><span>Success Rate</span><strong>{safePct(usage?.prodTotalSuccessfulRequests, usage?.prodTotalRequests)}%</strong></div>
                        <div className="usage-metric"><span>Last Used</span><strong>{usage?.prodLastUsedAt ? new Date(usage.prodLastUsedAt).toLocaleString() : 'Never'}</strong></div>
                        <div className="usage-rate-grid">
                            <div><label>Per Hour</label><strong>{usage?.prodRateLimitPerHour || 0}</strong></div>
                            <div><label>Per Day</label><strong>{usage?.prodRateLimitPerDay || 0}</strong></div>
                            <div><label>Per Month</label><strong>{usage?.prodRateLimitPerMonth || 0}</strong></div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
