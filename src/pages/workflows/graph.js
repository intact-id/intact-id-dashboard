// Workflow graph helpers for the builder. The backend's WorkflowGraph is { nodes, edges }:
//   node: { id, type, label, service, settings, branches, outcome, position }
//   edge: { from, port, to }   ports: next | passed | failed | review | else | branch:N
// React Flow wants { id, type, position, data } nodes and { id, source, sourceHandle, target } edges.

export const SUBJECT_TYPES = {
    INDIVIDUAL: { label: 'Person (KYC)' },
    BUSINESS: { label: 'Business (KYB)' },
};

export const PORT_STYLE = {
    next: { label: '', color: 'var(--ink-3)' },
    passed: { label: 'Passed', color: 'var(--success)' },
    failed: { label: 'Failed', color: 'var(--danger-dot)' },
    review: { label: 'Review', color: 'var(--amber-ink)' },
    else: { label: 'Else', color: 'var(--ink-3)' },
};

export const OPERATORS = [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'in', label: 'is one of', list: true },
    { value: 'not_in', label: 'is not one of', list: true },
    { value: 'lt', label: 'is less than', numeric: true },
    { value: 'lte', label: 'is at most', numeric: true },
    { value: 'gt', label: 'is more than', numeric: true },
    { value: 'gte', label: 'is at least', numeric: true },
    { value: 'exists', label: 'is present', none: true },
];

// Facts known before any service runs (WorkflowOutcomes.startFacts on the server).
export const START_FACTS = [
    { key: 'applicant.country', type: 'string', from: 'Applicant' },
    { key: 'applicant.nationality', type: 'string', from: 'Applicant' },
];

export const newId = (prefix = 'n') => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

export function portLabel(node, port) {
    if (!port) return '';
    if (port.startsWith('branch:')) {
        const i = Number(port.slice(7));
        return node?.data?.branches?.[i]?.label || `Branch ${i + 1}`;
    }
    return PORT_STYLE[port]?.label ?? port;
}

export function portColor(port) {
    if (port?.startsWith('branch:')) return 'var(--info)';
    return PORT_STYLE[port]?.color || 'var(--ink-3)';
}

export function toFlow(graph) {
    const nodes = (graph?.nodes || []).map((n, i) => ({
        id: n.id,
        type: n.type,
        position: typeof n.position?.x === 'number' ? { x: n.position.x, y: n.position.y } : { x: 60 + i * 260, y: 160 },
        data: {
            label: n.label || '',
            service: n.service || null,
            settings: n.settings || {},
            branches: n.branches || [],
            outcome: n.outcome || null,
        },
        deletable: n.type !== 'START',
    }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const edges = (graph?.edges || []).map((e) => flowEdge(e.from, e.port, e.to, byId[e.from]));
    return { nodes, edges };
}

export function flowEdge(source, port, target, sourceNode) {
    return {
        id: `${source}:${port}`,
        source,
        sourceHandle: port,
        target,
        label: portLabel(sourceNode, port),
        type: 'step',
        style: { stroke: portColor(port), strokeWidth: 1.8 },
    };
}

export function fromFlow(nodes, edges) {
    return {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            label: n.data.label || null,
            service: n.type === 'SERVICE' ? n.data.service : null,
            settings: n.type === 'SERVICE' && Object.keys(n.data.settings || {}).length ? n.data.settings : null,
            branches: n.type === 'CONDITION' ? n.data.branches : null,
            outcome: n.type === 'END' ? n.data.outcome : null,
            position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        })),
        edges: edges.map((e) => ({ from: e.source, port: e.sourceHandle, to: e.target })),
    };
}

/** A graph to start from: Start → Approve. */
export function starterGraph() {
    return {
        nodes: [
            { id: 'start', type: 'START', label: 'Start', position: { x: 40, y: 200 } },
            { id: 'approve', type: 'END', label: 'Approve', outcome: 'APPROVED', position: { x: 420, y: 200 } },
        ],
        edges: [{ from: 'start', port: 'next', to: 'approve' }],
    };
}

/** Output ports a node offers, in display order. */
export function outputPorts(node) {
    switch (node.type) {
        case 'START': return ['next'];
        case 'SERVICE': return ['passed', 'failed', 'review'];
        case 'CONDITION': return [...(node.data.branches || []).map((_, i) => `branch:${i}`), 'else'];
        default: return [];
    }
}

// ---------------------------------------------------------------------------
// Layout: columns by longest distance from Start, rows by order within a column.
// ---------------------------------------------------------------------------

export function tidyLayout(nodes, edges) {
    const start = nodes.find((n) => n.type === 'START');
    if (!start) return nodes;
    const depth = { [start.id]: 0 };
    const outgoing = {};
    edges.forEach((e) => { (outgoing[e.source] ||= []).push(e); });
    // Longest-path depth; the graph is acyclic when valid, and the bound stops runaway loops when not.
    for (let pass = 0; pass < nodes.length; pass++) {
        let changed = false;
        Object.keys(depth).forEach((id) => (outgoing[id] || []).forEach((e) => {
            if ((depth[e.target] ?? -1) < depth[id] + 1) {
                depth[e.target] = depth[id] + 1;
                changed = true;
            }
        }));
        if (!changed) break;
    }
    const columns = {};
    nodes.forEach((n) => {
        const d = depth[n.id] ?? Math.max(0, ...Object.values(depth)) + 1; // unconnected nodes go last
        (columns[d] ||= []).push(n);
    });
    const positions = {};
    Object.entries(columns).forEach(([d, column]) => {
        column.sort((a, b) => a.position.y - b.position.y);
        const top = 200 - ((column.length - 1) * 150) / 2;
        column.forEach((n, i) => { positions[n.id] = { x: 40 + Number(d) * 300, y: top + i * 150 }; });
    });
    return nodes.map((n) => ({ ...n, position: positions[n.id] || n.position }));
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/** Facts a condition at nodeId can read: start facts plus outputs of services that run before it. */
export function factsBefore(nodeId, nodes, edges, catalogByCode) {
    const incoming = {};
    edges.forEach((e) => { (incoming[e.target] ||= []).push(e.source); });
    const seen = new Set();
    const queue = [...(incoming[nodeId] || [])];
    const facts = [...START_FACTS];
    while (queue.length) {
        const id = queue.shift();
        if (seen.has(id)) continue;
        seen.add(id);
        const node = nodes.find((n) => n.id === id);
        const service = node?.type === 'SERVICE' ? catalogByCode[node.data.service] : null;
        (service?.outputs || []).forEach((o) => {
            if (!facts.some((f) => f.key === o.key)) facts.push({ ...o, from: service.name });
        });
        queue.push(...(incoming[id] || []));
    }
    return facts;
}

/** "liveness.score is less than 0.7" */
export function describeClause(clause) {
    const op = OPERATORS.find((o) => o.value === clause.op);
    if (!clause.field) return 'Incomplete rule';
    if (op?.none) return `${clause.field} ${op.label}`;
    const value = Array.isArray(clause.value) ? clause.value.join(', ') : String(clause.value ?? '');
    return `${clause.field} ${op?.label || clause.op} ${value}`;
}

export function clausesOf(when) {
    if (!when) return [];
    if (when.all) return when.all;
    if (when.any) return when.any;
    return [when];
}

export const matchModeOf = (when) => (when?.any ? 'any' : 'all');

// ---------------------------------------------------------------------------
// Test run: the server's WorkflowExecutor, in the browser, for "what happens if…".
// ---------------------------------------------------------------------------

const sameValue = (a, b) => {
    if (a === null || a === undefined || b === null || b === undefined) return a === b;
    if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
    if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b);
    return String(a) === String(b);
};

function matches(when, facts) {
    if (when.all) return when.all.every((c) => matches(c, facts));
    if (when.any) return when.any.some((c) => matches(c, facts));
    const actual = facts[when.field];
    const expected = when.value;
    switch (when.op) {
        case 'exists': return actual !== null && actual !== undefined && actual !== '';
        case 'is': return sameValue(actual, expected);
        case 'is_not': return !sameValue(actual, expected);
        case 'in': return Array.isArray(expected) && expected.some((v) => sameValue(actual, v));
        case 'not_in': return Array.isArray(expected) && !expected.some((v) => sameValue(actual, v));
        case 'lt': return actual != null && Number(actual) < Number(expected);
        case 'lte': return actual != null && Number(actual) <= Number(expected);
        case 'gt': return actual != null && Number(actual) > Number(expected);
        case 'gte': return actual != null && Number(actual) >= Number(expected);
        default: return false;
    }
}

/**
 * Walks the graph like the server does. outcomes: { SERVICE_CODE: 'passed' | 'failed' | 'review' },
 * facts: { 'liveness.score': 0.62, ... }. Returns { decision, reason, path: [nodeId], edges: [edgeId] }.
 */
export function simulate(nodes, edges, outcomes, facts) {
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const portsOf = {};
    edges.forEach((e) => { (portsOf[e.source] ||= {})[e.sourceHandle] = e.target; });
    const path = [];
    const usedEdges = [];
    const follow = (node, port) => {
        const next = portsOf[node.id]?.[port];
        if (next) usedEdges.push(`${node.id}:${port}`);
        return next ? byId[next] : null;
    };
    const stop = (reason) => ({ decision: 'MANUAL_REVIEW', reason, path, edges: usedEdges });

    let node = nodes.find((n) => n.type === 'START');
    if (!node) return stop('The workflow has no Start node');
    let failure = null;
    for (let guard = 0; guard <= nodes.length; guard++) {
        path.push(node.id);
        if (node.type === 'END') {
            return { decision: node.data.outcome || 'APPROVED', reason: node.data.outcome === 'REJECTED' ? failure || node.data.label : null, path, edges: usedEdges };
        }
        if (node.type === 'MANUAL_REVIEW') return { decision: 'MANUAL_REVIEW', reason: failure || node.data.label || 'Sent to a reviewer', path, edges: usedEdges };
        if (node.type === 'START') {
            const next = follow(node, 'next');
            if (!next) return stop('Start is not connected');
            node = next;
            continue;
        }
        if (node.type === 'SERVICE') {
            const status = outcomes[node.data.service] || 'passed';
            const next = follow(node, status);
            if (!next) {
                if (status === 'failed') return { decision: 'REJECTED', reason: `${node.data.label || node.data.service} failed`, path, edges: usedEdges };
                if (status === 'review') return { decision: 'MANUAL_REVIEW', reason: `${node.data.label || node.data.service} needs review`, path, edges: usedEdges };
                return stop(`${node.data.label || node.data.service} passed but nothing follows it`);
            }
            if (status !== 'passed') failure = `${node.data.label || node.data.service} ${status}`;
            node = next;
            continue;
        }
        if (node.type === 'CONDITION') {
            const branches = node.data.branches || [];
            const index = branches.findIndex((b) => b.when && matches(b.when, facts));
            const port = index === -1 ? 'else' : `branch:${index}`;
            const next = follow(node, port);
            if (!next) return stop(`${node.data.label || 'Condition'} has no ${portLabel(node, port)} path`);
            node = next;
            continue;
        }
        return stop('Unknown step');
    }
    return stop('The workflow loops');
}

// ---------------------------------------------------------------------------
// Adding steps
// ---------------------------------------------------------------------------

/** Logic steps offered next to catalog services. */
export const LOGIC_STEPS = [
    { kind: 'CONDITION', name: 'Condition', description: 'Branch on a result, e.g. liveness score below 0.7' },
    { kind: 'MANUAL_REVIEW', name: 'Manual review', description: 'Send the case to a person to decide' },
    { kind: 'APPROVE', name: 'Approve', description: 'End: the verification is approved' },
    { kind: 'REJECT', name: 'Reject', description: 'End: the verification is rejected' },
];

/** A new canvas node for a step kind ('service:CODE', 'CONDITION', 'MANUAL_REVIEW', 'APPROVE', 'REJECT'). */
export function createNode(kind, position) {
    const base = { id: newId(), position, deletable: true };
    if (kind.startsWith('service:')) {
        const code = kind.slice(8);
        return { ...base, type: 'SERVICE', data: { label: '', service: code, settings: {}, branches: [], outcome: null } };
    }
    if (kind === 'CONDITION') {
        return { ...base, type: 'CONDITION', data: { label: 'Condition', service: null, settings: {}, outcome: null, branches: [{ label: 'Branch 1', when: { all: [{ field: '', op: 'is', value: '' }] } }] } };
    }
    if (kind === 'MANUAL_REVIEW') {
        return { ...base, type: 'MANUAL_REVIEW', data: { label: 'Manual review', service: null, settings: {}, branches: [], outcome: null } };
    }
    const approved = kind === 'APPROVE';
    return { ...base, type: 'END', data: { label: approved ? 'Approve' : 'Reject', service: null, settings: {}, branches: [], outcome: approved ? 'APPROVED' : 'REJECTED' } };
}

/** The port a node continues from when it is inserted into an existing connection. */
export function continuePort(node) {
    if (node.type === 'SERVICE') return 'passed';
    if (node.type === 'CONDITION') return 'else';
    return null;
}
