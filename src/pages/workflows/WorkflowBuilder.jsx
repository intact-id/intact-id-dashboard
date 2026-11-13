import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
    ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useNodesState, useEdgesState, useReactFlow,
    applyNodeChanges, applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Undo2, Redo2, LayoutGrid, FlaskConical, Rocket, TriangleAlert, CircleCheck } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import workflowService from '../../services/workflowService';
import { errorMessage } from '../../services/api';
import { isSuperAdmin } from '../../utils/roles';
import { BuilderContext } from './BuilderContext';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import Palette from './Palette';
import StepPicker from './StepPicker';
import TestRunPanel from './TestRunPanel';
import { NodePanel, SummaryPanel } from './Inspector';
import {
    SUBJECT_TYPES, continuePort, createNode, flowEdge, fromFlow, portLabel, tidyLayout, toFlow,
} from './graph';
import './workflows.css';

const AUTOSAVE_MS = 800;

/** Edge labels come from the source node (branch names), so refresh them after node edits. */
function relabel(edges, nodes) {
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    return edges.map((e) => ({ ...e, label: portLabel(byId[e.source], e.sourceHandle) }));
}

function Editor({ workflowId, initial, scope, readOnly, onDetail }) {
    const { toast } = useToast();
    const { screenToFlowPosition, fitView, getViewport } = useReactFlow();
    const wrapperRef = useRef(null);

    const [nodes, setNodes] = useNodesState(initial.nodes);
    const [edges, setEdges] = useEdgesState(initial.edges);
    const [name, setName] = useState(initial.name);
    const [catalog, setCatalog] = useState([]);
    const [unavailable, setUnavailable] = useState([]);

    const [validation, setValidation] = useState(null);
    const [saveState, setSaveState] = useState('saved'); // saved | pending | saving | error
    const [dirty, setDirty] = useState(0);
    const history = useRef({ past: [], future: [] });
    const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
    const syncHistory = () => setHistorySize({ past: history.current.past.length, future: history.current.future.length });

    const [picker, setPicker] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testInputs, setTestInputs] = useState({ outcomes: {}, facts: {} });
    const [run, setRun] = useState(null);

    const [publishing, setPublishing] = useState(null); // { notes, step: 'notes' | 'done', version }
    const [promoting, setPromoting] = useState(null);
    const [defaultChange, setDefaultChange] = useState(null); // 'set' | 'clear' while the confirm is open
    const [busy, setBusy] = useState(false);

    // ----- catalog -----
    useEffect(() => {
        workflowService.catalog(initial.subjectType).then(setCatalog).catch(() => setCatalog([]));
        workflowService.fullCatalog()
            .then((all) => setUnavailable(all.filter((s) => s.status === 'IN_DEVELOPMENT'
                && (!s.subjectTypes?.length || s.subjectTypes.includes(initial.subjectType)))))
            .catch(() => setUnavailable([])); // only admins may read the full catalog
    }, [initial.subjectType]);

    const catalogByCode = useMemo(() => Object.fromEntries(catalog.map((s) => [s.code, s])), [catalog]);

    // ----- history -----
    const latest = useRef({ nodes, edges });
    useEffect(() => { latest.current = { nodes, edges }; }, [nodes, edges]);

    const remember = useCallback(() => {
        history.current.past.push(latest.current);
        if (history.current.past.length > 100) history.current.past.shift();
        history.current.future = [];
        syncHistory();
    }, []);

    const commit = useCallback((nextNodes, nextEdges) => {
        remember();
        setNodes(nextNodes);
        setEdges(relabel(nextEdges, nextNodes));
        setDirty((d) => d + 1);
    }, [remember, setNodes, setEdges]);

    const undo = useCallback(() => {
        const previous = history.current.past.pop();
        if (!previous) return;
        history.current.future.push(latest.current);
        setNodes(previous.nodes);
        setEdges(previous.edges);
        setDirty((d) => d + 1);
        syncHistory();
    }, [setNodes, setEdges]);

    const redo = useCallback(() => {
        const next = history.current.future.pop();
        if (!next) return;
        history.current.past.push(latest.current);
        setNodes(next.nodes);
        setEdges(next.edges);
        setDirty((d) => d + 1);
        syncHistory();
    }, [setNodes, setEdges]);

    // ----- autosave + server checks -----
    const save = useCallback(async () => {
        if (readOnly) return;
        setSaveState('saving');
        try {
            const graph = fromFlow(latest.current.nodes, latest.current.edges);
            const detail = await workflowService.saveDraft(workflowId, { name, graph }, scope);
            onDetail(detail);
            setValidation(await workflowService.validate(workflowId, scope));
            setSaveState('saved');
        } catch (error) {
            setSaveState('error');
            toast.error(errorMessage(error, 'Could not save the draft.'));
        }
    }, [workflowId, name, scope, readOnly, onDetail, toast]);

    useEffect(() => {
        if (!dirty) return undefined;
        setSaveState('pending');
        const timer = setTimeout(save, AUTOSAVE_MS);
        return () => clearTimeout(timer);
    }, [dirty, save]);

    useEffect(() => {
        workflowService.validate(workflowId, scope).then(setValidation).catch(() => {});
    }, [workflowId, scope]);

    // ----- keyboard -----
    useEffect(() => {
        const onKey = (e) => {
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
            if (typing || readOnly) return;
            if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo, save, readOnly]);

    // ----- canvas changes -----
    // Deleting a step also removes its connections in a second change event; record one undo step for both.
    const lastNodeRemoval = useRef(0);

    const onNodesChange = useCallback((changes) => {
        const structural = changes.some((c) => c.type === 'remove');
        const dragEnd = changes.some((c) => c.type === 'position' && c.dragging === false);
        if (structural) {
            remember();
            lastNodeRemoval.current = Date.now();
        }
        setNodes((current) => applyNodeChanges(changes, current));
        if (structural || dragEnd) setDirty((d) => d + 1);
    }, [remember, setNodes]);

    const onEdgesChange = useCallback((changes) => {
        const structural = changes.some((c) => c.type === 'remove');
        if (structural && Date.now() - lastNodeRemoval.current > 100) remember();
        setEdges((current) => applyEdgeChanges(changes, current));
        if (structural) setDirty((d) => d + 1);
    }, [remember, setEdges]);

    const onNodeDragStart = useCallback(() => remember(), [remember]);

    // One connection per output port: a new one replaces the old.
    const connect = useCallback((source, port, target, currentNodes, currentEdges) => {
        const sourceNode = currentNodes.find((n) => n.id === source);
        return [
            ...currentEdges.filter((e) => !(e.source === source && e.sourceHandle === port)),
            flowEdge(source, port, target, sourceNode),
        ];
    }, []);

    const onConnect = useCallback((c) => {
        if (c.source === c.target) return;
        commit(nodes, connect(c.source, c.sourceHandle, c.target, nodes, edges));
    }, [nodes, edges, commit, connect]);

    // Dropping a dangling connection on empty canvas offers a step to connect there.
    const onConnectEnd = useCallback((event, state) => {
        if (readOnly || state.isValid || state.fromHandle?.type !== 'source') return;
        const point = 'changedTouches' in event ? event.changedTouches[0] : event;
        setPicker({
            x: point.clientX, y: point.clientY,
            sourceId: state.fromNode.id, port: state.fromHandle.id,
            position: screenToFlowPosition({ x: point.clientX, y: point.clientY }),
        });
    }, [readOnly, screenToFlowPosition]);

    // ----- adding steps -----
    const addStep = useCallback((kind, { position, sourceId, port, insertEdgeId } = {}) => {
        let place = position;
        let nextEdges = edges;
        if (insertEdgeId) {
            const edge = edges.find((e) => e.id === insertEdgeId);
            const from = nodes.find((n) => n.id === edge.source);
            const to = nodes.find((n) => n.id === edge.target);
            place = { x: (from.position.x + to.position.x) / 2, y: (from.position.y + to.position.y) / 2 + 60 };
            const node = createNode(kind, place);
            const out = continuePort(node);
            nextEdges = connect(edge.source, edge.sourceHandle, node.id, [...nodes, node], edges.filter((e) => e.id !== insertEdgeId));
            if (out) nextEdges = connect(node.id, out, edge.target, [...nodes, node], nextEdges);
            commit([...nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }], nextEdges);
            return;
        }
        if (!place && sourceId) {
            const from = nodes.find((n) => n.id === sourceId);
            const siblings = edges.filter((e) => e.source === sourceId).length;
            place = { x: from.position.x + 300, y: from.position.y + siblings * 130 };
        }
        if (!place) {
            const box = wrapperRef.current.getBoundingClientRect();
            const { zoom } = getViewport();
            place = screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
            place = { x: place.x - 110 / zoom, y: place.y - 40 / zoom };
        }
        const node = createNode(kind, place);
        if (sourceId) nextEdges = connect(sourceId, port, node.id, [...nodes, node], edges);
        commit([...nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }], nextEdges);
    }, [nodes, edges, commit, connect, getViewport, screenToFlowPosition]);

    const pick = (kind) => {
        const { sourceId, port, insertEdgeId, position } = picker;
        setPicker(null);
        addStep(kind, { sourceId, port, insertEdgeId, position });
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData('application/x-workflow-step');
        if (kind) addStep(kind, { position: screenToFlowPosition({ x: e.clientX - 110, y: e.clientY - 30 }) });
    }, [addStep, screenToFlowPosition]);

    // ----- editing the selected step -----
    const selected = nodes.find((n) => n.selected);

    const updateNode = (id, patch) => commit(nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)), edges);

    // Branch edits move "branch:N" ports; portMap says where each old port went (null: removed).
    const updateBranches = (id, branches, portMap) => {
        const nextNodes = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, branches } } : n));
        let nextEdges = edges;
        if (portMap) {
            nextEdges = edges.flatMap((e) => {
                if (e.source !== id || !(e.sourceHandle in portMap)) return [e];
                const port = portMap[e.sourceHandle];
                return port ? [{ ...e, sourceHandle: port, id: `${e.source}:${port}` }] : [];
            });
        }
        commit(nextNodes, nextEdges);
    };

    const deleteNode = (id) => commit(nodes.filter((n) => n.id !== id), edges.filter((e) => e.source !== id && e.target !== id));

    const selectNode = (id) => {
        setNodes((current) => current.map((n) => ({ ...n, selected: n.id === id })));
        const node = nodes.find((n) => n.id === id);
        if (node) fitView({ nodes: [node], duration: 400, maxZoom: 1.2 });
    };

    const tidy = () => {
        commit(tidyLayout(nodes, edges), edges);
        setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 50);
    };

    // ----- publish / promote -----
    const publish = async () => {
        setBusy(true);
        try {
            await save();
            const latestBefore = initial.latestVersion || 0;
            const version = await workflowService.publish(workflowId, publishing.notes, scope);
            onDetail(await workflowService.get(workflowId, scope));
            // The server returns the latest version instead of a new one when nothing changed
            setPublishing({ ...publishing, step: 'done', version, unchanged: version.number <= latestBefore });
        } catch (error) {
            toast.error(errorMessage(error, 'Could not publish.'));
        } finally {
            setBusy(false);
        }
    };

    const promote = async (number) => {
        setBusy(true);
        try {
            await workflowService.promote(workflowId, number, scope);
            onDetail(await workflowService.get(workflowId, scope));
            toast.success(`Version ${number} is live`);
            setPromoting(null);
            setPublishing(null);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not make that version live.'));
        } finally {
            setBusy(false);
        }
    };

    const changeDefault = async () => {
        setBusy(true);
        try {
            const detail = defaultChange === 'set'
                ? await workflowService.makeDefault(workflowId, scope)
                : await workflowService.clearDefault(workflowId, scope);
            onDetail(detail);
            toast.success(defaultChange === 'set' ? 'This is now the default workflow' : 'No longer the default workflow');
            setDefaultChange(null);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not change the default workflow.'));
        } finally {
            setBusy(false);
        }
    };

    // ----- render -----
    const problemsByNode = useMemo(() => {
        const map = {};
        (validation?.problems || []).forEach((p) => { if (p.nodeId) (map[p.nodeId] ||= []).push(p.message); });
        return map;
    }, [validation]);

    const context = useMemo(() => ({
        catalogByCode, problemsByNode, run: testing ? run : null, readOnly,
        openPicker: (p) => setPicker(p),
    }), [catalogByCode, problemsByNode, run, testing, readOnly]);

    const problemCount = validation?.problems?.length ?? 0;
    const saveLabel = { saved: 'All changes saved', pending: 'Unsaved changes', saving: 'Saving…', error: 'Save failed — retrying on next change' }[saveState];

    return (
        <BuilderContext.Provider value={context}>
            <div className="wf-shell">
                <header className="wf-toolbar">
                    <div className="wf-toolbar-left">
                        <Link to={`/dashboard/workflows${scope.companyId ? `?companyId=${scope.companyId}` : ''}`} className="wf-icon-btn" aria-label="Back to workflows"><ArrowLeft size={16} /></Link>
                        <div>
                            <input
                                className="wf-name"
                                value={name}
                                disabled={readOnly}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={() => setDirty((d) => d + 1)}
                                aria-label="Workflow name"
                            />
                            <div className="wf-subline">
                                <Badge kind="neutral" dot={false}>{SUBJECT_TYPES[initial.subjectType]?.label || initial.subjectType}</Badge>
                                {scope.template ? <Badge kind="info" dot={false}>Template · copy it to use it</Badge>
                                    : initial.liveVersion ? <Badge kind="ok">Live v{initial.liveVersion}</Badge> : <Badge kind="warn">Not live</Badge>}
                                {!scope.template && initial.defaultWorkflow && <Badge kind="info" dot={false}>Default</Badge>}
                                {!scope.template && !readOnly && (initial.defaultWorkflow || initial.liveVersion) && (
                                    <button className="link-btn" onClick={() => setDefaultChange(initial.defaultWorkflow ? 'clear' : 'set')}>
                                        {initial.defaultWorkflow ? 'Stop using as default' : 'Make default'}
                                    </button>
                                )}
                                <span className={`wf-save wf-save--${saveState}`}>{readOnly ? 'Read-only' : saveLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div className="wf-toolbar-right">
                        {!readOnly && (
                            <>
                                <button className="wf-icon-btn" onClick={undo} disabled={!historySize.past} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={16} /></button>
                                <button className="wf-icon-btn" onClick={redo} disabled={!historySize.future} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Redo2 size={16} /></button>
                                <button className="wf-icon-btn" onClick={tidy} title="Tidy layout" aria-label="Tidy layout"><LayoutGrid size={16} /></button>
                            </>
                        )}
                        <button className={`btn btn--secondary btn--sm${testing ? ' is-on' : ''}`} onClick={() => setTesting((t) => !t)}>
                            <FlaskConical size={15} /> Test run
                        </button>
                        <span className={`wf-check ${problemCount ? 'wf-check--bad' : 'wf-check--ok'}`} title={problemCount ? 'See the panel on the right' : 'No problems found'}>
                            {problemCount ? <><TriangleAlert size={14} /> {problemCount} to fix</> : <><CircleCheck size={14} /> Ready</>}
                        </span>
                        {!readOnly && (
                            <button className="btn btn--primary btn--sm" disabled={problemCount > 0 || saveState === 'saving'} onClick={() => setPublishing({ notes: '', step: 'notes' })}
                                title={problemCount ? 'Fix the problems first' : 'Freeze this draft as a new version'}>
                                <Rocket size={15} /> Publish
                            </button>
                        )}
                    </div>
                </header>

                <div className="wf-body">
                    {!readOnly && <Palette catalog={catalog} unavailable={unavailable} onAdd={(kind) => addStep(kind)} />}

                    <div className="wf-canvas" ref={wrapperRef} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={onDrop}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onConnectEnd={onConnectEnd}
                            onNodeDragStart={onNodeDragStart}
                            onPaneClick={() => setPicker(null)}
                            nodesDraggable={!readOnly}
                            nodesConnectable={!readOnly}
                            elementsSelectable
                            deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
                            snapToGrid
                            snapGrid={[20, 20]}
                            fitView
                            fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
                            minZoom={0.3}
                            maxZoom={1.8}
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background variant="dots" gap={20} size={1.2} color="var(--rule)" />
                            <Controls showInteractive={false} position="bottom-left" />
                            <MiniMap pannable zoomable position="bottom-right" nodeStrokeWidth={3}
                                nodeColor={(n) => ({ START: '#5B6461', SERVICE: '#0B5D45', CONDITION: '#1F4E86', MANUAL_REVIEW: '#E0A030', END: n.data?.outcome === 'REJECTED' ? '#D64545' : '#1DB980' }[n.type])} />
                        </ReactFlow>

                        {testing && (
                            <TestRunPanel
                                nodes={nodes}
                                edges={edges}
                                catalogByCode={catalogByCode}
                                inputs={testInputs}
                                onInputsChange={setTestInputs}
                                onResult={setRun}
                                onClose={() => setTesting(false)}
                            />
                        )}
                    </div>

                    <aside className="wf-inspector">
                        {selected ? (
                            <NodePanel
                                key={selected.id}
                                node={selected}
                                nodes={nodes}
                                edges={edges}
                                catalogByCode={catalogByCode}
                                problems={problemsByNode[selected.id] || []}
                                readOnly={readOnly}
                                onChange={(patch) => updateNode(selected.id, patch)}
                                onBranchesChange={(branches, portMap) => updateBranches(selected.id, branches, portMap)}
                                onDelete={() => deleteNode(selected.id)}
                            />
                        ) : (
                            <SummaryPanel
                                validation={validation}
                                versions={initial.versions}
                                saving={saveState !== 'saved'}
                                readOnly={readOnly || scope.template}
                                onSelectNode={selectNode}
                                onPromote={(number) => setPromoting(number)}
                            />
                        )}
                    </aside>
                </div>

                {picker && (
                    <StepPicker
                        catalog={catalog}
                        x={picker.x}
                        y={picker.y}
                        insertOnly={!!picker.insertEdgeId}
                        onPick={pick}
                        onClose={() => setPicker(null)}
                    />
                )}

                <Modal
                    isOpen={!!defaultChange}
                    onClose={() => setDefaultChange(null)}
                    title={defaultChange === 'set' ? 'Make this the default workflow?' : 'Stop using it as the default?'}
                    caption={defaultChange === 'set'
                        ? `Every session and API call that names no workflow will run this one (live v${initial.liveVersion}) instead of the tier checks. Any other default is replaced.`
                        : 'Sessions and API calls that name no workflow go back to the tier checks.'}
                    footer={(
                        <>
                            <button className="btn btn--secondary" onClick={() => setDefaultChange(null)} disabled={busy}>Cancel</button>
                            <button className="btn btn--primary" onClick={changeDefault} disabled={busy}>{busy ? 'Working…' : defaultChange === 'set' ? 'Make default' : 'Stop using as default'}</button>
                        </>
                    )}
                />

                <Modal
                    isOpen={!!publishing}
                    onClose={() => setPublishing(null)}
                    title={publishing?.step === 'done'
                        ? (publishing.unchanged ? `No changes since v${publishing.version?.number}` : `Version ${publishing.version?.number} published`)
                        : 'Publish a new version'}
                    caption={publishing?.step === 'done'
                        ? (publishing.unchanged
                            ? `The draft is the same as v${publishing.version?.number}, so no new version was created.`
                            : scope.template
                            ? 'Saved as a fixed version merchants can copy. Later edits go into the draft until you publish again.'
                            : `Sandbox keys use it now. Production ${initial.liveVersion
                                ? `keeps using v${initial.liveVersion} until you make this one live.`
                                : 'can’t use this workflow until you make a version live.'} This version can’t be edited; later changes go into the draft.`)
                        : 'Saves the current draft as a fixed version. Sandbox uses it straight away; you choose when production does.'}
                    footer={publishing?.step === 'done' ? (
                        <>
                            <button className="btn btn--secondary" onClick={() => setPublishing(null)}>Later</button>
                            {!scope.template && !publishing.version?.live && <button className="btn btn--primary" disabled={busy} onClick={() => promote(publishing.version.number)}>{busy ? 'Working…' : 'Make it live now'}</button>}
                        </>
                    ) : (
                        <>
                            <button className="btn btn--secondary" onClick={() => setPublishing(null)} disabled={busy}>Cancel</button>
                            <button className="btn btn--primary" onClick={publish} disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button>
                        </>
                    )}
                >
                    {publishing?.step === 'notes' && (
                        <div className="field">
                            <label htmlFor="wf-notes">What changed (optional)</label>
                            <textarea id="wf-notes" className="input" rows={3} value={publishing.notes} onChange={(e) => setPublishing({ ...publishing, notes: e.target.value })} placeholder="e.g. Liveness below 0.7 now goes to review" />
                        </div>
                    )}
                </Modal>

                <Modal
                    isOpen={promoting !== null}
                    onClose={() => setPromoting(null)}
                    title={`Make version ${promoting} live?`}
                    caption="New verifications start using it straight away. Verifications already running finish on the version they started with."
                    footer={(
                        <>
                            <button className="btn btn--secondary" onClick={() => setPromoting(null)} disabled={busy}>Cancel</button>
                            <button className="btn btn--primary" onClick={() => promote(promoting)} disabled={busy}>{busy ? 'Working…' : 'Make live'}</button>
                        </>
                    )}
                />
            </div>
        </BuilderContext.Provider>
    );
}

export default function WorkflowBuilder() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const { user } = useAuth();
    const template = params.get('template') === '1';
    const companyId = params.get('companyId') || undefined;
    const scope = useMemo(() => ({ companyId, template }), [companyId, template]);
    const readOnly = template && !isSuperAdmin(user);

    const [detail, setDetail] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        workflowService.get(id, scope).then(setDetail).catch((e) => setError(errorMessage(e, 'Could not load this workflow.')));
    }, [id, scope]);

    // Keep the first graph for the canvas; later details only refresh versions and status.
    const [initialGraph, setInitialGraph] = useState(null);
    useEffect(() => {
        if (detail && !initialGraph) setInitialGraph(toFlow(detail.draft));
    }, [detail, initialGraph]);

    const onDetail = useCallback((d) => setDetail(d), []);

    if (error) {
        return (
            <div className="page">
                <Link to="/dashboard/workflows" className="back-link"><ArrowLeft size={15} /> Back to workflows</Link>
                <div className="card"><div className="empty-state">{error}</div></div>
            </div>
        );
    }
    if (!detail || !initialGraph) return <div className="page"><div className="loading-state">Loading workflow…</div></div>;

    return (
        <ReactFlowProvider>
            <Editor
                workflowId={id}
                scope={scope}
                readOnly={readOnly}
                onDetail={onDetail}
                initial={{
                    ...initialGraph,
                    name: detail.workflow.name,
                    subjectType: detail.workflow.subjectType || 'INDIVIDUAL',
                    liveVersion: detail.workflow.liveVersion,
                    latestVersion: detail.workflow.latestVersion,
                    defaultWorkflow: detail.workflow.defaultWorkflow,
                    versions: detail.versions || [],
                }}
            />
        </ReactFlowProvider>
    );
}
