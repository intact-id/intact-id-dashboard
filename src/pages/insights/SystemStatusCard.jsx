import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import statsService from '../../services/statsService';
import { formatPercent } from '../../utils/insights';
import { formatDateTime } from '../../utils/format';

const REFRESH_MS = 60000;

// Super admins only: the latest health check of each service behind Intact ID, refreshed every minute.
export default function SystemStatusCard() {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = () => statsService.systemStatus()
            .then((s) => { if (!cancelled) { setStatus(s); setError(false); } })
            .catch(() => { if (!cancelled) setError(true); });
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => { cancelled = true; clearInterval(timer); };
    }, []);

    const down = status?.services.filter((s) => s.up === false) || [];
    const unchecked = status?.services.every((s) => s.up === null);
    const headline = error ? { tone: 'neutral', text: 'Status unavailable' }
        : !status ? { tone: 'neutral', text: 'Checking…' }
            : unchecked ? { tone: 'neutral', text: 'First check pending' }
                : down.length ? { tone: 'bad', text: `${down.length} service${down.length > 1 ? 's' : ''} down` }
                    : { tone: 'ok', text: 'All systems operational' };

    return (
        <div className="card sys-card">
            <div className="card-head">
                <div>
                    <h3>System status</h3>
                    <div className="card-caption">{status?.checkedAt ? `Checked ${formatDateTime(status.checkedAt)}` : 'Checked every minute'}</div>
                </div>
                <span className={`sys-pill sys-pill--${headline.tone}`}><i />{headline.text}</span>
            </div>
            {error ? (
                <div className="name-secondary">The status service did not answer. auth-server may be on an older version.</div>
            ) : (
                <div className="sys-list">
                    {(status?.services || []).map((s) => (
                        <div key={s.service} className="sys-row">
                            <span className={`sys-dot sys-dot--${s.up === null ? 'none' : s.up ? 'ok' : 'bad'}`} />
                            <span className="sys-name" title={s.error || undefined}>{s.label}</span>
                            <span className="sys-latency">{s.up ? `${s.latencyMs} ms` : s.up === false ? 'Down' : '—'}</span>
                            <span className="sys-uptime">{formatPercent(s.uptime24h, 2)}</span>
                        </div>
                    ))}
                </div>
            )}
            <Link to="/dashboard/analytics#health" className="sys-link">Latency and uptime history <ArrowRight size={13} /></Link>
        </div>
    );
}
