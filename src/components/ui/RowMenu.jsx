import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

// The "…" actions menu on a table row. items: [{ label, onClick, danger }]
export default function RowMenu({ items }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);
    if (!items.length) return null;
    return (
        <div className="row-menu" ref={ref}>
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)} aria-label="Actions"><MoreHorizontal size={16} /></button>
            {open && (
                <div className="row-menu-list">
                    {items.map((item) => (
                        <button key={item.label} className={item.danger ? 'is-danger' : ''} onClick={() => { setOpen(false); item.onClick(); }}>{item.label}</button>
                    ))}
                </div>
            )}
        </div>
    );
}
