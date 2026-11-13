import { useState } from 'react';
import { Search } from 'lucide-react';
import { stepGroups } from './StepPicker';

/** Left rail: drag a step onto the canvas, or click it to drop it in view. */
export default function Palette({ catalog, unavailable, onAdd }) {
    const [query, setQuery] = useState('');
    const groups = stepGroups(catalog, query);

    return (
        <aside className="wf-palette">
            <div className="wf-palette-search">
                <Search size={14} />
                <input placeholder="Search steps" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="wf-palette-list">
                {groups.map((group) => (
                    <div key={group.label} className="wf-palette-group">
                        <div className="wf-palette-group-label">{group.label}</div>
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.kind}
                                    className="wf-palette-item"
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('application/x-workflow-step', item.kind);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onClick={() => onAdd(item.kind)}
                                    title={item.description}
                                >
                                    <span className="wf-palette-icon"><Icon size={15} /></span>
                                    <span className="wf-palette-name">{item.name}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
                {unavailable.length > 0 && !query && (
                    <div className="wf-palette-group">
                        <div className="wf-palette-group-label">Coming soon</div>
                        {unavailable.map((s) => (
                            <div key={s.code} className="wf-palette-item is-disabled" title={`${s.name} is ${s.status.toLowerCase().replace('_', ' ')}`}>
                                <span className="wf-palette-name">{s.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="wf-palette-hint">Drag onto the canvas, or use + on any step.</div>
        </aside>
    );
}
