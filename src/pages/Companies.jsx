import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { Building2, Search, Edit3, Trash2, Ban, CheckCircle, Eye, PauseCircle, PlayCircle, Mail, Phone, Globe, Webhook as WebhookIcon, Key, Shield } from 'lucide-react';
import companyService from '../services/companyService';
import webhookService from '../services/webhookService';
import apiKeyService from '../services/apiKeyService';
import './Companies.css';

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 20,
        totalPages: 0,
        totalElements: 0
    });

    // Modal states
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusAction, setStatusAction] = useState(null); // 'activate' or 'suspend'
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Notification modal
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Edit form state
    const [editForm, setEditForm] = useState({
        tradingName: '',
        businessType: '',
        email: '',
        phone: '',
        website: '',
        secondaryEmail: '',
        secondaryPhone: '',
        supportEmail: '',
        billingEmail: ''
    });

    useEffect(() => {
        fetchCompanies();
    }, [pagination.page, statusFilter]);

    useEffect(() => {
        filterCompanies();
    }, [searchQuery, companies]);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const filters = statusFilter !== 'all' ? { status: statusFilter.toUpperCase() } : {};
            const response = await companyService.getAllCompanies(
                filters,
                { page: pagination.page, size: pagination.size }
            );

            if (response.success) {
                const companiesList = response.data.content || [];
                setCompanies(companiesList);
                setFilteredCompanies(companiesList);
                setPagination(prev => ({
                    ...prev,
                    totalPages: response.data.totalPages,
                    totalElements: response.data.totalElements
                }));
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
            showNotification('Failed to load companies', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterCompanies = () => {
        if (!searchQuery.trim()) {
            setFilteredCompanies(companies);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = companies.filter(company =>
            company.legalName?.toLowerCase().includes(query) ||
            company.tradingName?.toLowerCase().includes(query) ||
            company.registrationNumber?.toLowerCase().includes(query) ||
            company.country?.toLowerCase().includes(query) ||
            company.companyIdentifierCode?.toLowerCase().includes(query)
        );
        setFilteredCompanies(filtered);
    };

    // Company details state for view modal
    const [companyDetails, setCompanyDetails] = useState(null);
    const [communicationDetails, setCommunicationDetails] = useState(null);
    const [credentialsDetails, setCredentialsDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const showNotification = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotificationModal(true);
    };

    const handleViewCompany = async (company) => {
        setSelectedCompany(company);
        setCompanyDetails(company);
        setShowViewModal(true);
        setDetailsLoading(true);

        // Fetch communication details
        try {
            const commResponse = await webhookService.getCompanyCommunication(company.id);
            if (commResponse.success) {
                setCommunicationDetails(commResponse.data);
            }
        } catch (error) {
            console.error('Error fetching communication:', error);
        }

        // Fetch credentials details
        try {
            const credsResponse = await apiKeyService.getApiKeys(company.id);
            if (credsResponse.success && credsResponse.data) {
                setCredentialsDetails(credsResponse.data[0] || null);
            }
        } catch (error) {
            console.error('Error fetching credentials:', error);
        }

        setDetailsLoading(false);
    };

    const handleEditCompany = async (company) => {
        setSelectedCompany(company);
        setActionLoading(true);

        // Fetch communication details first
        try {
            const commResponse = await webhookService.getCompanyCommunication(company.id);
            const commData = commResponse.success ? commResponse.data : {};

            setEditForm({
                tradingName: company.tradingName || '',
                businessType: company.businessType || '',
                email: commData.email || '',
                phone: commData.phone || '',
                website: commData.website || '',
                secondaryEmail: commData.secondaryEmail || '',
                secondaryPhone: commData.secondaryPhone || '',
                supportEmail: commData.supportEmail || '',
                billingEmail: commData.billingEmail || ''
            });
        } catch (error) {
            console.error('Error fetching communication details:', error);
            // Set defaults if fetch fails
            setEditForm({
                tradingName: company.tradingName || '',
                businessType: company.businessType || '',
                email: '',
                phone: '',
                website: '',
                secondaryEmail: '',
                secondaryPhone: '',
                supportEmail: '',
                billingEmail: ''
            });
        }

        setActionLoading(false);
        setShowEditModal(true);
    };

    const handleUpdateCompany = async () => {
        if (!selectedCompany) return;

        setActionLoading(true);
        try {
            const response = await companyService.updateCompany(selectedCompany.id, editForm);

            if (response.success) {
                setShowEditModal(false);
                fetchCompanies();
                showNotification('Company updated successfully', 'success');
            } else {
                showNotification('Failed to update company: ' + response.responseMessage, 'error');
            }
        } catch (error) {
            console.error('Error updating company:', error);
            showNotification('Failed to update company: ' + (error.response?.data?.errorMessage || error.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCompany = (company) => {
        setSelectedCompany(company);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedCompany) return;

        setActionLoading(true);
        try {
            const response = await companyService.deleteCompany(selectedCompany.id);

            if (response.success) {
                setShowDeleteModal(false);
                fetchCompanies();
                showNotification('Company deleted successfully', 'success');
            } else {
                showNotification('Failed to delete company: ' + response.responseMessage, 'error');
            }
        } catch (error) {
            console.error('Error deleting company:', error);
            showNotification('Failed to delete company: ' + (error.response?.data?.errorMessage || error.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusChange = (company, action) => {
        setSelectedCompany(company);
        setStatusAction(action);
        setActionReason('');
        setShowStatusModal(true);
    };

    const confirmStatusChange = async () => {
        if (!selectedCompany) return;

        setActionLoading(true);
        try {
            let response;
            if (statusAction === 'activate') {
                response = await companyService.activateCompany(selectedCompany.id);
            } else if (statusAction === 'suspend') {
                response = await companyService.suspendCompany(selectedCompany.id, actionReason);
            }

            if (response.success) {
                setShowStatusModal(false);
                fetchCompanies();
                showNotification(`Company ${statusAction}d successfully`, 'success');
            } else {
                showNotification(`Failed to ${statusAction} company: ` + response.responseMessage, 'error');
            }
        } catch (error) {
            console.error(`Error ${statusAction}ing company:`, error);
            showNotification(`Failed to ${statusAction} company: ` + (error.response?.data?.errorMessage || error.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'ACTIVE': 'success',
            'PENDING': 'warning',
            'SUSPENDED': 'warning',
            'REJECTED': 'error'
        };
        return <Badge variant={statusMap[status] || 'default'}>{status}</Badge>;
    };

    if (loading && companies.length === 0) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading companies...</p>
            </div>
        );
    }

    return (
        <div className="companies-page">
            <div className="page-header">
                <div>
                    <h1>Company Management</h1>
                    <p className="page-subtitle">Manage all registered companies and their status</p>
                </div>
            </div>

            {/* Filters and Search */}
            <Card className="filters-card">
                <div className="filters-container">
                    <div className="search-box">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, registration number, country..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="filter-group">
                        <label>Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <Badge variant="info">
                        {pagination.totalElements} Total Companies
                    </Badge>
                </div>
            </Card>

            {/* Companies Grid */}
            <Card>
                <div className="companies-grid">
                    {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((company) => (
                            <div key={company.id} className="company-card">
                                <div className="company-card-header">
                                    <Building2 size={24} />
                                    {getStatusBadge(company.status)}
                                </div>
                                <h4 className="company-card-name">{company.legalName}</h4>
                                <p className="company-card-trading">{company.tradingName || 'N/A'}</p>
                                <div className="company-card-details">
                                    <div className="company-detail">
                                        <span className="detail-label">Code:</span>
                                        <span className="detail-value">{company.companyIdentifierCode || 'N/A'}</span>
                                    </div>
                                    <div className="company-detail">
                                        <span className="detail-label">Country:</span>
                                        <span className="detail-value">{company.country || 'N/A'}</span>
                                    </div>
                                    <div className="company-detail">
                                        <span className="detail-label">Type:</span>
                                        <span className="detail-value">{company.businessType || 'N/A'}</span>
                                    </div>
                                    <div className="company-detail">
                                        <span className="detail-label">Created:</span>
                                        <span className="detail-value">{formatDate(company.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="company-card-actions">
                                    <button
                                        className="action-btn action-btn--view"
                                        onClick={() => handleViewCompany(company)}
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        className="action-btn action-btn--edit"
                                        onClick={() => handleEditCompany(company)}
                                        title="Edit Company"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    {company.status === 'ACTIVE' ? (
                                        <button
                                            className="action-btn action-btn--suspend"
                                            onClick={() => handleStatusChange(company, 'suspend')}
                                            title="Suspend Company"
                                        >
                                            <PauseCircle size={16} />
                                        </button>
                                    ) : company.status === 'SUSPENDED' ? (
                                        <button
                                            className="action-btn action-btn--activate"
                                            onClick={() => handleStatusChange(company, 'activate')}
                                            title="Activate Company"
                                        >
                                            <PlayCircle size={16} />
                                        </button>
                                    ) : null}
                                    <button
                                        className="action-btn action-btn--delete"
                                        onClick={() => handleDeleteCompany(company)}
                                        title="Delete Company"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-data">
                            {searchQuery ? 'No companies found matching your search' : 'No companies found'}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="pagination">
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.page === 0}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            Previous
                        </Button>
                        <span className="pagination-info">
                            Page {pagination.page + 1} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages - 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </Card>

            {/* View Company Modal - Enhanced */}
            {showViewModal && selectedCompany && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content modal-content--xlarge" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{selectedCompany.legalName}</h2>
                                <p style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    {selectedCompany.companyIdentifierCode || 'No company code'}
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Company Status Banner */}
                            <div className="status-banner" style={{
                                background: selectedCompany.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' :
                                    selectedCompany.status === 'SUSPENDED' ? 'rgba(251, 191, 36, 0.1)' :
                                        'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${selectedCompany.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.3)' :
                                    selectedCompany.status === 'SUSPENDED' ? 'rgba(251, 191, 36, 0.3)' :
                                        'rgba(239, 68, 68, 0.3)'}`,
                                padding: '1rem',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <Shield size={20} />
                                <div>
                                    <strong>Status: </strong>
                                    {getStatusBadge(selectedCompany.status)}
                                    {selectedCompany.approvedAt && (
                                        <span style={{ marginLeft: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                                            Approved on {formatDate(selectedCompany.approvedAt)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="company-details-sections">
                                {/* Company Information */}
                                <div className="details-section">
                                    <h3 className="section-title">
                                        <Building2 size={18} />
                                        Company Information
                                    </h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Legal Name</span>
                                            <span className="detail-value">{selectedCompany.legalName}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Trading Name</span>
                                            <span className="detail-value">{selectedCompany.tradingName || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Registration Number</span>
                                            <span className="detail-value mono">{selectedCompany.registrationNumber || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Company Code</span>
                                            <span className="detail-value mono">{selectedCompany.companyIdentifierCode || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Country</span>
                                            <span className="detail-value">{selectedCompany.country || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Business Type</span>
                                            <span className="detail-value">{selectedCompany.businessType || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Created At</span>
                                            <span className="detail-value">{formatDate(selectedCompany.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Communication Details */}
                                <div className="details-section">
                                    <h3 className="section-title">
                                        <Mail size={18} />
                                        Communication & Contact
                                    </h3>
                                    {detailsLoading ? (
                                        <div className="section-loading">
                                            <div className="spinner-small"></div>
                                            <span>Loading communication details...</span>
                                        </div>
                                    ) : (
                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <span className="detail-label">
                                                    <Mail size={14} /> Primary Email
                                                </span>
                                                <span className="detail-value">{communicationDetails?.email || selectedCompany.email || 'N/A'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">
                                                    <Phone size={14} /> Phone
                                                </span>
                                                <span className="detail-value">{communicationDetails?.phone || selectedCompany.phone || 'N/A'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">
                                                    <Mail size={14} /> Support Email
                                                </span>
                                                <span className="detail-value">{communicationDetails?.supportEmail || 'N/A'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">
                                                    <Globe size={14} /> Website
                                                </span>
                                                <span className="detail-value">
                                                    {communicationDetails?.website || selectedCompany.website ? (
                                                        <a
                                                            href={communicationDetails?.website || selectedCompany.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#00f2ff' }}
                                                        >
                                                            {communicationDetails?.website || selectedCompany.website}
                                                        </a>
                                                    ) : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="detail-item detail-item--full">
                                                <span className="detail-label">
                                                    <WebhookIcon size={14} /> Webhook URL
                                                </span>
                                                <span className="detail-value mono" style={{ fontSize: '0.85rem' }}>
                                                    {communicationDetails?.webhookUrl || 'Not configured'}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Webhook Status</span>
                                                <span className="detail-value">
                                                    {communicationDetails?.webhookEnabled ? (
                                                        <Badge variant="success">Enabled</Badge>
                                                    ) : (
                                                        <Badge variant="default">Disabled</Badge>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Email Notifications</span>
                                                <span className="detail-value">
                                                    {communicationDetails?.emailNotifications !== false ? (
                                                        <Badge variant="success">Enabled</Badge>
                                                    ) : (
                                                        <Badge variant="default">Disabled</Badge>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* API Credentials */}
                                <div className="details-section">
                                    <h3 className="section-title">
                                        <Key size={18} />
                                        API Credentials
                                    </h3>
                                    {detailsLoading ? (
                                        <div className="section-loading">
                                            <div className="spinner-small"></div>
                                            <span>Loading credentials...</span>
                                        </div>
                                    ) : credentialsDetails ? (
                                        <div className="credentials-info">
                                            <div className="detail-grid">
                                                <div className="detail-item">
                                                    <span className="detail-label">API Key</span>
                                                    <span className="detail-value mono" style={{ fontSize: '0.85rem' }}>
                                                        {credentialsDetails.apiKey}
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label">Status</span>
                                                    <span className="detail-value">
                                                        {credentialsDetails.status === 'ACTIVE' ? (
                                                            <Badge variant="success">Active</Badge>
                                                        ) : credentialsDetails.status === 'SUSPENDED' ? (
                                                            <Badge variant="warning">Suspended</Badge>
                                                        ) : (
                                                            <Badge variant="error">Inactive</Badge>
                                                        )}
                                                    </span>
                                                </div>
                                                {credentialsDetails.expiresAt && (
                                                    <div className="detail-item">
                                                        <span className="detail-label">Expires At</span>
                                                        <span className="detail-value">{formatDate(credentialsDetails.expiresAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="empty-state-small">
                                            <Key size={32} style={{ opacity: 0.3 }} />
                                            <p>No API credentials generated for this company yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={() => {
                                setShowViewModal(false);
                                handleEditCompany(selectedCompany);
                            }}>
                                <Edit3 size={16} />
                                Edit Company
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Company Modal */}
            {showEditModal && selectedCompany && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Company</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {actionLoading ? (
                                <div className="section-loading">
                                    <div className="spinner-small"></div>
                                    <span>Loading company details...</span>
                                </div>
                            ) : (
                                <form className="edit-form">
                                    <Input
                                        label="Trading Name"
                                        value={editForm.tradingName}
                                        onChange={(e) => setEditForm({ ...editForm, tradingName: e.target.value })}
                                        placeholder="Enter trading name"
                                    />
                                    <Input
                                        label="Business Type"
                                        value={editForm.businessType}
                                        onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                                        placeholder="e.g., digital_lender, neobank"
                                    />
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        placeholder="primary@company.com"
                                    />
                                    <Input
                                        label="Phone"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                    <Input
                                        label="Website"
                                        value={editForm.website}
                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                        placeholder="https://company.com"
                                    />
                                    <Input
                                        label="Secondary Email"
                                        type="email"
                                        value={editForm.secondaryEmail}
                                        onChange={(e) => setEditForm({ ...editForm, secondaryEmail: e.target.value })}
                                        placeholder="secondary@company.com"
                                    />
                                    <Input
                                        label="Secondary Phone"
                                        value={editForm.secondaryPhone}
                                        onChange={(e) => setEditForm({ ...editForm, secondaryPhone: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                    <Input
                                        label="Support Email"
                                        type="email"
                                        value={editForm.supportEmail}
                                        onChange={(e) => setEditForm({ ...editForm, supportEmail: e.target.value })}
                                        placeholder="support@company.com"
                                    />
                                    <Input
                                        label="Billing Email"
                                        type="email"
                                        value={editForm.billingEmail}
                                        onChange={(e) => setEditForm({ ...editForm, billingEmail: e.target.value })}
                                        placeholder="billing@company.com"
                                    />
                                </form>
                            )}
                        </div>

                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={actionLoading}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleUpdateCompany} disabled={actionLoading}>
                                {actionLoading ? 'Updating...' : 'Update Company'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedCompany && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Company</h2>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="warning-box">
                                <p><strong>Warning:</strong> This action cannot be undone!</p>
                                <p>Are you sure you want to delete <strong>{selectedCompany.legalName}</strong>?</p>
                                <p>All associated data, API keys, and verifications will be permanently removed.</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete} disabled={actionLoading}>
                                {actionLoading ? 'Deleting...' : 'Delete Company'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {showStatusModal && selectedCompany && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{statusAction === 'activate' ? 'Activate' : 'Suspend'} Company</h2>
                            <button className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="info-box" style={{
                                background: statusAction === 'suspend' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                border: `1px solid ${statusAction === 'suspend' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                            }}>
                                <p><strong>Company:</strong> {selectedCompany.legalName}</p>
                                <p>
                                    {statusAction === 'suspend'
                                        ? 'This will suspend the company and block their API access.'
                                        : 'This will activate the company and restore their API access.'}
                                </p>
                            </div>

                            {statusAction === 'suspend' && (
                                <div className="input-group" style={{ marginTop: '1rem' }}>
                                    <label className="input-label">Reason (Optional)</label>
                                    <textarea
                                        className="input"
                                        placeholder="Enter reason for suspension..."
                                        value={actionReason}
                                        onChange={(e) => setActionReason(e.target.value)}
                                        rows={3}
                                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowStatusModal(false)} disabled={actionLoading}>
                                Cancel
                            </Button>
                            <Button
                                variant={statusAction === 'suspend' ? 'danger' : 'primary'}
                                onClick={confirmStatusChange}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? (statusAction === 'suspend' ? 'Suspending...' : 'Activating...')
                                    : (statusAction === 'suspend' ? 'Suspend Company' : 'Activate Company')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showNotificationModal && (
                <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{notificationType === 'success' ? 'Success' : 'Error'}</h2>
                            <button className="modal-close" onClick={() => setShowNotificationModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="info-box" style={{
                                background: notificationType === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${notificationType === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                <p>{notificationMessage}</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button variant="primary" onClick={() => setShowNotificationModal(false)}>
                                OK
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
