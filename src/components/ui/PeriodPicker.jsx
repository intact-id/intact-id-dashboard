import { PERIODS } from '../../utils/insights';

export default function PeriodPicker({ value, onChange }) {
    return (
        <div className="view-toggle" role="group" aria-label="Period">
            {PERIODS.map(([days, label]) => (
                <button key={days} type="button" className={value === days ? 'is-active' : ''} onClick={() => onChange(days)}>{label}</button>
            ))}
        </div>
    );
}
