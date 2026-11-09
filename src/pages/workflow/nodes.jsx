import { Handle, Position } from '@xyflow/react';
import { Play, GitBranch, UserCheck, CheckCircle2, XCircle, Puzzle } from 'lucide-react';

function Shell({ kind, icon, title, subtitle, selected, problems, children, target = true }) {
    const Icon = icon;
    const hasProblems = problems && problems.length > 0;
    return (
        <div className={`wf-node wf-node--${kind} ${selected ? 'is-selected' : ''} ${hasProblems ? 'has-problems' : ''}`}
             title={hasProblems ? problems.join('\n') : undefined}>
            {target && <Handle type="target" position={Position.Left} className="wf-handle wf-handle--in" />}
            <div className="wf-node__head">
                <Icon size={15} />
                <span className="wf-node__title">{title}</span>
            </div>
            {subtitle && <div className="wf-node__sub">{subtitle}</div>}
            {children}
            {hasProblems && <div className="wf-node__problem">{problems.length} problem{problems.length > 1 ? 's' : ''}</div>}
        </div>
    );
}

/** Output ports listed down the right edge, each with its own handle. */
function Ports({ ports }) {
    return (
        <div className="wf-ports">
            {ports.map((p) => (
                <div key={p.id} className={`wf-port wf-port--${p.tone || 'default'}`}>
                    <span>{p.label}</span>
                    <Handle type="source" position={Position.Right} id={p.id} className={`wf-handle wf-handle--${p.tone || 'default'}`} />
                </div>
            ))}
        </div>
    );
}

export function StartNode({ data, selected }) {
    return (
        <Shell kind="start" icon={Play} title="Start" subtitle="Applicant begins" selected={selected} problems={data.problems} target={false}>
            <Ports ports={[{ id: 'next', label: 'next' }]} />
        </Shell>
    );
}

export function ServiceNode({ data, selected }) {
    const service = data.catalog?.[data.service];
    return (
        <Shell kind="service" icon={Puzzle} title={data.label || service?.name || data.service}
               subtitle={service ? `${service.code}` : `${data.service} (unknown)`} selected={selected} problems={data.problems}>
            <Ports ports={[
                { id: 'passed', label: 'passed', tone: 'good' },
                { id: 'failed', label: 'failed', tone: 'bad' },
                { id: 'review', label: 'review', tone: 'warn' },
            ]} />
        </Shell>
    );
}

export function ConditionNode({ data, selected }) {
    const branches = data.branches || [];
    return (
        <Shell kind="condition" icon={GitBranch} title={data.label || 'Condition'}
               subtitle={`${branches.length} branch${branches.length === 1 ? '' : 'es'} + else`} selected={selected} problems={data.problems}>
            <Ports ports={[
                ...branches.map((b, i) => ({ id: `branch:${i}`, label: b.label || `Branch ${i + 1}`, tone: 'good' })),
                { id: 'else', label: 'else' },
            ]} />
        </Shell>
    );
}

export function ReviewNode({ data, selected }) {
    return <Shell kind="review" icon={UserCheck} title={data.label || 'Manual review'} subtitle="A reviewer decides" selected={selected} problems={data.problems} />;
}

export function EndNode({ data, selected }) {
    const approved = data.outcome === 'APPROVED';
    return (
        <Shell kind={approved ? 'approved' : data.outcome === 'REJECTED' ? 'rejected' : 'end'} icon={approved ? CheckCircle2 : XCircle}
               title={data.label || (data.outcome ? data.outcome.toLowerCase() : 'End')}
               subtitle={data.outcome ? `Outcome: ${data.outcome}` : 'Choose an outcome'} selected={selected} problems={data.problems} />
    );
}
