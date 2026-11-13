import { useCallback, useEffect, useState } from 'react';
import { Search, Pencil, Copy } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import apiKeyService from '../services/apiKeyService';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { hasAnyRole, isSuperAdmin } from '../utils/roles';
import { formatDate, humanize, initialsOf } from '../utils/format';

const STATUS_BADGE = { ACTIVE: 'ok', SUSPENDED: 'warn', REVOKED: 'bad', EXPIRED: 'bad' };

const formatCount = (value) => (value == null ? '—' : Number(value).toLocaleString());
// auth-server skips the check when a limit is empty or 0.
const formatLimit = (value) => (value ? Number(value).toLocaleString() : 'No limit');

function copy(text, toast) {
    navigator.clipboard.writeText(text).then(
        () => toast.success('Copied'),
        () => toast.error('Could not copy — select the text and copy it manually'),
    );
}

export default function ApiManagement() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const canEditLimits = isSuperAdmin(user);

    const [companies, setCompanies] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [loadError, setLoadError] = useState('');

    const [keys, setKeys] = useState(null); // null while loading
    const [usage, setUsage] = useState(null);

    const [confirm, setConfirm] = useState(null); // 'issue' | 'suspend' | 'activate' while the dialog is open
    const [issued, setIssued] = useState(null); // { apiKey, apiSecret } — shown once
    const [limitsForm, setLimitsForm] = useState(null);
    const [saving, setSaving] = useState(false);

    // API key endpoints are admin-only, so company users get the explanation below instead.
    useEffect(() => {
        if (!isAdmin) return;
        companyService
            .list({ size: 100 })
            .then((page) => setCompanies(page.content))
            .catch((error) => setLoadError(errorMessage(error, 'Could not load companies.')));
    }, [isAdmin]);

    const selected = companies.find((c) => c.id === selectedId) ?? companies[0];

    const loadKeys = useCallback(async (companyId) => {
        setKeys(null);
        setUsage(null);
        try {
            const [keyList, usageData] = await Promise.all([
                apiKeyService.listKeys(companyId),
                apiKeyService.getUsage(companyId),
            ]);
            setKeys(keyList);
            setUsage(usageData);
        } catch (error) {
            setKeys([]);
            toast.error(errorMessage(error, 'Could not load API keys.'));
        }
    }, [toast]);

    useEffect(() => {
        if (selected?.id) loadKeys(selected.id);
    }, [selected?.id, loadKeys]);

    const runConfirmedAction = async () => {
        const action = confirm;
        setSaving(true);
        try {
            if (action === 'issue') {
                const result = await apiKeyService.issueKey(selected.id);
                setIssued({ apiKey: result.apiKey, apiSecret: result.apiSecret });
            } else if (action === 'suspend') {
                await apiKeyService.suspendKey(selected.id);
                toast.success('Key suspended');
            } else {
                await apiKeyService.activateKey(selected.id);
                toast.success('Key activated');
            }
            setConfirm(null);
            await loadKeys(selected.id);
        } catch (error) {
            toast.error(errorMessage(error, 'That did not work. Please try again.'));
        } finally {
            setSaving(false);
        }
    };

    const openLimitsForm = () => {
        setLimitsForm({ perHour: usage?.rateLimitPerHour || '', perDay: usage?.rateLimitPerDay || '', perMonth: usage?.rateLimitPerMonth || '' });
    };

    const setLimit = (field, value) => setLimitsForm((form) => ({ ...form, [field]: value }));

    const saveLimits = async () => {
        const values = Object.values(limitsForm);
        if (values.some((v) => v !== '' && (!Number.isInteger(Number(v)) || Number(v) < 1))) {
            toast.error('Limits must be whole numbers of 1 or more. Leave a field empty for no limit.');
            return;
        }
        // auth-server: a negative value clears the limit (no limit); a number sets it.
        const toLimit = (value) => (value === '' ? -1 : Number(value));

        setSaving(true);
        try {
            await apiKeyService.updateRateLimits(selected.id, {
                perHour: toLimit(limitsForm.perHour), perDay: toLimit(limitsForm.perDay), perMonth: toLimit(limitsForm.perMonth),
            });
            toast.success('Rate limits saved');
            setLimitsForm(null);
            await loadKeys(selected.id);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save rate limits.'));
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="page">
                <div className="page-head"><div><h1>API keys</h1></div></div>
                <div className="card"><div className="empty-state">Only Intact ID administrators can view and manage API keys.</div></div>
            </div>
        );
    }

    const query = search.trim().toLowerCase();
    const filtered = companies.filter((c) =>
        [c.legalName, c.tradingName].some((name) => name?.toLowerCase().includes(query)));
    const key = keys?.[0]; // one key pair per company

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>API keys</h1>
                    <p>One key pair per company. Keys work only on this server: test-server keys don't work in production.</p>
                </div>
            </div>

            {loadError ? (
                <div className="card"><div className="empty-state">{loadError}</div></div>
            ) : (
                <div className="api-layout">
                    <div className="card api-companies-card">
                        <div className="card-head"><h3>Companies</h3></div>
                        <div className="search-input" style={{ marginBottom: 12 }}>
                            <Search size={14} />
                            <input placeholder="Search company" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="api-company-list">
                            {filtered.map((c) => (
                                <button
                                    key={c.id}
                                    className={`api-company-item${c.id === selected?.id ? ' is-selected' : ''}`}
                                    onClick={() => setSelectedId(c.id)}
                                >
                                    <span className="avatar avatar--light">{initialsOf(c.tradingName || c.legalName)}</span>
                                    <div>
                                        <div className="name-primary">{c.tradingName || c.legalName}</div>
                                        <div className="name-secondary">{[humanize(c.status), c.country].filter(Boolean).join(' · ')}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selected && (
                        <div className="api-detail">
                            <div className="card">
                                <div className="card-head">
                                    <div className="subject-head" style={{ marginBottom: 0 }}>
                                        <span className="avatar avatar--dark avatar--lg">{initialsOf(selected.tradingName || selected.legalName)}</span>
                                        <div>
                                            <div className="name-primary">{selected.legalName}</div>
                                            <div className="name-secondary">Onboarded {formatDate(selected.approvedAt || selected.createdAt)}</div>
                                        </div>
                                    </div>
                                </div>
                                {keys === null ? (
                                    <div className="loading-state">Loading keys…</div>
                                ) : (
                                    <div className="api-key-list">
                                        <div className="api-key-row">
                                            <div className="api-key-row-head">
                                                <div className="head-actions">
                                                    {key ? <Badge kind={STATUS_BADGE[key.status] || 'neutral'}>{humanize(key.status)}</Badge> : <Badge kind="neutral">No key</Badge>}
                                                </div>
                                                <div className="head-actions">
                                                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirm('issue')}>{key ? 'Rotate' : 'Issue key'}</button>
                                                    {key?.status === 'ACTIVE' && <button className="btn btn--ghost btn--sm" onClick={() => setConfirm('suspend')}>Suspend</button>}
                                                    {key?.status === 'SUSPENDED' && <button className="btn btn--ghost btn--sm" onClick={() => setConfirm('activate')}>Activate</button>}
                                                </div>
                                            </div>
                                            <div className="api-key-value mono">{key ? '•••••••••••••••• (stored hashed — shown only when issued)' : 'No key issued'}</div>
                                            {key && (
                                                <div className="api-key-meta">
                                                    Expires {formatDate(key.expiresAt)} · {usage?.lastUsedAt ? `Last used ${formatDate(usage.lastUsedAt)}` : 'Never used'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="card">
                                <div className="card-head">
                                    <h3>Rate limits</h3>
                                    {canEditLimits && usage && (
                                        <button className="btn btn--ghost btn--sm" onClick={openLimitsForm}><Pencil size={13} /> Edit limits</button>
                                    )}
                                </div>
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Per hour</th><th>Per day</th><th>Per month</th><th>Requests (all time)</th><th>Failed</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="mono">{usage ? formatLimit(usage.rateLimitPerHour) : '—'}</td>
                                                <td className="mono">{usage ? formatLimit(usage.rateLimitPerDay) : '—'}</td>
                                                <td className="mono">{usage ? formatLimit(usage.rateLimitPerMonth) : '—'}</td>
                                                <td className="mono">{formatCount(usage?.totalRequests)}</td>
                                                <td className="mono">{formatCount(usage?.totalFailedRequests)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                title={confirm && {
                    issue: key ? 'Rotate the key?' : 'Issue a key?',
                    suspend: 'Suspend the key?',
                    activate: 'Activate the key?',
                }[confirm]}
                caption={confirm && {
                    issue: key
                        ? `The current key stops working immediately. ${selected?.legalName} must switch to the new key and secret.`
                        : 'The key and secret are shown once. Copy them before closing.',
                    suspend: `Calls with this key are rejected until you activate it again.`,
                    activate: 'Calls with this key are accepted again.',
                }[confirm]}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setConfirm(null)} disabled={saving}>Cancel</button>
                        <button
                            className={confirm === 'suspend' || (confirm === 'issue' && key) ? 'btn btn--danger-outline' : 'btn btn--primary'}
                            onClick={runConfirmedAction}
                            disabled={saving}
                        >
                            {saving ? 'Working…' : confirm && { issue: key ? 'Rotate key' : 'Issue key', suspend: 'Suspend key', activate: 'Activate key' }[confirm]}
                        </button>
                    </>
                )}
            />

            <Modal
                isOpen={!!issued}
                onClose={() => setIssued(null)}
                title="New credentials"
                caption="Copy both values now. They are stored hashed and cannot be shown again."
                footer={<button className="btn btn--primary" onClick={() => setIssued(null)}>I have copied them</button>}
            >
                {issued && (
                    <>
                        <div className="field">
                            <label>API key</label>
                            <button className="copy-field mono" onClick={() => copy(issued.apiKey, toast)}>{issued.apiKey} <Copy size={14} /></button>
                        </div>
                        <div className="field">
                            <label>API secret</label>
                            <button className="copy-field mono" onClick={() => copy(issued.apiSecret, toast)}>{issued.apiSecret} <Copy size={14} /></button>
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={!!limitsForm}
                onClose={() => setLimitsForm(null)}
                title="Edit rate limits"
                caption={`${selected?.legalName} · leave a field empty for no limit`}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setLimitsForm(null)} disabled={saving}>Cancel</button>
                        <button className="btn btn--primary" onClick={saveLimits} disabled={saving}>{saving ? 'Saving…' : 'Save limits'}</button>
                    </>
                )}
            >
                {limitsForm && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[['perHour', 'Per hour'], ['perDay', 'Per day'], ['perMonth', 'Per month']].map(([field, label]) => (
                            <div key={field} className="field">
                                <label htmlFor={`limit-${field}`}>{label}</label>
                                <input id={`limit-${field}`} className="input" type="number" min="1" step="1" placeholder="No limit"
                                       value={limitsForm[field]} onChange={(e) => setLimit(field, e.target.value)} />
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
