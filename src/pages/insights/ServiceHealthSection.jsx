import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import LineChart from '../../components/ui/LineChart';
import UptimeStrip from '../../components/ui/UptimeStrip';
import { ChartLegend } from '../../components/ui/StackedBarChart';
import statsService from '../../services/statsService';
import { formatPercent } from '../../utils/insights';

const WINDOWS = [[24, '24 hours'], [24 * 7, '7 days'], [24 * 30, '30 days']];
const COLORS = ['var(--ink-2)', 'var(--brand-green)', 'var(--amber-ink)', 'var(--info)', 'var(--danger-dot)', 'var(--brand-bright)'];

function bucketLabel(at, bucketMinutes) {
    const date = new Date(at);
    return bucketMinutes >= 24 * 60
        ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Super admins only: uptime and latency of every service behind Intact ID, from a check every minute.
export default function ServiceHealthSection() {
    const [hours, setHours] = useState(24);
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        statsService.systemStatus().then(setStatus).catch(() => setError(true));
    }, []);

    useEffect(() => {
        statsService.systemHistory(hours).then(setHistory).catch(() => setError(true));
    }, [hours]);

    const series = (history?.services || []).map((s, i) => ({ key: s.service, label: s.label, color: COLORS[i % COLORS.length] }));
    // One row per bucket, with each service's average latency in its own column
    const latency = (() => {
        if (!history) return [];
        const rows = new Map();
        history.services.forEach((s) => s.points.forEach((p) => {
            const row = rows.get(p.at) || { at: p.at };
            row[s.service] = p.averageLatencyMs;
            rows.set(p.at, row);
        }));
        return [...rows.values()].sort((a, b) => new Date(a.at) - new Date(b.at));
    })();
    const pointsOf = (service) => history?.services.find((s) => s.service === service)?.points || [];

    return (
        <div id="health">
            <div className="ins-section-title">
                <h2>Service health <span className="staff-tag"><Lock size={11} /> Super admins</span></h2>
                <div className="view-toggle" role="group" aria-label="Window">
                    {WINDOWS.map(([h, label]) => <button key={h} type="button" className={hours === h ? 'is-active' : ''} onClick={() => setHours(h)}>{label}</button>)}
                </div>
            </div>
            {error ? <div className="card"><div className="empty-state">Service health could not be loaded. auth-server may be on an older version.</div></div> : !status || !history ? (
                <div className="card"><div className="loading-state">Loading service health…</div></div>
            ) : (
                <div className="ins-stack">
                    <div className="card">
                        <div className="health-table">
                            <div className="health-row health-row--head"><span>Service</span><span>Uptime over the window</span><span className="health-num">Latency</span><span className="health-num">p95 (24h)</span><span className="health-num">Up (30d)</span></div>
                            {status.services.map((s) => (
                                <div key={s.service} className="health-row">
                                    <span className="health-name" title={s.error || undefined}>
                                        <span className={`sys-dot sys-dot--${s.up === null ? 'none' : s.up ? 'ok' : 'bad'}`} />{s.label}
                                    </span>
                                    <UptimeStrip points={pointsOf(s.service)} formatTime={(at) => bucketLabel(at, history.bucketMinutes)} />
                                    <span className="health-num">{s.up ? `${s.latencyMs} ms` : s.up === false ? 'Down' : '—'}</span>
                                    <span className="health-num">{s.p95LatencyMs24h != null ? `${Math.round(s.p95LatencyMs24h)} ms` : '—'}</span>
                                    <span className="health-num">{formatPercent(s.uptime30d, 2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head ov-chart-head">
                            <div><h3>Response time</h3><div className="card-caption">Average health-check latency, successful checks only</div></div>
                            <ChartLegend series={series} />
                        </div>
                        {latency.length === 0 ? <div className="empty-state">No checks in this window yet.</div> : (
                            <LineChart data={latency} series={series} labelKey="at" formatLabel={(at) => bucketLabel(at, history.bucketMinutes)}
                                       formatValue={(v) => `${Math.round(v)} ms`} height={220} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
