import { Handle, Position, useEdges } from '@xyflow/react';
import { Play, GitBranch, UserCheck, CircleCheck, CircleX, Plus, TriangleAlert } from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { serviceIcon } from './icons';
import { outputPorts, portColor, portLabel } from './graph';

/** One output row: a coloured dot handle, its label, and a "+" when nothing is connected yet. */
function OutputPort({ node, port, connected }) {
    const { openPicker, readOnly } = useBuilder();
    const label = portLabel(node, port);
    const color = portColor(port);
    return (
        <div className="wf-port">
            {label && <span className="wf-port-label" style={{ color }}>{label}</span>}
            {!connected && !readOnly && (
                <button
                    className="wf-port-add nodrag"
                    title={`Add a step after “${label || 'this'}”`}
                    onClick={(e) => {
                        e.stopPropagation();
                        const box = e.currentTarget.getBoundingClientRect();
                        openPicker({ sourceId: node.id, port, x: box.right + 8, y: box.top - 8 });
                    }}
                >
                    <Plus size={12} />
                </button>
            )}
            <Handle type="source" position={Position.Right} id={port} className="wf-handle" style={{ background: color }} />
        </div>
    );
}

function NodeShell({ node, icon: Icon, tone, title, subtitle, hasInput = true, children }) {
    const { problemsByNode, run } = useBuilder();
    const edges = useEdges();
    const problems = problemsByNode[node.id] || [];
    const onPath = run?.path.includes(node.id);
    const ports = outputPorts(node);
    const connected = new Set(edges.filter((e) => e.source === node.id).map((e) => e.sourceHandle));
    const className = [
        'wf-node', `wf-node--${tone}`,
        node.selected && 'is-selected',
        problems.length && 'has-problems',
        run && (onPath ? 'is-on-path' : 'is-off-path'),
    ].filter(Boolean).join(' ');

    return (
        <div className={className}>
            {hasInput && <Handle type="target" position={Position.Left} className="wf-handle wf-handle--in" />}
            <div className="wf-node-head">
                <span className="wf-node-icon"><Icon size={16} /></span>
                <div className="wf-node-text">
                    <div className="wf-node-title">{title}</div>
                    {subtitle && <div className="wf-node-subtitle">{subtitle}</div>}
                </div>
                {problems.length > 0 && (
                    <span className="wf-node-problem" title={problems.join('\n')}><TriangleAlert size={13} /> {problems.length}</span>
                )}
            </div>
            {children}
            {ports.length > 0 && (
                <div className="wf-ports">
                    {ports.map((port) => <OutputPort key={port} node={node} port={port} connected={connected.has(port)} />)}
                </div>
            )}
        </div>
    );
}

export function StartNode(props) {
    return <NodeShell node={props} icon={Play} tone="start" title="Start" subtitle="Applicant submits" hasInput={false} />;
}

export function ServiceNode(props) {
    const { catalogByCode } = useBuilder();
    const service = catalogByCode[props.data.service];
    return (
        <NodeShell
            node={props}
            icon={serviceIcon(service)}
            tone="service"
            title={props.data.label || service?.name || props.data.service}
            subtitle={service ? service.description : 'Service not in the catalog'}
        />
    );
}

export function ConditionNode(props) {
    const branches = props.data.branches || [];
    return (
        <NodeShell
            node={props}
            icon={GitBranch}
            tone="condition"
            title={props.data.label || 'Condition'}
            subtitle={branches.length ? 'First matching branch wins' : 'Add a branch in the panel'}
        />
    );
}

export function ReviewNode(props) {
    return <NodeShell node={props} icon={UserCheck} tone="review" title={props.data.label || 'Manual review'} subtitle="A person decides" />;
}

export function EndNode(props) {
    const approved = props.data.outcome !== 'REJECTED';
    return (
        <NodeShell
            node={props}
            icon={approved ? CircleCheck : CircleX}
            tone={approved ? 'approve' : 'reject'}
            title={props.data.label || (approved ? 'Approve' : 'Reject')}
            subtitle={approved ? 'Verification approved' : 'Verification rejected'}
        />
    );
}

export const nodeTypes = {
    START: StartNode,
    SERVICE: ServiceNode,
    CONDITION: ConditionNode,
    MANUAL_REVIEW: ReviewNode,
    END: EndNode,
};
