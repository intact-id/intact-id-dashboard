import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Send } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import kybService from '../../services/kybService';
import { errorMessage } from '../../services/api';
import { formatDate, humanize, initialsOf } from '../../utils/format';
import { PARTY_STATUS } from '../../utils/verification';

// The business's own details (the "Applicant" card for a business verification).
export function BusinessDetails({ verification }) {
    const data = verification.customerData || {};
    return (
        <div className="card">
            <div className="card-head"><h3>Business</h3></div>
            <div className="subject-head">
                <span className="avatar avatar--light avatar--lg">{initialsOf(data.companyName)}</span>
                <div>
                    <div className="name-primary">{data.companyName || 'Unnamed business'}</div>
                    <div className="name-secondary">{data.tradingName || '—'}</div>
                </div>
            </div>
            <div className="kv-list">
                <div className="kv-row"><span>Registration number</span><strong className="mono">{data.registrationNumber || '—'}</strong></div>
                <div className="kv-row"><span>Country</span><strong>{data.country || '—'}</strong></div>
                <div className="kv-row"><span>Incorporated</span><strong>{data.incorporationDate ? formatDate(data.incorporationDate) : '—'}</strong></div>
                <div className="kv-row"><span>Business type</span><strong>{data.businessType ? humanize(data.businessType) : '—'}</strong></div>
                <div className="kv-row"><span>Tax PIN</span><strong className="mono">{data.taxPin || '—'}</strong></div>
                <div className="kv-row"><span>Registered address</span><strong>{data.registeredAddress || '—'}</strong></div>
            </div>
        </div>
    );
}

const canInvite = (p) => p.required && ['PENDING', 'INVITED'].includes(p.status);

function role(p) {
    const parts = [];
    if (p.ownershipPercent != null) parts.push(`${Number(p.ownershipPercent)}% owner`);
    if (p.director) parts.push('Director');
    return parts.join(' · ') || '—';
}

// The directors and owners named on a business verification, with each one's check.
export function PartiesCard({ verification, onChanged }) {
    const { toast } = useToast();
    const [inviting, setInviting] = useState(null); // party being invited
    const [link, setLink] = useState(null); // { party, link } after sending
    const [busy, setBusy] = useState(false);
    const parties = verification.parties || [];
    const waiting = verification.status === 'PENDING';

    const invite = async () => {
        setBusy(true);
        try {
            const result = await kybService.invite(verification.verificationId, inviting.id);
            setLink({ party: inviting, link: result.link });
            setInviting(null);
            onChanged?.();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not send the link.'));
        } finally {
            setBusy(false);
        }
    };

    const copy = (text) => navigator.clipboard.writeText(text).then(
        () => toast.success('Copied'),
        () => toast.error('Could not copy — select the text and copy it manually'),
    );

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <h3>Directors and owners</h3>
                    <div className="card-caption">
                        {waiting ? 'The business is waiting for the people marked required to finish their verification.'
                            : `${parties.filter((p) => p.required).length} of ${parties.length} must be checked`}
                    </div>
                </div>
            </div>
            {parties.length === 0 ? <div className="empty-state">No directors or owners were submitted.</div> : (
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>Person</th><th>Role</th><th>Check</th><th /></tr></thead>
                    <tbody>
                        {parties.map((p) => {
                            const status = PARTY_STATUS[p.status] || { label: p.status, badge: 'neutral' };
                            return (
                                <tr key={p.id}>
                                    <td>
                                        <div className="name-primary">{p.firstName} {p.lastName}</div>
                                        {p.verificationId && (
                                            <Link className="name-secondary mono" to={`/dashboard/verifications/${p.verificationId}`}>{p.verificationId.slice(0, 8)}…</Link>
                                        )}
                                        {p.screening?.verdict && <div className="name-secondary">Screening: {humanize(p.screening.verdict)}</div>}
                                    </td>
                                    <td>{role(p)}</td>
                                    <td><Badge kind={status.badge}>{status.label}</Badge></td>
                                    <td style={{ textAlign: 'right' }}>
                                        {canInvite(p) && (
                                            <button className="btn btn--ghost btn--sm" onClick={() => setInviting(p)}>
                                                <Send size={13} /> {p.status === 'INVITED' ? 'Send again' : 'Send link'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table></div>
            )}

            <Modal
                isOpen={!!inviting}
                onClose={() => setInviting(null)}
                title={`Send ${inviting?.firstName} their verification link?`}
                caption={`${inviting?.email ? `It is emailed to them. ` : 'They have no email on file, so copy the link and send it yourself. '}The link works for 7 days; sending again replaces the old link.`}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setInviting(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={invite} disabled={busy}>{busy ? 'Sending…' : 'Send link'}</button>
                    </>
                )}
            />

            <Modal
                isOpen={!!link}
                onClose={() => setLink(null)}
                title={`Link for ${link?.party.firstName}`}
                caption="Anyone with this link can complete this person's verification. Share it only with them."
                footer={<button className="btn btn--primary" onClick={() => setLink(null)}>Done</button>}
            >
                {link && <button className="copy-field mono" onClick={() => copy(link.link)}>{link.link} <Copy size={14} /></button>}
            </Modal>
        </div>
    );
}
