// Formatting shared by the overview, analytics, billing and turnaround views.

// 850 → "850 ms", 12400 → "12.4 s", 200000 → "3m 20s", 8100000 → "2h 15m", 100800000 → "1d 4h"
export function formatDuration(ms) {
    if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export const formatSeconds = (seconds) => (seconds === null || seconds === undefined ? '—' : formatDuration(seconds * 1000));

export const formatCount = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString());

export const formatPercent = (n, digits = 1) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(digits).replace(/\.0+$/, '')}%`);

// "KES", 1234.5 → "KES 1,234.50"
export function formatMoney(amount, currency) {
    if (amount === null || amount === undefined) return '—';
    const value = Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency ? `${currency} ${value}` : value;
}

// Change from the previous period, as shown under a stat: { text: "+12.4%", direction: "up" }
export function changeBetween(current, previous) {
    if (!previous) return current ? { text: 'New', direction: 'up' } : { text: 'No change', direction: 'flat' };
    const pct = ((current - previous) / previous) * 100;
    if (Math.abs(pct) < 0.05) return { text: 'No change', direction: 'flat' };
    return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`, direction: pct > 0 ? 'up' : 'down' };
}

// Percentage-point change: 94.2 vs 92.4 → "+1.8 pts"
export function pointsBetween(current, previous) {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return { text: 'No change', direction: 'flat' };
    return { text: `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} pts`, direction: diff > 0 ? 'up' : 'down' };
}

// 1240 → 1500; keeps chart axes on round numbers.
export function niceCeil(value) {
    if (value <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value);
    return step * magnitude;
}

// "2026-11-13" → "13 Nov"
export function shortDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export const PERIODS = [[7, '7 days'], [30, '30 days'], [90, '90 days']];

// Country codes the applicants use most → names; anything else shows its code.
const COUNTRY_NAMES = {
    KE: 'Kenya', NG: 'Nigeria', GH: 'Ghana', UG: 'Uganda', TZ: 'Tanzania', RW: 'Rwanda', ZA: 'South Africa',
    ET: 'Ethiopia', ZM: 'Zambia', CD: 'DR Congo', SS: 'South Sudan', SO: 'Somalia', US: 'United States', GB: 'United Kingdom',
    KEN: 'Kenya', NGA: 'Nigeria', GHA: 'Ghana', UGA: 'Uganda', TZA: 'Tanzania', RWA: 'Rwanda', ZAF: 'South Africa',
    UNKNOWN: 'Not given',
};
export const countryName = (code) => COUNTRY_NAMES[code] || code;

// Daily verification volume, stacked by where each verification is now.
export const VOLUME_SERIES = [
    { key: 'approved', label: 'Approved', color: 'var(--brand-green)' },
    { key: 'inReview', label: 'In review', color: 'var(--amber-ink)' },
    { key: 'rejected', label: 'Rejected', color: 'var(--danger-dot)' },
    { key: 'other', label: 'Processing or failed', color: 'var(--rule)' },
];

export const withOther = (daily) => daily.map((d) => ({ ...d, other: Math.max(0, d.total - d.approved - d.rejected - d.inReview) }));
