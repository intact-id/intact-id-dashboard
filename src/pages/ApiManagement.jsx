import { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Building2, Key, RefreshCcw, Trash2, Edit3, Copy, Check, PauseCircle, PlayCircle } from 'lucide-react';
import apiKeyService from '../services/apiKeyService';
import credentialsService from '../services/credentialsService';
import analyticsService from '../services/analyticsService';
import companyService from '../services/companyService';
import './ApiManagement.css';

export default function ApiManagement() {
    // State management
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [apiKeys, setApiKeys] = useState([]);
    const [usageData, setUsageData] = useState([]);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingKeys, setLoadingKeys] = useState(false);
    const [error, setError] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Modal states
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState(null); // 'suspend' or 'activate'
    const [actionReason, setActionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Notification modal states
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success'); // 'success' or 'error'

    const searchRef = useRef(null);

    // Fetch companies on mount
    useEffect(() => {
        fetchCompanies();
    }, []);

    // Fetch API keys and usage data when company changes
    useEffect(() => {
        if (selectedCompany) {
            fetchApiKeys();
            fetchUsageData();
        }
    }, [selectedCompany]);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await companyService.getAllCompanies(
                { status: 'ACTIVE' }, // Backend uses ACTIVE, not APPROVED
                { page: 0, size: 100 }
            );

            console.log('Companies response:', response);

            if (response.success) {
                const companiesList = response.data.content || [];
                console.log('Companies loaded:', companiesList.length, companiesList);
                setCompanies(companiesList);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
            setError('Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    const fetchApiKeys = async () => {
        if (!selectedCompany) return;

        setLoadingKeys(true);
        setError(null);
        try {
            const response = await apiKeyService.getApiKeys(selectedCompany.id);

            // Backend returns array, but we expect single credential per company
            if (response.success && response.data) {
                const credentials = response.data.map(cred => ({
                    apiKey: cred.apiKey,
                    apiSecret: cred.apiSecret,
                    expiresAt: cred.expiresAt,
                    status: cred.status
                }));
                setApiKeys(credentials);
            }
        } catch (error) {
            console.error('Error fetching API keys:', error);
            setError(error.response?.data?.errorMessage || 'Failed to load API keys');
            setApiKeys([]);
        } finally {
            setLoadingKeys(false);
        }
    };

    const fetchUsageData = async () => {
        if (!selectedCompany) return;

        try {
            const response = await analyticsService.getUsageData({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            });

            if (response.success && response.data) {
                setUsageData(response.data.slice(0, 7)); // Last 7 days
            }
        } catch (error) {
            console.error('Error fetching usage data:', error);
        }
    };

    const handleCompanySelect = (company) => {
        setSelectedCompany(company);
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const generateNewKey = async () => {
        if (!selectedCompany) {
            setNotificationMessage('Please select a company first');
            setNotificationType('error');
            setShowNotificationModal(true);
            return;
        }

        try {
            const response = await apiKeyService.generateApiKey(selectedCompany.id);

            if (response.success) {
                const newCredential = {
                    apiKey: response.data.apiKey,
                    apiSecret: response.data.apiSecret,
                    expiresAt: response.data.expiresAt,
                    status: response.data.status
                };

                setGeneratedKey(newCredential);
                // Replace existing credentials (backend only allows one set per company)
                setApiKeys([newCredential]);
                setShowNewKeyModal(true);
            } else {
                setNotificationMessage('Failed to generate API key: ' + response.responseMessage);
                setNotificationType('error');
                setShowNotificationModal(true);
            }
        } catch (error) {
            console.error('Error generating API key:', error);
            setNotificationMessage('Failed to generate API key: ' + (error.response?.data?.errorMessage || error.message));
            setNotificationType('error');
            setShowNotificationModal(true);
        }
    };

    const regenerateKey = async () => {
        if (!confirm('Are you sure you want to regenerate the API credentials? The old credentials will be replaced.')) {
            return;
        }

        try {
            const response = await apiKeyService.generateApiKey(selectedCompany.id);

            if (response.success) {
                const newCredential = {
                    apiKey: response.data.apiKey,
                    apiSecret: response.data.apiSecret,
                    expiresAt: response.data.expiresAt,
                    status: response.data.status
                };

                setGeneratedKey(newCredential);
                setApiKeys([newCredential]);
                setNotificationMessage('API credentials regenerated successfully');
                setNotificationType('success');
                setShowNotificationModal(true);
                setShowNewKeyModal(true);
            } else {
                setNotificationMessage('Failed to regenerate: ' + response.responseMessage);
                setNotificationType('error');
                setShowNotificationModal(true);
            }
        } catch (error) {
            console.error('Error regenerating:', error);
            setNotificationMessage('Failed to regenerate: ' + (error.response?.data?.errorMessage || error.message));
            setNotificationType('error');
            setShowNotificationModal(true);
        }
    };

    const suspendCredentials = async () => {
        if (!selectedCompany) return;
        setActionType('suspend');
        setActionReason('');
        setShowActionModal(true);
    };

    const activateCredentials = async () => {
        if (!selectedCompany) return;
        setActionType('activate');
        setActionReason('');
        setShowActionModal(true);
    };

    const handleActionConfirm = async () => {
        if (!selectedCompany) return;

        setActionLoading(true);
        try {
            let response;
            if (actionType === 'suspend') {
                response = await credentialsService.suspendCredentials(
                    selectedCompany.id,
                    actionReason || 'Suspended via dashboard'
                );
            } else {
                response = await credentialsService.activateCredentials(selectedCompany.id);
            }

            if (response.success) {
                setShowActionModal(false);
                setActionReason('');
                fetchApiKeys(); // Refresh to show updated status
                fetchCompanies(); // Refresh company list

                // Show success message
                setNotificationMessage(`Credentials ${actionType === 'suspend' ? 'suspended' : 'activated'} successfully`);
                setNotificationType('success');
                setShowNotificationModal(true);
            } else {
                setNotificationMessage(`Failed to ${actionType}: ` + response.responseMessage);
                setNotificationType('error');
                setShowNotificationModal(true);
            }
        } catch (error) {
            console.error(`Error ${actionType}ing credentials:`, error);
            setNotificationMessage(`Failed to ${actionType}: ` + (error.response?.data?.errorMessage || error.message));
            setNotificationType('error');
            setShowNotificationModal(true);
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner"></div>
                <p>Loading companies...</p>
            </div>
        );
    }

    return (
        <div className="api-management">
            <div className="page-header">
                <div>
                    <h1>API Key Management</h1>
                    <p className="page-subtitle">Manage API keys and credentials for all companies</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setShowNewKeyModal(true)}
                    disabled={!selectedCompany}
                >
                    <Key size={18} />
                    Generate New Key
                </Button>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            {/* Main Content Grid */}
            <div className="api-content-grid">
                {/* Left Sidebar: Company List */}
                <div className="company-sidebar">
                    <div className="sidebar-header">
                        <h3 className="sidebar-title">Companies</h3>
                        <Badge variant="info">{companies.length}</Badge>
                    </div>
                     <div className="companies-list">
                        {companies.map((company) => (
                            <div
                                key={company.id}
                                className={`company-list-item ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                                onClick={() => handleCompanySelect(company)}
                            >
                                <div className="company-item-header">
                                    <span className="company-name">{company.legalName}</span>
                                    {company.status === 'ACTIVE' && <div className="status-dot status-dot--active"></div>}
                                </div>
                                <div className="company-item-meta">
                                    <span>{company.country || 'N/A'}</span>
                                    <span>•</span>
                                    <span className="code-badge">{company.companyIdentifierCode || 'N/A'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: API Details */}
                <div className="main-content-panel">
                    {!selectedCompany ? (
                        <div className="empty-selection-state">
                            <Building2 size={48} className="empty-icon-large" />
                            <h3>Select a Company</h3>
                            <p>Choose a company from the sidebar to manage API keys and view usage analytics.</p>
                        </div>
                    ) : (
                        <div className="company-workspace">
                            {/* Company Header Info */}
                            <div className="workspace-header">
                                <div className="workspace-title">
                                    <h2>{selectedCompany.legalName}</h2>
                                    <div className="workspace-badges">
                                        <Badge variant={selectedCompany.status === 'ACTIVE' ? 'success' : 'warning'}>
                                            {selectedCompany.status}
                                        </Badge>
                                        <span className="workspace-meta">ID: {selectedCompany.id.substring(0, 8)}...</span>
                                    </div>
                                </div>
                                <div className="workspace-actions">
                                     <Button
                                        variant="primary"
                                        onClick={() => setShowNewKeyModal(true)}
                                    >
                                        <Key size={16} />
                                        Generate Key
                                    </Button>
                                </div>
                            </div>

                            {/* API Credentials Section */}
                            <div className="credentials-section">
                                <h3 className="section-title">Active Credentials</h3>
                                {loadingKeys ? (
                                    <div className="loading-state">
                                        <div className="spinner"></div>
                                        <p>Loading credentials...</p>
                                    </div>
                                ) : apiKeys.length === 0 ? (
                                    <div className="empty-keys-state">
                                        <p>No active API keys found.</p>
                                        <Button variant="secondary" size="sm" onClick={() => setShowNewKeyModal(true)}>
                                            Create First Key
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="keys-grid">
                                        {apiKeys.map((credential, index) => (
                                            <div key={index} className="key-detail-card">
                                                <div className="key-header-row">
                                                    <div className="status-badge-wrapper">
                                                        <div className={`status-point ${credential.status === 'ACTIVE' ? 'active' : 'suspended'}`}></div>
                                                        <span>{credential.status}</span>
                                                    </div>
                                                    <div className="key-actions">
                                                        <button 
                                                            className="action-icon-btn" 
                                                            onClick={regenerateKey}
                                                            title="Regenerate Key"
                                                        >
                                                            <RefreshCcw size={14} />
                                                        </button>
                                                        {credential.status === 'SUSPENDED' ? (
                                                            <button 
                                                                className="action-icon-btn success"
                                                                onClick={activateCredentials}
                                                                title="Activate"
                                                            >
                                                                <PlayCircle size={14} />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="action-icon-btn danger"
                                                                onClick={suspendCredentials}
                                                                title="Suspend"
                                                            >
                                                                <PauseCircle size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="key-field-group">
                                                    <label>API Key</label>
                                                    <div className="code-display">
                                                        <code>{credential.apiKey}</code>
                                                        <button onClick={() => copyToClipboard(credential.apiKey, 'key')}>
                                                            {copiedId === 'key' ? <Check size={14} className="text-success"/> : <Copy size={14}/>}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="key-field-group">
                                                    <label>API Secret</label>
                                                    <div className="code-display">
                                                        <code>{credential.apiSecret.substring(0, 8)}••••••••••••••••</code>
                                                        <button onClick={() => copyToClipboard(credential.apiSecret, 'secret')}>
                                                            {copiedId === 'secret' ? <Check size={14} className="text-success"/> : <Copy size={14}/>}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Usage Chart Section */}
                            <div className="usage-section">
                                <h3 className="section-title">Traffic Analytics</h3>
                                <div className="chart-container-glass">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={usageData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#94A3B8" // var(--color-text-tertiary)
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => {
                                                    const date = new Date(value);
                                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                }}
                                            />
                                            <YAxis 
                                                stroke="#94A3B8" 
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                                contentStyle={{
                                                    background: 'rgba(15, 23, 42, 0.9)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                                                }}
                                            />
                                            <Bar 
                                                dataKey="apiCalls" 
                                                fill="url(#colorGradient)" 
                                                radius={[4, 4, 0, 0]} 
                                                barSize={40}
                                            />
                                            <defs>
                                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.8}/>
                                                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.4}/>
                                                </linearGradient>
                                            </defs>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Key Modal */}
            {showNewKeyModal && (
                <div className="modal-overlay" onClick={() => { setShowNewKeyModal(false); setGeneratedKey(null); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <Card className="modal-card">
                            <div className="modal-header">
                                <h2>{generatedKey ? 'Credentials Generated' : 'Generate API Credentials'}</h2>
                                <button className="modal-close" onClick={() => { setShowNewKeyModal(false); setGeneratedKey(null); }}>
                                    ×
                                </button>
                            </div>

                            <div className="modal-body">
                                {!generatedKey ? (
                                    <>
                                        <div className="input-group">
                                            <label className="input-label">Company</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={selectedCompany?.legalName || ''}
                                                disabled
                                            />
                                        </div>
                                        <div className="info-box">
                                            <p>This will generate API key and secret for <strong>{selectedCompany?.legalName}</strong>.</p>
                                            <p>If credentials already exist, they will be replaced.</p>
                                        </div>
                                        <Button
                                            variant="primary"
                                            onClick={generateNewKey}
                                        >
                                            <Key size={18} />
                                            Generate Credentials
                                        </Button>
                                    </>
                                ) : (
                                    <div className="generated-key-display">
                                        <div className="warning-box">
                                            <span className="warning-icon">!</span>
                                            <div>
                                                <strong>Save these credentials now!</strong>
                                                <p>You won't be able to see them again after closing this dialog.</p>
                                            </div>
                                        </div>

                                        <div className="key-display">
                                            <div className="key-display-header">
                                                <span>API Key</span>
                                                <button
                                                    className="copy-btn-large"
                                                    onClick={() => copyToClipboard(generatedKey.apiKey)}
                                                >
                                                    <Copy size={16} />
                                                    Copy
                                                </button>
                                            </div>
                                            <code>{generatedKey.apiKey}</code>
                                        </div>

                                        <div className="key-display">
                                            <div className="key-display-header">
                                                <span>API Secret</span>
                                                <button
                                                    className="copy-btn-large"
                                                    onClick={() => copyToClipboard(generatedKey.apiSecret)}
                                                >
                                                    <Copy size={16} />
                                                    Copy
                                                </button>
                                            </div>
                                            <code>{generatedKey.apiSecret}</code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Suspend/Activate Confirmation Modal */}
            {showActionModal && (
                <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {actionType === 'suspend' ? 'Suspend' : 'Activate'} Credentials
                            </h2>
                            <button className="modal-close" onClick={() => setShowActionModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="info-box" style={{
                                background: actionType === 'suspend' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                border: `1px solid ${actionType === 'suspend' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                            }}>
                                <p>
                                    <strong>Company:</strong> {selectedCompany?.legalName}
                                </p>
                                <p>
                                    {actionType === 'suspend'
                                        ? 'This will prevent the company from using their API credentials. All API requests will be rejected.'
                                        : 'This will restore the company\'s API access. They will be able to make API requests again.'}
                                </p>
                            </div>

                            {actionType === 'suspend' && (
                                <div className="input-group">
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
                            <Button
                                variant="secondary"
                                onClick={() => setShowActionModal(false)}
                                disabled={actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={actionType === 'suspend' ? 'danger' : 'primary'}
                                onClick={handleActionConfirm}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? (actionType === 'suspend' ? 'Suspending...' : 'Activating...')
                                    : (actionType === 'suspend' ? 'Suspend Credentials' : 'Activate Credentials')}
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
