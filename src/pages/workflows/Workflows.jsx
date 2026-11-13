import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Archive, ArchiveRestore, Workflow as WorkflowIcon } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import workflowService from '../../services/workflowService';
import companyService from '../../services/companyService';
import { errorMessage } from '../../services/api';
import { isSuperAdmin } from '../../utils/roles';
import { formatDateTime } from '../../utils/format';
import { SUBJECT_TYPES, starterGraph } from './graph';
import './workflows.css';

const slug = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

function WorkflowCard({ workflow, href, onArchive }) {
    return (
        <Link to={href} className="wf-card">
            <div className="wf-card-head">
                <div>
                    <h3>{workflow.name}</h3>
                    <div className="wf-card-key">{workflow.key}</div>
                </div>
                {onArchive && (
                    <button className="wf-icon-btn" title="Archive" aria-label={`Archive ${workflow.name}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive(workflow); }}>
                        <Archive size={15} />
                    </button>
                )}
            </div>
            {workflow.description && <p className="wf-panel-text">{workflow.description}</p>}
            <div className="wf-card-meta">
                <Badge kind="neutral" dot={false}>{SUBJECT_TYPES[workflow.subjectType]?.label || 'Any applicant'}</Badge>
                {workflow.template ? <Badge kind="info" dot={false}>Template</Badge>
                    : workflow.liveVersion ? <Badge kind="ok">Live v{workflow.liveVersion}</Badge> : <Badge kind="warn">Not published</Badge>}
                {workflow.defaultWorkflow && <Badge kind="info" dot={false}>Default</Badge>}
                {workflow.latestVersion > (workflow.liveVersion || 0) && !workflow.template && (
                    <Badge kind="neutral" dot={false}>v{workflow.latestVersion} not in use</Badge>
                )}
            </div>
            <div className="wf-card-foot">
                <span>Edited {formatDateTime(workflow.draftUpdatedAt)}</span>
                {workflow.livePrice != null && <strong>{workflow.currency} {Number(workflow.livePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>}
            </div>
        </Link>
    );
}

export default function Workflows() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const superAdmin = isSuperAdmin(user);

    const [companies, setCompanies] = useState([]);
    const companyId = superAdmin ? params.get('companyId') || null : undefined;
    const [tab, setTab] = useState('workflows');
    const [workflows, setWorkflows] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [error, setError] = useState('');

    const [creating, setCreating] = useState(null); // { name, key, keyEdited, subjectType, templateId, template }
    const [archiving, setArchiving] = useState(null);
    const [archived, setArchived] = useState(null); // archived workflows (and templates, for super admins)
    const [restoring, setRestoring] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!superAdmin) return;
        companyService.list({ size: 100 })
            .then((page) => {
                setCompanies(page.content);
                if (!params.get('companyId') && page.content[0]) setParams({ companyId: page.content[0].id }, { replace: true });
            })
            .catch((e) => setError(errorMessage(e, 'Could not load companies.')));
    }, [superAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(async () => {
        setError('');
        try {
            const [own, shared] = await Promise.all([
                superAdmin && !companyId ? Promise.resolve([]) : workflowService.list(companyId),
                workflowService.templates(),
            ]);
            setWorkflows(own);
            setTemplates(shared);
        } catch (e) {
            setWorkflows([]);
            setError(errorMessage(e, 'Could not load workflows.'));
        }
    }, [companyId, superAdmin]);

    useEffect(() => {
        if (superAdmin && !companyId) return;
        setWorkflows(null);
        load();
    }, [load, superAdmin, companyId]);

    const loadArchived = useCallback(async () => {
        setArchived(null);
        try {
            const [own, shared] = await Promise.all([
                superAdmin && !companyId ? Promise.resolve([]) : workflowService.archived({ companyId }),
                superAdmin ? workflowService.archived({ template: true }) : Promise.resolve([]),
            ]);
            setArchived([...own, ...shared]);
        } catch (e) {
            setArchived({ error: errorMessage(e, 'Could not load archived workflows.') });
        }
    }, [companyId, superAdmin]);

    useEffect(() => { if (tab === 'archived') loadArchived(); }, [tab, loadArchived]);

    const restore = async () => {
        setBusy(true);
        try {
            await workflowService.restore(restoring.id, { companyId, template: restoring.template });
            toast.success(`${restoring.name} restored`);
            setRestoring(null);
            await Promise.all([load(), loadArchived()]);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not restore the workflow.'));
        } finally {
            setBusy(false);
        }
    };

    const scopeQuery = (template) => {
        const q = new URLSearchParams();
        if (template) q.set('template', '1');
        else if (companyId) q.set('companyId', companyId);
        const s = q.toString();
        return s ? `?${s}` : '';
    };

    const openCreate = (overrides = {}) => setCreating({
        name: '', key: '', keyEdited: false, subjectType: 'INDIVIDUAL', templateId: null, template: tab === 'templates' && superAdmin, ...overrides,
    });

    const create = async () => {
        setBusy(true);
        try {
            const request = {
                key: creating.key,
                name: creating.name.trim(),
                subjectType: creating.subjectType,
                ...(creating.templateId ? { fromTemplateId: creating.templateId } : { graph: starterGraph() }),
                ...(creating.template ? { template: true } : {}),
            };
            const detail = await workflowService.create(request, creating.template ? undefined : companyId);
            navigate(`/dashboard/workflows/${detail.workflow.id}${scopeQuery(creating.template)}`);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not create the workflow.'));
        } finally {
            setBusy(false);
        }
    };

    const archive = async () => {
        setBusy(true);
        try {
            await workflowService.archive(archiving.id, { companyId, template: archiving.template });
            toast.success(`${archiving.name} archived`);
            setArchiving(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not archive the workflow.'));
        } finally {
            setBusy(false);
        }
    };

    const list = tab === 'templates' ? templates : workflows || [];
    const keyValid = /^[a-z0-9][a-z0-9-]{1,99}$/.test(creating?.key || '');
    const templateChoices = templates.filter((t) => !creating || !t.subjectType || t.subjectType === creating.subjectType);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Workflows</h1>
                    <p>The steps each applicant goes through, and what decides the outcome.</p>
                </div>
                <div className="head-actions">
                    {superAdmin && companies.length > 0 && tab === 'workflows' && (
                        <select className="input filter-select" value={companyId || ''} onChange={(e) => setParams({ companyId: e.target.value })} aria-label="Company">
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                        </select>
                    )}
                    {(tab === 'workflows' || superAdmin) && (
                        <button className="btn btn--primary btn--sm" onClick={() => openCreate()}>
                            <Plus size={15} /> {tab === 'templates' ? 'New template' : 'New workflow'}
                        </button>
                    )}
                </div>
            </div>

            <div className="page-tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'workflows'} className={tab === 'workflows' ? 'is-active' : ''} onClick={() => setTab('workflows')}>
                    Workflows {workflows && `(${workflows.length})`}
                </button>
                <button role="tab" aria-selected={tab === 'templates'} className={tab === 'templates' ? 'is-active' : ''} onClick={() => setTab('templates')}>
                    Templates ({templates.length})
                </button>
                <button role="tab" aria-selected={tab === 'archived'} className={tab === 'archived' ? 'is-active' : ''} onClick={() => setTab('archived')}>
                    Archived {Array.isArray(archived) && `(${archived.length})`}
                </button>
            </div>

            {tab === 'archived' ? (
                !archived ? <div className="loading-state">Loading archived workflows…</div>
                    : archived.error ? <div className="card"><div className="empty-state">{archived.error}</div></div>
                    : archived.length === 0 ? <div className="card"><div className="empty-state">Nothing archived.</div></div>
                        : (
                            <div className="wf-grid">
                                {archived.map((w) => (
                                    <div key={w.id} className="wf-card wf-card--archived">
                                        <div className="wf-card-head">
                                            <div>
                                                <h3>{w.name}</h3>
                                                <div className="wf-card-key">{w.key}</div>
                                            </div>
                                        </div>
                                        <div className="wf-card-meta">
                                            <Badge kind="neutral" dot={false}>{SUBJECT_TYPES[w.subjectType]?.label || 'Any applicant'}</Badge>
                                            {w.template ? <Badge kind="info" dot={false}>Template</Badge>
                                                : w.liveVersion ? <Badge kind="neutral" dot={false}>Was live v{w.liveVersion}</Badge> : null}
                                        </div>
                                        <div className="wf-card-foot">
                                            <span>Edited {formatDateTime(w.draftUpdatedAt)}</span>
                                            <button className="btn btn--secondary btn--sm" onClick={() => setRestoring(w)}><ArchiveRestore size={14} /> Restore</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
            ) : error ? <div className="card"><div className="empty-state">{error}</div></div>
                : tab === 'workflows' && !workflows ? <div className="loading-state">Loading workflows…</div>
                    : (
                        <div className="wf-grid">
                            {list.map((w) => (
                                tab === 'templates' && !superAdmin ? (
                                    <div key={w.id} className="wf-card">
                                        <h3>{w.name}</h3>
                                        {w.description && <p className="wf-panel-text">{w.description}</p>}
                                        <div className="wf-card-meta"><Badge kind="neutral" dot={false}>{SUBJECT_TYPES[w.subjectType]?.label || 'Any applicant'}</Badge></div>
                                        <div className="wf-card-foot">
                                            <Link to={`/dashboard/workflows/${w.id}?template=1`}>Preview</Link>
                                            <button className="btn btn--secondary btn--sm" onClick={() => { setTab('workflows'); openCreate({ templateId: w.id, subjectType: w.subjectType || 'INDIVIDUAL', name: w.name, key: slug(w.name), template: false }); }}>Use template</button>
                                        </div>
                                    </div>
                                ) : (
                                    <WorkflowCard key={w.id} workflow={w} href={`/dashboard/workflows/${w.id}${scopeQuery(tab === 'templates')}`} onArchive={setArchiving} />
                                )
                            ))}
                            {(tab === 'workflows' || superAdmin) && (
                                <button className="wf-card wf-card--new" onClick={() => openCreate()}>
                                    <WorkflowIcon size={22} />
                                    {tab === 'templates' ? 'New template' : 'New workflow'}
                                </button>
                            )}
                        </div>
                    )}

            <Modal
                isOpen={!!creating}
                onClose={() => setCreating(null)}
                size="lg"
                title={creating?.template ? 'New template' : 'New workflow'}
                caption="You can change the steps any time; nothing goes live until you publish."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setCreating(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={create} disabled={busy || !creating?.name.trim() || !keyValid}>{busy ? 'Creating…' : 'Create and open'}</button>
                    </>
                )}
            >
                {creating && (
                    <>
                        <div className="field">
                            <label htmlFor="wf-new-name">Name</label>
                            <input id="wf-new-name" className="input" autoFocus placeholder="e.g. Full onboarding" value={creating.name}
                                onChange={(e) => setCreating({ ...creating, name: e.target.value, key: creating.keyEdited ? creating.key : slug(e.target.value) })} />
                        </div>
                        <div className="field" style={{ marginTop: 12 }}>
                            <label htmlFor="wf-new-key">Key</label>
                            <input id="wf-new-key" className="input mono" value={creating.key}
                                onChange={(e) => setCreating({ ...creating, key: e.target.value, keyEdited: true })} />
                            <span className={creating.key && !keyValid ? 'field-error' : 'wf-hint'}>
                                Used by the API to pick this workflow. Lowercase letters, digits and dashes.
                            </span>
                        </div>
                        <div className="field" style={{ marginTop: 12 }}>
                            <label>Who it verifies</label>
                            <div className="view-toggle" style={{ alignSelf: 'flex-start' }}>
                                {Object.entries(SUBJECT_TYPES).map(([value, { label }]) => (
                                    <button key={value} className={creating.subjectType === value ? 'is-active' : ''}
                                        onClick={() => setCreating({ ...creating, subjectType: value, templateId: null })}>{label}</button>
                                ))}
                            </div>
                        </div>
                        {!creating.template && (
                            <div className="field" style={{ marginTop: 12 }}>
                                <label>Start from</label>
                                <div className="wf-start-options">
                                    <button className={`wf-start-option${!creating.templateId ? ' is-active' : ''}`} onClick={() => setCreating({ ...creating, templateId: null })}>
                                        <strong>Blank</strong><small>Start → Approve; add your steps</small>
                                    </button>
                                    {templateChoices.map((t) => (
                                        <button key={t.id} className={`wf-start-option${creating.templateId === t.id ? ' is-active' : ''}`} onClick={() => setCreating({ ...creating, templateId: t.id })}>
                                            <strong>{t.name}</strong><small>{t.description || 'Intact template'}</small>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            <Modal
                isOpen={!!archiving}
                onClose={() => setArchiving(null)}
                title={`Archive ${archiving?.name}?`}
                caption="New sessions that name its key stop working. Verifications already started finish on their version. You can restore it from Archived."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setArchiving(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--danger-outline" onClick={archive} disabled={busy}>{busy ? 'Archiving…' : 'Archive'}</button>
                    </>
                )}
            />

            <Modal
                isOpen={!!restoring}
                onClose={() => setRestoring(null)}
                title={`Restore ${restoring?.name}?`}
                caption={restoring?.liveVersion
                    ? `It comes back with its versions, and v${restoring.liveVersion} is live again straight away: sessions that name “${restoring.key}” work again.`
                    : 'It comes back with its draft and versions.'}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setRestoring(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={restore} disabled={busy}>{busy ? 'Restoring…' : 'Restore'}</button>
                    </>
                )}
            />
        </div>
    );
}
