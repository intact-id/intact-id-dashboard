import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import Badge from '../components/ui/Badge';
import CompanySelect from '../components/ui/CompanySelect';
import AlertMatches from '../components/monitoring/AlertMatches';
import ResolveAlertModal from '../components/monitoring/ResolveAlertModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import monitoringService, { ALERT_KIND, ALERT_STATUS, VERDICT } from '../services/monitoringService';
import { errorMessage } from '../services/api';
import { hasAnyRole, isSuperAdmin } from '../utils/roles';
import { formatDateTime } from '../utils/format';

const TABS = [['alerts', 'Alerts'], ['customers', 'Customers'], ['settings', 'Settings']];
const ALERT_FILTERS = [['OPEN', 'To decide'], ['CONFIRMED', 'Confirmed'], ['DISMISSED', 'Dismissed'], ['INFO', 'For information'], ['', 'All']];

function Alerts({ companyId, canDecide, onChanged }) {
    const [status, setStatus] = useState('OPEN');
    const [result, setResult] = useState(null);
    const [pending, setPending] = useState(null);
    const load = useCallback(() => {
        setResult(null);
        monitoringService.alerts({ companyId, status: status || undefined, size: 50 }).then(setResult)
            .catch((e) => setResult({ error: errorMessage(e, 'Could not load alerts.') }));
    }, [companyId, status]);
    useEffect(() => { load(); }, [load]);

    return (
        <>
            <div className="view-toggle" style={{ marginBottom: 12 }}>
                {ALERT_FILTERS.map(([value, label]) => <button key={label} className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>{label}</button>)}
            </div>
            <div className="table-card">
                {!result ? <div className="loading-state">Loading…</div> : result.error ? <div className="empty-state">{result.error}</div>
                    : result.content.length === 0 ? <div className="empty-state">{status === 'OPEN' ? 'No alerts to decide.' : 'Nothing here.'}</div> : (
                        <div className="table-scroll"><table className="data-table">
                            <thead><tr><th>Found</th><th>Change</th><th>Watchlist entries</th><th>Verdict</th><th>Status</th><th /></tr></thead>
                            <tbody>{result.content.map((a) => {
                                const kind = ALERT_KIND[a.kind] || { label: a.kind, badge: 'neutral' };
                                const st = ALERT_STATUS[a.status] || { label: a.status, badge: 'neutral' };
                                return (
                                    <tr key={a.id}>
                                        <td>{formatDateTime(a.createdAt)}</td>
                                        <td><Badge kind={kind.badge}>{kind.label}</Badge></td>
                                        <td><AlertMatches matches={a.matches} /></td>
                                        <td>{VERDICT[a.previousVerdict]?.label || a.previousVerdict} → {VERDICT[a.verdict]?.label || a.verdict}</td>
                                        <td><Badge kind={st.badge}>{st.label}</Badge>{a.resolvedBy && <div className="name-secondary">{a.resolvedBy}{a.resolutionNote ? `: ${a.resolutionNote}` : ''}</div>}</td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <SubjectLink subjectId={a.subjectId} />
                                            {canDecide && a.status === 'OPEN' && <>
                                                <button className="btn btn--ghost btn--sm" onClick={() => setPending({ alert: a, decision: 'DISMISSED', name: 'this customer' })}>Dismiss</button>
                                                <button className="btn btn--danger-outline btn--sm" onClick={() => setPending({ alert: a, decision: 'CONFIRMED', name: 'this customer' })}>Confirm</button>
                                            </>}
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                    )}
            </div>
            <ResolveAlertModal pending={pending} onClose={() => setPending(null)} onResolved={() => { setPending(null); load(); onChanged?.(); }} />
        </>
    );
}

// Opens the verification an alert's subject came from
function SubjectLink({ subjectId }) {
    const navigate = useNavigate();
    const open = async () => {
        const detail = await monitoringService.subject(subjectId).catch(() => null);
        if (detail) navigate(`/dashboard/verifications/${detail.subject.verificationId}`);
    };
    return <button className="btn btn--ghost btn--sm" onClick={open}>Open</button>;
}

function Customers({ companyId, canAct }) {
    const { toast } = useToast();
    const [status, setStatus] = useState('ACTIVE');
    const [search, setSearch] = useState('');
    const [result, setResult] = useState(null);
    const load = useCallback(() => {
        monitoringService.subjects({ companyId, status: status || undefined, search: search.trim() || undefined, size: 50 }).then(setResult)
            .catch((e) => setResult({ error: errorMessage(e, 'Could not load customers.') }));
    }, [companyId, status, search]);
    useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

    const rescreen = async (s) => {
        try {
            const d = await monitoringService.rescreen(s.id);
            toast.success(`Screened: ${VERDICT[d.subject.verdict]?.label || d.subject.verdict}`);
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not screen now.'));
        }
    };

    return (
        <div className="table-card">
            <div className="card-head">
                <div className="view-toggle">
                    {[['ACTIVE', 'Monitored'], ['STOPPED', 'Stopped'], ['', 'All']].map(([v, l]) => <button key={l} className={status === v ? 'is-active' : ''} onClick={() => setStatus(v)}>{l}</button>)}
                </div>
                <div className="search-input"><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or reference" aria-label="Search customers" /></div>
            </div>
            {!result ? <div className="loading-state">Loading…</div> : result.error ? <div className="empty-state">{result.error}</div>
                : result.content.length === 0 ? <div className="empty-state">No customers here. Turn monitoring on in Settings, or start it on a verification.</div> : (
                    <div className="table-scroll"><table className="data-table">
                        <thead><tr><th>Customer</th><th>Verdict</th><th>Last screened</th><th>Next</th><th>Open alerts</th><th /></tr></thead>
                        <tbody>{result.content.map((s) => {
                            const v = VERDICT[s.verdict];
                            return (
                                <tr key={s.id}>
                                    <td>
                                        <Link className="name-primary" to={`/dashboard/verifications/${s.verificationId}`}>{s.displayName}</Link>
                                        <div className="name-secondary">{s.kind === 'BUSINESS' ? 'Business' : s.partyId ? 'Director or owner' : 'Person'}{s.externalReference ? ` · ${s.externalReference}` : ''}</div>
                                    </td>
                                    <td>{v ? <Badge kind={v.badge}>{v.label}</Badge> : <span className="name-secondary">First screen pending</span>}</td>
                                    <td>{s.lastScreenedAt ? formatDateTime(s.lastScreenedAt) : '—'}{s.failures > 0 && <div className="name-secondary">Screening unavailable, retrying</div>}</td>
                                    <td>{s.status === 'ACTIVE' ? formatDateTime(s.nextScreenAt) : <span className="name-secondary">Stopped: {s.stoppedReason}</span>}</td>
                                    <td>{s.openAlerts ? <Badge kind="warn">{s.openAlerts}</Badge> : '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{canAct && s.status === 'ACTIVE' && <button className="btn btn--ghost btn--sm" onClick={() => rescreen(s)}><RefreshCw size={13} /> Screen now</button>}</td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                )}
        </div>
    );
}

function Settings({ companyId, canEdit }) {
    const { toast } = useToast();
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!companyId) return;
        monitoringService.settings(companyId).then((s) => { setForm(s); setSaved(s); }).catch((e) => toast.error(errorMessage(e, 'Could not load settings.')));
    }, [companyId, toast]);
    if (!companyId) return <div className="card"><div className="empty-state">Choose a company above to see its monitoring settings.</div></div>;
    if (!form) return <div className="card"><div className="loading-state">Loading…</div></div>;
    const dirty = JSON.stringify(form) !== JSON.stringify(saved);
    const save = async () => {
        setBusy(true);
        try {
            const s = await monitoringService.updateSettings(companyId, form);
            setForm(s); setSaved(s);
            toast.success('Monitoring settings saved');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save.'));
        } finally {
            setBusy(false);
        }
    };
    const check = (key, label) => (
        <label className="checkbox-row"><input type="checkbox" disabled={!canEdit} checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /><span>{label}</span></label>
    );
    return (
        <div className="card">
            <div className="card-head"><div><h3>Ongoing monitoring</h3><div className="card-caption">{form.activeSubjects} customers monitored · {form.openAlerts} alerts to decide</div></div></div>
            <label className="checkbox-row"><input type="checkbox" disabled={!canEdit} checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                <span><strong>Monitor approved customers</strong>: screen them again against sanctions and PEP lists, and alert on any change</span></label>
            <div className="field" style={{ marginTop: 12 }}>
                <label>How often</label>
                <div className="view-toggle" style={{ alignSelf: 'flex-start' }}>
                    {[['DAILY', 'Daily'], ['WEEKLY', 'Weekly'], ['MONTHLY', 'Monthly']].map(([v, l]) => (
                        <button key={v} disabled={!canEdit} className={form.frequency === v ? 'is-active' : ''} onClick={() => setForm({ ...form, frequency: v })}>{l}</button>
                    ))}
                </div>
                <span className="field-hint">Watchlists change daily, so daily catches new listings soonest.</span>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
                <label>Who is monitored once approved</label>
                {check('includePeople', 'People')}
                {check('includeBusinesses', 'Businesses')}
                {check('includeParties', 'Directors and owners of approved businesses')}
                <span className="field-hint">Applies to verifications approved from now on. Start older ones from the verification’s Monitoring card.</span>
            </div>
            {canEdit && (
                <div className="head-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                    <button className="btn btn--secondary btn--sm" onClick={() => setForm(saved)} disabled={!dirty || busy}>Discard</button>
                    <button className="btn btn--primary btn--sm" onClick={save} disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save'}</button>
                </div>
            )}
        </div>
    );
}

// Approved customers screened again on a schedule; changes become alerts to confirm or dismiss
export default function Monitoring() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const [tab, setTab] = useState('alerts');
    const [companyId, setCompanyId] = useState('');
    const [version, setVersion] = useState(0);
    const company = superAdmin ? companyId || undefined : user.companyId;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Monitoring</h1>
                    <p>Approved customers are screened again against sanctions and PEP lists. Any change is an alert here and a <span className="mono">screening.updated</span> webhook.</p>
                </div>
                {superAdmin && <div className="head-actions"><CompanySelect value={companyId} onChange={setCompanyId} /></div>}
            </div>
            <div className="page-tabs" role="tablist">
                {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
            </div>
            {tab === 'alerts' && <Alerts key={`${company}-${version}`} companyId={company} canDecide onChanged={() => setVersion((v) => v + 1)} />}
            {tab === 'customers' && <Customers key={company || 'all'} companyId={company} canAct={isAdmin || !superAdmin} />}
            {tab === 'settings' && <Settings key={company || 'none'} companyId={company} canEdit={isAdmin} />}
        </div>
    );
}
