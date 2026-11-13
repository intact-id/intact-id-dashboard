import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import LineChart from '../../components/ui/LineChart';
import { ChartLegend } from '../../components/ui/StackedBarChart';
import statsService from '../../services/statsService';
import { stepLabel } from '../../utils/verification';
import { formatCount, formatDuration, formatSeconds, shortDate } from '../../utils/insights';

const STAGES = [
    { key: 'queued', label: 'Waiting to start', color: 'var(--rule)' },
    { key: 'checks', label: 'Automated checks', color: 'var(--brand-green)' },
    { key: 'waitingForReviewer', label: 'Waiting for a reviewer', color: 'var(--amber-ink)' },
    { key: 'underReview', label: 'Under review', color: 'var(--info)' },
];

const DAILY_SERIES = [
    { key: 'averageSeconds', label: 'Average', color: 'var(--brand-green)' },
    { key: 'medianSeconds', label: 'Median', color: 'var(--amber-ink)' },
];

// Super admins only: how long verifications take from submission to decision, and where the time goes.
export default function TurnaroundSection({ companyId, days }) {
    const [tat, setTat] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
        statsService.turnaround({ companyId, days }).then(setTat).catch(() => setError(true));
    }, [companyId, days]);

    const stageTotal = tat ? STAGES.reduce((sum, s) => sum + (tat.stages[s.key] || 0), 0) : 0;

    return (
        <>
            <div className="ins-section-title">
                <h2>Turnaround time <span className="staff-tag"><Lock size={11} /> Super admins</span></h2>
                <p>Submission to final decision</p>
            </div>
            {error ? <div className="card"><div className="empty-state">Turnaround times could not be loaded.</div></div> : !tat ? (
                <div className="card"><div className="loading-state">Loading turnaround times…</div></div>
            ) : (
                <>
                    <div className="tat-stats">
                        <div className="tat-stat"><span>Median</span><strong>{formatSeconds(tat.medianSeconds)}</strong></div>
                        <div className="tat-stat"><span>Average</span><strong>{formatSeconds(tat.averageSeconds)}</strong></div>
                        <div className="tat-stat"><span>90th percentile</span><strong>{formatSeconds(tat.p90Seconds)}</strong></div>
                        <div className="tat-stat"><span>Finished · reviewed by a person</span><strong>{formatCount(tat.finished)} · {formatCount(tat.reviewed)}</strong></div>
                    </div>

                    <div className="ins-grid-2">
                        <div className="card">
                            <div className="card-head"><div><h3>Where the time goes</h3><div className="card-caption">Average time in each stage, for verifications that went through it</div></div></div>
                            {stageTotal === 0 ? <div className="empty-state">No stage times yet.</div> : (
                                <>
                                    <div className="stage-bar">
                                        {STAGES.map((s) => tat.stages[s.key] > 0 && <span key={s.key} style={{ flexGrow: tat.stages[s.key], background: s.color }} title={s.label} />)}
                                    </div>
                                    <div className="stage-legend">
                                        {STAGES.map((s) => (
                                            <div key={s.key} className="stage-legend-item">
                                                <i style={{ background: s.color }} /><span>{s.label}</span><strong>{formatSeconds(tat.stages[s.key])}</strong>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="kv-list" style={{ marginTop: 14 }}>
                                        <div className="kv-row"><span>Decided automatically</span><strong>{formatSeconds(tat.automatedAverageSeconds)} average</strong></div>
                                        <div className="kv-row"><span>Decided by a reviewer</span><strong>{formatSeconds(tat.reviewedAverageSeconds)} average</strong></div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="card">
                            <div className="card-head"><div><h3>Check times</h3><div className="card-caption">How long each service call takes</div></div></div>
                            {tat.checks.length === 0 ? <div className="empty-state">No check times recorded yet. They are recorded from 13 Nov 2026.</div> : (
                                <table className="mini-table">
                                    <thead><tr><th>Check</th><th className="num">Runs</th><th className="num">Average</th><th className="num">p90</th></tr></thead>
                                    <tbody>
                                        {tat.checks.map((c) => (
                                            <tr key={c.step}>
                                                <td>{stepLabel(c.step)}</td>
                                                <td className="num">{formatCount(c.runs)}</td>
                                                <td className="num">{formatDuration(c.averageMs)}</td>
                                                <td className="num">{formatDuration(c.p90Ms)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head ov-chart-head">
                            <div><h3>Turnaround by day</h3><div className="card-caption">Finished verifications, by the day they were submitted</div></div>
                            <ChartLegend series={DAILY_SERIES} />
                        </div>
                        {tat.finished === 0 ? <div className="empty-state">No finished verifications in this period.</div> : (
                            <LineChart data={tat.daily} series={DAILY_SERIES} labelKey="date" formatLabel={shortDate} formatValue={formatSeconds} height={200} />
                        )}
                    </div>
                </>
            )}
        </>
    );
}
