import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { resolveIcon } from '../../utils/iconMap';

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function StatCard({ label, value, icon, trend, trendDirection = 'up', note }) {
    const Icon = typeof icon === 'string' ? resolveIcon(icon) : icon;
    const TrendIcon = TREND_ICONS[trendDirection];
    const trendColor = trendDirection === 'up' ? 'var(--accent)' : trendDirection === 'down' ? 'var(--amber)' : 'var(--ink-3)';
    return (
        <div className="stat-card">
            <div className="stat-card-head">
                <span>{label}</span>
                {Icon && <Icon size={16} color="var(--ink-3)" />}
            </div>
            <div className="stat-value">{value}</div>
            {trend && (
                <div className="stat-trend">
                    {TrendIcon && <TrendIcon size={14} color={trendColor} />}
                    <span style={{ color: trendColor, fontWeight: 600 }}>{trend}</span>
                    {note && <span className="stat-trend-note">{note}</span>}
                </div>
            )}
        </div>
    );
}
