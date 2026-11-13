import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, TriangleAlert } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import applicationService from '../services/applicationService';
import { errorMessage } from '../services/api';
import { isSuperAdmin } from '../utils/roles';
import { formatDateTime, humanize } from '../utils/format';
import './services/services.css';
import './applications.css';

const STATUS = {
    SUBMITTED: { label: 'New', badge: 'info' },
    PENDING: { label: 'New', badge: 'info' },
    INFO_REQUESTED: { label: 'Info requested', badge: 'warn' },
    PENDING_APPROVAL: { label: 'Final approval', badge: 'warn' },
    APPROVED: { label: 'Approved', badge: 'ok' },
    REJECTED: { label: 'Rejected', badge: 'bad' },
};

const TABS = [
    { id: 'new', label: 'New', statuses: ['SUBMITTED', 'PENDING'] },
    { id: 'info', label: 'Info requested', statuses: ['INFO_REQUESTED'] },
    { id: 'final', label: 'Final approval', statuses: ['PENDING_APPROVAL'] },
    { id: 'approved', label: 'Approved', statuses: ['APPROVED'] },
    { id: 'rejected', label: 'Rejected', statuses: ['REJECTED'] },
    { id: 'all', label: 'All', statuses: null },
];

// What each decision does, shown before it is sent.
const ACTIONS = {
    review: {
        APPROVED: { button: 'Send for final approval', effect: 'A different super admin makes the final decision. The applicant is told it is under review.' },
        INFO_REQUESTED: { button: 'Ask for more information', effect: 'The applicant sees “we need more information” when they track the application.', needsMessage: true },
        REJECTED: { button: 'Reject', effect: 'The application is closed. The applicant sees that it was not approved.', danger: true, needsMessage: true },
    },
    decide: {
        APPROVED: { button: 'Approve', effect: 'Creates the company and its API credentials, and emails the credentials to the company.' },
        REJECTED: { button: 'Reject', effect: 'The application is closed. The applicant sees that it was not approved.', danger: true, needsMessage: true },
    },
};

const canReview = (status) => ['SUBMITTED', 'PENDING', 'INFO_REQUESTED'].includes(status);

export default function Applications() {
    const { user } = useAuth();
    const { toast } = useToast();
    const superAdmin = isSuperAdmin(user);
    const [applications, setApplications] = useState(null);
    const [awaiting, setAwaiting] = useState({}); // applicationId -> first review, for those awaiting the final decision
    const [error, setError] = useState('');
    const [tab, setTab] = useState('new');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);
    const [decision, setDecision] = useState(null); // { step: 'review' | 'decide', action, note, message }
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            const [page, queue] = await Promise.all([
                applicationService.list(),
                applicationService.awaitingFinalDecision(),
            ]);
            setApplications(page.content || []);
            setAwaiting(Object.fromEntries((queue.content || []).map((a) => [a.applicationId, a])));
        } catch (e) {
            setError(errorMessage(e, 'Could not load applications.'));
        }
    }, []);

    useEffect(() => { if (superAdmin) load(); }, [load, superAdmin]);

    const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id,
        (applications || []).filter((a) => !t.statuses || t.statuses.includes(a.applicationStatus)).length])), [applications]);

    const shown = useMemo(() => {
        const statuses = TABS.find((t) => t.id === tab).statuses;
        const q = search.trim().toLowerCase();
        return (applications || [])
            .filter((a) => !statuses || statuses.includes(a.applicationStatus))
            .filter((a) => !q || [a.legalName, a.tradingName, a.applicationNumber, a.registrationNumber, a.email]
                .some((v) => v?.toLowerCase().includes(q)))
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }, [applications, tab, search]);

    if (!superAdmin) {
        return (
            <div className="page">
                <div className="page-head"><div><h1>Applications</h1></div></div>
                <div className="card"><div className="empty-state">Applications are reviewed by Intact ID staff.</div></div>
            </div>
        );
    }

    const open = applications?.find((a) => a.id === openId);
    const firstReview = open && awaiting[open.id];
    const ownReview = firstReview && firstReview.makerId === user.id;
    const chosen = decision && ACTIONS[decision.step][decision.action];

    const close = () => { setOpenId(null); setDecision(null); };

    const send = async () => {
        setBusy(true);
        const details = { action: decision.action, note: decision.note.trim(), messageToApplicant: decision.message.trim() };
        try {
            if (decision.step === 'review') await applicationService.review(open.id, details);
            else await applicationService.decide(firstReview.approvalId, details);
            toast.success(`${open.legalName}: ${chosen.button.toLowerCase()} done`);
            close();
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'That decision was refused.'));
        } finally {
            setBusy(false);
        }
    };

    const choose = (step, action) => setDecision({ step, action, note: '', message: '' });
    const missingMessage = chosen?.needsMessage && !decision.message.trim();

    const footer = !open ? null : decision ? (
        <>
            <button className="btn btn--secondary" onClick={() => setDecision(null)} disabled={busy}>Back</button>
            <button className={chosen.danger ? 'btn btn--danger-outline' : 'btn btn--primary'} onClick={send} disabled={busy || missingMessage}>
                {busy ? 'Sending…' : chosen.button}
            </button>
        </>
    ) : canReview(open.applicationStatus) ? (
        <>
            <button className="btn btn--danger-outline" onClick={() => choose('review', 'REJECTED')}>Reject</button>
            <button className="btn btn--secondary" onClick={() => choose('review', 'INFO_REQUESTED')}>Ask for more information</button>
            <button className="btn btn--primary" onClick={() => choose('review', 'APPROVED')}>Send for final approval</button>
        </>
    ) : open.applicationStatus === 'PENDING_APPROVAL' && firstReview && !ownReview ? (
        <>
            <button className="btn btn--danger-outline" onClick={() => choose('decide', 'REJECTED')}>Reject</button>
            <button className="btn btn--primary" onClick={() => choose('decide', 'APPROVED')}>Approve</button>
        </>
    ) : <button className="btn btn--secondary" onClick={close}>Close</button>;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Applications</h1>
                    <p>Businesses asking for API access. One person reviews, a second makes the final decision.</p>
                </div>
            </div>

            <div className="table-card">
                <div className="card-head svc-toolbar">
                    <div className="view-toggle">
                        {TABS.map((t) => (
                            <button key={t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
                                {t.label} <span className="svc-count">{counts[t.id] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="search-input svc-search">
                        <Search size={14} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, number or email" aria-label="Search applications" />
                    </div>
                </div>
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>Business</th><th>Type</th><th>Country</th><th>Contact</th><th>Submitted</th><th>Status</th></tr></thead>
                    <tbody>
                        {error ? (
                            <tr><td colSpan={6}><div className="empty-state">{error}</div></td></tr>
                        ) : !applications ? (
                            <tr><td colSpan={6}><div className="loading-state">Loading applications…</div></td></tr>
                        ) : shown.length === 0 ? (
                            <tr><td colSpan={6}><div className="empty-state">No applications here.</div></td></tr>
                        ) : shown.map((a) => {
                            const status = STATUS[a.applicationStatus] || { label: humanize(a.applicationStatus), badge: 'neutral' };
                            return (
                                <tr key={a.id} className="app-row" onClick={() => setOpenId(a.id)}>
                                    <td>
                                        <span className="name-primary">{a.legalName}</span>
                                        <span className="name-secondary mono">{a.applicationNumber}</span>
                                    </td>
                                    <td>{a.businessType || '—'}</td>
                                    <td>{humanize(a.country) || '—'}</td>
                                    <td>
                                        <span className="name-primary">{a.contactPersonName || '—'}</span>
                                        <span className="name-secondary">{a.contactPersonEmail || a.email}</span>
                                    </td>
                                    <td>{formatDateTime(a.createdAt)}</td>
                                    <td><Badge kind={status.badge}>{status.label}</Badge></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table></div>
            </div>

            <Modal isOpen={Boolean(open)} onClose={close} size="lg" footer={footer}
                   title={open ? (decision ? chosen.button : open.legalName) : ''}
                   caption={open ? (decision ? chosen.effect : `${open.applicationNumber} · submitted ${formatDateTime(open.createdAt)}`) : ''}>
                {open && (decision ? (
                    <>
                        <div className="field">
                            <label htmlFor="app-message">Message to the applicant{chosen.needsMessage ? '' : ' (optional)'}</label>
                            <textarea id="app-message" rows={3} value={decision.message} onChange={(e) => setDecision({ ...decision, message: e.target.value })}
                                      placeholder={decision.action === 'INFO_REQUESTED' ? 'e.g. Please send a CR12 dated within the last 3 months.' : ''} />
                        </div>
                        <div className="field" style={{ marginTop: 12 }}>
                            <label htmlFor="app-note">Internal note (optional)</label>
                            <textarea id="app-note" rows={2} value={decision.note} onChange={(e) => setDecision({ ...decision, note: e.target.value })}
                                      placeholder="Only Intact ID staff see this" />
                        </div>
                    </>
                ) : (
                    <>
                        {open.applicationStatus === 'PENDING_APPROVAL' && (firstReview ? (
                            <div className={`note${ownReview ? ' note--warn' : ''}`} style={{ marginBottom: 14 }}>
                                <div className="note-head">
                                    {ownReview && <TriangleAlert size={16} />}
                                    <span>Reviewed by {firstReview.makerUsername || firstReview.makerEmail} on {formatDateTime(firstReview.submittedForApprovalAt)}</span>
                                </div>
                                {firstReview.makerNote && <p>{firstReview.makerNote}</p>}
                                {ownReview && <p>You did the first review, so a different super admin has to make the final decision.</p>}
                            </div>
                        ) : (
                            <div className="note note--warn" style={{ marginBottom: 14 }}>
                                <div className="note-head"><TriangleAlert size={16} /><span>First review not found</span></div>
                                <p>It is waiting for final approval, but its first review could not be loaded. Reload the page.</p>
                            </div>
                        ))}
                        <div className="kv-grid">
                            <div className="kv-cell"><span>Legal name</span><strong>{open.legalName}</strong></div>
                            <div className="kv-cell"><span>Trading name</span><strong>{open.tradingName || '—'}</strong></div>
                            <div className="kv-cell"><span>Registration number</span><strong className="mono">{open.registrationNumber || '—'}</strong></div>
                            <div className="kv-cell"><span>Country</span><strong>{humanize(open.country) || '—'}</strong></div>
                            <div className="kv-cell"><span>Business type</span><strong>{open.businessType || '—'}</strong></div>
                            <div className="kv-cell"><span>Website</span><strong>{open.website
                                ? <a href={open.website} target="_blank" rel="noreferrer noopener">{open.website}</a> : '—'}</strong></div>
                            <div className="kv-cell"><span>Company email</span><strong>{open.email}</strong></div>
                            <div className="kv-cell"><span>Company phone</span><strong>{open.phone || '—'}</strong></div>
                            <div className="kv-cell"><span>Contact person</span><strong>{[open.contactPersonName, open.contactPersonTitle].filter(Boolean).join(', ') || '—'}</strong></div>
                            <div className="kv-cell"><span>Contact email · phone</span><strong>{[open.contactPersonEmail, open.contactPersonPhone].filter(Boolean).join(' · ') || '—'}</strong></div>
                            <div className="kv-cell"><span>Status</span><strong>{(STATUS[open.applicationStatus] || {}).label || humanize(open.applicationStatus)}</strong></div>
                            <div className="kv-cell"><span>Last updated</span><strong>{formatDateTime(open.updatedAt)}</strong></div>
                        </div>
                    </>
                ))}
            </Modal>
        </div>
    );
}
