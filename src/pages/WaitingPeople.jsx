import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import kybService from '../services/kybService';
import { errorMessage } from '../services/api';
import { isSuperAdmin } from '../utils/roles';
import { formatDateTime } from '../utils/format';
import { PARTY_STATUS } from '../utils/verification';
import { linkInfo } from './verifications/BusinessPanels';

// Business verifications that can't finish until their directors and owners complete their own verification.
export default function WaitingPeople() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setError('');
        try {
            setRows(await kybService.waiting());
        } catch (e) {
            setError(errorMessage(e, 'Could not load the waiting businesses.'));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Waiting for people</h1>
                    <p>Businesses that finish once their directors and owners complete their own verification. Open one to email or copy a person’s link.</p>
                </div>
            </div>
            {error ? <div className="card"><div className="empty-state">{error}</div></div>
                : !rows ? <div className="card"><div className="loading-state">Loading…</div></div>
                    : rows.length === 0 ? (
                        <div className="card"><div className="empty-state"><Users size={20} /> No business is waiting for anyone.</div></div>
                    ) : (
                        <div className="table-card">
                            <div className="table-scroll"><table className="data-table">
                                <thead><tr><th>Business</th>{superAdmin && <th>Company</th>}<th>Submitted</th><th>People</th></tr></thead>
                                <tbody>
                                    {rows.map((b) => {
                                        const done = b.people.filter((p) => ['PASSED', 'FAILED', 'REVIEW'].includes(p.status)).length;
                                        return (
                                            <tr key={b.verificationId}>
                                                <td>
                                                    <Link className="name-primary" to={`/dashboard/verifications/${b.verificationId}`}>{b.businessName || 'Business'}</Link>
                                                    {b.externalReference && <div className="name-secondary mono">{b.externalReference}</div>}
                                                </td>
                                                {superAdmin && <td>{b.companyName}</td>}
                                                <td>{formatDateTime(b.submittedAt)}</td>
                                                <td>
                                                    <div className="name-secondary">{done} of {b.people.length} done</div>
                                                    {b.people.map((p) => {
                                                        const status = PARTY_STATUS[p.status] || { label: p.status, badge: 'neutral' };
                                                        return (
                                                            <div key={p.id} style={{ marginTop: 6 }}>
                                                                {p.firstName} {p.lastName} <Badge kind={status.badge}>{status.label}</Badge>
                                                                {linkInfo(p) && <div className="name-secondary">{linkInfo(p)}</div>}
                                                            </div>
                                                        );
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table></div>
                        </div>
                    )}
        </div>
    );
}
