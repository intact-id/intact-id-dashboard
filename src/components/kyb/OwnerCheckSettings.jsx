import { useEffect, useState } from 'react';
import Badge from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import kybService from '../../services/kybService';
import { errorMessage } from '../../services/api';

const MODES = [
    ['NONE', 'Nobody', 'Directors and owners are recorded but not checked.'],
    ['SCREENING', 'Screening only', 'Each person is screened against sanctions and PEP lists.'],
    ['FULL_KYC', 'Full verification', 'Each person completes their own identity verification; the business waits for them.'],
];

const toForm = (s) => ({
    ownerCheck: s.ownerCheck,
    ownershipThreshold: s.ownershipThreshold ?? 25,
    includeDirectors: !!s.includeDirectors,
    personWorkflow: s.personWorkflow || '',
});

/**
 * Who is checked behind a business. Without companyId: the platform default (super admins).
 * With companyId: that company's settings, which override the default once saved.
 */
export default function OwnerCheckSettings({ companyId }) {
    const { toast } = useToast();
    const [loaded, setLoaded] = useState(null); // { platformDefault, company }
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        kybService.settings(companyId)
            .then((data) => {
                if (cancelled) return;
                setLoaded(data);
                setForm(toForm(companyId ? data.company : data.platformDefault));
            })
            .catch((e) => { if (!cancelled) setError(errorMessage(e, 'Could not load the settings.')); });
        return () => { cancelled = true; };
    }, [companyId]);

    const current = loaded && (companyId ? loaded.company : loaded.platformDefault);
    const override = companyId && current?.companyOverride;
    const dirty = form && current && JSON.stringify(form) !== JSON.stringify(toForm(current));

    const save = async () => {
        const threshold = Number(form.ownershipThreshold);
        if (!(threshold >= 0 && threshold <= 100)) {
            toast.error('The ownership threshold must be between 0 and 100.');
            return;
        }
        setSaving(true);
        try {
            const body = { ...form, ownershipThreshold: threshold, personWorkflow: form.personWorkflow.trim() || null };
            const saved = companyId ? await kybService.updateCompany(companyId, body) : await kybService.updateDefault(body);
            setLoaded((l) => (companyId ? { ...l, company: saved } : { ...l, platformDefault: saved }));
            setForm(toForm(saved));
            toast.success(companyId ? 'Company settings saved' : 'Platform default saved');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the settings.'));
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        setSaving(true);
        try {
            const def = await kybService.clearCompany(companyId);
            setLoaded((l) => ({ ...l, company: { ...def, companyOverride: false } }));
            setForm(toForm(def));
            toast.success('This company now uses the platform default');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not reset the settings.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <h3>Directors and owners</h3>
                    <div className="card-caption">
                        {companyId ? 'Who is checked behind the businesses this company verifies.' : 'The default for every company without its own settings.'}
                    </div>
                </div>
                {companyId && current && <Badge kind={override ? 'info' : 'neutral'} dot={false}>{override ? 'Company setting' : 'Platform default'}</Badge>}
            </div>
            {error ? <div className="empty-state">{error}</div> : !form ? <div className="loading-state">Loading…</div> : (
                <>
                    <div className="field">
                        <label>How they are checked</label>
                        <div className="view-toggle" style={{ alignSelf: 'flex-start' }}>
                            {MODES.map(([value, label]) => (
                                <button key={value} className={form.ownerCheck === value ? 'is-active' : ''} onClick={() => setForm({ ...form, ownerCheck: value })}>{label}</button>
                            ))}
                        </div>
                        <span className="field-hint">{MODES.find(([v]) => v === form.ownerCheck)?.[2]}</span>
                    </div>
                    {form.ownerCheck !== 'NONE' && (
                        <>
                            <div className="field" style={{ marginTop: 12 }}>
                                <label htmlFor="kyb-threshold">Owners at or above (%)</label>
                                <input id="kyb-threshold" className="input" type="number" min="0" max="100" step="0.01" style={{ maxWidth: 140 }}
                                       value={form.ownershipThreshold} onChange={(e) => setForm({ ...form, ownershipThreshold: e.target.value })} />
                            </div>
                            <label className="checkbox-row" style={{ marginTop: 12 }}>
                                <input type="checkbox" checked={form.includeDirectors} onChange={(e) => setForm({ ...form, includeDirectors: e.target.checked })} />
                                <span>Check directors too, whatever their share</span>
                            </label>
                        </>
                    )}
                    {form.ownerCheck === 'FULL_KYC' && (
                        <div className="field" style={{ marginTop: 12 }}>
                            <label htmlFor="kyb-person-workflow">Workflow each person runs (optional)</label>
                            <input id="kyb-person-workflow" className="input mono" placeholder="e.g. standard-kyc" style={{ maxWidth: 260 }}
                                   value={form.personWorkflow} onChange={(e) => setForm({ ...form, personWorkflow: e.target.value })} />
                            <span className="field-hint">A person workflow's key. Empty: the company's default workflow, else the Tier 1 checks.</span>
                        </div>
                    )}
                    <div className="head-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                        {override && <button className="btn btn--ghost btn--sm" onClick={reset} disabled={saving}>Use the platform default</button>}
                        <button className="btn btn--secondary btn--sm" onClick={() => setForm(toForm(current))} disabled={!dirty || saving}>Discard</button>
                        <button className="btn btn--primary btn--sm" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </>
            )}
        </div>
    );
}
