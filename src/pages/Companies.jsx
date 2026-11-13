import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { hasAnyRole } from '../utils/roles';
import { formatDate, humanize, initialsOf } from '../utils/format';
import OwnerCheckSettings from '../components/kyb/OwnerCheckSettings';

const STATUS_BADGE = { ACTIVE: 'ok', APPROVED: 'ok', PENDING: 'warn', PENDING_APPROVAL: 'warn', SUSPENDED: 'bad', INACTIVE: 'bad' };
const PAGE_SIZE = 100;

// Fields the design shows that auth-server does not return yet — rendered as "—" until it does.
const NOT_IN_API = '—';

export default function Companies() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);

    const [companies, setCompanies] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');

    const [contact, setContact] = useState(null);
    const [statusAction, setStatusAction] = useState(null); // 'suspend' | 'activate' while the confirm dialog is open
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    // Admins see every company; a company user only sees their own (GET /api/companies is admin-only).
    const loadPage = useCallback(async (pageToLoad) => {
        setLoading(true);
        setLoadError('');
        try {
            if (isAdmin) {
                const result = await companyService.list({ page: pageToLoad, size: PAGE_SIZE });
                setCompanies((prev) => (pageToLoad === 0 ? result.content : [...prev, ...result.content]));
                setTotal(result.totalElements);
            } else {
                const mine = await companyService.getMine();
                setCompanies([mine]);
                setTotal(1);
            }
            setPage(pageToLoad);
        } catch (error) {
            setLoadError(errorMessage(error, 'Could not load companies.'));
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => { loadPage(0); }, [loadPage]);

    // Fall back to the first company until the user picks one.
    const selected = companies.find((c) => c.id === selectedId) ?? companies[0];

    useEffect(() => {
        const selectedId = selected?.id;
        if (!selectedId) return;
        let cancelled = false;
        setContact(null);
        companyService
            .getCommunication(selectedId)
            .then((data) => { if (!cancelled) setContact(data); })
            .catch(() => { if (!cancelled) setContact({}); });
        return () => { cancelled = true; };
    }, [selected?.id]);

    const query = search.trim().toLowerCase();
    const filtered = companies.filter((c) =>
        [c.legalName, c.tradingName, c.registrationNumber, c.companyIdentifierCode]
            .some((field) => field?.toLowerCase().includes(query)));

    const closeStatusDialog = () => {
        setStatusAction(null);
        setReason('');
    };

    const confirmStatusChange = async () => {
        setSaving(true);
        try {
            const updated = statusAction === 'suspend'
                ? await companyService.suspend(selected.id, reason.trim())
                : await companyService.activate(selected.id);
            setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            toast.success(`${updated.legalName} ${statusAction === 'suspend' ? 'suspended' : 'activated'}`);
            closeStatusDialog();
        } catch (error) {
            toast.error(errorMessage(error, `Could not ${statusAction} the company.`));
        } finally {
            setSaving(false);
        }
    };

    const isSuspended = selected?.status === 'SUSPENDED';

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Companies</h1>
                    <p>{isAdmin ? 'Every business with access to your verification APIs.' : 'Your company’s registration and contact details.'}</p>
                </div>
            </div>

            {loadError && companies.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        {loadError}
                        <div style={{ marginTop: 12 }}>
                            <button className="btn btn--secondary btn--sm" onClick={() => loadPage(0)}>Try again</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="api-layout">
                    <div className="card api-companies-card">
                        <div className="card-head">
                            <h3>Companies</h3>
                            {isAdmin && <span className="name-secondary">{total.toLocaleString()}</span>}
                        </div>
                        <div className="search-input" style={{ marginBottom: 12 }}>
                            <Search size={14} />
                            <input placeholder="Search name or registration number" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="api-company-list">
                            {loading && companies.length === 0 && <div className="loading-state">Loading companies…</div>}
                            {!loading && filtered.length === 0 && <div className="empty-state">No companies match “{search}”.</div>}
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
                            {isAdmin && companies.length < total && (
                                <button className="btn btn--ghost btn--sm" disabled={loading} onClick={() => loadPage(page + 1)}>
                                    {loading ? 'Loading…' : `Load more (${(total - companies.length).toLocaleString()} left)`}
                                </button>
                            )}
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
                                            <div className="name-secondary">
                                                {[humanize(selected.businessType), selected.country, selected.companyIdentifierCode].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="head-actions">
                                        <Badge kind={STATUS_BADGE[selected.status] || 'neutral'}>{humanize(selected.status)}</Badge>
                                        {isAdmin && (
                                            isSuspended
                                                ? <button className="btn btn--secondary btn--sm" onClick={() => setStatusAction('activate')}>Activate</button>
                                                : <button className="btn btn--danger-outline btn--sm" onClick={() => setStatusAction('suspend')}>Suspend</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-head"><h3>Registration details</h3></div>
                                <div className="kv-grid">
                                    <div className="kv-cell"><span>Legal name</span><strong>{selected.legalName || '—'}</strong></div>
                                    <div className="kv-cell"><span>Trading name</span><strong>{selected.tradingName || '—'}</strong></div>
                                    <div className="kv-cell"><span>Registration number</span><strong className="mono">{selected.registrationNumber || '—'}</strong></div>
                                    <div className="kv-cell"><span>KRA PIN</span><strong className="mono">{NOT_IN_API}</strong></div>
                                    <div className="kv-cell"><span>Country</span><strong>{selected.country || '—'}</strong></div>
                                    <div className="kv-cell"><span>Incorporated</span><strong>{NOT_IN_API}</strong></div>
                                    <div className="kv-cell"><span>Industry</span><strong>{humanize(selected.businessType)}</strong></div>
                                    <div className="kv-cell"><span>Website</span><strong>{contact?.website || '—'}</strong></div>
                                </div>
                            </div>

                            <div className="usage-row">
                                <div className="card">
                                    <div className="card-head"><h3>Contact</h3></div>
                                    {contact === null ? (
                                        <div className="loading-state">Loading contact details…</div>
                                    ) : (
                                        <div className="kv-list">
                                            <div className="kv-row"><span>Name</span><strong>{NOT_IN_API}</strong></div>
                                            <div className="kv-row"><span>Role</span><strong>{NOT_IN_API}</strong></div>
                                            <div className="kv-row"><span>Email</span><strong>{contact.email || '—'}</strong></div>
                                            <div className="kv-row"><span>Phone</span><strong>{contact.phone || '—'}</strong></div>
                                            <div className="kv-row"><span>Support email</span><strong>{contact.supportEmail || '—'}</strong></div>
                                        </div>
                                    )}
                                </div>
                                <div className="card">
                                    <div className="card-head"><h3>Compliance status</h3></div>
                                    <div className="kv-list">
                                        <div className="kv-row"><span>Approved</span><strong>{formatDate(selected.approvedAt)}</strong></div>
                                        <div className="kv-row"><span>Onboarded</span><strong>{formatDate(selected.createdAt)}</strong></div>
                                        <div className="kv-row"><span>KYB review</span><strong>{NOT_IN_API}</strong></div>
                                        <div className="kv-row"><span>Documents</span><strong>{NOT_IN_API}</strong></div>
                                        <div className="kv-row"><span>Next review</span><strong>{NOT_IN_API}</strong></div>
                                        <div className="kv-row"><span>Risk rating</span><strong>{NOT_IN_API}</strong></div>
                                    </div>
                                </div>
                            </div>

                            {isAdmin && <OwnerCheckSettings key={selected.id} companyId={selected.id} />}
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={!!statusAction}
                onClose={closeStatusDialog}
                title={statusAction === 'suspend' ? `Suspend ${selected?.legalName}?` : `Activate ${selected?.legalName}?`}
                caption={statusAction === 'suspend'
                    ? 'Their API keys stop working until you activate them again. The company is emailed and notified.'
                    : 'Their API keys start working again.'}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={closeStatusDialog} disabled={saving}>Cancel</button>
                        <button
                            className={statusAction === 'suspend' ? 'btn btn--danger-outline' : 'btn btn--primary'}
                            onClick={confirmStatusChange}
                            disabled={saving}
                        >
                            {saving ? 'Saving…' : statusAction === 'suspend' ? 'Suspend company' : 'Activate company'}
                        </button>
                    </>
                )}
            >
                {statusAction === 'suspend' && (
                    <div className="field">
                        <label htmlFor="suspend-reason">Reason (optional)</label>
                        <textarea
                            id="suspend-reason"
                            className="input"
                            rows={3}
                            placeholder="Included in the suspension email the company receives"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
