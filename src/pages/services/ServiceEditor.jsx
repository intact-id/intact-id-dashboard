import { createElement, useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import workflowService from '../../services/workflowService';
import billingService from '../../services/billingService';
import { errorMessage } from '../../services/api';
import { CATEGORY_LABELS, SERVICE_ICON_NAMES, serviceIcon } from '../workflows/icons';

// Applicant fields and uploads services already use; anything else can still be typed in.
const FIELD_SUGGESTIONS = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'countryOfResidence', 'idNumber', 'idType',
    'phone', 'email', 'address', 'companyName', 'registrationNumber', 'jurisdiction'];
const CAPTURE_SUGGESTIONS = ['id_front', 'id_back', 'selfie', 'liveness_frames', 'proof_of_address', 'business_documents'];
const SUBJECTS = [['INDIVIDUAL', 'Individuals (KYC)'], ['BUSINESS', 'Businesses (KYB)']];
const CODE_RULE = /^[A-Z][A-Z0-9_]{1,99}$/;

// "Proof of address" → "PROOF_OF_ADDRESS"
const codeFrom = (name) => name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'S_$1');
const json = (value) => (value && Object.keys(value).length ? JSON.stringify(value, null, 2) : '');

// A list of short values typed as chips: Enter or comma adds one, suggestions add with a click.
function TagInput({ value, onChange, suggestions = [], placeholder, transform = (v) => v }) {
    const [text, setText] = useState('');
    const add = (raw) => {
        const item = transform(raw.trim());
        if (item && !value.includes(item)) onChange([...value, item]);
        setText('');
    };
    const left = suggestions.filter((s) => !value.includes(s));
    return (
        <div className="svc-tags">
            <div className="svc-tags-box">
                {value.map((item) => (
                    <span key={item} className="svc-tag">{item}<button type="button" onClick={() => onChange(value.filter((v) => v !== item))} aria-label={`Remove ${item}`}><X size={11} /></button></span>
                ))}
                <input value={text} placeholder={value.length ? '' : placeholder} onChange={(e) => setText(e.target.value)}
                       onKeyDown={(e) => {
                           if ((e.key === 'Enter' || e.key === ',') && text.trim()) { e.preventDefault(); add(text); }
                           if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
                       }}
                       onBlur={() => text.trim() && add(text)} />
            </div>
            {left.length > 0 && (
                <div className="svc-suggest">{left.map((s) => <button key={s} type="button" onClick={() => add(s)}>+ {s}</button>)}</div>
            )}
        </div>
    );
}

function parseJson(label, text, expect) {
    if (!text.trim()) return expect === 'array' ? [] : {};
    let value;
    try {
        value = JSON.parse(text);
    } catch {
        throw new Error(`${label} is not valid JSON`);
    }
    if (expect === 'array' ? !Array.isArray(value) : (typeof value !== 'object' || value === null || Array.isArray(value))) {
        throw new Error(`${label} must be a JSON ${expect === 'array' ? 'list' : 'object'}`);
    }
    return value;
}

/**
 * Adds a service (service null) or edits one, including its standard price in billing.
 * services: the whole catalog (for dependencies); charge: this service's standard price, if any.
 */
export default function ServiceEditor({ service, charge, services, onClose, onSaved }) {
    const { toast } = useToast();
    const creating = !service;
    const [form, setForm] = useState(() => ({
        code: service?.code || '',
        name: service?.name || '',
        description: service?.description || '',
        category: service?.category || 'VERIFICATION',
        subjectTypes: service?.subjectTypes || ['INDIVIDUAL'],
        countries: service?.countries || [],
        requires: service?.requires || [],
        requiredFields: service?.requiredFields || [],
        captures: service?.captures || [],
        sortOrder: service?.sortOrder ?? 100,
        icon: service?.ui?.icon || '',
        price: charge ? String(charge.price) : '',
        currency: charge?.currency || 'KES',
        outputs: json(service?.outputs),
        ui: json(Object.fromEntries(Object.entries(service?.ui || {}).filter(([k]) => k !== 'icon'))),
        settingsSchema: json(service?.settingsSchema),
    }));
    const [codeTouched, setCodeTouched] = useState(false);
    const [advanced, setAdvanced] = useState(false);
    const [busy, setBusy] = useState(false);
    const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

    const fieldSuggestions = [...new Set([...FIELD_SUGGESTIONS, ...services.flatMap((s) => s.requiredFields || [])])];
    const captureSuggestions = [...new Set([...CAPTURE_SUGGESTIONS, ...services.flatMap((s) => s.captures || [])])];
    const others = services.filter((s) => s.code !== form.code && s.status !== 'RETIRED');

    const problems = [];
    if (!form.name.trim()) problems.push('a name');
    if (creating && !CODE_RULE.test(form.code)) problems.push('a code in UPPER_SNAKE_CASE');
    if (!form.subjectTypes.length) problems.push('who it verifies');
    if (form.price !== '' && !(Number(form.price) >= 0)) problems.push('a valid price');

    const save = async () => {
        setBusy(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                category: form.category,
                subjectTypes: form.subjectTypes,
                countries: form.countries,
                requires: form.requires,
                requiredFields: form.requiredFields,
                captures: form.captures,
                sortOrder: Number(form.sortOrder) || 0,
                outputs: parseJson('Outputs', form.outputs, 'array'),
                ui: { ...parseJson('Widget hints', form.ui, 'object'), ...(form.icon ? { icon: form.icon } : {}) },
                settingsSchema: parseJson('Settings schema', form.settingsSchema, 'object'),
            };
            const saved = creating
                ? await workflowService.createService({ code: form.code, ...payload })
                : await workflowService.updateService(service.code, payload);

            // The standard price lives in billing, under the same code
            let priceNote = '';
            if (form.price !== '') {
                try {
                    if (charge) {
                        if (Number(form.price) !== Number(charge.price) || charge.name !== payload.name) {
                            await billingService.updateServiceCharge(charge.id, { price: Number(form.price), name: payload.name });
                        }
                    } else {
                        await billingService.createStandardPrice({ serviceCode: saved.code, name: payload.name, price: Number(form.price), currency: form.currency.trim().toUpperCase() });
                    }
                } catch (e) {
                    priceNote = ` The price was not saved: ${errorMessage(e, 'billing did not answer')}`;
                }
            }
            if (priceNote) toast.error(`${saved.name} saved.${priceNote}`);
            else toast.success(creating ? `${saved.name} added. It stays in development until you make it available.` : `${saved.name} saved`);
            onSaved();
        } catch (e) {
            toast.error(e.response ? errorMessage(e, 'Could not save the service.') : e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} size="lg"
               title={creating ? 'Add a service' : `Edit ${service.name}`}
               caption={creating ? 'New services start in development; merchants see them once you make them available.' : <span className="mono">{service.code}</span>}
               footer={<>
                   {problems.length > 0 && <span className="svc-footer-hint">Needs {problems.join(', ')}</span>}
                   <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
                   <button className="btn btn--primary" disabled={busy || problems.length > 0} onClick={save}>{busy ? 'Saving…' : creating ? 'Add service' : 'Save changes'}</button>
               </>}>
            <div className="svc-editor-head">
                <span className="svc-icon svc-icon--lg">{createElement(serviceIcon({ ui: { icon: form.icon } }), { size: 20 })}</span>
                <div className="form-grid svc-grow">
                    <div className="field">
                        <label>Name</label>
                        <input type="text" value={form.name} autoFocus={creating}
                               onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, code: creating && !codeTouched ? codeFrom(e.target.value) : f.code }))} />
                    </div>
                    {creating ? (
                        <div className="field">
                            <label>Code</label>
                            <input type="text" className="mono" value={form.code} onChange={(e) => { setCodeTouched(true); set('code')(e.target.value.toUpperCase()); }} />
                            <span className="field-hint">Matches the billing price code. Can’t be changed later.</span>
                        </div>
                    ) : (
                        <div className="field">
                            <label>Category</label>
                            <select value={form.category} onChange={(e) => set('category')(e.target.value)}>
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="field">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="What it checks, shown in the workflow builder" />
            </div>

            <div className="form-grid">
                {creating && (
                    <div className="field">
                        <label>Category</label>
                        <select value={form.category} onChange={(e) => set('category')(e.target.value)}>
                            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                )}
                <div className="field">
                    <label>Icon</label>
                    <select value={form.icon} onChange={(e) => set('icon')(e.target.value)}>
                        <option value="">Default</option>
                        {SERVICE_ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label>Verifies</label>
                    <div className="svc-checks">
                        {SUBJECTS.map(([value, label]) => (
                            <label key={value} className="svc-check">
                                <input type="checkbox" checked={form.subjectTypes.includes(value)}
                                       onChange={(e) => set('subjectTypes')(e.target.checked ? [...form.subjectTypes, value] : form.subjectTypes.filter((v) => v !== value))} />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="field">
                    <label>Order in the builder</label>
                    <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder')(e.target.value)} />
                </div>
            </div>

            <div className="svc-section">
                <div className="svc-section-title">Standard price</div>
                <div className="form-grid">
                    <div className="field">
                        <label>Price per run</label>
                        <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price')(e.target.value)} placeholder="Not priced yet" />
                        <span className="field-hint">What every company pays unless it has its own price. 0 makes it free.</span>
                    </div>
                    <div className="field">
                        <label>Currency</label>
                        <input type="text" maxLength={3} value={form.currency} disabled={Boolean(charge)} onChange={(e) => set('currency')(e.target.value.toUpperCase())} />
                        {charge && <span className="field-hint">Set when the price was created.</span>}
                    </div>
                </div>
            </div>

            <div className="svc-section">
                <div className="svc-section-title">What it needs from the applicant</div>
                <div className="field">
                    <label>Details</label>
                    <TagInput value={form.requiredFields} onChange={set('requiredFields')} suggestions={fieldSuggestions} placeholder="Type a field and press Enter" />
                </div>
                <div className="field">
                    <label>Uploads</label>
                    <TagInput value={form.captures} onChange={set('captures')} suggestions={captureSuggestions} placeholder="Type an upload and press Enter" />
                </div>
                <div className="field">
                    <label>Countries</label>
                    <TagInput value={form.countries} onChange={set('countries')} placeholder="All countries. Add ISO3 codes (KEN, NGA…) to limit it"
                              transform={(v) => (/^[A-Za-z]{3}$/.test(v) ? v.toUpperCase() : '')} />
                </div>
                {others.length > 0 && (
                    <div className="field">
                        <label>Runs after</label>
                        <div className="svc-checks svc-checks--wrap">
                            {others.map((s) => (
                                <label key={s.code} className="svc-check">
                                    <input type="checkbox" checked={form.requires.includes(s.code)}
                                           onChange={(e) => set('requires')(e.target.checked ? [...form.requires, s.code] : form.requires.filter((c) => c !== s.code))} />
                                    {s.name}
                                </label>
                            ))}
                        </div>
                        <span className="field-hint">It can only be made available once these are available.</span>
                    </div>
                )}
            </div>

            <button type="button" className="svc-advanced-toggle" onClick={() => setAdvanced((a) => !a)}>
                {advanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Advanced: outputs, settings and widget hints (JSON)
            </button>
            {advanced && (
                <div className="svc-section">
                    <div className="field">
                        <label>Outputs</label>
                        <textarea rows={5} className="mono" value={form.outputs} onChange={(e) => set('outputs')(e.target.value)}
                                  placeholder='[{"key": "liveness.score", "type": "number"}]' />
                        <span className="field-hint">Results workflow conditions can test.</span>
                    </div>
                    <div className="field">
                        <label>Settings schema</label>
                        <textarea rows={5} className="mono" value={form.settingsSchema} onChange={(e) => set('settingsSchema')(e.target.value)}
                                  placeholder='{"type": "object", "properties": {}}' />
                        <span className="field-hint">JSON Schema for the per-step settings shown in the builder.</span>
                    </div>
                    <div className="field">
                        <label>Widget hints</label>
                        <textarea rows={3} className="mono" value={form.ui} onChange={(e) => set('ui')(e.target.value)} placeholder='{"screen": "document_capture"}' />
                    </div>
                </div>
            )}
        </Modal>
    );
}
