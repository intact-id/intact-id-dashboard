import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { useBuilder } from './BuilderContext';

/** A connection with its port label and a "+" in the middle to insert a step there. */
export function StepEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label }) {
    const { openPicker, readOnly, run } = useBuilder();
    const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14 });
    const onPath = run?.edges.includes(id);
    const dimmed = run && !onPath;

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                style={{ ...style, opacity: dimmed ? 0.25 : 1, strokeWidth: onPath ? 3 : style?.strokeWidth }}
                className={onPath ? 'wf-edge-running' : undefined}
            />
            <EdgeLabelRenderer>
                <div className="wf-edge-label nodrag nopan" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, opacity: dimmed ? 0.35 : 1 }}>
                    {label && <span style={{ color: style?.stroke, fontWeight: 600 }}>{label}</span>}
                    {!readOnly && (
                        <button
                            className="wf-edge-add"
                            title="Insert a step here"
                            onClick={(e) => {
                                e.stopPropagation();
                                const box = e.currentTarget.getBoundingClientRect();
                                openPicker({ insertEdgeId: id, x: box.right + 8, y: box.top - 8 });
                            }}
                        >
                            <Plus size={11} />
                        </button>
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export const edgeTypes = { step: StepEdge };
