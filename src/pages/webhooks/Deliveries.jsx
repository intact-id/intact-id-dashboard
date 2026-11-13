import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, CircleCheck, CircleX, RotateCw, Gauge } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import webhookService from '../../services/webhookService';
import { errorMessage } from '../../services/api';
import { formatDateTime, humanize } from '../../utils/format';

const PAGE_SIZE = 20;
const STATUS_FILTERS = ['ALL', 'DELIVERED', 'FAILED', 'RETRYING', 'PENDING'];
const STATUS_BADGE = { DELIVERED: 'ok', FAILED: 'bad', RETRYING: 'warn', PENDING: 'neutral' };

// The delivery endpoints shipped in auth-server after the console's other webhook calls, so a
// server still on an older build answers 404. Say that plainly instead of a generic error.
function deliveryError(error) {
    return error?.response?.status === 404
        ? 'Delivery history needs the latest auth-server. It will appear once the server is updated.'
        : errorMessage(error, 'Could not load deliveries.');
}

export function DeliveryHealth({ companyId, refreshKey }) {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setSummary(null);
        setError('');
        webhookService
            .getDeliverySummary(companyId)
            .then((data) => { if (!cancelled) setSummary(data); })
            .catch((e) => { if (!cancelled) setError(deliveryError(e)); });
        return () => { cancelled = true; };
    }, [companyId, refreshKey]);

    if (error) return null; // the delivery log below explains what is missing

    const value = (n) => (summary ? n.toLocaleString() : '…');
    const successRate = summary?.total ? `${((summary.delivered / summary.total) * 100).toFixed(1)}%` : '—';

    return (
        <div className="stat-grid">
            <StatCard label="Delivered · 24h" value={value(summary?.delivered ?? 0)} icon={CircleCheck} />
            <StatCard label="Failed · 24h" value={value(summary?.failed ?? 0)} icon={CircleX} />
            <StatCard label="Retrying · 24h" value={value(summary?.retrying ?? 0)} icon={RotateCw} />
            <StatCard label="Success rate · 24h" value={summary ? successRate : '…'} icon={Gauge} />
        </div>
    );
}

export function DeliveryLog({ companyId, refreshKey, onRefresh }) {
    const [status, setStatus] = useState('ALL');
    const [page, setPage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // A different company starts from the first page of everything.
    useEffect(() => {
        setStatus('ALL');
        setPage(0);
    }, [companyId]);

    useEffect(() => {
        let cancelled = false;
        setResult(null);
        setError('');
        webhookService
            .listDeliveries(companyId, { status: status === 'ALL' ? undefined : status, page, size: PAGE_SIZE })
            .then((data) => { if (!cancelled) setResult(data); })
            .catch((e) => { if (!cancelled) setError(deliveryError(e)); });
        return () => { cancelled = true; };
    }, [companyId, status, page, refreshKey]);

    const rows = result?.content ?? [];
    const totalPages = result?.totalPages ?? 0;

    return (
        <div className="table-card">
            <div className="card-head">
                <div>
                    <h3>Recent deliveries</h3>
                    <div className="card-caption">Every event sent to the endpoint, newest first. Test events are not recorded.</div>
                </div>
                <div className="head-actions">
                    <div className="view-toggle" role="group" aria-label="Filter by status">
                        {STATUS_FILTERS.map((s) => (
                            <button key={s} className={status === s ? 'is-active' : ''} onClick={() => { setStatus(s); setPage(0); }}>
                                {s === 'ALL' ? 'All' : humanize(s)}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={onRefresh} aria-label="Refresh deliveries">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="empty-state">{error}</div>
            ) : (
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr><th>Event</th><th>Status</th><th>Response</th><th>Retries</th><th>Verification</th><th>Sent</th></tr>
                        </thead>
                        <tbody>
                            {!result ? (
                                <tr><td colSpan={6}><div className="loading-state">Loading deliveries…</div></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state">No deliveries{status === 'ALL' ? ' yet' : ` with status ${humanize(status).toLowerCase()}`}.</div></td></tr>
                            ) : rows.map((d) => (
                                <tr key={d.id}>
                                    <td className="mono">{d.eventType}</td>
                                    <td>
                                        <Badge kind={STATUS_BADGE[d.status] || 'neutral'}>{humanize(d.status)}</Badge>
                                        {d.errorMessage && <div className="name-secondary" title={d.errorMessage}>{d.errorMessage.slice(0, 60)}</div>}
                                    </td>
                                    <td className="mono">{d.httpStatusCode ?? '—'}</td>
                                    <td>{d.retryCount ?? 0}{d.nextRetryAt ? <div className="name-secondary">next {formatDateTime(d.nextRetryAt)}</div> : null}</td>
                                    <td className="mono">{d.verificationId || '—'}</td>
                                    <td>{formatDateTime(d.deliveredAt || d.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="pagination">
                    <span>Page {page + 1} of {totalPages} · {result.totalElements.toLocaleString()} deliveries</span>
                    <div className="pagination-controls">
                        <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft size={14} /> Previous
                        </button>
                        <button className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
