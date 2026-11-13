import {
    ShieldCheck, CircleCheck, Key, Activity, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

const ICON_MAP = {
    'shield-check': ShieldCheck,
    'circle-check': CircleCheck,
    key: Key,
    activity: Activity,
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    minus: Minus,
};

export function resolveIcon(name) {
    return ICON_MAP[name] || Activity;
}
