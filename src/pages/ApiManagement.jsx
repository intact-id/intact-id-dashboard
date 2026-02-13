import { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, Copy, Check, RefreshCcw, PauseCircle, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import companyService from '../services/companyService';
import apiKeyService from '../services/apiKeyService';
import credentialsService from '../services/credentialsService';
import './ApiManagement.css';

export default function ApiManagement() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [credential, setCredential] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [copied, setCopied] = useState(null);
    const [error, setError] = useState('');
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatedCredential, setGeneratedCredential] = useState(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const isSuperAdmin = useMemo(
        () => Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN'),
        [user?.roles]
    );

    useEffect(() => {
        fetchCompanies();
    }, [pagination.page, statusFilter]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredCompanies(companies);
            return;
        }
        const query = searchQuery.toLowerCase();
        setFilteredCompanies(
            companies.filter((c) =>
                c.legalName?.toLowerCase().includes(query) ||
                c.registrationNumber?.toLowerCase().includes(query) ||
                c.country?.toLowerCase().includes(query)
            )
        );
    }, [companies, searchQuery]);

    const fetchCompanies = async () => {
        setLoadingCompanies(true);
        setError('');
        try {
            const response = await companyService.getAllCompanies(
                statusFilter === 'all' ? {} : { status: statusFilter },
                { page: pagination.page, size: pagination.size }
            );
            if (response.success) {
                const pageData = response.data;
                const list = pageData.content || [];
                setCompanies(list);
                setFilteredCompanies(list);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: pageData.totalPages || 0,
                    totalElements: pageData.totalElements || 0
                }));
                if (list.length > 0 && !selectedCompany) {
                    await selectCompany(list[0]);
                }
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to load companies');
        } finally {
            setLoadingCompanies(false);
        }
    };

    const selectCompany = async (company) => {
        setSelectedCompany(company);
        setLoadingDetails(true);
        setError('');
        try {
            const [keysResponse, usageResponse] = await Promise.allSettled([
                apiKeyService.getApiKeys(company.id),
                apiKeyService.getUsage(company.id)
            ]);

            if (keysResponse.status === 'fulfilled' && keysResponse.value.success) {
                setCredential(keysResponse.value.data?.[0] || null);
            } else {
                setCredential(null);
            }

            if (usageResponse.status === 'fulfilled' && usageResponse.value.success) {
                setUsage(usageResponse.value.data || null);
            } else {
                setUsage(null);
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to load company API details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const copyValue = async (value, key) => {
        if (!value) return;
        await navigator.clipboard.writeText(value);
        setCopied(key);
        setTimeout(() => setCopied(null), 1200);
    };

    const generateCredentials = async () => {
        if (!selectedCompany) return;
        try {
            const response = await apiKeyService.generateApiKey(selectedCompany.id);
            if (response.success) {
                setGeneratedCredential(response.data);
                setCredential(response.data);
                setShowGenerateModal(true);
                await selectCompany(selectedCompany);
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to generate credentials');
        }
    };

    const openAction = (type) => {
        setActionType(type);
        setActionReason('');
        setShowActionModal(true);
    };

    const confirmAction = async () => {
        if (!selectedCompany) return;
        setActionLoading(true);
        try {
            if (actionType === 'suspend') {
                await credentialsService.suspendCredentials(selectedCompany.id, actionReason || 'Suspended via dashboard');
            } else {
                await credentialsService.activateCredentials(selectedCompany.id);
            }
            setShowActionModal(false);
            await selectCompany(selectedCompany);
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || `Failed to ${actionType} credentials`);
        } finally {
            setActionLoading(false);
        }
    };

    const safePct = (ok = 0, total = 0) => (!total ? 0 : Math.round((ok / total) * 100));

    if (!isSuperAdmin) {
        return (
            <div className="api-management">
                <div className="page-header">
                    <h1>API Key Management</h1>
                </div>
                <Card className="api-empty-state">This page is available to `SUPER_ADMIN` users only.</Card>
            </div>
        );
    }

    return (
        <div className="api-management">
            <div className="page-header">
                <div>
                    <h1>API Key Management</h1>
                    <p className="page-subtitle">Manage company credentials and API usage.</p>
                </div>
                <Button onClick={generateCredentials} disabled={!selectedCompany}>
                    <KeyRound size={16} />
                    Generate Credentials
                </Button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="api-layout">
                <Card className="companies-panel">
                    <div className="panel-header">
                        <h3>Companies</h3>
                        <Badge variant="info">{pagination.totalElements}</Badge>
                    </div>

                    <div className="panel-filters">
                        <input
                            className="panel-input"
                            placeholder="Search company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            className="panel-input"
                            value={statusFilter}
                            onChange={(e) => {
                                setPagination((prev) => ({ ...prev, page: 0 }));
                                setStatusFilter(e.target.value);
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>

                    <div className="panel-table-wrap">
                        {loadingCompanies ? (
                            <div className="loading-state">Loading companies...</div>
                        ) : (
                            <table className="companies-table">
                                <thead>
                                    <tr>
                                        <th>Company</th>
                                        <th>Status</th>
                                        <th>Country</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCompanies.map((company) => (
                                        <tr
                                            key={company.id}
                                            className={selectedCompany?.id === company.id ? 'selected' : ''}
                                            onClick={() => selectCompany(company)}
                                        >
                                            <td>
                                                <div className="company-main">
                                                    <Building2 size={14} />
                                                    <span>{company.legalName}</span>
                                                </div>
                                            </td>
                                            <td><Badge variant={company.status === 'ACTIVE' ? 'success' : 'warning'}>{company.status}</Badge></td>
                                            <td>{company.country || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={pagination.page === 0}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        >
                            Previous
                        </button>
                        <span>Page {pagination.page + 1} of {Math.max(pagination.totalPages, 1)}</span>
                        <button
                            className="pagination-btn"
                            disabled={pagination.page >= pagination.totalPages - 1 || pagination.totalPages === 0}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                        </button>
                    </div>
                </Card>

                <Card className="details-panel">
                    {!selectedCompany ? (
                        <div className="api-empty-state">Select a company to manage credentials.</div>
                    ) : loadingDetails ? (
                        <div className="loading-state">Loading API details...</div>
                    ) : (
                        <div className="details-content">
                            <div className="details-header">
                                <div>
                                    <h2>{selectedCompany.legalName}</h2>
                                    <p>{selectedCompany.registrationNumber || selectedCompany.id}</p>
                                </div>
                                <div className="details-actions">
                                    <Button variant="secondary" onClick={generateCredentials}>
                                        <RefreshCcw size={14} />
                                        Rotate
                                    </Button>
                                    {credential?.status === 'SUSPENDED' ? (
                                        <Button onClick={() => openAction('activate')}>
                                            <PlayCircle size={14} />
                                            Activate
                                        </Button>
                                    ) : (
                                        <Button variant="secondary" onClick={() => openAction('suspend')}>
                                            <PauseCircle size={14} />
                                            Suspend
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="credential-card">
                                <div className="credential-row">
                                    <span>Credential Status</span>
                                    <Badge variant={credential?.status === 'ACTIVE' ? 'success' : 'warning'}>
                                        {credential?.status || 'NOT GENERATED'}
                                    </Badge>
                                </div>
                                <div className="credential-row">
                                    <span>API Key</span>
                                    <div className="secret-wrap">
                                        <code>{credential?.apiKey || 'N/A'}</code>
                                        {credential?.apiKey && (
                                            <button onClick={() => copyValue(credential.apiKey, 'apiKey')}>
                                                {copied === 'apiKey' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="credential-row">
                                    <span>API Secret</span>
                                    <div className="secret-wrap">
                                        <code>{credential?.apiSecret ? `${credential.apiSecret.slice(0, 8)}••••••••••` : 'N/A'}</code>
                                        {credential?.apiSecret && (
                                            <button onClick={() => copyValue(credential.apiSecret, 'apiSecret')}>
                                                {copied === 'apiSecret' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="usage-grid">
                                <div className="usage-box">
                                    <h4>Development Usage</h4>
                                    <div className="usage-row"><span>Total</span><strong>{(usage?.devTotalRequests || 0).toLocaleString()}</strong></div>
                                    <div className="usage-row"><span>Success</span><strong>{(usage?.devTotalSuccessfulRequests || 0).toLocaleString()}</strong></div>
                                    <div className="usage-row"><span>Failed</span><strong>{(usage?.devTotalFailedRequests || 0).toLocaleString()}</strong></div>
                                    <div className="usage-row"><span>Success Rate</span><strong>{safePct(usage?.devTotalSuccessfulRequests, usage?.devTotalRequests)}%</strong></div>
                                </div>
                                <div className="usage-box">
                                    <h4>Production Usage</h4>
                                    <div className="usage-row"><span>Total</span><strong>{(usage?.prodTotalRequests || 0).toLocaleString()}</strong></div>
                                    <div className="usage-row"><span>Success</span><strong>{(usage?.prodTotalSuccessfulRequests || 0).toLocaleString()}</strong></div>
                                    <div className="usage-row"><span>Failed</span><strong>{(usage?.prodTotalFailedRequests || 0).toLocaleString()}</strong></div>
                                    <div className="usage-row"><span>Success Rate</span><strong>{safePct(usage?.prodTotalSuccessfulRequests, usage?.prodTotalRequests)}%</strong></div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {showGenerateModal && generatedCredential && (
                <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Credentials Generated</h3>
                        <p>Copy and store these now. You may not see the full secret again.</p>
                        <div className="generated-row">
                            <span>API Key</span>
                            <code>{generatedCredential.apiKey}</code>
                        </div>
                        <div className="generated-row">
                            <span>API Secret</span>
                            <code>{generatedCredential.apiSecret}</code>
                        </div>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => copyValue(generatedCredential.apiKey, 'generatedKey')}>
                                <Copy size={14} />
                                Copy Key
                            </Button>
                            <Button onClick={() => copyValue(generatedCredential.apiSecret, 'generatedSecret')}>
                                <Copy size={14} />
                                Copy Secret
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showActionModal && (
                <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{actionType === 'suspend' ? 'Suspend Credentials' : 'Activate Credentials'}</h3>
                        <p>
                            {actionType === 'suspend'
                                ? 'Suspending credentials blocks API requests for this company.'
                                : 'Activating credentials restores API access.'}
                        </p>
                        {actionType === 'suspend' && (
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Reason (optional)"
                            />
                        )}
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowActionModal(false)}>Cancel</Button>
                            <Button onClick={confirmAction} disabled={actionLoading}>
                                {actionLoading ? 'Processing...' : (actionType === 'suspend' ? 'Suspend' : 'Activate')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
