import { useState } from 'react';
import { niceCeil } from '../../utils/insights';
import './charts.css';

// One or more lines over the same x values. Missing values (null) break the line.
// series: [{ key, label, color }]; data: [{ [labelKey]: x, [series.key]: y }]
export default function LineChart({ data, series, labelKey, formatLabel = (v) => v, formatValue = (v) => v, height = 200 }) {
    const [hover, setHover] = useState(null);
    const values = data.flatMap((d) => series.map((s) => d[s.key])).filter((v) => typeof v === 'number');
    const max = niceCeil(Math.max(...values, 0));
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => max * f);
    // Points sit in the middle of equal-width columns, so hover columns line up with them
    const x = (i) => ((i + 0.5) / data.length) * 100;
    const y = (v) => 100 - (v / max) * 100;
    const labelEvery = Math.max(1, Math.ceil(data.length / 7));

    const path = (key) => data.reduce((d, point, i) => {
        const v = point[key];
        if (typeof v !== 'number') return d;
        const previous = i > 0 && typeof data[i - 1][key] === 'number';
        return `${d}${previous ? 'L' : 'M'}${x(i)},${y(v)} `;
    }, '');

    return (
        <div className="chart" style={{ height }}>
            <div className="chart-axis">{ticks.map((t, i) => <span key={i}>{formatValue(t)}</span>)}</div>
            <div className="chart-plot">
                <div className="chart-grid">{ticks.map((_, i) => <span key={i} />)}</div>
                <div className="chart-lines">
                    <div className="chart-area">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        {series.map((s) => (
                            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2"
                                  vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                        ))}
                    </svg>
                    {hover !== null && series.map((s) => typeof data[hover][s.key] === 'number' && (
                        <span key={s.key} className="chart-dot" style={{ left: `${x(hover)}%`, top: `${y(data[hover][s.key])}%`, borderColor: s.color }} />
                    ))}
                    </div>
                    <div className="chart-hit">
                        {data.map((d, i) => (
                            <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                                {hover === i && (
                                    <div className={`chart-tip${i > data.length / 2 ? ' chart-tip--left' : ''}`}>
                                        <div className="chart-tip-title">{formatLabel(d[labelKey])}</div>
                                        {series.map((s) => (
                                            <div key={s.key} className="chart-tip-row">
                                                <i style={{ background: s.color }} />{s.label}
                                                <strong>{typeof d[s.key] === 'number' ? formatValue(d[s.key]) : '—'}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <span className="chart-label">{i % labelEvery === 0 ? formatLabel(d[labelKey]) : ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
