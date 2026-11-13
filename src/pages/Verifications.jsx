import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, RefreshCw, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useEnvironment } from '../contexts/EnvironmentContext';
import verificationService from '../services/verificationService';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { hasAnyRole } from '../utils/roles';
import { formatDateTime, initialsOf } from '../utils/format';
import { STATUS_FILTERS, TYPE_LABEL, applicantName, decisionOf, statusOf } from '../utils/verification';

const PAGE_SIZE = 20;
const DATE_RANGES = [
    { id: '7', label: 'Last 7 days', days: 7 },
    { id: '30', label: 'Last 30 days', days: 30 },
    { id: '90', label: 'Last 90 days', days: 90 },
    { id: 'all', label: 'All time', days: null },
];

// auth-server parses fromDate as a LocalDateTime: ISO without the trailing "Z".
function fromDateFor(rangeId) {
    const range = DATE_RANGES.find((r) => r.id === rangeId);
    if (!range?.days) return undefined;
    return new Date(Date.now() - range.days * 86400000).toISOString().slice(0, 19);
}

const EMPTY_FILTERS = { search: '', status: 'all', type: 'all', companyId: 'all', range: 'all' };

export default function Verifications() {
    const { user } = useAuth();
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const { environment, setEnvironment } = useEnvironment();

    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [search, setSearch] = useState(''); // typed text; copied into filters after a pause
    const [page, setPage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [companies, setCompanies] = useState([]);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!isAdmin) return;
        companyService.list({ size: 100 }).then((p) => setCompanies(p.content)).catch(() => {});
    }, [isAdmin]);

    // Wait for a pause in typing before searching.
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters((f) => (f.search === search.trim() ? f : { ...f, search: search.trim() }));
            setPage(0);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        setResult(null);
        setError('');
        verificationService
            .list({
                environment,
                status: filters.status === 'all' ? undefined : filters.status,
                verificationType: filters.type === 'all' ? undefined : filters.type,
                companyId: filters.companyId === 'all' ? undefined : filters.companyId,
                fromDate: fromDateFor(filters.range),
                search: filters.search || undefined,
                page,
                size: PAGE_SIZE,
            })
            .then((data) => { if (!cancelled) setResult(data); })
            .catch((e) => { if (!cancelled) setError(errorMessage(e, 'Could not load verifications.')); });
        return () => { cancelled = true; };
    }, [filters, page, reloadKey, environment]);

    const setFilter = (key, value) => {
        setFilters((f) => ({ ...f, [key]: value }));
        setPage(0);
    };

    const clearFilters = () => {
        setSearch('');
        setFilters(EMPTY_FILTERS);
        setPage(0);
    };

    const rows = result?.content ?? [];
    const total = result?.totalElements ?? 0;
    const totalPages = result?.totalPages ?? 0;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Verifications</h1>
                    <p>Every identity check, split by the API keys that ran it.</p>
                </div>
            </div>

            <div className="page-tabs" role="tablist" aria-label="Environment">
                {[['PROD', 'Production'], ['DEV', 'Sandbox']].map(([value, label]) => (
                    <button
                        key={value}
                        role="tab"
                        aria-selected={environment === value}
                        className={environment === value ? 'is-active' : ''}
                        onClick={() => { setEnvironment(value); setPage(0); }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="filter-bar">
                <div className="search-input">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Search name, email, ID number, company or verification ID"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="input filter-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
                    <option value="all">All statuses</option>
                    {STATUS_FILTERS.map((s) => <option key={s} value={s}>{statusOf(s).label}</option>)}
                </select>
                <select className="input filter-select" value={filters.type} onChange={(e) => setFilter('type', e.target.value)} aria-label="Type">
                    <option value="all">All types</option>
                    <option value="individual">KYC</option>
                    <option value="business">KYB</option>
                </select>
                {isAdmin && (
                    <select className="input filter-select" value={filters.companyId} onChange={(e) => setFilter('companyId', e.target.value)} aria-label="Company">
                        <option value="all">All companies</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                    </select>
                )}
                <select className="input filter-select" value={filters.range} onChange={(e) => setFilter('range', e.target.value)} aria-label="Date range">
                    {DATE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
                    <X size={14} /> Clear
                </button>
            </div>

            <div className="table-card">
                <div className="card-head">
                    <div className="result-sentence">
                        <strong>{result ? total.toLocaleString() : '…'}</strong>
                        <span>verifications match these filters</span>
                    </div>
                    <div className="head-actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw size={14} /> Refresh</button>
                    </div>
                </div>
                <div className="table-scroll"><table className="data-table">
                    <thead>
                        <tr>
                            <th>Applicant</th><th>Status</th><th>Type</th><th>Company</th><th>Decision</th><th>Files</th><th>Submitted</th><th />
                        </tr>
                    </thead>
                    <tbody>
                        {error ? (
                            <tr><td colSpan={8}><div className="empty-state">{error}</div></td></tr>
                        ) : !result ? (
                            <tr><td colSpan={8}><div className="loading-state">Loading verifications…</div></td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={8}><div className="empty-state">No verifications match these filters.</div></td></tr>
                        ) : rows.map((v) => {
                            const name = applicantName(v);
                            const status = statusOf(v.status);
                            const decision = decisionOf(v.overallDecision);
                            const detailLink = `/dashboard/verifications/${v.verificationId}${v.environment === 'DEV' ? '?env=DEV' : ''}`;
                            return (
                                <tr key={v.verificationId}>
                                    <td>
                                        <Link to={detailLink} className="name-cell">
                                            <span className="avatar avatar--light">{initialsOf(name)}</span>
                                            <div>
                                                <div className="name-primary">{name}</div>
                                                <div className="name-secondary">{v.customerData?.email || v.externalReference || v.verificationId}</div>
                                            </div>
                                        </Link>
                                    </td>
                                    <td><Badge kind={status.badge}>{status.label}</Badge></td>
                                    <td>{TYPE_LABEL[v.verificationType] || v.verificationType || '—'}</td>
                                    <td>{v.companyName || '—'}</td>
                                    <td>{v.overallDecision ? <Badge kind={decision.badge}>{decision.label}</Badge> : <span className="name-secondary">—</span>}</td>
                                    <td><span className="files-cell"><FileText size={13} /> {v.documentCount ?? '—'}</span></td>
                                    <td>{formatDateTime(v.createdAt)}</td>
                                    <td><Link to={detailLink} className="row-open-link" aria-label={`Open ${name}`}><ChevronRight size={16} /></Link></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table></div>
                {totalPages > 1 && (
                    <div className="pagination">
                        <span>Page {page + 1} of {totalPages.toLocaleString()} · {total.toLocaleString()} verifications</span>
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
        </div>
    );
}
