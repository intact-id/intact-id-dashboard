import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronRight, ChevronLeft, ShieldAlert, ShieldCheck, ShieldQuestion, UserRound, Newspaper, Radar } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { useEnvironment } from '../../contexts/EnvironmentContext';
import { useToast } from '../../contexts/ToastContext';
import screeningService from '../../services/screeningService';
import companyService from '../../services/companyService';
import { errorMessage } from '../../services/api';
import { hasAnyRole, isSuperAdmin } from '../../utils/roles';
import { formatDateTime, humanize } from '../../utils/format';

const PAGE_SIZE = 20;
const VERDICTS = {
    CONFIRMED_MATCH: { label: 'Confirmed match', badge: 'bad' },
    POTENTIAL_MATCH: { label: 'Potential match', badge: 'warn' },
    NO_HIT: { label: 'Clear', badge: 'ok' },
    SKIPPED: { label: 'Not screened', badge: 'neutral' },
};
const TABS = [['', 'All'], ['POTENTIAL_MATCH', 'Potential matches'], ['CONFIRMED_MATCH', 'Confirmed'], ['NO_HIT', 'Clear'], ['SKIPPED', 'Not screened']];

const percent = (score) => (typeof score === 'number' ? `${Math.round(score * 100)}%` : '—');

function Matches({ matches }) {
    if (!matches?.length) return <div className="name-secondary">No matches on any list.</div>;
    return (
        <div className="scr-matches">
            {matches.map((m, i) => (
                <div key={m.entity_id || m.entityId || i} className="scr-match">
                    <div className="scr-match-head">
                        <strong>{m.caption}</strong>
                        <span className="mono">{percent(m.score)}</span>
                    </div>
                    <div className="scr-tags">
                        {(m.topics || []).map((t) => <span key={t} className={`scr-tag${t === 'role.pep' ? ' scr-tag--pep' : t.startsWith('sanction') || t.startsWith('crime') ? ' scr-tag--bad' : ''}`}>{t}</span>)}
                        {(m.datasets || []).map((d) => <span key={d} className="scr-tag scr-tag--dataset">{d}</span>)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ScreenNow() {
    const { toast } = useToast();
    const [form, setForm] = useState({ type: 'PERSON', firstName: '', lastName: '', birthDate: '', name: '', jurisdiction: '' });
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const ready = form.type === 'PERSON' ? form.firstName.trim() && form.lastName.trim() : form.name.trim();

    const run = async () => {
        setBusy(true);
        setResult(null);
        try {
            setResult(await screeningService.check(form.type === 'PERSON'
                ? { type: 'PERSON', firstName: form.firstName, lastName: form.lastName, birthDate: form.birthDate || undefined }
                : { type: 'BUSINESS', name: form.name, jurisdiction: form.jurisdiction || undefined }));
        } catch (e) {
            toast.error(errorMessage(e, 'Screening did not run.'));
        } finally {
            setBusy(false);
        }
    };

    const verdict = result && (VERDICTS[result.verdict] || VERDICTS.SKIPPED);
    return (
        <div className="card">
            <div className="card-head"><div><h3>Screen a name</h3><div className="card-caption">Sanctions, PEP and watch lists, right now. Not stored or billed.</div></div></div>
            <div className="field">
                <div className="view-toggle" style={{ alignSelf: 'flex-start' }}>
                    <button className={form.type === 'PERSON' ? 'is-active' : ''} onClick={() => setForm({ ...form, type: 'PERSON' })}>Person</button>
                    <button className={form.type === 'BUSINESS' ? 'is-active' : ''} onClick={() => setForm({ ...form, type: 'BUSINESS' })}>Business</button>
                </div>
                {form.type === 'PERSON' ? (
                    <div className="form-grid" style={{ marginTop: 10 }}>
                        <input className="input" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                        <input className="input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                        <input className="input form-grid-full" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} aria-label="Date of birth (optional)" />
                    </div>
                ) : (
                    <div className="form-grid" style={{ marginTop: 10 }}>
                        <input className="input form-grid-full" placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <input className="input form-grid-full" placeholder="Jurisdiction, e.g. KE (optional)" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
                    </div>
                )}
                <button className="btn btn--primary" style={{ justifyContent: 'center', marginTop: 10 }} disabled={!ready || busy} onClick={run}>
                    <Radar size={15} /> {busy ? 'Screening…' : 'Screen'}
                </button>
            </div>
            {result && (
                <div className="scr-check-result">
                    <div className="head-actions" style={{ justifyContent: 'space-between' }}>
                        <Badge kind={verdict.badge}>{verdict.label}</Badge>
                        <span className="name-secondary">{result.hits} {result.hits === 1 ? 'hit' : 'hits'} · top {percent(result.topScore)}{result.pep ? ' · PEP' : ''}{result.adverseMedia ? ' · adverse media' : ''}</span>
                    </div>
                    <Matches matches={result.matches} />
                </div>
            )}
        </div>
    );
}

export default function Screening() {
    const { user } = useAuth();
    const { environment } = useEnvironment();
    const superAdmin = isSuperAdmin(user);
    const staff = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);

    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState('');
    const [verdict, setVerdict] = useState('');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [result, setResult] = useState(null);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(null);

    useEffect(() => {
        if (superAdmin) companyService.list({ size: 100 }).then((p) => setCompanies(p.content)).catch(() => {});
    }, [superAdmin]);

    useEffect(() => {
        const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const load = useCallback(async () => {
        setError('');
        setResult(null);
        try {
            setResult(await screeningService.results({ verdict, search: query, environment, companyId, page, size: PAGE_SIZE }));
        } catch (e) {
            setError(e?.response?.status === 404
                ? 'Screening results need the latest auth-server. They will appear once the server is updated.'
                : errorMessage(e, 'Could not load screening results.'));
        }
    }, [verdict, query, environment, companyId, page]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        screeningService.summary({ environment, companyId }).then(setSummary).catch(() => setSummary(null));
    }, [environment, companyId]);

    const rows = result?.content ?? [];
    const totalPages = result?.totalPages ?? 0;
    const count = (n) => (summary ? n.toLocaleString() : '…');

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Screening</h1>
                    <p>Sanctions, PEP and adverse-media checks from {environment === 'DEV' ? 'sandbox' : 'production'} verifications.</p>
                </div>
                {superAdmin && companies.length > 0 && (
                    <div className="head-actions">
                        <select className="input filter-select" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(0); }} aria-label="Company">
                            <option value="">All companies</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="stat-grid">
                <StatCard label="Screened · 30 days" value={count(summary?.total ?? 0)} icon={ShieldCheck} />
                <StatCard label="Potential matches" value={count(summary?.potentialMatch ?? 0)} icon={ShieldQuestion} />
                <StatCard label="Confirmed matches" value={count(summary?.confirmedMatch ?? 0)} icon={ShieldAlert} />
                <StatCard label="PEP · adverse media" value={summary ? `${summary.pep} · ${summary.adverseMedia}` : '…'} icon={Newspaper} />
            </div>

            <div className={staff ? 'notifications-row' : ''}>
                <div className="table-card">
                    <div className="card-head">
                        <div className="view-toggle">
                            {TABS.map(([value, label]) => (
                                <button key={value} className={verdict === value ? 'is-active' : ''} onClick={() => { setVerdict(value); setPage(0); }}>{label}</button>
                            ))}
                        </div>
                        <div className="search-input" style={{ maxWidth: 260 }}>
                            <Search size={14} />
                            <input placeholder="Name or verification ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead><tr><th /><th>Applicant</th>{superAdmin && <th>Company</th>}<th>Result</th><th>Hits</th><th>Flags</th><th>Checked</th></tr></thead>
                            <tbody>
                                {error ? <tr><td colSpan={7}><div className="empty-state">{error}</div></td></tr>
                                    : !result ? <tr><td colSpan={7}><div className="loading-state">Loading screening results…</div></td></tr>
                                        : rows.length === 0 ? <tr><td colSpan={7}><div className="empty-state">No screening results{verdict ? ' with this result' : ''} yet.</div></td></tr>
                                            : rows.map((r) => {
                                                const v = VERDICTS[r.verdict] || VERDICTS.SKIPPED;
                                                const expanded = open === r.id;
                                                return (
                                                    <Fragment key={r.id}>
                                                        <tr className="scr-row" onClick={() => setOpen(expanded ? null : r.id)}>
                                                            <td>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                                                            <td>
                                                                <div className="name-primary">{r.subjectName || 'Unnamed applicant'}</div>
                                                                <Link className="name-secondary mono" to={`/dashboard/verifications/${r.verificationId}${r.environment === 'DEV' ? '?env=DEV' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                                    {r.verificationId}
                                                                </Link>
                                                            </td>
                                                            {superAdmin && <td>{r.companyName || '—'}</td>}
                                                            <td><Badge kind={v.badge}>{v.label}</Badge>{r.skippedReason && <div className="name-secondary">{humanize(r.skippedReason)}</div>}</td>
                                                            <td className="mono">{r.hits ?? '—'}{r.topScore ? <span className="name-secondary"> · {percent(r.topScore)}</span> : null}</td>
                                                            <td>
                                                                <div className="head-actions" style={{ gap: 4 }}>
                                                                    {r.pep && <span className="scr-tag scr-tag--pep"><UserRound size={11} /> PEP</span>}
                                                                    {r.adverseMedia && <span className="scr-tag scr-tag--bad"><Newspaper size={11} /> Adverse media</span>}
                                                                    {!r.pep && !r.adverseMedia && <span className="name-secondary">—</span>}
                                                                </div>
                                                            </td>
                                                            <td>{formatDateTime(r.checkedAt)}</td>
                                                        </tr>
                                                        {expanded && (
                                                            <tr className="scr-detail"><td colSpan={7}><Matches matches={r.matches} /></td></tr>
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="pagination">
                            <span>Page {page + 1} of {totalPages} · {result.totalElements.toLocaleString()} results</span>
                            <div className="pagination-controls">
                                <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Previous</button>
                                <button className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
                            </div>
                        </div>
                    )}
                </div>
                {staff && <ScreenNow />}
            </div>
        </div>
    );
}
