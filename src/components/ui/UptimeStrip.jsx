import { formatPercent } from '../../utils/insights';
import './charts.css';

// Status-page style strip: one bar per time bucket, coloured by the share of checks that succeeded.
export default function UptimeStrip({ points, formatTime }) {
    if (!points?.length) return <div className="uptime-strip uptime-strip--empty">No checks yet</div>;
    return (
        <div className="uptime-strip">
            {points.map((p) => {
                const level = p.uptime >= 99.9 ? 'ok' : p.uptime >= 95 ? 'warn' : 'bad';
                return (
                    <span key={p.at} className={`uptime-tick uptime-tick--${level}`}
                          title={`${formatTime(p.at)} · ${formatPercent(p.uptime)} up${p.averageLatencyMs != null ? ` · ${Math.round(p.averageLatencyMs)} ms` : ''}`} />
                );
            })}
        </div>
    );
}
