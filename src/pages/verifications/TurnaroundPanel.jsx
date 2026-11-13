import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import statsService from '../../services/statsService';
import { formatDateTime } from '../../utils/format';
import { stepLabel } from '../../utils/verification';
import { formatDuration } from '../../utils/insights';
import '../insights/insights.css';

const STAGE_COLOR = {
    queued: 'var(--ink-3)',
    checks: 'var(--brand-green)',
    waiting_for_reviewer: 'var(--amber-ink)',
    under_review: 'var(--info)',
};

// Super admins only: how long this verification took, stage by stage, with each check's own time.
// Reloads while the verification is still moving. `version` changes when the page reloads the verification.
export default function TurnaroundPanel({ verificationId, version }) {
    const [timeline, setTimeline] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let timer;
        const load = () => statsService.timeline(verificationId)
            .then((t) => {
                if (cancelled) return;
                setTimeline(t);
                setError(false);
                if (t.running) timer = setTimeout(load, 15000);
            })
            .catch(() => { if (!cancelled) setError(true); });
        load();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [verificationId, version]);

    if (error) return null;

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <h3>Turnaround time</h3>
                    <div className="card-caption">Submission to {timeline?.running ? 'now' : 'decision'}</div>
                </div>
                <span className="staff-tag"><Lock size={11} /> Super admins</span>
            </div>
            {!timeline ? <div className="loading-state">Loading…</div> : (
                <>
                    <div className="vt-total">
                        <strong>{formatDuration(timeline.totalMs)}</strong>
                        <span>{timeline.running ? 'and counting' : `decided ${formatDateTime(timeline.finishedAt)}`}</span>
                    </div>
                    {timeline.totalMs > 0 && (
                        <div className="stage-bar">
                            {timeline.stages.map((s) => s.durationMs > 0 && (
                                <span key={s.key} style={{ flexGrow: s.durationMs, background: STAGE_COLOR[s.key] }} title={`${s.label} · ${formatDuration(s.durationMs)}`} />
                            ))}
                        </div>
                    )}
                    <div className="vt-stages">
                        {timeline.stages.map((s) => {
                            const longest = Math.max(...s.checks.map((c) => c.durationMs || 0), 1);
                            return (
                                <div key={s.key} className={`vt-stage${s.running ? ' is-running' : ''}`}>
                                    <span className="vt-marker" style={{ background: `color-mix(in srgb, ${STAGE_COLOR[s.key]} 16%, transparent)` }}>
                                        <i style={{ background: STAGE_COLOR[s.key] }} />
                                    </span>
                                    <div className="vt-body">
                                        <div className="vt-name">{s.label}</div>
                                        <div className="vt-when">{formatDateTime(s.startedAt)}{s.endedAt ? ` → ${formatDateTime(s.endedAt).split(', ')[1]}` : ' → now'}</div>
                                        {s.note && <div className="vt-note">{s.note}</div>}
                                        {s.checks.length > 0 && (
                                            <div className="vt-checks">
                                                {s.checks.map((c, i) => (
                                                    <div key={`${c.step}-${i}`} className="vt-check">
                                                        <span>{stepLabel(c.step)}</span>
                                                        <div className="vt-check-bar">{c.durationMs != null && <span style={{ width: `${(100 * c.durationMs) / longest}%` }} />}</div>
                                                        <em>{c.durationMs != null ? formatDuration(c.durationMs) : 'not timed'}</em>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className="vt-dur">{formatDuration(s.durationMs)}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
