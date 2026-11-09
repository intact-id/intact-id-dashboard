import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GitBranch, Plus, Copy, Archive, LayoutTemplate } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import companyService from '../services/companyService';
import workflowService, { apiError } from '../services/workflowService';
import { SUBJECT_TYPES } from './workflow/graph';
import './Workflows.css';

export default function Workflows() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN');
    const companyId = isSuperAdmin ? params.get('companyId') || '' : '';

    const [companies, setCompanies] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(null);

    const needsCompany = isSuperAdmin && !companyId;

    useEffect(() => {
        if (!isSuperAdmin) return;
        companyService.getAllCompanies({ status: 'ACTIVE' }, { page: 0, size: 100 })
            .then((res) => setCompanies(res.data?.content || []))
            .catch(() => setCompanies([]));
    }, [isSuperAdmin]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const tpl = await workflowService.templates();
            setTemplates(tpl.data || []);
            if (needsCompany) {
                setWorkflows([]);
            } else {
                const res = await workflowService.list(companyId || undefined);
                setWorkflows(res.data || []);
            }
        } catch (err) {
            setError(apiError(err, 'Could not load workflows'));
        } finally {
            setLoading(false);
        }
    }, [companyId, needsCompany]);

    useEffect(() => { load(); }, [load]);

    const open = (wf, template = false) => {
        const q = new URLSearchParams();
        if (companyId) q.set('companyId', companyId);
        if (template) q.set('template', '1');
        navigate(`/dashboard/workflows/${wf.id}${q.toString() ? `?${q}` : ''}`);
    };

    const archive = async (wf) => {
        if (!window.confirm(`Archive "${wf.name}"? Sessions already using it are not affected.`)) return;
        try {
            await workflowService.archive(companyId || undefined, wf.id);
            toast.success('Workflow archived');
            load();
        } catch (err) {
            toast.error(apiError(err));
        }
    };

    return (
        <div className="workflows-page">
            <div className="workflows-header">
                <div>
                    <h1><GitBranch size={22} /> Workflows</h1>
                    <p>Choose the checks each applicant goes through. Publish to test in sandbox, then make a version live.</p>
                </div>
                {!needsCompany && (
                    <Button onClick={() => setCreating({ template: null })}><Plus size={16} /> New workflow</Button>
                )}
            </div>

            {isSuperAdmin && (
                <Card className="workflows-company">
                    <label>
                        <span>Company</span>
                        <select value={companyId} onChange={(e) => setParams(e.target.value ? { companyId: e.target.value } : {})}>
                            <option value="">Choose a company…</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
                        </select>
                    </label>
                    {isSuperAdmin && (
                        <Button variant="secondary" size="sm" onClick={() => setCreating({ template: null, asTemplate: true })}>
                            <LayoutTemplate size={14} /> New template
                        </Button>
                    )}
                </Card>
            )}

            {error && <div className="workflows-error">{error}</div>}

            {!needsCompany && (
                <Card>
                    <h2>Your workflows</h2>
                    {loading ? <p className="muted">Loading…</p> : workflows.length === 0 ? (
                        <p className="muted">No workflows yet. Start from a template below or an empty canvas.</p>
                    ) : (
                        <table className="workflows-table">
                            <thead><tr><th>Name</th><th>Key</th><th>Applicants</th><th>Sandbox</th><th>Live</th><th>Price</th><th /></tr></thead>
                            <tbody>
                                {workflows.map((wf) => (
                                    <tr key={wf.id}>
                                        <td><button type="button" className="link" onClick={() => open(wf)}>{wf.name}</button></td>
                                        <td><code>{wf.key}</code></td>
                                        <td>{wf.subjectType}</td>
                                        <td>{wf.latestVersion ? `v${wf.latestVersion}` : <span className="muted">draft</span>}</td>
                                        <td>{wf.liveVersion ? <Badge size="sm" variant="success">v{wf.liveVersion}</Badge> : <Badge size="sm" variant="warning">not live</Badge>}</td>
                                        <td>{wf.livePrice != null ? `${wf.livePrice} ${wf.currency}` : '—'}</td>
                                        <td className="actions">
                                            <Button variant="secondary" size="sm" onClick={() => open(wf)}>Open</Button>
                                            <button type="button" className="icon" title="Archive" onClick={() => archive(wf)}><Archive size={15} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}

            <Card>
                <h2>Templates</h2>
                <div className="workflows-templates">
                    {templates.map((t) => (
                        <div key={t.id} className="workflows-template">
                            <div>
                                <strong>{t.name}</strong>
                                <p className="muted">{t.description}</p>
                            </div>
                            <div className="actions">
                                {!needsCompany && <Button size="sm" onClick={() => setCreating({ template: t })}><Copy size={14} /> Use</Button>}
                                <Button variant="secondary" size="sm" onClick={() => open(t, true)}>{isSuperAdmin ? 'Edit' : 'Preview'}</Button>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && <p className="muted">No templates yet.</p>}
                </div>
            </Card>

            {creating && (
                <CreateModal
                    template={creating.template}
                    asTemplate={!!creating.asTemplate}
                    onClose={() => setCreating(null)}
                    onCreate={async (payload) => {
                        try {
                            const res = await workflowService.create(creating.asTemplate ? undefined : companyId || undefined, payload);
                            toast.success('Workflow created');
                            setCreating(null);
                            open(res.data.workflow, !!creating.asTemplate);
                        } catch (err) {
                            toast.error(apiError(err));
                        }
                    }}
                />
            )}
        </div>
    );
}

function CreateModal({ template, asTemplate, onClose, onCreate }) {
    const [name, setName] = useState(template ? template.name : '');
    const [key, setKey] = useState(template ? template.key : '');
    const [subjectType, setSubjectType] = useState(template?.subjectType || 'INDIVIDUAL');
    const [saving, setSaving] = useState(false);
    const keyFromName = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onCreate({ key, name, subjectType, fromTemplateId: template?.id, template: asTemplate || undefined });
        setSaving(false);
    };

    return (
        <Modal isOpen onClose={onClose} title={asTemplate ? 'New template' : template ? `New workflow from "${template.name}"` : 'New workflow'}>
            <form className="workflows-form" onSubmit={submit}>
                <label>
                    <span>Name</span>
                    <input required value={name} onChange={(e) => { setName(e.target.value); if (!template) setKey(keyFromName(e.target.value)); }} />
                </label>
                <label>
                    <span>Key <small>(integrations send this when starting a session)</small></span>
                    <input required pattern="[a-z0-9][a-z0-9-]{1,99}" value={key} onChange={(e) => setKey(e.target.value)} />
                </label>
                <label>
                    <span>Applicants</span>
                    <select value={subjectType} disabled={!!template} onChange={(e) => setSubjectType(e.target.value)}>
                        {SUBJECT_TYPES.map((s) => <option key={s} value={s}>{s === 'INDIVIDUAL' ? 'People (KYC)' : 'Businesses (KYB)'}</option>)}
                    </select>
                </label>
                <div className="workflows-form__actions">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
                </div>
            </form>
        </Modal>
    );
}
