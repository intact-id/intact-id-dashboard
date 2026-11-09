import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
    ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState, useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, CheckCircle2, GitBranch, Rocket, Save, ShieldCheck, UserCheck, XCircle, Puzzle, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import workflowService, { apiError } from '../services/workflowService';
import { nodeTypes } from './workflow/nodeTypes';
import NodeInspector from './workflow/NodeInspector';
import { NODE_TYPES, fromFlow, knownFields, newNodeId, portLabel, toFlow } from './workflow/graph';
import './WorkflowBuilder.css';

export default function WorkflowBuilder() {
    return (
        <ReactFlowProvider>
            <Builder />
        </ReactFlowProvider>
    );
}

function Builder() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const companyId = params.get('companyId') || undefined;
    const isTemplate = params.get('template') === '1';
    const { user } = useAuth();
    const { toast } = useToast();
    const flow = useReactFlow();
    const wrapper = useRef(null);

    const [workflow, setWorkflow] = useState(null);
    const [versions, setVersions] = useState([]);
    const [available, setAvailable] = useState([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [validation, setValidation] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notes, setNotes] = useState('');
    const [promoteVersion, setPromoteVersion] = useState('');

    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN');
    const readOnly = isTemplate && !isSuperAdmin;
    const catalog = useMemo(() => Object.fromEntries(available.map((s) => [s.code, s])), [available]);

    const load = useCallback(async () => {
        setError('');
        try {
            const res = await workflowService.get(companyId, id, isTemplate);
            const detail = res.data;
            setWorkflow(detail.workflow);
            setVersions(detail.versions || []);
            const services = await workflowService.availableServices(detail.workflow.subjectType);
            setAvailable(services.data || []);
            const converted = toFlow(detail.draft);
            setNodes(converted.nodes);
            setEdges(converted.edges);
            setDirty(false);
            setValidation(null);
        } catch (err) {
            setError(apiError(err, 'Could not load the workflow'));
        }
    }, [companyId, id, isTemplate, setEdges, setNodes]);

    useEffect(() => { load(); }, [load]);

    // Problems from the last check are shown on their nodes
    const problemsByNode = useMemo(() => {
        const map = {};
        (validation?.problems || []).forEach((p) => {
            const key = p.nodeId || '_';
            (map[key] = map[key] || []).push(p.message);
        });
        return map;
    }, [validation]);

    const displayNodes = useMemo(() => nodes.map((n) => ({
        ...n,
        data: { ...n.data, catalog, problems: problemsByNode[n.id] },
    })), [nodes, catalog, problemsByNode]);

    const markDirty = () => { setDirty(true); setValidation(null); };

    const onConnect = useCallback((connection) => {
        if (readOnly) return;
        setEdges((current) => {
            // One connection per output; reconnecting a port replaces it
            const id = `${connection.source}:${connection.sourceHandle}`;
            const source = nodes.find((n) => n.id === connection.source);
            const rest = current.filter((e) => e.id !== id);
            return addEdge({ ...connection, id, label: portLabel(source, connection.sourceHandle) }, rest);
        });
        markDirty();
    }, [nodes, readOnly, setEdges]);

    const addNode = useCallback((kind, position) => {
        if (readOnly) return;
        const spec = paletteSpec(kind, catalog);
        const nodeId = newNodeId(spec.type, nodes);
        const at = position || flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setNodes((current) => [...current, { id: nodeId, type: spec.type, position: at, data: spec.data }]);
        setSelectedId(nodeId);
        markDirty();
    }, [catalog, flow, nodes, readOnly, setNodes]);

    const onDrop = useCallback((event) => {
        event.preventDefault();
        const kind = event.dataTransfer.getData('application/x-workflow-step');
        if (!kind) return;
        addNode(kind, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    }, [addNode, flow]);

    const updateSelected = (patch) => {
        setNodes((current) => current.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)));
        if (patch.branches) {
            // Branch edges follow their branch; removed branches drop their connections
            setEdges((current) => current
                .filter((e) => e.source !== selectedId || !e.sourceHandle?.startsWith('branch:')
                    || Number(e.sourceHandle.slice(7)) < patch.branches.length)
                .map((e) => (e.source === selectedId && e.sourceHandle?.startsWith('branch:')
                    ? { ...e, label: patch.branches[Number(e.sourceHandle.slice(7))]?.label || e.label } : e)));
        }
        markDirty();
    };

    const removeSelected = () => {
        setNodes((current) => current.filter((n) => n.id !== selectedId));
        setEdges((current) => current.filter((e) => e.source !== selectedId && e.target !== selectedId));
        setSelectedId(null);
        markDirty();
    };

    const save = async () => {
        const res = await workflowService.saveDraft(companyId, id, { graph: fromFlow(nodes, edges) }, isTemplate);
        setWorkflow(res.data.workflow);
        setDirty(false);
    };

    const run = async (label, action) => {
        setBusy(label);
        try {
            await action();
        } catch (err) {
            const data = err?.response?.data;
            if (err?.response?.status === 422 && Array.isArray(data?.data)) {
                setValidation({ valid: false, problems: data.data });
                toast.error(data.responseMessage);
            } else {
                toast.error(apiError(err));
            }
        } finally {
            setBusy('');
        }
    };

    const onSave = () => run('save', async () => { await save(); toast.success('Draft saved'); });

    const onValidate = () => run('validate', async () => {
        if (dirty) await save();
        const res = await workflowService.validate(companyId, id, isTemplate);
        setValidation(res.data);
        if (res.data.valid) toast.success('No problems found');
        else toast.warning(`${res.data.problems.length} problem(s) to fix`);
    });

    const onPublish = () => run('publish', async () => {
        if (dirty) await save();
        const res = await workflowService.publish(companyId, id, notes || null, isTemplate);
        toast.success(`Version ${res.data.number} published${res.data.price != null ? ` at ${res.data.price} ${res.data.currency}` : ''}`);
        setNotes('');
        await load();
    });

    const onPromote = () => run('promote', async () => {
        const version = Number(promoteVersion || workflow.latestVersion);
        await workflowService.promote(companyId, id, version);
        toast.success(`Version ${version} is now live`);
        await load();
    });

    const selected = nodes.find((n) => n.id === selectedId);
    const fields = useMemo(() => knownFields(nodes, catalog), [nodes, catalog]);
    const backLink = `/dashboard/workflows${companyId ? `?companyId=${companyId}` : ''}`;

    if (error) {
        return (
            <div className="wf-page">
                <Link to={backLink} className="wf-back"><ArrowLeft size={16} /> Workflows</Link>
                <div className="wf-error-box">{error}</div>
            </div>
        );
    }
    if (!workflow) return <div className="wf-page wf-loading">Loading workflow…</div>;

    return (
        <div className="wf-page wf-builder">
            <header className="wf-topbar">
                <div className="wf-topbar__title">
                    <Link to={backLink} className="wf-back"><ArrowLeft size={16} /></Link>
                    <div>
                        <h1>{workflow.name}</h1>
                        <div className="wf-topbar__meta">
                            <code>{workflow.key}</code>
                            <Badge size="sm">{workflow.subjectType}</Badge>
                            {workflow.template && <Badge size="sm" variant="warning">Template</Badge>}
                            {workflow.latestVersion > 0
                                ? <Badge size="sm" variant="default">Sandbox v{workflow.latestVersion}</Badge>
                                : <Badge size="sm" variant="default">Never published</Badge>}
                            {workflow.liveVersion
                                ? <Badge size="sm" variant="success">Live v{workflow.liveVersion}{workflow.livePrice != null ? ` · ${workflow.livePrice} ${workflow.currency}` : ''}</Badge>
                                : <Badge size="sm" variant="warning">Not live</Badge>}
                            {dirty && <span className="wf-unsaved">Unsaved changes</span>}
                        </div>
                    </div>
                </div>
                {!readOnly && (
                    <div className="wf-topbar__actions">
                        <Button variant="secondary" size="sm" onClick={onSave} disabled={!!busy || !dirty}><Save size={14} /> Save</Button>
                        <Button variant="secondary" size="sm" onClick={onValidate} disabled={!!busy}><ShieldCheck size={14} /> Check</Button>
                        <input className="wf-notes" placeholder="Version notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        <Button size="sm" onClick={onPublish} disabled={!!busy}><Rocket size={14} /> {busy === 'publish' ? 'Publishing…' : 'Publish to sandbox'}</Button>
                        {!workflow.template && versions.length > 0 && (
                            <>
                                <select className="wf-version-select" value={promoteVersion || workflow.latestVersion}
                                        onChange={(e) => setPromoteVersion(e.target.value)}>
                                    {versions.map((v) => <option key={v.number} value={v.number}>v{v.number}{v.live ? ' (live)' : ''}</option>)}
                                </select>
                                <Button variant="secondary" size="sm" onClick={onPromote} disabled={!!busy}>Make live</Button>
                            </>
                        )}
                    </div>
                )}
                {readOnly && <span className="wf-readonly">Read-only template — create a workflow from it to edit</span>}
            </header>

            <div className="wf-body">
                <aside className="wf-palette">
                    <h3>Services</h3>
                    {available.length === 0 && <p className="wf-hint">No services are available for {workflow.subjectType} applicants yet.</p>}
                    {available.map((s) => (
                        <PaletteItem key={s.code} kind={`service:${s.code}`} icon={Puzzle} title={s.name} hint={s.category}
                                     onAdd={addNode} disabled={readOnly} />
                    ))}
                    <h3>Logic</h3>
                    <PaletteItem kind="condition" icon={GitBranch} title="Condition" hint="Branch on results or applicant data" onAdd={addNode} disabled={readOnly} />
                    <PaletteItem kind="review" icon={UserCheck} title="Manual review" hint="A reviewer decides" onAdd={addNode} disabled={readOnly} />
                    <h3>Outcomes</h3>
                    <PaletteItem kind="approved" icon={CheckCircle2} title="Approve" onAdd={addNode} disabled={readOnly} />
                    <PaletteItem kind="rejected" icon={XCircle} title="Reject" onAdd={addNode} disabled={readOnly} />
                </aside>

                <div className="wf-canvas" ref={wrapper} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={onDrop}>
                    <ReactFlow
                        nodes={displayNodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={(changes) => {
                            onNodesChange(changes);
                            if (changes.some((c) => c.type !== 'select' && c.type !== 'dimensions')) markDirty();
                        }}
                        onEdgesChange={(changes) => {
                            onEdgesChange(changes);
                            if (changes.some((c) => c.type === 'remove')) markDirty();
                        }}
                        onConnect={onConnect}
                        onNodeClick={(_, node) => setSelectedId(node.id)}
                        onPaneClick={() => setSelectedId(null)}
                        nodesDraggable={!readOnly}
                        nodesConnectable={!readOnly}
                        elementsSelectable
                        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
                        defaultEdgeOptions={{ type: 'smoothstep' }}
                        colorMode="dark"
                        fitView
                        fitViewOptions={{ padding: 0.15, minZoom: 0.6, maxZoom: 1 }}
                        minZoom={0.3}
                    >
                        <Background gap={20} size={1} />
                        <Controls />
                        <MiniMap pannable zoomable />
                    </ReactFlow>
                </div>

                <aside className="wf-inspector">
                    <NodeInspector node={selected} catalog={catalog} availableServices={available} fields={fields}
                                   problems={selected ? problemsByNode[selected.id] : null} readOnly={readOnly}
                                   onChange={updateSelected} onDelete={removeSelected} />
                    <Summary validation={validation} general={problemsByNode._} catalog={catalog} />
                    <Versions versions={versions} />
                </aside>
            </div>
        </div>
    );
}

function PaletteItem({ kind, icon, title, hint, onAdd, disabled }) {
    const Icon = icon;
    return (
        <button type="button" className="wf-palette__item" draggable={!disabled} disabled={disabled}
                onDragStart={(e) => { e.dataTransfer.setData('application/x-workflow-step', kind); e.dataTransfer.effectAllowed = 'move'; }}
                onClick={() => onAdd(kind)} title="Drag onto the canvas, or click to add">
            <Icon size={15} />
            <span><strong>{title}</strong>{hint && <small>{hint}</small>}</span>
        </button>
    );
}

function paletteSpec(kind, catalog) {
    if (kind.startsWith('service:')) {
        const code = kind.slice('service:'.length);
        return { type: NODE_TYPES.SERVICE, data: { label: catalog[code]?.name || code, service: code, settings: {} } };
    }
    switch (kind) {
        case 'condition':
            return { type: NODE_TYPES.CONDITION, data: { label: 'Condition', branches: [] } };
        case 'review':
            return { type: NODE_TYPES.MANUAL_REVIEW, data: { label: 'Manual review' } };
        case 'approved':
            return { type: NODE_TYPES.END, data: { label: 'Approved', outcome: 'APPROVED' } };
        default:
            return { type: NODE_TYPES.END, data: { label: 'Rejected', outcome: 'REJECTED' } };
    }
}

function Summary({ validation, general, catalog }) {
    if (!validation) {
        return <div className="wf-summary wf-hint">Use <strong>Check</strong> to see problems, what the applicant will be asked for, and the price.</div>;
    }
    const req = validation.requirements;
    return (
        <div className="wf-summary">
            <h3>{validation.valid ? <><CheckCircle2 size={15} className="wf-ok" /> Ready to publish</> : <><AlertTriangle size={15} className="wf-warn" /> {validation.problems.length} problem(s)</>}</h3>
            {general?.length > 0 && <ul className="wf-inspector__problems">{general.map((p, i) => <li key={i}>{p}</li>)}</ul>}
            {req && (
                <>
                    <p><strong>Widget screens:</strong> {req.screens.join(' → ') || '—'}</p>
                    <p><strong>Applicant fields:</strong> {req.requiredFields.join(', ') || '—'}</p>
                    <p><strong>Captures:</strong> {req.captures.join(', ') || '—'}</p>
                </>
            )}
            {validation.price && (
                <div className="wf-price">
                    <div className="wf-price__total">{validation.price.total} {validation.price.currency} <small>per verification</small></div>
                    {validation.price.services.map((s) => (
                        <div key={s.code} className="wf-price__line"><span>{s.name || catalog[s.code]?.name || s.code}</span><span>{s.price}{s.source === 'OVERRIDE' ? ' *' : ''}</span></div>
                    ))}
                    {validation.price.unpriced?.length > 0 && <p className="wf-error">No price configured for: {validation.price.unpriced.join(', ')}</p>}
                </div>
            )}
        </div>
    );
}

function Versions({ versions }) {
    if (!versions.length) return null;
    return (
        <div className="wf-versions">
            <h3>Versions</h3>
            {versions.map((v) => (
                <div key={v.number} className={`wf-version ${v.live ? 'is-live' : ''}`}>
                    <div><strong>v{v.number}</strong>{v.live && <Badge size="sm" variant="success">Live</Badge>}</div>
                    <small>{v.price != null ? `${v.price} ${v.currency} · ` : ''}{v.publishedBy} · {new Date(v.publishedAt).toLocaleString()}</small>
                    {v.notes && <small className="wf-version__notes">{v.notes}</small>}
                </div>
            ))}
        </div>
    );
}
