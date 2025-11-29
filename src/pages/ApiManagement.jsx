import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './ApiManagement.css';

export default function ApiManagement() {
    const [apiKeys, setApiKeys] = useState([]);
    const [usageData, setUsageData] = useState([]);
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApiData();
    }, []);

    const fetchApiData = async () => {
        try {
            const [keysRes, usageRes] = await Promise.all([
                fetch('http://localhost:3001/apiKeys'),
                fetch('http://localhost:3001/usageData')
            ]);

            const [keysData, usageData] = await Promise.all([
                keysRes.json(),
                usageRes.json()
            ]);

            setApiKeys(keysData);
            setUsageData(usageData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching API data:', error);
            setLoading(false);
        }
    };

    const generateNewKey = () => {
        const newKey = {
            id: apiKeys.length + 1,
            name: newKeyName,
            key: `sk_live_************************${Math.random().toString(36).substr(2, 4)}`,
            keyFull: `sk_live_${Math.random().toString(36).substr(2, 40)}`,
            created: new Date().toISOString(),
            lastUsed: null,
            permissions: ['read', 'write'],
            status: 'active'
        };

        setGeneratedKey(newKey);
        setApiKeys([...apiKeys, newKey]);
        setNewKeyName('');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('API key copied to clipboard!');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return <div className="page-loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="api-management">
            <div className="page-header">
                <div>
                    <h1>API Management</h1>
                    <p className="page-subtitle">Manage your API keys and monitor usage</p>
                </div>
                <Button variant="primary" onClick={() => setShowNewKeyModal(true)}>
                    Generate New Key
                </Button>
            </div>

            {/* API Keys List */}
            <Card className="api-keys-card">
                <div className="card__header">
                    <h3 className="card__title">API Keys</h3>
                    <Badge variant="info">{apiKeys.length} Active</Badge>
                </div>
                <div className="card__body">
                    <div className="api-keys-list">
                        {apiKeys.map((key) => (
                            <div key={key.id} className="api-key-item">
                                <div className="api-key-header">
                                    <div className="api-key-name">{key.name}</div>
                                    <Badge variant="success">{key.status}</Badge>
                                </div>
                                <div className="api-key-value">
                                    <code>{key.key}</code>
                                    <button
                                        className="copy-btn"
                                        onClick={() => copyToClipboard(key.keyFull)}
                                        title="Copy full key"
                                    >
                                        📋
                                    </button>
                                </div>
                                <div className="api-key-meta">
                                    <span>Created: {formatDate(key.created)}</span>
                                    <span>Last used: {formatDate(key.lastUsed)}</span>
                                    <span>Permissions: {key.permissions.join(', ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Usage Chart */}
            <Card className="usage-chart-card">
                <div className="card__header">
                    <h3 className="card__title">API Usage (Last 7 Days)</h3>
                </div>
                <div className="card__body">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={usageData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 148, 158, 0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="#8b949e"
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis stroke="#8b949e" />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(11, 15, 25, 0.95)',
                                    border: '1px solid rgba(0, 242, 255, 0.2)',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <Bar dataKey="apiCalls" fill="#00f2ff" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Rate Limits */}
            <Card>
                <div className="card__header">
                    <h3 className="card__title">Rate Limits</h3>
                </div>
                <div className="card__body">
                    <div className="rate-limit-item">
                        <div className="rate-limit-label">
                            <span className="limit-name">Requests per minute</span>
                            <span className="limit-usage">100 / 1000</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '10%' }}></div>
                        </div>
                    </div>
                    <div className="rate-limit-item">
                        <div className="rate-limit-label">
                            <span className="limit-name">Requests per hour</span>
                            <span className="limit-usage">1,245 / 50,000</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '2.5%' }}></div>
                        </div>
                    </div>
                    <div className="rate-limit-item">
                        <div className="rate-limit-label">
                            <span className="limit-name">Monthly quota</span>
                            <span className="limit-usage">8,547 / 10,000</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill progress-fill--warning" style={{ width: '85.47%' }}></div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* New Key Modal */}
            {showNewKeyModal && (
                <div className="modal-overlay" onClick={() => { setShowNewKeyModal(false); setGeneratedKey(null); }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <Card variant="elevated">
                            <div className="modal-header">
                                <h2>{generatedKey ? 'API Key Generated' : 'Generate New API Key'}</h2>
                                <button className="modal-close" onClick={() => { setShowNewKeyModal(false); setGeneratedKey(null); }}>
                                    ✕
                                </button>
                            </div>

                            <div className="modal-body">
                                {!generatedKey ? (
                                    <>
                                        <div className="input-group">
                                            <label className="input-label">Key Name *</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="e.g., Production API Key"
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="primary"
                                            onClick={generateNewKey}
                                            disabled={!newKeyName}
                                        >
                                            Generate Key
                                        </Button>
                                    </>
                                ) : (
                                    <div className="generated-key-display">
                                        <div className="warning-box">
                                            <span className="warning-icon">⚠️</span>
                                            <div>
                                                <strong>Save this key!</strong> You won't be able to see  it again.
                                            </div>
                                        </div>
                                        <div className="key-display">
                                            <code>{generatedKey.keyFull}</code>
                                            <button
                                                className="copy-btn-large"
                                                onClick={() => copyToClipboard(generatedKey.keyFull)}
                                            >
                                                Copy Key
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
