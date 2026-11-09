// Converts between the backend workflow graph and React Flow nodes/edges.

export const NODE_TYPES = {
    START: 'START',
    SERVICE: 'SERVICE',
    CONDITION: 'CONDITION',
    MANUAL_REVIEW: 'MANUAL_REVIEW',
    END: 'END',
};

export const OUTCOMES = ['APPROVED', 'REJECTED'];
export const SUBJECT_TYPES = ['INDIVIDUAL', 'BUSINESS'];

// Must match ConditionOperator in the backend
export const OPERATORS = [
    { value: 'is', label: 'is', needs: 'value' },
    { value: 'is_not', label: 'is not', needs: 'value' },
    { value: 'in', label: 'is one of', needs: 'list' },
    { value: 'not_in', label: 'is not one of', needs: 'list' },
    { value: 'lt', label: '<', needs: 'number' },
    { value: 'lte', label: '≤', needs: 'number' },
    { value: 'gt', label: '>', needs: 'number' },
    { value: 'gte', label: '≥', needs: 'number' },
    { value: 'exists', label: 'exists', needs: 'none' },
];

// Facts known when the run starts; services add their outputs
export const START_FIELDS = [
    { key: 'applicant.country', type: 'string' },
    { key: 'applicant.nationality', type: 'string' },
];

export function toFlow(graph) {
    const nodes = (graph?.nodes || []).map((n, i) => ({
        id: n.id,
        type: n.type,
        position: n.position && typeof n.position.x === 'number' ? n.position : { x: 80 + i * 220, y: 200 },
        data: {
            label: n.label || '',
            service: n.service || null,
            settings: n.settings || {},
            branches: n.branches || [],
            outcome: n.outcome || null,
        },
        deletable: n.type !== NODE_TYPES.START,
    }));
    const edges = (graph?.edges || []).map((e) => ({
        id: `${e.from}:${e.port}`,
        source: e.from,
        sourceHandle: e.port,
        target: e.to,
        label: portLabel(nodes.find((n) => n.id === e.from), e.port),
    }));
    return { nodes, edges };
}

export function fromFlow(nodes, edges) {
    return {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            label: n.data.label || null,
            service: n.type === NODE_TYPES.SERVICE ? n.data.service : null,
            settings: n.type === NODE_TYPES.SERVICE && n.data.settings && Object.keys(n.data.settings).length ? n.data.settings : null,
            branches: n.type === NODE_TYPES.CONDITION ? n.data.branches : null,
            outcome: n.type === NODE_TYPES.END ? n.data.outcome : null,
            position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        })),
        edges: edges.map((e) => ({ from: e.source, port: e.sourceHandle, to: e.target })),
    };
}

export function portLabel(node, port) {
    if (!node || !port) return '';
    if (port.startsWith('branch:')) {
        const index = Number(port.slice('branch:'.length));
        return node.data?.branches?.[index]?.label || `Branch ${index + 1}`;
    }
    return { next: '', passed: 'passed', failed: 'failed', review: 'review', else: 'else' }[port] ?? port;
}

export function newNodeId(type, nodes) {
    const base = type.toLowerCase().replace('_', '-');
    let i = 1;
    while (nodes.some((n) => n.id === `${base}-${i}`)) i += 1;
    return `${base}-${i}`;
}

/** Fields conditions can test: start facts plus the outputs of services in the workflow. */
export function knownFields(nodes, catalog) {
    const outputs = new Map(START_FIELDS.map((f) => [f.key, f]));
    nodes.filter((n) => n.type === NODE_TYPES.SERVICE).forEach((n) => {
        (catalog[n.data.service]?.outputs || []).forEach((o) => outputs.set(o.key, { key: o.key, type: o.type }));
    });
    return [...outputs.values()];
}
