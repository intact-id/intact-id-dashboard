// Turns auth-server's raw verification values into the labels and badge colours the console shows.

export const STATUS = {
    SUBMITTED: { label: 'Submitted', badge: 'neutral' },
    PENDING: { label: 'Pending', badge: 'neutral' },
    PROCESSING: { label: 'Processing', badge: 'info' },
    ON_HOLD: { label: 'On hold', badge: 'warn' },
    PENDING_APPROVAL: { label: 'Needs review', badge: 'warn' },
    COMPLETED: { label: 'Completed', badge: 'ok' },
    APPROVED: { label: 'Approved', badge: 'ok' },
    REJECTED: { label: 'Rejected', badge: 'bad' },
    FAILED: { label: 'Failed', badge: 'bad' },
};

// Statuses offered in the list filter, in the order a case moves through them.
export const STATUS_FILTERS = ['SUBMITTED', 'PROCESSING', 'ON_HOLD', 'PENDING_APPROVAL', 'COMPLETED', 'REJECTED', 'FAILED'];

export const DECISION = {
    approved: { label: 'Approved', badge: 'ok' },
    rejected: { label: 'Rejected', badge: 'bad' },
    manual_review: { label: 'In review', badge: 'warn' },
};

// verificationType values → what the console calls them.
export const TYPE_LABEL = { individual: 'KYC', business: 'KYB' };

const STEP_LABEL = {
    ocr_extraction: 'Document check',
    face_match: 'Face match',
    liveness_detection: 'Liveness',
    sanctions_screening: 'Sanctions and PEP screening',
    risk_assessment: 'Risk assessment',
    system_check: 'System check',
};

// Step statuses are stored as COMPLETED (passed), PENDING_APPROVAL (needs review) or FAILED.
export const STEP_STATUS = {
    COMPLETED: { label: 'Passed', badge: 'ok' },
    PENDING_APPROVAL: { label: 'Review', badge: 'warn' },
    FAILED: { label: 'Failed', badge: 'bad' },
};

export const statusOf = (value) => STATUS[value] || { label: value || '—', badge: 'neutral' };
export const decisionOf = (value) => DECISION[value] || { label: value || '—', badge: 'neutral' };
export const stepLabel = (name) => STEP_LABEL[name] || name;

export function applicantName(verification) {
    const data = verification?.customerData || {};
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
    return name || 'Unnamed applicant';
}

// "12345678" → "1••••••8". Shown on screen; the full value stays in the API response.
export function maskId(value) {
    if (!value) return '—';
    const s = String(value);
    return s.length <= 2 ? '•'.repeat(s.length) : `${s[0]}${'•'.repeat(s.length - 2)}${s[s.length - 1]}`;
}

// riskScore is 0–1 on the API; the console shows 0–100. The bands are display-only.
export function riskOf(score) {
    if (score === null || score === undefined) return null;
    const value = Math.round(score * 100);
    if (value >= 70) return { value, level: 'High', badge: 'bad' };
    if (value >= 40) return { value, level: 'Medium', badge: 'warn' };
    return { value, level: 'Low', badge: 'ok' };
}

// "3h 12m", "48m", "2d 4h" since the given time.
export function waitingSince(value) {
    if (!value) return '—';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
