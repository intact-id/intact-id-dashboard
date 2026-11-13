import { LEVELS } from './model';

/** The Low / Medium / High split of the 0–100 score, drawn to scale. */
export default function BandBar({ thresholds }) {
    const bands = LEVELS
        .map((l) => ({ ...l, band: thresholds?.find((t) => t.riskLevel === l.level) }))
        .filter((l) => l.band);
    return (
        <div className="rm-bands">
            {bands.map(({ level, label, color, band }) => (
                <div key={level} className="rm-band" style={{ flexGrow: Math.max(1, band.maxScore - band.minScore) }}>
                    <div className="rm-band-bar" style={{ background: color }} />
                    <span>{label} ({Number(band.minScore)} – {Number(band.maxScore)})</span>
                </div>
            ))}
        </div>
    );
}
