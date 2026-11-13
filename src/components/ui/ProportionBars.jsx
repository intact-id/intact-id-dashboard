import './ProportionBars.css';

const DEFAULT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

export default function ProportionBars({ rows }) {
    return (
        <div className="proportion-bars">
            {rows.map((r, i) => (
                <div key={r.label} className="proportion-row">
                    <div className="proportion-row-head">
                        <span className="proportion-swatch" style={{ background: r.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
                        <span className="proportion-label">{r.label}</span>
                        <span className="proportion-value">{r.display ?? r.value}</span>
                    </div>
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{ width: `${r.pct}%`, background: r.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
