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

const ENVIRONMENTS = [
    { id: 'prod', label: 'Production' },
    { id: 'dev', label: 'Development' },
];
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

    const [confirm, setConfirm] = useState(null); // { action: 'issue' | 'suspend' | 'activate', env }
    const [issued, setIssued] = useState(null); // { env, apiKey, apiSecret } — shown once
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
        const { action, env } = confirm;
        setSaving(true);
        try {
            if (action === 'issue') {
                const result = await apiKeyService.issueKey(selected.id, env.id);
                setIssued({ env, apiKey: result.apiKey, apiSecret: result.apiSecret });
            } else if (action === 'suspend') {
                await apiKeyService.suspendKey(selected.id, env.id);
                toast.success(`${env.label} key suspended`);
            } else {
                await apiKeyService.activateKey(selected.id, env.id);
                toast.success(`${env.label} key activated`);
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
        setLimitsForm({
            dev: { perHour: usage?.devRateLimitPerHour || '', perDay: usage?.devRateLimitPerDay || '', perMonth: usage?.devRateLimitPerMonth || '' },
            prod: { perHour: usage?.prodRateLimitPerHour || '', perDay: usage?.prodRateLimitPerDay || '', perMonth: usage?.prodRateLimitPerMonth || '' },
        });
    };

    const setLimit = (env, field, value) => {
        setLimitsForm((form) => ({ ...form, [env]: { ...form[env], [field]: value } }));
    };

    const saveLimits = async () => {
        const values = ['dev', 'prod'].flatMap((env) => Object.values(limitsForm[env]));
        if (values.some((v) => v !== '' && (!Number.isInteger(Number(v)) || Number(v) < 1))) {
            toast.error('Limits must be whole numbers of 1 or more. Leave a field empty for no limit.');
            return;
        }
        // auth-server: a negative value clears the limit (no limit); a number sets it.
        const toLimit = (value) => (value === '' ? -1 : Number(value));
        const toNumbers = (env) => ({
            perHour: toLimit(limitsForm[env].perHour),
            perDay: toLimit(limitsForm[env].perDay),
            perMonth: toLimit(limitsForm[env].perMonth),
        });
        setSaving(true);
        try {
            await apiKeyService.updateRateLimits(selected.id, { dev: toNumbers('dev'), prod: toNumbers('prod') });
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
    const keyFor = (env) => keys?.find((k) => k.environment?.toLowerCase() === env.id);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>API keys</h1>
                    <p>Credentials issued per company, split by environment.</p>
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
                                        {ENVIRONMENTS.map((env) => {
                                            const key = keyFor(env);
                                            const lastUsed = usage?.[`${env.id}LastUsedAt`];
                                            return (
                                                <div key={env.id} className="api-key-row">
                                                    <div className="api-key-row-head">
                                                        <div className="head-actions">
                                                            <Badge kind={env.id === 'prod' ? 'ok' : 'neutral'} dot={false}>{env.label}</Badge>
                                                            {key && <Badge kind={STATUS_BADGE[key.status] || 'neutral'}>{humanize(key.status)}</Badge>}
                                                        </div>
                                                        <div className="head-actions">
                                                            <button className="btn btn--ghost btn--sm" onClick={() => setConfirm({ action: 'issue', env })}>
                                                                {key ? 'Rotate' : 'Issue key'}
                                                            </button>
                                                            {key?.status === 'ACTIVE' && (
                                                                <button className="btn btn--ghost btn--sm" onClick={() => setConfirm({ action: 'suspend', env })}>Suspend</button>
                                                            )}
                                                            {key?.status === 'SUSPENDED' && (
                                                                <button className="btn btn--ghost btn--sm" onClick={() => setConfirm({ action: 'activate', env })}>Activate</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="api-key-value mono">{key ? '•••••••••••••••• (stored hashed — shown only when issued)' : 'No key issued'}</div>
                                                    {key && (
                                                        <div className="api-key-meta">
                                                            Expires {formatDate(key.expiresAt)} · {lastUsed ? `Last used ${formatDate(lastUsed)}` : 'Never used'}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                            <tr><th>Environment</th><th>Per hour</th><th>Per day</th><th>Per month</th><th>Requests (all time)</th><th>Failed</th></tr>
                                        </thead>
                                        <tbody>
                                            {ENVIRONMENTS.map((env) => (
                                                <tr key={env.id}>
                                                    <td>{env.label}</td>
                                                    <td className="mono">{usage ? formatLimit(usage[`${env.id}RateLimitPerHour`]) : '—'}</td>
                                                    <td className="mono">{usage ? formatLimit(usage[`${env.id}RateLimitPerDay`]) : '—'}</td>
                                                    <td className="mono">{usage ? formatLimit(usage[`${env.id}RateLimitPerMonth`]) : '—'}</td>
                                                    <td className="mono">{formatCount(usage?.[`${env.id}TotalRequests`])}</td>
                                                    <td className="mono">{formatCount(usage?.[`${env.id}TotalFailedRequests`])}</td>
                                                </tr>
                                            ))}
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
                    issue: keyFor(confirm.env) ? `Rotate the ${confirm.env.label.toLowerCase()} key?` : `Issue a ${confirm.env.label.toLowerCase()} key?`,
                    suspend: `Suspend the ${confirm.env.label.toLowerCase()} key?`,
                    activate: `Activate the ${confirm.env.label.toLowerCase()} key?`,
                }[confirm.action]}
                caption={confirm && {
                    issue: keyFor(confirm.env)
                        ? `The current key stops working immediately. ${selected?.legalName} must switch to the new key and secret.`
                        : 'The key and secret are shown once. Copy them before closing.',
                    suspend: `Calls with this key are rejected until you activate it again.`,
                    activate: 'Calls with this key are accepted again.',
                }[confirm.action]}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setConfirm(null)} disabled={saving}>Cancel</button>
                        <button
                            className={confirm?.action === 'suspend' || (confirm?.action === 'issue' && keyFor(confirm.env)) ? 'btn btn--danger-outline' : 'btn btn--primary'}
                            onClick={runConfirmedAction}
                            disabled={saving}
                        >
                            {saving ? 'Working…' : confirm && { issue: keyFor(confirm.env) ? 'Rotate key' : 'Issue key', suspend: 'Suspend key', activate: 'Activate key' }[confirm.action]}
                        </button>
                    </>
                )}
            />

            <Modal
                isOpen={!!issued}
                onClose={() => setIssued(null)}
                title={`New ${issued?.env.label.toLowerCase()} credentials`}
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
                {limitsForm && ENVIRONMENTS.map((env) => (
                    <div key={env.id} className="field">
                        <label>{env.label}</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[['perHour', 'Per hour'], ['perDay', 'Per day'], ['perMonth', 'Per month']].map(([field, label]) => (
                                <input
                                    key={field}
                                    className="input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    aria-label={`${env.label} ${label}`}
                                    placeholder={`${label}: no limit`}
                                    value={limitsForm[env.id][field]}
                                    onChange={(e) => setLimit(env.id, field, e.target.value)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </Modal>
        </div>
    );
}
