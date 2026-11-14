import { useCallback, useEffect, useState } from 'react';
import { Check, FileText, X } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import CompanySelect from '../components/ui/CompanySelect';
import { useToast } from '../contexts/ToastContext';
import topUpService, { TOP_UP_METHOD, TOP_UP_STATUS, openReceipt } from '../services/topUpService';
import { errorMessage } from '../services/api';
import { formatDate, formatDateTime } from '../utils/format';
import { formatMoney } from '../utils/insights';

const FILTERS = [['PENDING_REVIEW', 'To review'], ['APPROVED', 'Credited'], ['REJECTED', 'Rejected'], ['', 'All']];

// Super admins: bank transfers companies reported, to check against the bank statement and credit.
export default function TopUps() {
    const { toast } = useToast();
    const [status, setStatus] = useState('PENDING_REVIEW');
    const [companyId, setCompanyId] = useState('');
    const [result, setResult] = useState(null);
    const [review, setReview] = useState(null); // { topUp, action: 'approve' | 'reject', amount, note }
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setResult(null);
        topUpService.list({ companyId: companyId || undefined, status: status || undefined, size: 50 }).then(setResult)
            .catch((e) => setResult({ error: errorMessage(e, 'Could not load top-ups.') }));
    }, [companyId, status]);
    useEffect(() => { load(); }, [load]);

    const decide = async () => {
        setBusy(true);
        try {
            if (review.action === 'approve') {
                await topUpService.approve(review.topUp.id, { amount: review.amount === '' ? '' : Number(review.amount), note: review.note });
                toast.success('Approved; the wallet is credited');
            } else {
                await topUpService.reject(review.topUp.id, review.note.trim());
                toast.success('Rejected; the company is told why');
            }
            setReview(null);
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'That did not work.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Top-ups</h1>
                    <p>Bank transfers companies reported. Check each against the bank statement, then credit or reject it.</p>
                </div>
                <div className="head-actions"><CompanySelect value={companyId} onChange={setCompanyId} /></div>
            </div>
            <div className="page-tabs" role="tablist">
                {FILTERS.map(([value, label]) => (
                    <button key={label} role="tab" aria-selected={status === value} className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>
                        {label}{value === 'PENDING_REVIEW' && result?.waitingForReview ? ` (${result.waitingForReview})` : ''}
                    </button>
                ))}
            </div>
            <div className="table-card">
                {!result ? <div className="loading-state">Loading…</div> : result.error ? <div className="empty-state">{result.error}</div>
                    : result.content.length === 0 ? <div className="empty-state">Nothing here.</div> : (
                        <div className="table-scroll"><table className="data-table">
                            <thead><tr><th>Submitted</th><th>Company</th><th>Transfer</th><th className="num">Amount</th><th>Status</th><th /></tr></thead>
                            <tbody>{result.content.map((t) => {
                                const s = TOP_UP_STATUS[t.status] || { label: t.status, badge: 'neutral' };
                                return (
                                    <tr key={t.id}>
                                        <td>{formatDateTime(t.createdAt)}<div className="name-secondary">{t.submittedBy}</div></td>
                                        <td className="mono name-secondary">{t.companyId.slice(0, 8)}…</td>
                                        <td>
                                            <div className="mono">{t.reference}</div>
                                            <div className="name-secondary">{TOP_UP_METHOD[t.method]}{t.bankName ? ` · ${t.bankName}` : ''}{t.paidOn ? ` · ${formatDate(t.paidOn)}` : ''}</div>
                                            {t.note && <div className="name-secondary">“{t.note}”</div>}
                                        </td>
                                        <td className="num">{formatMoney(t.creditedAmount ?? t.amount, t.currency)}</td>
                                        <td><Badge kind={s.badge}>{s.label}</Badge>{t.reviewedBy && <div className="name-secondary">{t.reviewedBy}{t.reviewNote ? `: ${t.reviewNote}` : ''}</div>}</td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {t.receiptFilename && <button className="btn btn--ghost btn--sm" onClick={() => openReceipt(t.id).catch(() => toast.error('Could not open the receipt'))}><FileText size={13} /> Receipt</button>}
                                            {t.status === 'PENDING_REVIEW' && <>
                                                <button className="btn btn--ghost btn--sm" onClick={() => setReview({ topUp: t, action: 'reject', amount: '', note: '' })}><X size={13} /> Reject</button>
                                                <button className="btn btn--primary btn--sm" onClick={() => setReview({ topUp: t, action: 'approve', amount: String(Number(t.amount)), note: '' })}><Check size={13} /> Approve</button>
                                            </>}
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                    )}
            </div>

            <Modal
                isOpen={!!review}
                onClose={() => !busy && setReview(null)}
                title={review?.action === 'approve' ? 'Credit this top-up?' : 'Reject this top-up?'}
                caption={review?.action === 'approve'
                    ? 'Credit what the bank statement shows. The wallet is credited at once and the company is notified.'
                    : 'The company sees the reason, and can submit the transfer again.'}
                footer={<>
                    <button className="btn btn--secondary" onClick={() => setReview(null)} disabled={busy}>Cancel</button>
                    <button className={review?.action === 'approve' ? 'btn btn--primary' : 'btn btn--danger-outline'} onClick={decide}
                            disabled={busy || (review?.action === 'reject' && !review.note.trim()) || (review?.action === 'approve' && !(Number(review.amount) > 0))}>
                        {busy ? 'Working…' : review?.action === 'approve' ? 'Credit wallet' : 'Reject'}
                    </button>
                </>}
            >
                {review && (
                    <>
                        <p className="field-hint">Reference {review.topUp.reference} · reported {formatMoney(review.topUp.amount, review.topUp.currency)}</p>
                        {review.action === 'approve' && (
                            <div className="field"><label htmlFor="rv-amount">Amount to credit ({review.topUp.currency})</label>
                                <input id="rv-amount" className="input" type="number" min="0" step="0.01" style={{ maxWidth: 200 }}
                                       value={review.amount} onChange={(e) => setReview({ ...review, amount: e.target.value })} /></div>
                        )}
                        <div className="field" style={{ marginTop: 10 }}>
                            <label htmlFor="rv-note">{review.action === 'approve' ? 'Note (optional)' : 'Reason'}</label>
                            <input id="rv-note" className="input" maxLength={1000} value={review.note}
                                   placeholder={review.action === 'reject' ? 'e.g. No matching transfer on the statement' : ''}
                                   onChange={(e) => setReview({ ...review, note: e.target.value })} />
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
