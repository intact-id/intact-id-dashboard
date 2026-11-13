// "2026-02-12T09:00:00" → "12 Feb 2026". Missing or unparseable values show as an em dash.
export function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// "2026-11-12T14:32:04" → "12 Nov 2026, 14:32"
export function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// "Kestrel Capital Limited" → "KC"
export function initialsOf(name) {
    return String(name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('');
}

// "PENDING_APPROVAL" → "Pending approval"
export function humanize(value) {
    if (!value) return '—';
    const words = String(value).toLowerCase().replace(/_/g, ' ');
    return words[0].toUpperCase() + words.slice(1);
}
