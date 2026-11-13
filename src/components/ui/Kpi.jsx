import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus };

// A headline number. change: { text, direction }; good: which direction is good news ("up" or "down").
export default function Kpi({ label, value, icon: Icon, change, good = 'up', caption, children }) {
    const TrendIcon = change ? TREND_ICONS[change.direction] : null;
    const tone = !change || change.direction === 'flat' ? 'flat' : change.direction === good ? 'good' : 'bad';
    return (
        <div className="kpi">
            <div className="kpi-head">
                <span>{label}</span>
                {Icon && <span className="kpi-icon"><Icon size={15} /></span>}
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-foot">
                {change && <span className={`kpi-change kpi-change--${tone}`}><TrendIcon size={13} />{change.text}</span>}
                {caption && <span className="kpi-caption">{caption}</span>}
                {children}
            </div>
        </div>
    );
}
