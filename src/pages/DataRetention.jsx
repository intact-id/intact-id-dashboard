import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CompanySelect from '../components/ui/CompanySelect';
import CompanyPeriods from '../components/privacy/CompanyPeriods';
import CountryRules from '../components/privacy/CountryRules';
import privacyService, { categoryLabel } from '../services/privacyService';
import { hasAnyRole, isSuperAdmin } from '../utils/roles';
import { formatDateTime } from '../utils/format';

function Holds({ companyId }) {
    const [rows, setRows] = useState(null);
    useEffect(() => { privacyService.holds(companyId).then(setRows).catch(() => setRows([])); }, [companyId]);
    return (
        <div className="table-card">
            <div className="card-head"><div><h3>Legal holds</h3><div className="card-caption">Nothing on hold is deleted until the hold is released on the verification.</div></div></div>
            {!rows ? <div className="loading-state">Loading…</div> : rows.length === 0 ? <div className="empty-state">No verification is on hold.</div> : (
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>Verification</th><th>Why</th><th>By</th><th>Since</th></tr></thead>
                    <tbody>{rows.map((h) => (
                        <tr key={h.verificationId}>
                            <td><Link className="mono" to={`/dashboard/verifications/${h.verificationId}`}>{h.verificationId.slice(0, 8)}…</Link>{h.externalReference && <div className="name-secondary mono">{h.externalReference}</div>}</td>
                            <td>{h.reason}</td><td>{h.by}</td><td>{formatDateTime(h.at)}</td>
                        </tr>
                    ))}</tbody>
                </table></div>
            )}
        </div>
    );
}

function ErasureLog({ companyId }) {
    const [rows, setRows] = useState(null);
    useEffect(() => { privacyService.erasures(companyId).then(setRows).catch(() => setRows([])); }, [companyId]);
    return (
        <div className="table-card">
            <div className="card-head"><div><h3>Erasure log</h3><div className="card-caption">Every erasure, by request or by the retention rules. Newest first.</div></div></div>
            {!rows ? <div className="loading-state">Loading…</div> : rows.length === 0 ? <div className="empty-state">Nothing erased yet.</div> : (
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>When</th><th>Verification</th><th>What</th><th>Why</th><th>By</th></tr></thead>
                    <tbody>{rows.map((e) => (
                        <tr key={e.id}>
                            <td>{formatDateTime(e.createdAt)}</td>
                            <td><Link className="mono" to={`/dashboard/verifications/${e.verificationId}`}>{e.verificationId.slice(0, 8)}…</Link></td>
                            <td>{categoryLabel(e.scope)}{e.scope !== 'BIOMETRICS' ? ' and what comes before it' : ''}{e.documentsDeleted ? ` · ${e.documentsDeleted} files` : ''}</td>
                            <td>{e.trigger === 'RETENTION' ? e.reason : e.reason}{e.overrodeMinimum && <div className="name-secondary">Before its minimum period (override)</div>}</td>
                            <td>{e.performedBy}</td>
                        </tr>
                    ))}</tbody>
                </table></div>
            )}
        </div>
    );
}

const TABS = [['periods', 'Retention periods'], ['countries', 'Country rules'], ['holds', 'Legal holds'], ['log', 'Erasure log']];

// How long applicants' data is kept, by country and kind of data, with legal holds and the erasure log.
export default function DataRetention() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const [companyId, setCompanyId] = useState('');
    const [tab, setTab] = useState(superAdmin ? 'countries' : 'periods');
    const company = superAdmin ? companyId || undefined : user.companyId;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Data retention</h1>
                    <p>How long applicants’ data is kept, by their country and the kind of data, and a record of everything erased.</p>
                </div>
                {superAdmin && (
                    <div className="head-actions">
                        <CompanySelect value={companyId} onChange={setCompanyId} allLabel="All companies" />
                    </div>
                )}
            </div>

            <div className="note note--warn" style={{ marginBottom: 16 }}>
                <div className="note-head"><ShieldAlert size={16} /><span>Erased data can’t be recovered</span></div>
                <p>Keep personal data no longer than you need it, and records as long as AML law requires. Set periods your legal advisers have confirmed.
                    The rules run every night at 02:30; to erase one applicant now, open their verification.</p>
            </div>

            <div className="page-tabs" role="tablist">
                {TABS.map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
                ))}
            </div>

            {tab === 'periods' && (company
                ? <CompanyPeriods key={company} companyId={company} canEdit={isAdmin} />
                : <div className="card"><div className="empty-state">Choose a company above to see and set its periods.</div></div>)}
            {tab === 'countries' && <CountryRules editable={superAdmin} />}
            {tab === 'holds' && <Holds key={company || 'all'} companyId={company} />}
            {tab === 'log' && <ErasureLog key={company || 'all'} companyId={company} />}
        </div>
    );
}
