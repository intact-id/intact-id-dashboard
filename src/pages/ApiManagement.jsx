import { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, RefreshCcw, PauseCircle, PlayCircle, Gauge } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminOrSuperAdmin, hasAnyRole } from '../utils/roles';
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
    const [credentialsByEnv, setCredentialsByEnv] = useState({ DEV: null, PROD: null });
    const [usage, setUsage] = useState(null);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [error, setError] = useState('');
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatedCredential, setGeneratedCredential] = useState(null);
    const [generatingEnv, setGeneratingEnv] = useState(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState(null);
    const [actionEnv, setActionEnv] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [rateLimits, setRateLimits] = useState(null);
    const [showRateLimitModal, setShowRateLimitModal] = useState(false);
    const [rlForm, setRlForm] = useState({ dev: { perHour: '', perDay: '', perMonth: '' }, prod: { perHour: '', perDay: '', perMonth: '' } });
    const [rlSaving, setRlSaving] = useState(false);

    const isAdminUser = useMemo(() => isAdminOrSuperAdmin(user), [user]);
    const isSuperAdmin = useMemo(() => hasAnyRole(user, ['SUPER_ADMIN']), [user]);

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
            const [keysResponse, usageResponse, rlResponse] = await Promise.allSettled([
                apiKeyService.getApiKeys(company.id),
                apiKeyService.getUsage(company.id),
                companyService.getRateLimits(company.id)
            ]);

            if (keysResponse.status === 'fulfilled' && keysResponse.value.success) {
                const credentials = keysResponse.value.data || [];
                const next = { DEV: null, PROD: null };
                credentials.forEach((item) => {
                    if (item.environment === 'DEV') next.DEV = item;
                    if (item.environment === 'PROD') next.PROD = item;
                });
                setCredentialsByEnv(next);
            } else {
                setCredentialsByEnv({ DEV: null, PROD: null });
            }

            if (usageResponse.status === 'fulfilled' && usageResponse.value.success) {
                setUsage(usageResponse.value.data || null);
            } else {
                setUsage(null);
            }

            if (rlResponse.status === 'fulfilled' && rlResponse.value.success) {
                const rl = rlResponse.value.data;
                setRateLimits(rl);
                setRlForm({
                    dev: { perHour: rl?.dev?.perHour ?? '', perDay: rl?.dev?.perDay ?? '', perMonth: rl?.dev?.perMonth ?? '' },
                    prod: { perHour: rl?.prod?.perHour ?? '', perDay: rl?.prod?.perDay ?? '', perMonth: rl?.prod?.perMonth ?? '' }
                });
            } else {
                setRateLimits(null);
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to load company API details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const generateCredentials = async (environment) => {
        if (!selectedCompany) return;
        setGeneratingEnv(environment);
        try {
            const response = environment === 'DEV'
                ? await apiKeyService.generateDevApiKey(selectedCompany.id)
                : await apiKeyService.generateProdApiKey(selectedCompany.id);
            if (response.success) {
                setGeneratedCredential(response.data);
                setShowGenerateModal(true);
                await selectCompany(selectedCompany);
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || 'Failed to generate credentials');
        } finally {
            setGeneratingEnv(null);
        }
    };

    const openAction = (type, env) => {
        setActionType(type);
        setActionEnv(env);
        setShowActionModal(true);
    };

    const confirmAction = async () => {
        if (!selectedCompany) return;
        setActionLoading(true);
        try {
            if (actionType === 'suspend') {
                await credentialsService.suspendCredentials(selectedCompany.id, actionEnv.toLowerCase());
            } else {
                await credentialsService.activateCredentials(selectedCompany.id, actionEnv.toLowerCase());
            }
            setShowActionModal(false);
            await selectCompany(selectedCompany);
        } catch (err) {
            setError(err.response?.data?.errorMessage || err.message || `Failed to ${actionType} credentials`);
        } finally {
            setActionLoading(false);
        }
    };

    const saveRateLimits = async () => {
        if (!selectedCompany) return;
        setRlSaving(true);
        try {
            const toInt = (v) => (v === '' || v === null || v === undefined) ? -1 : parseInt(v, 10);
            const payload = {
                dev: { perHour: toInt(rlForm.dev.perHour), perDay: toInt(rlForm.dev.perDay), perMonth: toInt(rlForm.dev.perMonth) },
                prod: { perHour: toInt(rlForm.prod.perHour), perDay: toInt(rlForm.prod.perDay), perMonth: toInt(rlForm.prod.perMonth) }
            };
            const res = await companyService.updateRateLimits(selectedCompany.id, payload);
            if (res.success) {
                setRateLimits(res.data);
                setShowRateLimitModal(false);
            }
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.message || 'Failed to update rate limits');
        } finally {
            setRlSaving(false);
        }
    };

    const safePct = (ok = 0, total = 0) => (!total ? 0 : Math.round((ok / total) * 100));

    if (!isAdminUser) {
        return (
            <div className="api-management">
                <div className="page-header">
                    <h1>API Key Management</h1>
                </div>
                <Card className="api-empty-state">This page is available to `ADMIN` and `SUPER_ADMIN` users only.</Card>
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
                <Button onClick={() => generateCredentials('PROD')} disabled={!selectedCompany || generatingEnv !== null}>
                    <KeyRound size={16} />
                    Generate PROD
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
                                    <Button variant="secondary" onClick={() => generateCredentials('DEV')} disabled={generatingEnv !== null}>
                                        <RefreshCcw size={14} />
                                        {generatingEnv === 'DEV' ? 'Generating DEV...' : 'Generate DEV'}
                                    </Button>
                                    <Button variant="secondary" onClick={() => generateCredentials('PROD')} disabled={generatingEnv !== null}>
                                        <RefreshCcw size={14} />
                                        {generatingEnv === 'PROD' ? 'Generating PROD...' : 'Generate PROD'}
                                    </Button>
                                </div>
                            </div>

                            <div className="credential-card">
                                <h4 className="env-title">PROD Credentials</h4>
                                <div className="credential-row">
                                    <span>Credential Status</span>
                                    <Badge variant={credentialsByEnv.PROD?.status === 'ACTIVE' ? 'success' : 'warning'}>
                                        {credentialsByEnv.PROD?.status || 'NOT GENERATED'}
                                    </Badge>
                                </div>
                                <div className="credential-row">
                                    <span>Expires At</span>
                                    <strong>{credentialsByEnv.PROD?.expiresAt ? new Date(credentialsByEnv.PROD.expiresAt).toLocaleString() : 'N/A'}</strong>
                                </div>
                                <div className="credential-row">
                                    <span>Environment</span>
                                    <strong>{credentialsByEnv.PROD?.environment || 'PROD'}</strong>
                                </div>
                                <div className="credential-actions">
                                    <Button size="sm" variant="secondary" onClick={() => generateCredentials('PROD')} disabled={generatingEnv !== null}>
                                        <KeyRound size={14} />
                                        {credentialsByEnv.PROD ? 'Regenerate PROD' : 'Generate PROD'}
                                    </Button>
                                    {credentialsByEnv.PROD && (
                                        credentialsByEnv.PROD.status === 'SUSPENDED' ? (
                                            <Button size="sm" onClick={() => openAction('activate', 'PROD')}>
                                                <PlayCircle size={14} /> Activate PROD
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => openAction('suspend', 'PROD')}>
                                                <PauseCircle size={14} /> Suspend PROD
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="credential-card">
                                <h4 className="env-title">DEV Credentials</h4>
                                <div className="credential-row">
                                    <span>Credential Status</span>
                                    <Badge variant={credentialsByEnv.DEV?.status === 'ACTIVE' ? 'success' : 'warning'}>
                                        {credentialsByEnv.DEV?.status || 'NOT GENERATED'}
                                    </Badge>
                                </div>
                                <div className="credential-row">
                                    <span>Expires At</span>
                                    <strong>{credentialsByEnv.DEV?.expiresAt ? new Date(credentialsByEnv.DEV.expiresAt).toLocaleString() : 'N/A'}</strong>
                                </div>
                                <div className="credential-row">
                                    <span>Environment</span>
                                    <strong>{credentialsByEnv.DEV?.environment || 'DEV'}</strong>
                                </div>
                                <div className="credential-actions">
                                    <Button size="sm" variant="secondary" onClick={() => generateCredentials('DEV')} disabled={generatingEnv !== null}>
                                        <KeyRound size={14} />
                                        {credentialsByEnv.DEV ? 'Regenerate DEV' : 'Generate DEV'}
                                    </Button>
                                    {credentialsByEnv.DEV && (
                                        credentialsByEnv.DEV.status === 'SUSPENDED' ? (
                                            <Button size="sm" onClick={() => openAction('activate', 'DEV')}>
                                                <PlayCircle size={14} /> Activate DEV
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => openAction('suspend', 'DEV')}>
                                                <PauseCircle size={14} /> Suspend DEV
                                            </Button>
                                        )
                                    )}
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

                            {/* Rate Limits Card */}
                            <div className="rl-card">
                                <div className="rl-card-header">
                                    <div className="rl-card-title">
                                        <Gauge size={16} />
                                        <span>Rate Limits</span>
                                    </div>
                                    {isSuperAdmin && (
                                        <button className="rl-configure-btn" onClick={() => setShowRateLimitModal(true)}>
                                            Configure
                                        </button>
                                    )}
                                </div>
                                <div className="rl-envs">
                                    {[
                                        { key: 'dev',  label: 'Development', usageKey: 'dev' },
                                        { key: 'prod', label: 'Production',  usageKey: 'prod' }
                                    ].map(({ key, label, usageKey }) => {
                                        const lim = rateLimits?.[key];
                                        const used = usage?.[`${usageKey}TotalRequests`] || 0;
                                        const monthLimit = lim?.perMonth;
                                        const pct = monthLimit > 0 ? Math.min(100, Math.round((used / monthLimit) * 100)) : null;
                                        return (
                                            <div key={key} className="rl-env-panel">
                                                <div className="rl-env-label-row">
                                                    <span className={`rl-env-badge rl-env-badge--${key}`}>{label}</span>
                                                    {pct !== null && (
                                                        <span className={`rl-usage-pct ${pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : ''}`}>
                                                            {pct}% of monthly limit used
                                                        </span>
                                                    )}
                                                </div>
                                                {pct !== null && (
                                                    <div className="rl-bar-wrap">
                                                        <div className="rl-bar">
                                                            <div
                                                                className={`rl-bar-fill ${pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : ''}`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="rl-limits-grid">
                                                    {[
                                                        { label: 'Per Hour', val: lim?.perHour },
                                                        { label: 'Per Day',  val: lim?.perDay },
                                                        { label: 'Per Month', val: lim?.perMonth },
                                                    ].map(({ label: l, val }) => (
                                                        <div key={l} className="rl-limit-cell">
                                                            <span className="rl-limit-label">{l}</span>
                                                            <span className={`rl-limit-val ${val == null || val < 0 ? 'unlimited' : ''}`}>
                                                                {val == null || val < 0 ? '∞' : val.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
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
                        <p>Credentials were generated successfully for the selected environment.</p>
                        <div className="generated-row">
                            <span>Environment</span>
                            <code>{generatedCredential.environment || 'N/A'}</code>
                        </div>
                        <div className="modal-actions">
                            <Button onClick={() => setShowGenerateModal(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {showRateLimitModal && isSuperAdmin && (
                <div className="modal-overlay" onClick={() => setShowRateLimitModal(false)}>
                    <div className="modal-content rl-modal" onClick={e => e.stopPropagation()}>
                        <h3><Gauge size={16} /> Rate Limits — {selectedCompany?.legalName}</h3>
                        <p className="rl-modal-hint">Set to blank or 0 for unlimited. Values are per verification request.</p>

                        {[
                            { key: 'dev', label: 'Development (DEV)' },
                            { key: 'prod', label: 'Production (PROD)' }
                        ].map(({ key, label }, i) => (
                            <div key={key} className="rl-env-block">
                                {i > 0 && <div className="rl-modal-divider" />}
                                <div className="rl-env-label">{label}</div>
                                <div className="rl-fields">
                                    {[
                                        { field: 'perHour', label: 'Per Hour' },
                                        { field: 'perDay',  label: 'Per Day' },
                                        { field: 'perMonth', label: 'Per Month' }
                                    ].map(({ field, label: fl }) => (
                                        <div key={field} className="rl-field">
                                            <label>{fl}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="rl-input"
                                                placeholder="Unlimited"
                                                value={rlForm[key][field]}
                                                onChange={e => setRlForm(prev => ({
                                                    ...prev,
                                                    [key]: { ...prev[key], [field]: e.target.value }
                                                }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowRateLimitModal(false)}>Cancel</button>
                            <button className="btn-save" onClick={saveRateLimits} disabled={rlSaving}>
                                {rlSaving ? 'Saving…' : 'Save Limits'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showActionModal && (
                <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{actionType === 'suspend' ? `Suspend ${actionEnv} Credentials` : `Activate ${actionEnv} Credentials`}</h3>
                        <p>
                            {actionType === 'suspend'
                                ? `Suspending ${actionEnv} credentials will block all ${actionEnv} API requests for this company.`
                                : `Activating ${actionEnv} credentials will restore ${actionEnv} API access. No new keys will be generated.`}
                        </p>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowActionModal(false)}>Cancel</Button>
                            <Button onClick={confirmAction} disabled={actionLoading}>
                                {actionLoading ? 'Processing...' : (actionType === 'suspend' ? `Suspend ${actionEnv}` : `Activate ${actionEnv}`)}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
