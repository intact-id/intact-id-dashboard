import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, UserMinus, Check, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import verificationService from '../services/verificationService';
import { errorMessage } from '../services/api';
import { hasAnyRole } from '../utils/roles';
import { initialsOf } from '../utils/format';
import { TYPE_LABEL, applicantName, riskOf, waitingSince } from '../utils/verification';
import ReviewDecisionModal from './verifications/ReviewDecisionModal';

const PAGE_SIZE = 20;
const TABS = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'Assigned to me' },
    { id: 'unassigned', label: 'Unassigned' },
];

export default function KycReviews() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isStaff = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);

    const [tab, setTab] = useState('all');
    const [page, setPage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [decision, setDecision] = useState(null);

    const load = useCallback(async () => {
        setError('');
        try {
            setResult(await verificationService.reviewQueue({ assignee: tab, page, size: PAGE_SIZE }));
        } catch (e) {
            setError(errorMessage(e, 'Could not load the review queue.'));
        }
    }, [tab, page]);

    useEffect(() => {
        if (!isStaff) return;
        setResult(null);
        load();
    }, [isStaff, load]);

    const changeAssignment = async (row, assign) => {
        setBusyId(row.verificationId);
        try {
            if (assign) await verificationService.assignToMe(row.verificationId);
            else await verificationService.unassign(row.verificationId);
            toast.success(assign ? `${applicantName(row)} assigned to you` : `${applicantName(row)} returned to the queue`);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not change the assignment.'));
        } finally {
            setBusyId(null);
        }
    };

    if (!isStaff) {
        return (
            <div className="page">
                <div className="page-head"><div><h1>Manual review</h1></div></div>
                <div className="card"><div className="empty-state">Manual reviews are handled by Intact ID staff.</div></div>
            </div>
        );
    }

    const rows = result?.content ?? [];
    const total = result?.totalElements ?? 0;
    const totalPages = result?.totalPages ?? 0;
    const isMine = (row) => row.review?.assignedTo && row.review.assignedTo === user?.username;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Manual review</h1>
                    <p>Cases the automated checks could not decide, waiting on a person.</p>
                </div>
            </div>

            <div className="table-card">
                <div className="card-head">
                    <div>
                        <h3>Manual review queue</h3>
                        <div className="card-caption">{result ? `${total.toLocaleString()} waiting` : 'Loading…'} · longest-waiting first</div>
                    </div>
                    <div className="head-actions">
                        <div className="view-toggle" role="group" aria-label="Filter the queue">
                            {TABS.map((t) => (
                                <button key={t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => { setTab(t.id); setPage(0); }}>{t.label}</button>
                            ))}
                        </div>
                        <button className="btn btn--ghost btn--sm" onClick={load} aria-label="Refresh queue"><RefreshCw size={14} /></button>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr><th>Case</th><th>Why it was held</th><th>Risk</th><th>Waiting</th><th>Assignee</th><th>Decision</th></tr>
                        </thead>
                        <tbody>
                            {error ? (
                                <tr><td colSpan={6}><div className="empty-state">{error}</div></td></tr>
                            ) : !result ? (
                                <tr><td colSpan={6}><div className="loading-state">Loading review queue…</div></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state">{tab === 'mine' ? 'Nothing assigned to you.' : 'The queue is empty.'}</div></td></tr>
                            ) : rows.map((row) => {
                                const name = applicantName(row);
                                const risk = riskOf(row.riskScore);
                                const busy = busyId === row.verificationId;
                                return (
                                    <tr key={row.verificationId}>
                                        <td>
                                            <Link to={`/dashboard/verifications/${row.verificationId}`} className="name-cell">
                                                <span className="avatar avatar--light">{initialsOf(name)}</span>
                                                <div>
                                                    <div className="name-primary">{name}</div>
                                                    <div className="name-secondary">
                                                        {[TYPE_LABEL[row.verificationType], row.companyName].filter(Boolean).join(' · ')}
                                                    </div>
                                                </div>
                                            </Link>
                                        </td>
                                        <td>{row.review?.reason || <span className="name-secondary">Not recorded</span>}</td>
                                        <td>{risk ? <Badge kind={risk.badge}>{risk.level} · {risk.value}</Badge> : '—'}</td>
                                        <td>{waitingSince(row.review?.requestedAt || row.createdAt)}</td>
                                        <td>
                                            {row.review?.assignedTo
                                                ? <span>{isMine(row) ? 'You' : row.review.assignedTo}</span>
                                                : <span className="name-secondary">Unassigned</span>}
                                            <div>
                                                {isMine(row) ? (
                                                    <button className="link-btn" disabled={busy} onClick={() => changeAssignment(row, false)}>
                                                        <UserMinus size={12} /> Unassign
                                                    </button>
                                                ) : (
                                                    <button className="link-btn" disabled={busy} onClick={() => changeAssignment(row, true)}>
                                                        <UserCheck size={12} /> {row.review?.assignedTo ? 'Take over' : 'Assign to me'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="head-actions">
                                                <button className="btn btn--danger-outline btn--sm" onClick={() => setDecision({ verificationId: row.verificationId, name, decision: 'rejected' })}>
                                                    <X size={13} /> Reject
                                                </button>
                                                <button className="btn btn--primary btn--sm" onClick={() => setDecision({ verificationId: row.verificationId, name, decision: 'approved' })}>
                                                    <Check size={13} /> Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="pagination">
                        <span>Page {page + 1} of {totalPages}</span>
                        <div className="pagination-controls">
                            <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Previous</button>
                            <button className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            <ReviewDecisionModal
                pending={decision}
                onClose={() => setDecision(null)}
                onResolved={() => { setDecision(null); load(); }}
            />
        </div>
    );
}
