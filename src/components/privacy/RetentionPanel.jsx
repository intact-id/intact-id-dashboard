import { useCallback, useEffect, useState } from 'react';
import { Eraser, Lock, Unlock, UserX } from 'lucide-react';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import privacyService, { CATEGORIES, daysLabel } from '../../services/privacyService';
import { errorMessage } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';

// One verification's retention: what is due when, legal hold, relationship end, and erasing now.
export default function RetentionPanel({ verificationId, canAct, superAdmin, onErased }) {
    const { toast } = useToast();
    const [status, setStatus] = useState(null);
    const [dialog, setDialog] = useState(null); // { kind: 'erase' | 'hold' | 'ended', ... }
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => privacyService.status(verificationId).then(setStatus).catch(() => setStatus(false)), [verificationId]);
    useEffect(() => { load(); }, [load]);

    if (status === null) return <div className="card"><div className="loading-state">Loading retention…</div></div>;
    if (status === false) return null;

    const run = async (action, message) => {
        setBusy(true);
        try {
            await action();
            toast.success(message);
            setDialog(null);
            await load();
            onErased?.();
        } catch (e) {
            toast.error(errorMessage(e, 'That did not work.'));
        } finally {
            setBusy(false);
        }
    };

    const when = (c) => {
        if (c.doneAt) return <Badge kind="neutral" dot={false}>Erased {formatDate(c.doneAt)}</Badge>;
        if (status.legalHold) return <span className="name-secondary">On hold</span>;
        if (c.waitingForRelationshipEnd && c.days != null) return <span>{daysLabel(c.days)} after the relationship ends</span>;
        if (!c.dueAt) return <span className="name-secondary">Kept</span>;
        return <span>{formatDate(c.dueAt)}</span>;
    };

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <h3>Data retention</h3>
                    <div className="card-caption">
                        Rules of {status.countryName || 'any other country'}
                        {status.relationshipEndedAt ? ` · relationship ended ${formatDate(status.relationshipEndedAt)}` : ''}
                    </div>
                </div>
                {status.legalHold && <Badge kind="warn">Legal hold</Badge>}
            </div>
            {status.legalHold && <p className="field-hint">Held by {status.legalHoldBy} on {formatDateTime(status.legalHoldAt)}: {status.legalHoldReason}</p>}
            <div className="kv-list">
                {CATEGORIES.map(([code, label]) => {
                    const c = status.categories.find((x) => x.category === code);
                    return (
                        <div key={code} className="kv-row">
                            <span>{label}{c.keepUntil && !c.doneAt && new Date(c.keepUntil) > new Date() ? <span className="name-secondary"> · kept at least until {formatDate(c.keepUntil)}</span> : ''}</span>
                            <strong>{when(c)}</strong>
                        </div>
                    );
                })}
            </div>
            {canAct && status.finished && (
                <div className="head-actions" style={{ marginTop: 14, flexWrap: 'wrap' }}>
                    {status.legalHold
                        ? <button className="btn btn--ghost btn--sm" onClick={() => run(() => privacyService.release(verificationId), 'Hold released')} disabled={busy}><Unlock size={14} /> Release hold</button>
                        : <button className="btn btn--ghost btn--sm" onClick={() => setDialog({ kind: 'hold', reason: '' })}><Lock size={14} /> Legal hold</button>}
                    {!status.relationshipEndedAt && <button className="btn btn--ghost btn--sm" onClick={() => setDialog({ kind: 'ended', date: '' })}><UserX size={14} /> Relationship ended</button>}
                    {!status.legalHold && !status.categories.find((c) => c.category === 'RECORD').doneAt && (
                        <button className="btn btn--danger-outline btn--sm" onClick={() => setDialog({ kind: 'erase', scope: 'PERSONAL_DATA', reason: '', override: false })}><Eraser size={14} /> Erase now</button>
                    )}
                </div>
            )}

            <Modal
                isOpen={dialog?.kind === 'erase'}
                onClose={() => !busy && setDialog(null)}
                title="Erase this applicant’s data?"
                caption="Each choice also erases the ones above it. This cannot be undone."
                footer={<>
                    <button className="btn btn--secondary" onClick={() => setDialog(null)} disabled={busy}>Cancel</button>
                    <button className="btn btn--danger-outline" disabled={busy || !dialog?.reason?.trim()}
                            onClick={() => run(() => privacyService.erase(verificationId, { scope: dialog.scope, reason: dialog.reason.trim(), override: dialog.override }), 'Data erased')}>
                        {busy ? 'Erasing…' : 'Erase'}
                    </button>
                </>}
            >
                {dialog?.kind === 'erase' && (
                    <>
                        <div className="field">
                            <label htmlFor="er-scope">What</label>
                            <select id="er-scope" className="input" value={dialog.scope} onChange={(e) => setDialog({ ...dialog, scope: e.target.value })}>
                                {CATEGORIES.filter(([c]) => !status.categories.find((x) => x.category === c).doneAt).map(([c, label, hint]) => (
                                    <option key={c} value={c}>{label}: {hint}</option>
                                ))}
                            </select>
                        </div>
                        <div className="field" style={{ marginTop: 10 }}>
                            <label htmlFor="er-reason">Why</label>
                            <input id="er-reason" className="input" placeholder="e.g. The applicant asked us to delete their data"
                                   value={dialog.reason} onChange={(e) => setDialog({ ...dialog, reason: e.target.value })} />
                        </div>
                        {superAdmin && (
                            <label className="checkbox-row" style={{ marginTop: 10 }}>
                                <input type="checkbox" checked={dialog.override} onChange={(e) => setDialog({ ...dialog, override: e.target.checked })} />
                                <span>Erase even if a minimum period applies (recorded in the log)</span>
                            </label>
                        )}
                    </>
                )}
            </Modal>

            <Modal
                isOpen={dialog?.kind === 'hold'}
                onClose={() => !busy && setDialog(null)}
                title="Put this verification on legal hold?"
                caption="Nothing is deleted, by the rules or on request, until the hold is released."
                footer={<>
                    <button className="btn btn--secondary" onClick={() => setDialog(null)} disabled={busy}>Cancel</button>
                    <button className="btn btn--primary" disabled={busy || !dialog?.reason?.trim()}
                            onClick={() => run(() => privacyService.hold(verificationId, dialog.reason.trim()), 'Legal hold set')}>Hold</button>
                </>}
            >
                {dialog?.kind === 'hold' && (
                    <div className="field">
                        <label htmlFor="hold-reason">Why</label>
                        <input id="hold-reason" className="input" placeholder="e.g. Fraud investigation, dispute, regulator request"
                               value={dialog.reason} onChange={(e) => setDialog({ ...dialog, reason: e.target.value })} />
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={dialog?.kind === 'ended'}
                onClose={() => !busy && setDialog(null)}
                title="The customer relationship ended?"
                caption="Periods that count from the end of the relationship (such as AML record keeping) start from this date."
                footer={<>
                    <button className="btn btn--secondary" onClick={() => setDialog(null)} disabled={busy}>Cancel</button>
                    <button className="btn btn--primary" disabled={busy}
                            onClick={() => run(() => privacyService.relationshipEnded(verificationId, dialog.date ? `${dialog.date}T00:00:00` : null), 'Recorded')}>Save</button>
                </>}
            >
                {dialog?.kind === 'ended' && (
                    <div className="field">
                        <label htmlFor="ended-date">When it ended (empty = today)</label>
                        <input id="ended-date" className="input" type="date" max={new Date().toISOString().slice(0, 10)} style={{ maxWidth: 200 }}
                               value={dialog.date} onChange={(e) => setDialog({ ...dialog, date: e.target.value })} />
                    </div>
                )}
            </Modal>
        </div>
    );
}
