import { useEffect, useMemo, useState } from 'react';
import { Building2, Mail, Phone, Globe, Webhook as WebhookIcon, PauseCircle, PlayCircle, RefreshCcw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { isAdminOrSuperAdmin } from '../utils/roles';
import companyService from '../services/companyService';
import webhookService from '../services/webhookService';
import apiKeyService from '../services/apiKeyService';
import './Companies.css';

export default function Companies() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [communication, setCommunication] = useState(null);
    const [credential, setCredential] = useState(null);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [error, setError] = useState('');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusAction, setStatusAction] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const isAdminUser = useMemo(() => isAdminOrSuperAdmin(user), [user]);

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
            companies.filter((company) =>
                company.legalName?.toLowerCase().includes(query) ||
                company.registrationNumber?.toLowerCase().includes(query) ||
                company.country?.toLowerCase().includes(query)
            )
        );
    }, [searchQuery, companies]);

    const fetchCompanies = async () => {
        setLoadingCompanies(true);
        setError('');
        try {
            const response = await companyService.getAllCompanies(
                statusFilter === 'all' ? {} : { status: statusFilter },
                { page: pagination.page, size: pagination.size }
            );
            if (response.success) {
                const pageData = response.data || {};
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
            const [commResponse, keyResponse] = await Promise.allSettled([
                webhookService.getCompanyCommunication(company.id),
                apiKeyService.getApiKeys(company.id)
            ]);

            if (commResponse.status === 'fulfilled' && commResponse.value.success) {
                setCommunication(commResponse.value.data || null);
            } else {
                setCommunication(null);
            }

            if (keyResponse.status === 'fulfilled' && keyResponse.value.success) {
                setCredential(keyResponse.value.data?.[0] || null);
            } else {
                setCredential(null);
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to load company details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const openStatusAction = (action) => {
        if (!isAdminUser) return;
        setStatusAction(action);
        setActionReason('');
        setShowStatusModal(true);
    };

    const confirmStatusAction = async () => {
        if (!selectedCompany || !isAdminUser) return;
        setActionLoading(true);
        try {
            if (statusAction === 'activate') {
                await companyService.activateCompany(selectedCompany.id);
            } else {
                await companyService.suspendCompany(selectedCompany.id, actionReason || '');
            }
            setShowStatusModal(false);
            await fetchCompanies();
            if (selectedCompany) await selectCompany(selectedCompany);
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || `Failed to ${statusAction} company`);
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const canActivate = selectedCompany?.status === 'SUSPENDED' || selectedCompany?.status === 'INACTIVE';
    const canSuspend = selectedCompany?.status === 'ACTIVE';

    return (
        <div className="companies-page">
            <div className="page-header">
                <div>
                    <h1>Company Management</h1>
                    <p className="page-subtitle">Company profile, communication channels, and API footprint.</p>
                </div>
                <Button variant="secondary" onClick={fetchCompanies}>
                    <RefreshCcw size={14} />
                    Refresh
                </Button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="companies-layout">
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
                            <option value="PENDING">Pending</option>
                            <option value="REJECTED">Rejected</option>
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
                                            <td>
                                                <Badge variant={company.status === 'ACTIVE' ? 'success' : company.status === 'SUSPENDED' ? 'warning' : 'default'}>
                                                    {company.status}
                                                </Badge>
                                            </td>
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
                        <div className="empty-state">Select a company to view details.</div>
                    ) : loadingDetails ? (
                        <div className="loading-state">Loading details...</div>
                    ) : (
                        <div className="details-content">
                            <div className="details-header">
                                <div>
                                    <h2>{selectedCompany.legalName}</h2>
                                    <p>{selectedCompany.registrationNumber || selectedCompany.id}</p>
                                    <div className="details-meta">
                                        <Badge variant={selectedCompany.status === 'ACTIVE' ? 'success' : 'warning'}>
                                            {selectedCompany.status}
                                        </Badge>
                                        <span>Created: {formatDate(selectedCompany.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="details-actions">
                                    {isAdminUser && canSuspend && (
                                        <Button variant="secondary" onClick={() => openStatusAction('suspend')}>
                                            <PauseCircle size={14} />
                                            Suspend
                                        </Button>
                                    )}
                                    {isAdminUser && canActivate && (
                                        <Button onClick={() => openStatusAction('activate')}>
                                            <PlayCircle size={14} />
                                            Activate
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="detail-box">
                                    <h4>Company Details</h4>
                                    <div className="detail-row"><span>Trading Name</span><strong>{selectedCompany.tradingName || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Business Type</span><strong>{selectedCompany.businessType || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Country</span><strong>{selectedCompany.country || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Company Code</span><strong>{selectedCompany.companyIdentifierCode || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Approved At</span><strong>{formatDate(selectedCompany.approvedAt)}</strong></div>
                                </div>

                                <div className="detail-box">
                                    <h4>Communication Channels</h4>
                                    <div className="detail-row"><span><Mail size={14} /> Primary Email</span><strong>{communication?.email || selectedCompany.email || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Phone size={14} /> Primary Phone</span><strong>{communication?.phone || selectedCompany.phone || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Mail size={14} /> Support Email</span><strong>{communication?.supportEmail || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Mail size={14} /> Billing Email</span><strong>{communication?.billingEmail || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Globe size={14} /> Website</span><strong>{communication?.website || selectedCompany.website || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><WebhookIcon size={14} /> Webhook URL</span><strong className="mono">{communication?.webhookUrl || 'Not configured'}</strong></div>
                                    <div className="detail-row"><span>Webhook Enabled</span><strong>{communication?.webhookEnabled ? 'Yes' : 'No'}</strong></div>
                                    <div className="detail-row"><span>Email Notifications</span><strong>{communication?.emailNotifications !== false ? 'Yes' : 'No'}</strong></div>
                                </div>

                                <div className="detail-box">
                                    <h4>API Credentials</h4>
                                    {credential ? (
                                        <>
                                            <div className="detail-row"><span>Status</span><strong>{credential.status || 'N/A'}</strong></div>
                                            <div className="detail-row"><span>Environment</span><strong>{credential.environment || 'N/A'}</strong></div>
                                            <div className="detail-row"><span>Expires At</span><strong>{formatDate(credential.expiresAt)}</strong></div>
                                        </>
                                    ) : (
                                        <p className="text-muted">No credentials generated yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {showStatusModal && selectedCompany && isAdminUser && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{statusAction === 'suspend' ? 'Suspend Company' : 'Activate Company'}</h3>
                        <p>
                            {statusAction === 'suspend'
                                ? 'Suspending will block this company from API access.'
                                : 'Activating will restore this company API access.'}
                        </p>
                        {statusAction === 'suspend' && (
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Reason (optional)"
                            />
                        )}
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmStatusAction} disabled={actionLoading}>
                                {actionLoading ? 'Processing...' : (statusAction === 'suspend' ? 'Suspend' : 'Activate')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
