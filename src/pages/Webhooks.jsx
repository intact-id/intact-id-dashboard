import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, Globe, Webhook as WebhookIcon, RefreshCcw, Save, TestTube } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import companyService from '../services/companyService';
import webhookService from '../services/webhookService';
import './Webhooks.css';

export default function Webhooks() {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [communication, setCommunication] = useState(null);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [smsNotifications, setSmsNotifications] = useState(false);

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
            const response = await webhookService.getCompanyCommunication(company.id);
            if (response.success) {
                const data = response.data || null;
                setCommunication(data);
                setWebhookUrl(data?.webhookUrl || '');
                setWebhookEnabled(data?.webhookEnabled || false);
                setEmailNotifications(data?.emailNotifications !== false);
                setSmsNotifications(data?.smsNotifications || false);
            } else {
                setCommunication(null);
            }
        } catch (err) {
            setCommunication(null);
            setWebhookUrl('');
            setWebhookEnabled(false);
            setEmailNotifications(true);
            setSmsNotifications(false);
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
                smsNotifications
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

                                    <div className="detail-row">
                                        <span>Webhook Status</span>
                                        <strong>{webhookEnabled ? 'Enabled' : 'Disabled'}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Current URL</span>
                                        <strong className="mono">{communication?.webhookUrl || 'Not configured'}</strong>
                                    </div>

                                    <div className="actions-row">
                                        <Button variant="secondary" onClick={handleTestWebhook} disabled={testing || !webhookUrl.trim()}>
                                            <TestTube size={14} />
                                            {testing ? 'Testing...' : 'Test Webhook'}
                                        </Button>
                                        <Button onClick={handleSaveWebhook} disabled={saving}>
                                            <Save size={14} />
                                            {saving ? 'Saving...' : 'Save Settings'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
