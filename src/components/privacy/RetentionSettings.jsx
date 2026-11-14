import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import privacyService from '../../services/privacyService';
import { errorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';

const toForm = (rule) => ({
    documentsDays: rule?.documentsDays ?? '',
    personalDataDays: rule?.personalDataDays ?? '',
});
const toDays = (value) => (value === '' || value === null ? null : Number(value));

/**
 * How long applicants' data is kept. Without companyId: the platform default (super admins).
 * With companyId: that company's rule, which overrides the default once saved. Also the erasure log.
 */
export default function RetentionSettings({ companyId }) {
    const { toast } = useToast();
    const [loaded, setLoaded] = useState(null);
    const [form, setForm] = useState(null);
    const [log, setLog] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        privacyService.retention(companyId)
            .then((data) => {
                if (cancelled) return;
                setLoaded(data);
                setForm(toForm(companyId ? data.company : data.platformDefault));
            })
            .catch((e) => { if (!cancelled) setError(errorMessage(e, 'Could not load the retention rule.')); });
        privacyService.erasures(companyId).then((rows) => !cancelled && setLog(rows)).catch(() => !cancelled && setLog([]));
        return () => { cancelled = true; };
    }, [companyId]);

    const current = loaded && (companyId ? loaded.company : loaded.platformDefault);
    const override = companyId && current?.companyOverride;
    const dirty = form && current && JSON.stringify(form) !== JSON.stringify(toForm(current));

    const save = async () => {
        const rule = { documentsDays: toDays(form.documentsDays), personalDataDays: toDays(form.personalDataDays) };
        if ([rule.documentsDays, rule.personalDataDays].some((d) => d !== null && (!Number.isInteger(d) || d < 0))) {
            toast.error('Days must be whole numbers, or empty to keep the data.');
            return;
        }
        setSaving(true);
        try {
            const saved = companyId ? await privacyService.updateCompany(companyId, rule) : await privacyService.updateDefault(rule);
            setLoaded((l) => (companyId ? { ...l, company: saved } : { ...l, platformDefault: saved }));
            setForm(toForm(saved));
            toast.success('Retention rule saved');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the rule.'));
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        setSaving(true);
        try {
            const def = await privacyService.clearCompany(companyId);
            setLoaded((l) => ({ ...l, company: { ...def, companyOverride: false } }));
            setForm(toForm(def));
            toast.success('This company now uses the platform rule');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not reset the rule.'));
        } finally {
            setSaving(false);
        }
    };

    const daysField = (key, label, hint) => (
        <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor={`ret-${key}`}>{label}</label>
            <input id={`ret-${key}`} className="input" type="number" min="0" step="1" style={{ maxWidth: 160 }} placeholder="Keep"
                   value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            <span className="field-hint">{hint}</span>
        </div>
    );

    return (
        <>
            <div className="card">
                <div className="card-head">
                    <div>
                        <h3>Data retention</h3>
                        <div className="card-caption">
                            How long applicants’ data is kept after a verification finishes. The decision and check results are always kept.
                        </div>
                    </div>
                    {companyId && current && <Badge kind={override ? 'info' : 'neutral'} dot={false}>{override ? 'Company rule' : 'Platform rule'}</Badge>}
                </div>
                {error ? <div className="empty-state">{error}</div> : !form ? <div className="loading-state">Loading…</div> : (
                    <>
                        {daysField('documentsDays', 'Delete documents after (days)', 'ID photos, selfies, liveness frames and business documents. Empty keeps them.')}
                        {daysField('personalDataDays', 'Erase personal details after (days)', 'Names, ID numbers, dates of birth, contact details and what was read from documents. Also deletes the documents. Empty keeps them.')}
                        <p className="field-hint" style={{ marginTop: 12 }}>The rule runs every night and applies to verifications already finished, not only new ones.</p>
                        <div className="head-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                            {override && <button className="btn btn--ghost btn--sm" onClick={reset} disabled={saving}>Use the platform rule</button>}
                            <button className="btn btn--secondary btn--sm" onClick={() => setForm(toForm(current))} disabled={!dirty || saving}>Discard</button>
                            <button className="btn btn--primary btn--sm" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                    </>
                )}
            </div>

            <div className="table-card" style={{ marginTop: 16 }}>
                <div className="card-head"><div><h3>Erasure log</h3><div className="card-caption">Every erasure, by request or by the retention rule. Newest first.</div></div></div>
                {!log ? <div className="loading-state">Loading…</div> : log.length === 0 ? <div className="empty-state">Nothing erased yet.</div> : (
                    <div className="table-scroll"><table className="data-table">
                        <thead><tr><th>When</th><th>Verification</th><th>What</th><th>Why</th><th>By</th></tr></thead>
                        <tbody>
                            {log.map((e) => (
                                <tr key={e.id}>
                                    <td>{formatDateTime(e.createdAt)}</td>
                                    <td><Link className="mono" to={`/dashboard/verifications/${e.verificationId}`}>{e.verificationId.slice(0, 8)}…</Link></td>
                                    <td>{e.scope === 'PERSONAL_DATA' ? 'Personal details and documents' : 'Documents'}{e.documentsDeleted ? ` (${e.documentsDeleted} files)` : ''}</td>
                                    <td>{e.trigger === 'RETENTION' ? 'Retention rule' : e.reason}</td>
                                    <td>{e.performedBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </div>
        </>
    );
}
