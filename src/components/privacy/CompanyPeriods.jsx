import { useCallback, useEffect, useState } from 'react';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import privacyService, { CATEGORIES, daysLabel } from '../../services/privacyService';
import { errorMessage } from '../../services/api';

const SOURCE = {
    COMPANY_COUNTRY: 'Your period for this country',
    COMPANY_ALL: 'Your period for every country',
    COUNTRY_DEFAULT: 'Intact default',
    NONE: 'No rule',
};

// A company's own periods, per country ("*" = every country), within Intact's limits.
export default function CompanyPeriods({ companyId, canEdit }) {
    const { toast } = useToast();
    const [rows, setRows] = useState(null);
    const [editing, setEditing] = useState(null); // { country, name, form, effective }
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => privacyService.companyRules(companyId).then(setRows)
        .catch((e) => toast.error(errorMessage(e, 'Could not load the periods.'))), [companyId, toast]);
    useEffect(() => { load(); }, [load]);

    const open = (row) => setEditing({
        country: row.country,
        name: row.name,
        effective: row.effective,
        form: Object.fromEntries(CATEGORIES.map(([c]) => [c, row.days[c] ?? ''])),
    });

    const save = async () => {
        const days = {};
        Object.entries(editing.form).forEach(([c, v]) => { if (v !== '') days[c] = Number(v); });
        setBusy(true);
        try {
            setRows(await privacyService.updateCompany(companyId, editing.country, days));
            toast.success('Periods saved');
            setEditing(null);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the periods.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="table-card">
            <div className="card-head">
                <div>
                    <h3>Retention periods</h3>
                    <div className="card-caption">What happens to each kind of data, by the applicant’s country. “Every country” applies wherever you haven’t set a country of its own.</div>
                </div>
            </div>
            {!rows ? <div className="loading-state">Loading…</div> : (
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>Country</th>{CATEGORIES.map(([c, label]) => <th key={c}>{label}</th>)}<th /></tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.country}>
                                <td className="name-primary">{r.country === '*' ? 'Every country' : r.name}</td>
                                {CATEGORIES.map(([c]) => {
                                    const e = r.effective[c];
                                    return (
                                        <td key={c}>
                                            <div>{daysLabel(e.days)}{e.startsFrom === 'RELATIONSHIP_END' && e.days != null ? ' after relationship ends' : ''}</div>
                                            <div className="name-secondary">{SOURCE[e.source] || e.source}</div>
                                            {e.adjusted && <Badge kind="warn" dot={false}>Moved into the country’s limits</Badge>}
                                        </td>
                                    );
                                })}
                                <td style={{ textAlign: 'right' }}>{canEdit && <button className="btn btn--ghost btn--sm" onClick={() => open(r)}>Edit</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
            )}

            <Modal
                isOpen={!!editing}
                onClose={() => !busy && setEditing(null)}
                title={editing ? `Periods for ${editing.country === '*' ? 'every country' : editing.name}` : ''}
                caption="Days after the verification finished (or after the customer relationship ended, where the country says so). Leave empty to use Intact’s default."
                footer={<>
                    <button className="btn btn--secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                    <button className="btn btn--primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                </>}
            >
                {editing && CATEGORIES.map(([c, label, hint]) => {
                    const e = editing.effective[c];
                    const range = [e.minDays != null && `at least ${e.minDays}`, e.maxDays != null && `at most ${e.maxDays}`].filter(Boolean).join(', ');
                    return (
                        <div key={c} className="field" style={{ marginTop: 12 }}>
                            <label htmlFor={`cp-${c}`}>{label} <span className="name-secondary">· {hint}</span></label>
                            <input id={`cp-${c}`} className="input" type="number" min={e.minDays ?? 0} max={e.maxDays ?? undefined} style={{ maxWidth: 160 }}
                                   placeholder={e.source === 'COUNTRY_DEFAULT' ? `Default: ${daysLabel(e.days)}` : 'Keep'}
                                   value={editing.form[c]} onChange={(ev) => setEditing({ ...editing, form: { ...editing.form, [c]: ev.target.value } })} />
                            <span className="field-hint">{range ? `Allowed: ${range} days` : 'No limits'}{e.legalBasis ? ` · ${e.legalBasis}` : ''}</span>
                        </div>
                    );
                })}
            </Modal>
        </div>
    );
}
