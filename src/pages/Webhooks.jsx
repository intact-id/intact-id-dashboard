import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Building2, Webhook, TestTube, Save, RefreshCcw } from 'lucide-react';
import companyService from '../services/companyService';
import webhookService from '../services/webhookService';
import './Webhooks.css';

export default function Webhooks() {
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [communication, setCommunication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingWebhook, setLoadingWebhook] = useState(false);
    const [error, setError] = useState(null);
    const [testingWebhook, setTestingWebhook] = useState(false);

    // Form state
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookEnabled, setWebhookEnabled] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [smsNotifications, setSmsNotifications] = useState(false);

    // Modal and notification states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showTestResultModal, setShowTestResultModal] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompany) {
            fetchWebhookSettings();
        }
    }, [selectedCompany]);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await companyService.getAllCompanies(
                { status: 'ACTIVE' },
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

    const fetchWebhookSettings = async () => {
        if (!selectedCompany) return;

        setLoadingWebhook(true);
        setError(null);
        try {
            const response = await webhookService.getCompanyCommunication(selectedCompany.id);

            if (response.success && response.data) {
                setCommunication(response.data);
                setWebhookUrl(response.data.webhookUrl || '');
                setWebhookEnabled(response.data.webhookEnabled || false);
                setEmailNotifications(response.data.emailNotifications !== false);
                setSmsNotifications(response.data.smsNotifications || false);
            }
        } catch (error) {
            console.error('Error fetching webhook settings:', error);
            setError(error.response?.data?.errorMessage || 'Failed to load webhook settings');
            // Set defaults if error
            setCommunication(null);
            setWebhookUrl('');
            setWebhookEnabled(false);
        } finally {
            setLoadingWebhook(false);
        }
    };

    const handleCompanySelect = (company) => {
        setSelectedCompany(company);
    };

    const handleSaveWebhook = async () => {
        if (!selectedCompany) {
            setError('Please select a company first');
            return;
        }

        if (webhookEnabled && !webhookUrl.trim()) {
            setError('Please provide a webhook URL');
            return;
        }

        try {
            const response = await webhookService.updateWebhookSettings(selectedCompany.id, {
                webhookUrl: webhookUrl.trim(),
                webhookEnabled,
                emailNotifications,
                smsNotifications
            });

            if (response.success) {
                setSuccessMessage('Webhook settings saved successfully');
                setShowSuccessModal(true);
                fetchWebhookSettings();
            } else {
                setError('Failed to save webhook settings: ' + response.responseMessage);
            }
        } catch (error) {
            console.error('Error saving webhook settings:', error);
            setError('Failed to save webhook settings: ' + (error.response?.data?.errorMessage || error.message));
        }
    };

    const handleTestWebhook = async () => {
        if (!selectedCompany) {
            setError('Please select a company first');
            return;
        }

        if (!webhookUrl.trim()) {
            setError('Please provide a webhook URL first');
            return;
        }

        setTestingWebhook(true);
        try {
            const response = await webhookService.testWebhook(selectedCompany.id);

            if (response.success) {
                setTestResult({
                    success: true,
                    message: 'Test webhook sent successfully! Check your endpoint logs.'
                });
            } else {
                setTestResult({
                    success: false,
                    message: 'Webhook test failed: ' + response.responseMessage
                });
            }
            setShowTestResultModal(true);
        } catch (error) {
            console.error('Error testing webhook:', error);
            setTestResult({
                success: false,
                message: 'Webhook test failed: ' + (error.response?.data?.errorMessage || error.message)
            });
            setShowTestResultModal(true);
        } finally {
            setTestingWebhook(false);
        }
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
        <div className="webhooks-page">
            <div className="page-header">
                <div>
                    <h1>Webhook Management</h1>
                    <p className="page-subtitle">Configure webhook endpoints and notification settings for companies</p>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            {/* Company Selection Grid */}
            <Card className="company-selector-card">
                <div className="card-header-action">
                    <div>
                        <h3>Select Company</h3>
                        <p className="card-subtitle">Choose a company to manage webhook settings</p>
                    </div>
                    <Badge variant="info">{companies.length} Companies</Badge>
                </div>

                <div className="companies-grid">
                    {companies.map((company) => (
                        <div
                            key={company.id}
                            className={`company-card ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                            onClick={() => handleCompanySelect(company)}
                        >
                            <div className="company-card-header">
                                <Building2 size={24} />
                                <Badge variant={company.status === 'ACTIVE' ? 'success' : 'warning'}>
                                    {company.status}
                                </Badge>
                            </div>
                            <h4 className="company-card-name">{company.legalName}</h4>
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
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Webhook Configuration */}
            {selectedCompany && (
                <Card className="webhook-config-card">
                    <div className="card-header-action">
                        <div>
                            <h3>Webhook Configuration</h3>
                            <p className="card-subtitle">Configure webhook endpoint for {selectedCompany.legalName}</p>
                        </div>
                        <div className="header-actions">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={fetchWebhookSettings}
                            >
                                <RefreshCcw size={16} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="card-body">
                        {loadingWebhook ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading webhook settings...</p>
                            </div>
                        ) : (
                            <div className="webhook-form">
                                {/* Webhook URL */}
                                <div className="form-group">
                                    <label className="form-label">
                                        <Webhook size={16} />
                                        Webhook URL
                                    </label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="https://your-domain.com/webhook"
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                    />
                                    <p className="form-help">Enter the endpoint URL where webhook notifications will be sent</p>
                                </div>

                                {/* Webhook Enabled Toggle */}
                                <div className="form-group">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            className="toggle-input"
                                            checked={webhookEnabled}
                                            onChange={(e) => setWebhookEnabled(e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-text">Enable Webhook</span>
                                    </label>
                                    <p className="form-help">Enable or disable webhook notifications</p>
                                </div>

                                <div className="divider"></div>

                                {/* Notification Settings */}
                                <h4 className="section-title">Notification Channels</h4>

                                <div className="form-group">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            className="toggle-input"
                                            checked={emailNotifications}
                                            onChange={(e) => setEmailNotifications(e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-text">Email Notifications</span>
                                    </label>
                                    <p className="form-help">Receive notifications via email</p>
                                </div>

                                <div className="form-group">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            className="toggle-input"
                                            checked={smsNotifications}
                                            onChange={(e) => setSmsNotifications(e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                        <span className="toggle-text">SMS Notifications</span>
                                    </label>
                                    <p className="form-help">Receive notifications via SMS</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="form-actions">
                                    <Button
                                        variant="secondary"
                                        onClick={handleTestWebhook}
                                        disabled={!webhookUrl.trim() || testingWebhook}
                                    >
                                        <TestTube size={18} />
                                        {testingWebhook ? 'Testing...' : 'Test Webhook'}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleSaveWebhook}
                                    >
                                        <Save size={18} />
                                        Save Settings
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Webhook Info Card */}
            {selectedCompany && communication && (
                <Card className="webhook-info-card">
                    <div className="card-header">
                        <h3>Communication Details</h3>
                    </div>
                    <div className="card-body">
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Primary Email</span>
                                <span className="info-value">{communication.email || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Phone</span>
                                <span className="info-value">{communication.phone || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Support Email</span>
                                <span className="info-value">{communication.supportEmail || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Website</span>
                                <span className="info-value">{communication.website || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Success</h2>
                            <button className="modal-close" onClick={() => setShowSuccessModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="info-box" style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)'
                            }}>
                                <p>{successMessage}</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
                                OK
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Result Modal */}
            {showTestResultModal && (
                <div className="modal-overlay" onClick={() => setShowTestResultModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{testResult?.success ? 'Test Successful' : 'Test Failed'}</h2>
                            <button className="modal-close" onClick={() => setShowTestResultModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="info-box" style={{
                                background: testResult?.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${testResult?.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                <p>{testResult?.message}</p>
                                {testResult?.success && (
                                    <p style={{ marginTop: '10px', fontSize: '0.9em', opacity: 0.8 }}>
                                        Check your webhook endpoint logs to see the test payload.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button
                                variant={testResult?.success ? "primary" : "secondary"}
                                onClick={() => setShowTestResultModal(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
