import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import Badge from '../components/ui/Badge';
import CompanySelect from '../components/ui/CompanySelect';
import { useToast } from '../contexts/ToastContext';
import auditService from '../services/auditService';
import { errorMessage } from '../services/api';
import { formatDateTime, initialsOf } from '../utils/format';

const PAGE_SIZE = 50;
const PERIODS = [['24h', 'Last 24 hours', 1], ['7d', 'Last 7 days', 7], ['30d', 'Last 30 days', 30], ['all', 'All time', null]];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const STATUSES = [200, 201, 400, 401, 403, 404, 409, 500];
const TYPES = [['API_REQUEST', 'Requests'], ['LOGIN', 'Sign-ins'], ['LOGOUT', 'Sign-outs'], ['TOKEN_REFRESH', 'Token refreshes']];

// Local time without the zone, as the server expects (ISO date-time)
function since(days) {
    if (!days) return undefined;
    const d = new Date(Date.now() - days * 86_400_000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

const statusTone = (code) => (code == null ? 'neutral' : code < 300 ? 'ok' : code < 400 ? 'info' : code < 500 ? 'warn' : 'bad');

function shortAgent(agent) {
    if (!agent) return '—';
    const browser = /Edg\//.test(agent) ? 'Edge' : /Chrome\//.test(agent) ? 'Chrome' : /Firefox\//.test(agent) ? 'Firefox' : /Safari\//.test(agent) ? 'Safari' : null;
    const os = /Windows/.test(agent) ? 'Windows' : /Mac OS X/.test(agent) ? 'macOS' : /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Linux/.test(agent) ? 'Linux' : null;
    return [browser, os].filter(Boolean).join(' · ') || agent.slice(0, 40);
}

function toCsv(rows) {
    const head = ['Time', 'User', 'Company', 'Type', 'Method', 'Path', 'Status', 'Duration (ms)', 'IP address', 'Session'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [r.startedAt, r.username, r.companyName, r.activityType, r.httpMethod, r.path + (r.queryString ? `?${r.queryString}` : ''),
        r.statusCode, r.durationMs, r.ipAddress, r.sessionId].map(cell).join(','));
    return [head.map(cell).join(','), ...lines].join('\n');
}

function Pager({ page, totalPages, onPage }) {
    if (!totalPages || totalPages <= 1) return null;
    return (
        <div className="pagination">
            <span>Page {page + 1} of {totalPages.toLocaleString()}</span>
            <div className="pagination-controls">
                <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> Previous</button>
                <button className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={14} /></button>
            </div>
        </div>
    );
}

// Super admins: every console and API action, and every sign-in session, newest first
export default function RequestLogs() {
    const { toast } = useToast();
    const [tab, setTab] = useState('activity');
    const [period, setPeriod] = useState('24h');
    const [companyId, setCompanyId] = useState('');
    const [search, setSearch] = useState('');
    const [path, setPath] = useState('');
    const [method, setMethod] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    // Narrowing by clicking a person or a session in the tables
    const [person, setPerson] = useState(null); // { userId, username }
    const [session, setSession] = useState(null); // { sessionId, label }
    const [page, setPage] = useState(0);
    const [activity, setActivity] = useState(null);
    const [sessions, setSessions] = useState(null);
    const [exporting, setExporting] = useState(false);

    // The search box filters the path once typing pauses
    useEffect(() => { const t = setTimeout(() => setPath(search.trim()), 300); return () => clearTimeout(t); }, [search]);

    const fromDate = useMemo(() => since(PERIODS.find(([k]) => k === period)?.[2]), [period]);
    const filters = useMemo(() => ({
        companyId, userId: person?.userId, sessionId: session?.sessionId, httpMethod: method, path,
        statusCode: status, activityType: type, fromDate,
    }), [companyId, person, session, method, path, status, type, fromDate]);

    useEffect(() => { setPage(0); }, [filters, tab]);

    const load = useCallback(async () => {
        try {
            if (tab === 'activity') {
                setActivity(null);
                const [a, s] = await Promise.all([
                    auditService.activities({ ...filters, page, size: PAGE_SIZE }),
                    auditService.sessions({ companyId, userId: person?.userId, fromDate, page: 0, size: 1 }),
                ]);
                setActivity(a);
                setSessions((prev) => ({ ...(prev || {}), countOnly: s.totalElements }));
            } else {
                setSessions(null);
                setSessions(await auditService.sessions({ companyId, userId: person?.userId, fromDate, page, size: PAGE_SIZE }));
            }
        } catch (e) {
            const message = errorMessage(e, 'Could not load the audit logs.');
            if (tab === 'activity') setActivity({ error: message }); else setSessions({ error: message });
        }
    }, [tab, filters, companyId, person, fromDate, page]);

    useEffect(() => { load(); }, [load]);

    const exportCsv = async () => {
        setExporting(true);
        try {
            const rows = [];
            for (let p = 0; p < 10; p++) {
                const chunk = await auditService.activities({ ...filters, page: p, size: 500 });
                rows.push(...chunk.content);
                if (p + 1 >= chunk.totalPages) break;
            }
            const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${rows.length.toLocaleString()} rows${rows.length >= 5000 ? ' (the first 5,000; narrow the filters for more)' : ''}`);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not export.'));
        } finally {
            setExporting(false);
        }
    };

    const clearAll = () => { setSearch(''); setMethod(''); setStatus(''); setType(''); setPerson(null); setSession(null); setCompanyId(''); };
    const narrowed = search || method || status || type || person || session || companyId;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Audit logs</h1>
                    <p>Every console and API action, and every sign-in session, newest first.</p>
                </div>
                <div className="head-actions">
                    <button className="btn btn--secondary btn--sm" onClick={exportCsv} disabled={exporting || tab !== 'activity'}>
                        <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
                    </button>
                </div>
            </div>

            <div className="page-tabs" role="tablist">
                {[['activity', 'Activity'], ['sessions', 'Sessions']].map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
                ))}
            </div>

            <div className="filter-bar">
                {tab === 'activity' && (
                    <div className="search-input">
                        <Search size={15} />
                        <input placeholder="Search path, e.g. /workflows" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search path" />
                    </div>
                )}
                <CompanySelect value={companyId} onChange={setCompanyId} />
                {tab === 'activity' && (
                    <>
                        <select className="input filter-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
                            <option value="">All types</option>
                            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <select className="input filter-select" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">
                            <option value="">All methods</option>
                            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select className="input filter-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status code">
                            <option value="">Any status</option>
                            {STATUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </>
                )}
                <select className="input filter-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
                    {PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
            </div>

            {(person || session || narrowed) && (
                <div className="head-actions" style={{ margin: '-4px 0 12px', flexWrap: 'wrap' }}>
                    {person && <button className="btn btn--ghost btn--sm" onClick={() => setPerson(null)}>User: {person.username} <X size={13} /></button>}
                    {session && <button className="btn btn--ghost btn--sm" onClick={() => setSession(null)}>Session: {session.label} <X size={13} /></button>}
                    {narrowed && <button className="btn btn--ghost btn--sm" onClick={clearAll}>Clear filters</button>}
                </div>
            )}

            {tab === 'activity' && (
                <>
                    <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="stat-card">
                            <div className="stat-card-head"><span>ACTIVITY</span></div>
                            <div className="stat-value">{activity?.totalElements != null ? activity.totalElements.toLocaleString() : '—'}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-head"><span>SESSIONS</span></div>
                            <div className="stat-value">{sessions?.countOnly != null ? sessions.countOnly.toLocaleString() : '—'}</div>
                        </div>
                    </div>

                    <div className="table-card">
                        {!activity ? <div className="loading-state">Loading activity…</div> : activity.error ? <div className="empty-state">{activity.error}</div>
                            : activity.content.length === 0 ? <div className="empty-state">No activity matches these filters.</div> : (
                                <>
                                    <div className="table-scroll"><table className="data-table">
                                        <thead><tr><th>User</th><th>Method</th><th>Path</th><th>Status</th><th>Duration</th><th>IP address</th><th>Time</th></tr></thead>
                                        <tbody>{activity.content.map((l) => (
                                            <tr key={l.id}>
                                                <td>
                                                    <button className="name-cell link-btn" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                                                            onClick={() => l.userId && setPerson({ userId: l.userId, username: l.username })} title="Show only this user">
                                                        <span className="avatar avatar--light">{initialsOf(l.username || '?')}</span>
                                                        <span>
                                                            <span className="name-primary">{l.username || 'Unknown'}</span>
                                                            <span className="name-secondary" style={{ display: 'block' }}>{l.companyName || 'Intact ID'}</span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td>{l.activityType === 'API_REQUEST'
                                                    ? <span className={`method-tag method-tag--${(l.httpMethod || '').toLowerCase()}`}>{l.httpMethod}</span>
                                                    : <Badge kind="info" dot={false}>{TYPES.find(([v]) => v === l.activityType)?.[1] || l.activityType}</Badge>}</td>
                                                <td className="mono" style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.path + (l.queryString ? `?${l.queryString}` : '')}>
                                                    {l.path}{l.queryString && <span className="name-secondary">?{l.queryString}</span>}
                                                </td>
                                                <td>{l.statusCode != null ? <Badge kind={statusTone(l.statusCode)} dot={false}>{l.statusCode}</Badge> : '—'}</td>
                                                <td>{l.durationMs != null ? `${l.durationMs.toLocaleString()} ms` : '—'}</td>
                                                <td className="mono">{l.ipAddress || '—'}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {formatDateTime(l.startedAt)}
                                                    {l.sessionId && !session && (
                                                        <button className="link-btn" style={{ display: 'block', fontSize: 12 }} onClick={() => setSession({ sessionId: l.sessionId, label: `${l.username || ''} ${formatDateTime(l.startedAt)}`.trim() })}>This session</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}</tbody>
                                    </table></div>
                                    <Pager page={page} totalPages={activity.totalPages} onPage={setPage} />
                                </>
                            )}
                    </div>
                </>
            )}

            {tab === 'sessions' && (
                <div className="table-card">
                    {!sessions ? <div className="loading-state">Loading sessions…</div> : sessions.error ? <div className="empty-state">{sessions.error}</div>
                        : !sessions.content || sessions.content.length === 0 ? <div className="empty-state">No sessions in this period.</div> : (
                            <>
                                <div className="table-scroll"><table className="data-table">
                                    <thead><tr><th>User</th><th>Signed in</th><th>Ended / last active</th><th>Status</th><th>Device</th><th>IP address</th><th>Actions</th><th /></tr></thead>
                                    <tbody>{sessions.content.map((s) => (
                                        <tr key={s.sessionId}>
                                            <td>
                                                <div className="name-primary">{s.username || 'Unknown'}</div>
                                                <div className="name-secondary">{s.companyName || 'Intact ID'}</div>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(s.loginAt)}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(s.logoutAt || s.lastActivityAt)}</td>
                                            <td><Badge kind={s.status === 'ACTIVE' ? 'ok' : 'neutral'}>{s.status === 'ACTIVE' ? 'Active' : 'Ended'}</Badge></td>
                                            <td title={s.userAgent || ''}>{shortAgent(s.userAgent)}</td>
                                            <td className="mono">{s.ipAddress || '—'}</td>
                                            <td>{Number(s.activityCount || 0).toLocaleString()}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn--ghost btn--sm" onClick={() => { setSession({ sessionId: s.sessionId, label: `${s.username || ''} ${formatDateTime(s.loginAt)}`.trim() }); setTab('activity'); }}>
                                                    View activity
                                                </button>
                                            </td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                                <Pager page={page} totalPages={sessions.totalPages} onPage={setPage} />
                            </>
                        )}
                </div>
            )}
        </div>
    );
}
