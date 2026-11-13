import { useEffect, useRef, useState } from 'react';
import { GitBranch, UserCheck, CircleCheck, CircleX, Search } from 'lucide-react';
import { serviceIcon, CATEGORY_LABELS } from './icons';
import { LOGIC_STEPS } from './graph';

const LOGIC_ICONS = { CONDITION: GitBranch, MANUAL_REVIEW: UserCheck, APPROVE: CircleCheck, REJECT: CircleX };

/** Every step that can be added: catalog services grouped by category, then logic steps. */
export function stepGroups(catalog, query = '') {
    const q = query.trim().toLowerCase();
    const hit = (s) => !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    const groups = [];
    Object.keys(CATEGORY_LABELS).forEach((category) => {
        const items = catalog.filter((s) => s.category === category && hit(s))
            .map((s) => ({ kind: `service:${s.code}`, name: s.name, description: s.description, icon: serviceIcon(s) }));
        if (items.length) groups.push({ label: CATEGORY_LABELS[category], items });
    });
    const logic = LOGIC_STEPS.filter(hit).map((s) => ({ ...s, icon: LOGIC_ICONS[s.kind] }));
    if (logic.length) groups.push({ label: 'Logic', items: logic });
    return groups;
}

/**
 * Floating, searchable list of steps. Arrow keys move, Enter picks, Escape closes.
 * Positioned at (x, y) in viewport coordinates and kept on screen.
 */
export default function StepPicker({ catalog, x, y, onPick, onClose, insertOnly = false }) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const boxRef = useRef(null);

    // Steps without outputs cannot sit in the middle of a connection.
    const groups = stepGroups(catalog, query)
        .map((g) => ({ ...g, items: insertOnly ? g.items.filter((i) => !['MANUAL_REVIEW', 'APPROVE', 'REJECT'].includes(i.kind)) : g.items }))
        .filter((g) => g.items.length);
    const flat = groups.flatMap((g) => g.items);
    const indexOf = new Map(flat.map((item, i) => [item.kind, i]));

    useEffect(() => {
        const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [onClose]);

    const onKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter' && flat[active]) onPick(flat[active].kind);
    };

    const left = Math.min(x, window.innerWidth - 340);
    const top = Math.min(y, window.innerHeight - 440);

    return (
        <div ref={boxRef} className="wf-picker" style={{ left: Math.max(8, left), top: Math.max(8, top) }} onKeyDown={onKeyDown}>
            <div className="wf-picker-search">
                <Search size={14} />
                <input autoFocus placeholder="Search steps" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} />
            </div>
            <div className="wf-picker-list">
                {flat.length === 0 && <div className="wf-picker-empty">No steps match “{query}”.</div>}
                {groups.map((group) => (
                    <div key={group.label}>
                        <div className="wf-picker-group">{group.label}</div>
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const i = indexOf.get(item.kind);
                            const isActive = i === active;
                            return (
                                <button
                                    key={item.kind}
                                    className={`wf-picker-item${isActive ? ' is-active' : ''}`}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => onPick(item.kind)}
                                >
                                    <span className="wf-picker-icon"><Icon size={15} /></span>
                                    <span>
                                        <strong>{item.name}</strong>
                                        <small>{item.description}</small>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
