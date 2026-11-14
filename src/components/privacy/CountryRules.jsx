import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import privacyService, { CATEGORIES, daysLabel } from '../../services/privacyService';
import { errorMessage } from '../../services/api';

const blank = () => Object.fromEntries(CATEGORIES.map(([c]) => [c, { minDays: '', maxDays: '', defaultDays: '', startsFrom: 'FINISHED', legalBasis: '' }]));
const toNumber = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

// Intact's limits per country and kind of data. Super admins edit them; everyone else reads them.
export default function CountryRules({ editable }) {
    const { toast } = useToast();
    const [rows, setRows] = useState(null);
    const [editing, setEditing] = useState(null); // { country, isNew, form }
    const [busy, setBusy] = useState(false);

    const load = () => privacyService.countryRules().then(setRows).catch((e) => toast.error(errorMessage(e, 'Could not load the country rules.')));
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const open = (row) => {
        const form = blank();
        Object.entries(row?.categories || {}).forEach(([c, l]) => {
            form[c] = { minDays: l.minDays ?? '', maxDays: l.maxDays ?? '', defaultDays: l.defaultDays ?? '', startsFrom: l.startsFrom || 'FINISHED', legalBasis: l.legalBasis || '' };
        });
        setEditing({ country: row?.country || '', isNew: !row, form });
    };

    const save = async () => {
        const body = {};
        Object.entries(editing.form).forEach(([c, l]) => {
            const limit = { minDays: toNumber(l.minDays), maxDays: toNumber(l.maxDays), defaultDays: toNumber(l.defaultDays), startsFrom: l.startsFrom, legalBasis: l.legalBasis.trim() || null };
            const empty = limit.minDays === null && limit.maxDays === null && limit.defaultDays === null && !limit.legalBasis && limit.startsFrom === 'FINISHED';
            if (!empty || editing.country === '*') body[c] = limit;
        });
        setBusy(true);
        try {
            await privacyService.updateCountry(editing.country.trim().toUpperCase(), body);
            toast.success('Country rules saved');
            setEditing(null);
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the rules.'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (country) => {
        try {
            await privacyService.deleteCountry(country);
            toast.success('Removed; that country now uses the rules for any other country');
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not remove the rules.'));
        }
    };

    const cell = (l) => {
        if (!l || (l.minDays == null && l.maxDays == null && l.defaultDays == null)) return <span className="name-secondary">No limits</span>;
        return (
            <>
                <div>{daysLabel(l.defaultDays ?? l.maxDays)}</div>
                <div className="name-secondary">
                    {l.minDays != null ? `min ${l.minDays}` : 'no min'} · {l.maxDays != null ? `max ${l.maxDays}` : 'no max'}
                    {l.startsFrom === 'RELATIONSHIP_END' ? ' · from relationship end' : ''}
                </div>
            </>
        );
    };

    const set = (c, key, value) => setEditing((e) => ({ ...e, form: { ...e.form, [c]: { ...e.form[c], [key]: value } } }));

    return (
        <div className="table-card">
            <div className="card-head">
                <div>
                    <h3>Country rules</h3>
                    <div className="card-caption">Intact’s limits by the applicant’s country (a business’s country of registration). Companies choose periods within them.</div>
                </div>
                {editable && <button className="btn btn--secondary btn--sm" onClick={() => open(null)}><Plus size={14} /> Add country</button>}
            </div>
            {!rows ? <div className="loading-state">Loading…</div> : (
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>Country</th>{CATEGORIES.map(([c, label]) => <th key={c}>{label}</th>)}<th /></tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.country}>
                                <td><div className="name-primary">{r.name}</div><div className="name-secondary mono">{r.country}</div></td>
                                {CATEGORIES.map(([c]) => <td key={c}>{cell(r.categories[c])}{r.categories[c]?.legalBasis && <div className="name-secondary">{r.categories[c].legalBasis}</div>}</td>)}
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    {editable && <button className="btn btn--ghost btn--sm" onClick={() => open(r)}>Edit</button>}
                                    {editable && r.country !== '*' && <button className="btn btn--ghost btn--sm" onClick={() => remove(r.country)} aria-label="Remove"><Trash2 size={13} /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table></div>
            )}

            <Modal
                isOpen={!!editing}
                onClose={() => !busy && setEditing(null)}
                title={editing?.isNew ? 'Add a country' : `Rules for ${rows?.find((r) => r.country === editing?.country)?.name || editing?.country}`}
                caption="Days count from when the verification finished, or from the end of the customer relationship. Empty means no limit. Check every period with your legal advisers."
                footer={<>
                    <button className="btn btn--secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                    <button className="btn btn--primary" onClick={save} disabled={busy || !editing?.country.trim()}>{busy ? 'Saving…' : 'Save'}</button>
                </>}
            >
                {editing && (
                    <>
                        {editing.isNew && (
                            <div className="field">
                                <label htmlFor="cr-country">Country code (ISO, e.g. KE, NG, ZA)</label>
                                <input id="cr-country" className="input mono" maxLength={3} style={{ maxWidth: 120 }} value={editing.country}
                                       onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
                            </div>
                        )}
                        {CATEGORIES.map(([c, label, hint]) => (
                            <div key={c} className="field" style={{ marginTop: 14 }}>
                                <label>{label} <span className="name-secondary">· {hint}</span></label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {[['minDays', 'Min days'], ['defaultDays', 'Default days'], ['maxDays', 'Max days']].map(([key, ph]) => (
                                        <input key={key} className="input" type="number" min="0" placeholder={ph} aria-label={`${label} ${ph}`} style={{ width: 120 }}
                                               value={editing.form[c][key]} onChange={(e) => set(c, key, e.target.value)} />
                                    ))}
                                    <select className="input" style={{ width: 210 }} value={editing.form[c].startsFrom} onChange={(e) => set(c, 'startsFrom', e.target.value)} aria-label={`${label} counts from`}>
                                        <option value="FINISHED">From when it finished</option>
                                        <option value="RELATIONSHIP_END">From relationship end</option>
                                    </select>
                                </div>
                                <input className="input" placeholder="Legal basis, e.g. POCAMLA record keeping" style={{ marginTop: 6 }}
                                       value={editing.form[c].legalBasis} onChange={(e) => set(c, 'legalBasis', e.target.value)} />
                            </div>
                        ))}
                    </>
                )}
            </Modal>
        </div>
    );
}
