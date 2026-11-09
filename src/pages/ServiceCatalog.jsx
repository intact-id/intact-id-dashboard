import { useCallback, useEffect, useState } from 'react';
import { Boxes, Plus, Pencil } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import workflowService, { apiError } from '../services/workflowService';
import { SUBJECT_TYPES } from './workflow/graph';
import './Workflows.css';

// Must match the backend enums
const STATUSES = ['IN_DEVELOPMENT', 'AVAILABLE', 'DEPRECATED', 'RETIRED'];
const CATEGORIES = ['VERIFICATION', 'DOCUMENT', 'REGISTRY', 'SCREENING', 'RISK'];
const NEXT = {
    IN_DEVELOPMENT: [['AVAILABLE', 'Make available'], ['RETIRED', 'Retire']],
    AVAILABLE: [['DEPRECATED', 'Deprecate']],
    DEPRECATED: [['AVAILABLE', 'Make available again'], ['RETIRED', 'Retire']],
    RETIRED: [],
};
const STATUS_BADGE = { IN_DEVELOPMENT: 'default', AVAILABLE: 'success', DEPRECATED: 'warning', RETIRED: 'error' };

export default function ServiceCatalog() {
    const { toast } = useToast();
    const [services, setServices] = useState([]);
    const [filter, setFilter] = useState('');
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');

    const [reloads, setReloads] = useState(0);
    const load = useCallback(() => setReloads((n) => n + 1), []);

    useEffect(() => {
        let active = true;
        workflowService.catalog(filter || undefined)
            .then((res) => { if (active) { setServices(res.data || []); setError(''); } })
            .catch((err) => { if (active) setError(apiError(err, 'Could not load the catalog')); });
        return () => { active = false; };
    }, [filter, reloads]);

    const act = async (fn, message) => {
        try {
            await fn();
            toast.success(message);
            load();
        } catch (err) {
            toast.error(apiError(err));
        }
    };

    return (
        <div className="workflows-page">
            <div className="workflows-header">
                <div>
                    <h1><Boxes size={22} /> Service catalog</h1>
                    <p>Services merchants build workflows from. New services stay hidden until made available; each code must
                        have a matching service charge in billing so workflows using it can be priced.</p>
                </div>
                <Button onClick={() => setEditing({})}><Plus size={16} /> Add service</Button>
            </div>
            {error && <div className="workflows-error">{error}</div>}
            <Card>
                <div className="catalog-filter">
                    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <table className="workflows-table">
                    <thead><tr><th>Service</th><th>Code</th><th>Category</th><th>Applicants</th><th>Needs</th><th>Status</th><th /></tr></thead>
                    <tbody>
                        {services.map((s) => (
                            <tr key={s.code}>
                                <td><strong>{s.name}</strong><div className="muted small">{s.description}</div></td>
                                <td><code>{s.code}</code></td>
                                <td>{s.category}</td>
                                <td>{s.subjectTypes.join(', ') || 'all'}{s.countries.length ? ` · ${s.countries.join(', ')}` : ''}</td>
                                <td className="small">{s.requires.join(', ') || '—'}</td>
                                <td><Badge size="sm" variant={STATUS_BADGE[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                                <td className="actions">
                                    {NEXT[s.status].map(([target, label]) => (
                                        <Button key={target} size="sm" variant={target === 'RETIRED' ? 'danger' : 'secondary'}
                                                onClick={() => act(() => workflowService.changeServiceStatus(s.code, target), `${s.name}: ${target}`)}>
                                            {label}
                                        </Button>
                                    ))}
                                    {s.status !== 'RETIRED' && <button type="button" className="icon" title="Edit" onClick={() => setEditing(s)}><Pencil size={15} /></button>}
                                    {s.status === 'IN_DEVELOPMENT' && (
                                        <Button size="sm" variant="danger" onClick={() => window.confirm(`Delete ${s.code}?`)
                                            && act(() => workflowService.deleteService(s.code), `${s.code} deleted`)}>Delete</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            {editing && (
                <ServiceForm service={editing.code ? editing : null} all={services} onClose={() => setEditing(null)}
                             onSave={async (payload) => {
                                 try {
                                     if (editing.code) await workflowService.updateService(editing.code, payload);
                                     else await workflowService.createService(payload);
                                     toast.success(editing.code ? 'Service updated' : 'Service added (in development)');
                                     setEditing(null);
                                     load();
                                 } catch (err) {
                                     toast.error(apiError(err));
                                 }
                             }} />
            )}
        </div>
    );
}

const list = (text) => text.split(',').map((v) => v.trim()).filter(Boolean);

function ServiceForm({ service, all, onClose, onSave }) {
    const [form, setForm] = useState(() => ({
        code: service?.code || '',
        name: service?.name || '',
        description: service?.description || '',
        category: service?.category || 'VERIFICATION',
        subjectTypes: service?.subjectTypes || ['INDIVIDUAL'],
        countries: (service?.countries || []).join(', '),
        requires: service?.requires || [],
        requiredFields: (service?.requiredFields || []).join(', '),
        captures: (service?.captures || []).join(', '),
        outputs: (service?.outputs || []).map((o) => `${o.key}:${o.type}`).join('\n'),
        screen: service?.ui?.screen || '',
        icon: service?.ui?.icon || '',
        settingsSchema: JSON.stringify(service?.settingsSchema || {}, null, 2),
        sortOrder: service?.sortOrder ?? 100,
    }));
    const [jsonError, setJsonError] = useState('');
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const submit = (e) => {
        e.preventDefault();
        let settingsSchema;
        try {
            settingsSchema = JSON.parse(form.settingsSchema || '{}');
        } catch {
            setJsonError('Settings schema must be valid JSON');
            return;
        }
        onSave({
            ...(service ? {} : { code: form.code.trim() }),
            name: form.name.trim(),
            description: form.description,
            category: form.category,
            subjectTypes: form.subjectTypes,
            countries: list(form.countries).map((c) => c.toUpperCase()),
            requires: form.requires,
            requiredFields: list(form.requiredFields),
            captures: list(form.captures),
            outputs: form.outputs.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
                const [key, type = 'string'] = l.split(':').map((p) => p.trim());
                return { key, type };
            }),
            ui: { ...(form.screen ? { screen: form.screen } : {}), ...(form.icon ? { icon: form.icon } : {}) },
            settingsSchema,
            sortOrder: Number(form.sortOrder) || 0,
        });
    };

    return (
        <Modal isOpen onClose={onClose} title={service ? `Edit ${service.code}` : 'Add service'} size="lg">
            <form className="workflows-form catalog-form" onSubmit={submit}>
                <label><span>Code <small>(same as the billing service charge)</small></span>
                    <input required disabled={!!service} pattern="[A-Z][A-Z0-9_]{1,99}" value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} /></label>
                <label><span>Name</span><input required value={form.name} onChange={(e) => set({ name: e.target.value })} /></label>
                <label className="wide"><span>Description</span><textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
                <label><span>Category</span>
                    <select value={form.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                <fieldset><span>Applicants</span>
                    {SUBJECT_TYPES.map((s) => (
                        <label key={s} className="inline"><input type="checkbox" checked={form.subjectTypes.includes(s)}
                            onChange={(e) => set({ subjectTypes: e.target.checked ? [...form.subjectTypes, s] : form.subjectTypes.filter((x) => x !== s) })} />{s}</label>
                    ))}</fieldset>
                <label><span>Countries <small>(ISO3, empty = all)</small></span><input value={form.countries} placeholder="KEN, UGA" onChange={(e) => set({ countries: e.target.value })} /></label>
                <label><span>Must run after</span>
                    <select multiple value={form.requires} onChange={(e) => set({ requires: [...e.target.selectedOptions].map((o) => o.value) })}>
                        {all.filter((s) => s.code !== form.code).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                    </select></label>
                <label><span>Applicant fields <small>(comma-separated)</small></span><input value={form.requiredFields} placeholder="firstName, idNumber" onChange={(e) => set({ requiredFields: e.target.value })} /></label>
                <label><span>Captures <small>(comma-separated)</small></span><input value={form.captures} placeholder="id_front, selfie" onChange={(e) => set({ captures: e.target.value })} /></label>
                <label className="wide"><span>Results conditions can test <small>(one per line, key:type)</small></span>
                    <textarea rows={3} value={form.outputs} placeholder="registry.match:boolean" onChange={(e) => set({ outputs: e.target.value })} /></label>
                <label><span>Widget screen</span><input value={form.screen} placeholder="document_capture" onChange={(e) => set({ screen: e.target.value })} /></label>
                <label><span>Icon</span><input value={form.icon} placeholder="id-card" onChange={(e) => set({ icon: e.target.value })} /></label>
                <label className="wide"><span>Settings schema (JSON Schema)</span>
                    <textarea rows={4} value={form.settingsSchema} onChange={(e) => { set({ settingsSchema: e.target.value }); setJsonError(''); }} />
                    {jsonError && <small className="wf-error">{jsonError}</small>}</label>
                <label><span>Sort order</span><input type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} /></label>
                <div className="workflows-form__actions wide">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">{service ? 'Save' : 'Add (in development)'}</Button>
                </div>
            </form>
        </Modal>
    );
}
