import { useCallback, useEffect, useState } from 'react';
import { Radar, RefreshCw, Square } from 'lucide-react';
import Badge from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import monitoringService, { ALERT_KIND, ALERT_STATUS, VERDICT } from '../../services/monitoringService';
import { errorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import AlertMatches from './AlertMatches';
import ResolveAlertModal from './ResolveAlertModal';

// One verification's ongoing monitoring: who is monitored, the last result, alerts, start/stop/screen now
export default function MonitoringPanel({ verification, canAct }) {
    const { toast } = useToast();
    const [subjects, setSubjects] = useState(null);
    const [pending, setPending] = useState(null);
    const [busy, setBusy] = useState(false);
    const approved = verification.status === 'COMPLETED' && String(verification.overallDecision).toLowerCase() === 'approved';

    const load = useCallback(() => monitoringService.forVerification(verification.verificationId).then(setSubjects).catch(() => setSubjects([])),
        [verification.verificationId]);
    useEffect(() => { load(); }, [load]);

    const run = async (action, message) => {
        setBusy(true);
        try {
            await action();
            toast.success(message);
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'That did not work.'));
        } finally {
            setBusy(false);
        }
    };

    if (!subjects) return null;
    if (subjects.length === 0 && !approved) return null;
    const active = subjects.some((d) => d.subject.status === 'ACTIVE');

    return (
        <div className="card">
            <div className="card-head">
                <div><h3>Monitoring</h3><div className="card-caption">Screened again against sanctions and PEP lists; changes are alerts</div></div>
                {canAct && approved && !active && (
                    <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => run(() => monitoringService.start(verification.verificationId), 'Monitoring started; the first screen runs shortly')}>
                        <Radar size={14} /> Start monitoring
                    </button>
                )}
            </div>
            {subjects.length === 0 ? <div className="empty-state">Not monitored.</div> : subjects.map(({ subject: s, alerts }) => {
                const v = VERDICT[s.verdict];
                return (
                    <div key={s.id} style={{ borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: 10, marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <div>
                                <span className="name-primary">{s.displayName}</span>
                                <span className="name-secondary"> · {s.kind === 'BUSINESS' ? 'Business' : s.partyId ? 'Director or owner' : 'Person'}</span>
                                <div className="name-secondary">
                                    {s.status === 'ACTIVE'
                                        ? `Last screened ${s.lastScreenedAt ? formatDateTime(s.lastScreenedAt) : 'not yet'} · next ${formatDateTime(s.nextScreenAt)}`
                                        : `Stopped ${formatDateTime(s.stoppedAt)}: ${s.stoppedReason}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {v && <Badge kind={v.badge}>{v.label}</Badge>}
                                {canAct && s.status === 'ACTIVE' && <>
                                    <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => run(() => monitoringService.rescreen(s.id), 'Screened')}><RefreshCw size={13} /> Screen now</button>
                                    <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => run(() => monitoringService.stop(s.id, 'Stopped from the console'), 'Monitoring stopped')}><Square size={13} /> Stop</button>
                                </>}
                            </div>
                        </div>
                        {alerts.length > 0 && (
                            <div className="table-scroll" style={{ marginTop: 8 }}><table className="data-table">
                                <tbody>{alerts.map((a) => (
                                    <tr key={a.id}>
                                        <td style={{ width: 160 }}>{formatDateTime(a.createdAt)}</td>
                                        <td><Badge kind={(ALERT_KIND[a.kind] || {}).badge}>{(ALERT_KIND[a.kind] || {}).label || a.kind}</Badge></td>
                                        <td><AlertMatches matches={a.matches} /></td>
                                        <td><Badge kind={(ALERT_STATUS[a.status] || {}).badge}>{(ALERT_STATUS[a.status] || {}).label || a.status}</Badge></td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {canAct && a.status === 'OPEN' && <>
                                                <button className="btn btn--ghost btn--sm" onClick={() => setPending({ alert: a, decision: 'DISMISSED', name: s.displayName })}>Dismiss</button>
                                                <button className="btn btn--danger-outline btn--sm" onClick={() => setPending({ alert: a, decision: 'CONFIRMED', name: s.displayName })}>Confirm</button>
                                            </>}
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                        )}
                    </div>
                );
            })}
            <ResolveAlertModal pending={pending} onClose={() => setPending(null)} onResolved={() => { setPending(null); load(); }} />
        </div>
    );
}
