import { useState } from 'react';
import { niceCeil } from '../../utils/insights';
import './charts.css';

// Bars stacked from the series in order (first at the bottom). series: [{ key, label, color }]
export default function StackedBarChart({ data, series, labelKey, formatLabel = (v) => v, height = 220, formatValue = (v) => v.toLocaleString() }) {
    const [hover, setHover] = useState(null);
    const totals = data.map((d) => series.reduce((sum, s) => sum + (d[s.key] || 0), 0));
    const max = niceCeil(Math.max(...totals, 0));
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(max * f));
    // Label every bar when there are few, otherwise about seven evenly spaced labels
    const labelEvery = Math.max(1, Math.ceil(data.length / 7));

    return (
        <div className="chart" style={{ height }}>
            <div className="chart-axis">{ticks.map((t, i) => <span key={i}>{formatValue(t)}</span>)}</div>
            <div className="chart-plot">
                <div className="chart-grid">{ticks.map((_, i) => <span key={i} />)}</div>
                <div className="chart-bars">
                    {data.map((d, i) => (
                        <div key={i} className={`chart-col${hover === i ? ' is-hover' : ''}`}
                             onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                            <div className="chart-track">
                                <div className="chart-stack" style={{ height: `${(totals[i] / max) * 100}%` }}>
                                    {series.map((s) => d[s.key] > 0 && (
                                        <div key={s.key} style={{ flexGrow: d[s.key], background: s.color }} />
                                    ))}
                                </div>
                            </div>
                            {hover === i && (
                                <div className={`chart-tip${i > data.length / 2 ? ' chart-tip--left' : ''}`}>
                                    <div className="chart-tip-title">{formatLabel(d[labelKey])}</div>
                                    {series.map((s) => (
                                        <div key={s.key} className="chart-tip-row">
                                            <i style={{ background: s.color }} />{s.label}<strong>{formatValue(d[s.key] || 0)}</strong>
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
    );
}

export function ChartLegend({ series }) {
    return (
        <div className="chart-legend">
            {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
        </div>
    );
}
