import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, Globe, Webhook as WebhookIcon, RefreshCcw, Save, TestTube, Copy, RotateCcw, Eye, EyeOff } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { isAdminOrSuperAdmin } from '../utils/roles';
import companyService from '../services/companyService';
import webhookService from '../services/webhookService';
import apiKeyService from '../services/apiKeyService';
import './Webhooks.css';

export default function Webhooks() {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [communication, setCommunication] = useState(null);
    const [credentialStatuses, setCredentialStatuses] = useState({ DEV: 'N/A', PROD: 'N/A' });
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [secretVisible, setSecretVisible] = useState(false);
    const [revealedSecret, setRevealedSecret] = useState(null);

    const [webhookUrl, setWebhookUrl] = useState('');
    const [payloadFields, setPayloadFields] = useState({
        includeVerificationId: true,
        includeCompanyId: true,
        includeCompanyName: true,
        includeRejectionReason: true,
        includeTier: true,
        includeTimestamps: true,
        includeResults: true,
        includeRawScores: false,
        includeApplicant: false,
    });
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [smsNotifications, setSmsNotifications] = useState(false);
    const isAdminUser = isAdminOrSuperAdmin(user);

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
                if (list.length > 0) {
                    const next = list.find((c) => c.id === selectedCompany?.id) || list[0];
                    await selectCompany(next);
                } else {
                    setSelectedCompany(null);
                    setCommunication(null);
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
        setNotice(null);
        try {
            const [communicationResponse, keysResponse] = await Promise.allSettled([
                webhookService.getCompanyCommunication(company.id),
                isAdminUser ? apiKeyService.getApiKeys(company.id) : Promise.resolve({ success: false, data: [] })
            ]);

            if (communicationResponse.status === 'fulfilled' && communicationResponse.value.success) {
                const data = communicationResponse.value.data || null;
                setCommunication(data);
                setWebhookUrl(data?.webhookUrl || '');
                setWebhookEnabled(data?.webhookEnabled || false);
                setEmailNotifications(data?.emailNotifications !== false);
                setSmsNotifications(data?.smsNotifications || false);
                setPayloadFields({
                    includeVerificationId: data?.payloadFields?.includeVerificationId !== false,
                    includeCompanyId: data?.payloadFields?.includeCompanyId !== false,
                    includeCompanyName: data?.payloadFields?.includeCompanyName !== false,
                    includeRejectionReason: data?.payloadFields?.includeRejectionReason !== false,
                    includeTier: data?.payloadFields?.includeTier !== false,
                    includeTimestamps: data?.payloadFields?.includeTimestamps !== false,
                    includeResults: data?.payloadFields?.includeResults !== false,
                    includeRawScores: data?.payloadFields?.includeRawScores || false,
                    includeApplicant: data?.payloadFields?.includeApplicant || false,
                });
            } else {
                setCommunication(null);
            }

            if (keysResponse.status === 'fulfilled' && keysResponse.value.success) {
                const statuses = { DEV: 'NOT GENERATED', PROD: 'NOT GENERATED' };
                (keysResponse.value.data || []).forEach((k) => {
                    if (k.environment === 'DEV') statuses.DEV = k.status || 'UNKNOWN';
                    if (k.environment === 'PROD') statuses.PROD = k.status || 'UNKNOWN';
                });
                setCredentialStatuses(statuses);
            } else {
                setCredentialStatuses({ DEV: 'N/A', PROD: 'N/A' });
            }
        } catch (err) {
            setCommunication(null);
            setCredentialStatuses({ DEV: 'N/A', PROD: 'N/A' });
            setWebhookUrl('');
            setWebhookEnabled(false);
            setEmailNotifications(true);
            setSmsNotifications(false);
            setPayloadFields({ includeVerificationId: true, includeCompanyId: true, includeCompanyName: true, includeRejectionReason: true, includeTier: true, includeTimestamps: true, includeResults: true, includeRawScores: false, includeApplicant: false });
            setError(err.response?.data?.errorMessage || err.message || 'Failed to load webhook settings');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSaveWebhook = async () => {
        if (!selectedCompany) return;
        if (webhookEnabled && !webhookUrl.trim()) {
            setError('Webhook URL is required when webhook is enabled.');
            return;
        }
        setSaving(true);
        setError('');
        setNotice(null);
        try {
            const response = await webhookService.updateWebhookSettings(selectedCompany.id, {
                webhookUrl: webhookUrl.trim(),
                webhookEnabled,
                emailNotifications,
                smsNotifications,
                payloadFields,
            });
            if (response.success) {
                setNotice({ type: 'success', message: 'Webhook settings saved successfully.' });
                await selectCompany(selectedCompany);
            } else {
                setError(response.responseMessage || 'Failed to save webhook settings');
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to save webhook settings');
        } finally {
            setSaving(false);
        }
    };

    const handleRotateSecret = async () => {
        if (!selectedCompany) return;
        setRotating(true);
        setError('');
        setNotice(null);
        setRevealedSecret(null);
        setSecretVisible(false);
        try {
            const response = await webhookService.rotateWebhookSecret(selectedCompany.id);
            if (response.success) {
                setRevealedSecret(response.data?.webhookSecret || null);
                setSecretVisible(true);
                setNotice({ type: 'success', message: 'Secret rotated. Copy it now — it will not be shown in full again.' });
                await selectCompany(selectedCompany);
            } else {
                setError(response.responseMessage || 'Failed to rotate secret.');
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to rotate secret.');
        } finally {
            setRotating(false);
        }
    };

    const handleTestWebhook = async () => {
        if (!selectedCompany) return;
        if (!webhookUrl.trim()) {
            setError('Add a webhook URL before running test.');
            return;
        }
        setTesting(true);
        setError('');
        setNotice(null);
        try {
            const response = await webhookService.testWebhook(selectedCompany.id);
            if (response.success) {
                setNotice({ type: 'success', message: 'Webhook test sent successfully.' });
            } else {
                setNotice({ type: 'error', message: response.responseMessage || 'Webhook test failed.' });
            }
        } catch (err) {
            setNotice({
                type: 'error',
                message: err.response?.data?.errorMessage || err.message || 'Webhook test failed.'
            });
        } finally {
            setTesting(false);
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

    return (
        <div className="webhooks-page">
            <div className="page-header">
                <div>
                    <h1>Webhook Management</h1>
                    <p className="page-subtitle">Configure webhook endpoints and communication channels per company.</p>
                </div>
                <Button variant="secondary" onClick={fetchCompanies}>
                    <RefreshCcw size={14} />
                    Refresh
                </Button>
            </div>

            {error && <div className="error-banner">{error}</div>}
            {notice && (
                <div className={`notice-banner ${notice.type === 'success' ? 'success' : 'error'}`}>
                    {notice.message}
                </div>
            )}

            <div className="webhooks-layout">
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
                                                <Badge
                                                    variant={
                                                        company.status === 'ACTIVE'
                                                            ? 'success'
                                                            : company.status === 'SUSPENDED'
                                                                ? 'warning'
                                                                : 'default'
                                                    }
                                                >
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
                        <div className="empty-state">Select a company to manage webhook settings.</div>
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
                            </div>

                            <div className="details-grid">
                                <div className="detail-box">
                                    <h4>Company Details</h4>
                                    <div className="detail-row"><span>Trading Name</span><strong>{selectedCompany.tradingName || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Business Type</span><strong>{selectedCompany.businessType || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Country</span><strong>{selectedCompany.country || 'N/A'}</strong></div>
                                    <div className="detail-row"><span>Company Code</span><strong>{selectedCompany.companyIdentifierCode || 'N/A'}</strong></div>
                                </div>

                                <div className="detail-box">
                                    <h4>Communication Channels</h4>
                                    <div className="detail-row"><span><Mail size={14} /> Primary Email</span><strong>{communication?.email || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Phone size={14} /> Primary Phone</span><strong>{communication?.phone || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Mail size={14} /> Support Email</span><strong>{communication?.supportEmail || 'N/A'}</strong></div>
                                    <div className="detail-row"><span><Globe size={14} /> Website</span><strong>{communication?.website || 'N/A'}</strong></div>
                                </div>

                                <div className="detail-box detail-box-full">
                                    <h4>Webhook Configuration</h4>
                                    <div className="field-grid">
                                        <div className="field-group field-group-full">
                                            <label className="field-label">
                                                <WebhookIcon size={14} />
                                                Webhook URL
                                            </label>
                                            <input
                                                type="url"
                                                className="panel-input"
                                                placeholder="https://your-domain.com/webhook"
                                                value={webhookUrl}
                                                onChange={(e) => setWebhookUrl(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {isAdminUser && (
                                        <>
                                            <div className="switch-stack">
                                                <label className="switch-row">
                                                    <span className="switch-text">Enable Webhook</span>
                                                    <input className="switch-input" type="checkbox" checked={webhookEnabled} onChange={(e) => setWebhookEnabled(e.target.checked)} />
                                                    <span className="switch-control">
                                                        <span className="switch-pill" aria-hidden="true"></span>
                                                        <span className={`switch-state ${webhookEnabled ? 'on' : 'off'}`}>{webhookEnabled ? 'ON' : 'OFF'}</span>
                                                    </span>
                                                </label>
                                                <label className="switch-row">
                                                    <span className="switch-text">Email Notifications</span>
                                                    <input className="switch-input" type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                                                    <span className="switch-control">
                                                        <span className="switch-pill" aria-hidden="true"></span>
                                                        <span className={`switch-state ${emailNotifications ? 'on' : 'off'}`}>{emailNotifications ? 'ON' : 'OFF'}</span>
                                                    </span>
                                                </label>
                                                <label className="switch-row">
                                                    <span className="switch-text">SMS Notifications</span>
                                                    <input className="switch-input" type="checkbox" checked={smsNotifications} onChange={(e) => setSmsNotifications(e.target.checked)} />
                                                    <span className="switch-control">
                                                        <span className="switch-pill" aria-hidden="true"></span>
                                                        <span className={`switch-state ${smsNotifications ? 'on' : 'off'}`}>{smsNotifications ? 'ON' : 'OFF'}</span>
                                                    </span>
                                                </label>
                                            </div>

                                            <div className="payload-fields-section">
                                                <p className="payload-fields-title">Payload Fields</p>
                                                <div className="switch-stack">
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Verification ID
                                                            <span className="switch-subtext">verificationId</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeVerificationId} onChange={() => setPayloadFields(p => ({ ...p, includeVerificationId: !p.includeVerificationId }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeVerificationId ? 'on' : 'off'}`}>{payloadFields.includeVerificationId ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Company ID
                                                            <span className="switch-subtext">companyId</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeCompanyId} onChange={() => setPayloadFields(p => ({ ...p, includeCompanyId: !p.includeCompanyId }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeCompanyId ? 'on' : 'off'}`}>{payloadFields.includeCompanyId ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Company Name
                                                            <span className="switch-subtext">companyName (legalName)</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeCompanyName} onChange={() => setPayloadFields(p => ({ ...p, includeCompanyName: !p.includeCompanyName }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeCompanyName ? 'on' : 'off'}`}>{payloadFields.includeCompanyName ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Rejection Reason
                                                            <span className="switch-subtext">rejection_reason, rejection_details</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeRejectionReason} onChange={() => setPayloadFields(p => ({ ...p, includeRejectionReason: !p.includeRejectionReason }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeRejectionReason ? 'on' : 'off'}`}>{payloadFields.includeRejectionReason ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Tier
                                                            <span className="switch-subtext">Verification tier (tier1, tier2…)</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeTier} onChange={() => setPayloadFields(p => ({ ...p, includeTier: !p.includeTier }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeTier ? 'on' : 'off'}`}>{payloadFields.includeTier ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Timestamps
                                                            <span className="switch-subtext">started_at / completed_at</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeTimestamps} onChange={() => setPayloadFields(p => ({ ...p, includeTimestamps: !p.includeTimestamps }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeTimestamps ? 'on' : 'off'}`}>{payloadFields.includeTimestamps ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Results
                                                            <span className="switch-subtext">Per-check decision & status</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeResults} onChange={() => setPayloadFields(p => ({ ...p, includeResults: !p.includeResults, includeRawScores: !p.includeResults ? p.includeRawScores : false }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeResults ? 'on' : 'off'}`}>{payloadFields.includeResults ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className={`switch-row${!payloadFields.includeResults ? ' disabled' : ''}`}>
                                                        <span className="switch-text">
                                                            Include Raw Scores
                                                            <span className="switch-subtext">face_match_score, quality_score — sensitive</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeRawScores} disabled={!payloadFields.includeResults} onChange={() => setPayloadFields(p => ({ ...p, includeRawScores: !p.includeRawScores }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeRawScores ? 'on' : 'off'}`}>{payloadFields.includeRawScores ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                    <label className="switch-row">
                                                        <span className="switch-text">
                                                            Include Applicant Info
                                                            <span className="switch-subtext">name & internal ID — PII</span>
                                                        </span>
                                                        <input className="switch-input" type="checkbox" checked={payloadFields.includeApplicant} onChange={() => setPayloadFields(p => ({ ...p, includeApplicant: !p.includeApplicant }))} />
                                                        <span className="switch-control">
                                                            <span className="switch-pill" aria-hidden="true"></span>
                                                            <span className={`switch-state ${payloadFields.includeApplicant ? 'on' : 'off'}`}>{payloadFields.includeApplicant ? 'ON' : 'OFF'}</span>
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="detail-row">
                                        <span>Webhook Status</span>
                                        <strong>{webhookEnabled ? 'Enabled' : 'Disabled'}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>PROD Credential Status</span>
                                        <strong>{credentialStatuses.PROD}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>DEV Credential Status</span>
                                        <strong>{credentialStatuses.DEV}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Current URL</span>
                                        <strong className="mono">{communication?.webhookUrl || 'Not configured'}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Signing Secret</span>
                                        <div className="secret-row">
                                            <span className="mono secret-value">
                                                {revealedSecret && secretVisible
                                                    ? revealedSecret
                                                    : (communication?.webhookSecret || 'Not generated')}
                                            </span>
                                            {(revealedSecret || communication?.webhookSecret) && (
                                                <>
                                                    <button className="secret-btn" title="Copy" onClick={() => navigator.clipboard.writeText(revealedSecret || communication?.webhookSecret)}>
                                                        <Copy size={13} />
                                                    </button>
                                                    {revealedSecret && (
                                                        <button className="secret-btn" title={secretVisible ? 'Hide' : 'Show'} onClick={() => setSecretVisible(v => !v)}>
                                                            {secretVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isAdminUser && (
                                        <div className="actions-row">
                                            <Button variant="secondary" onClick={handleRotateSecret} disabled={rotating}>
                                                <RotateCcw size={14} />
                                                {rotating ? 'Rotating...' : 'Rotate Secret'}
                                            </Button>
                                            <Button variant="secondary" onClick={handleTestWebhook} disabled={testing || !webhookUrl.trim()}>
                                                <TestTube size={14} />
                                                {testing ? 'Testing...' : 'Test Webhook'}
                                            </Button>
                                            <Button onClick={handleSaveWebhook} disabled={saving}>
                                                <Save size={14} />
                                                {saving ? 'Saving...' : 'Save Settings'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
