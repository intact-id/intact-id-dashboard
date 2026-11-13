const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

const ok = (data, message = 'OK') => ({ data, status: 'SUCCESS', message, isTechnical: false, errors: null });

export const DOCUMENTS = [
    { id: 'doc_1', name: 'Certificate of Incorporation', category: 'Registration', status: 'approved', version: 'v1', expires: 'No expiry', updatedBy: 'Grace Achieng', updatedOn: '12 Feb 2026' },
    { id: 'doc_2', name: 'CR12 — directors and shareholders', category: 'Registration', status: 'approved', version: 'v3', expires: '14 Sep 2026', updatedBy: 'Grace Achieng', updatedOn: '03 Mar 2026' },
    { id: 'doc_3', name: 'KRA PIN certificate', category: 'Tax', status: 'approved', version: 'v1', expires: 'No expiry', updatedBy: 'Peter Kariuki', updatedOn: '12 Feb 2026' },
    { id: 'doc_4', name: 'Tax compliance certificate', note: 'Renew within 15 days to stay compliant', category: 'Tax', status: 'expiring', version: 'v2', expires: '04 Sep 2026', updatedBy: 'Peter Kariuki', updatedOn: '04 Sep 2025' },
    { id: 'doc_5', name: 'AML/CFT policy', category: 'Policy', status: 'approved', version: 'v4', expires: '—', updatedBy: 'Amina Wanjiku', updatedOn: '18 Aug 2026' },
    { id: 'doc_6', name: 'Board resolution — account opening', category: 'Governance', status: 'approved', version: 'v1', expires: 'No expiry', updatedBy: 'Grace Achieng', updatedOn: '12 Feb 2026' },
    { id: 'doc_7', name: 'Proof of business address', note: 'Rejected: utility bill is older than three months', category: 'Registration', status: 'rejected', version: 'v2', expires: '—', updatedBy: 'Brian Mwangi', updatedOn: '16 Aug 2026' },
    { id: 'doc_8', name: 'Beneficial ownership declaration', category: 'Governance', status: 'approved', version: 'v1', expires: '—', updatedBy: 'Amina Wanjiku', updatedOn: '18 Aug 2026' },
    { id: 'doc_9', name: "Directors' identity documents", category: 'Identity', status: 'approved', version: 'v1', expires: 'No expiry', updatedBy: 'Grace Achieng', updatedOn: '12 Feb 2026' },
    { id: 'doc_10', name: 'Data protection registration', note: 'Required before production access is renewed', category: 'Compliance', status: 'missing', version: '—', expires: '—', updatedBy: '—', updatedOn: '—' },
];

export async function fetchDocuments() {
    await delay();
    return ok({
        documents: DOCUMENTS,
        readiness: { approved: 7, of: 10, awaiting: 2, actionNeeded: 2 },
    });
}

export const AUDIT_LOGS = [
    { user: 'Amina Wanjiku', initials: 'AW', method: 'POST', path: '/v1/verifications', status: 200, duration: '318 ms', ip: '41.90.64.12', time: '14:32:04' },
    { user: 'System', initials: 'SY', method: 'POST', path: '/v1/webhooks/deliver', status: 200, duration: '118 ms', ip: '10.0.4.21', time: '14:32:04' },
    { user: 'David Otieno', initials: 'DO', method: 'GET', path: '/v1/verifications/8f42', status: 200, duration: '64 ms', ip: '41.90.64.88', time: '14:31:12' },
    { user: 'Sarah Kimani', initials: 'SK', method: 'POST', path: '/v1/documents', status: 200, duration: '842 ms', ip: '197.232.14.9', time: '14:29:41' },
    { user: 'Unknown', initials: '?', method: 'POST', path: '/v1/verifications', status: 401, duration: '12 ms', ip: '102.68.77.3', time: '14:26:58' },
    { user: 'Peter Kariuki', initials: 'PK', method: 'GET', path: '/v1/companies', status: 200, duration: '48 ms', ip: '41.90.64.51', time: '14:24:03' },
    { user: 'Brian Mwangi', initials: 'BM', method: 'DELETE', path: '/v1/api-keys/2c19', status: 204, duration: '92 ms', ip: '41.90.64.77', time: '14:22:47' },
    { user: 'Grace Achieng', initials: 'GA', method: 'PUT', path: '/v1/companies/kc', status: 200, duration: '156 ms', ip: '41.90.64.19', time: '14:20:15' },
    { user: 'System', initials: 'SY', method: 'POST', path: '/v1/webhooks/deliver', status: 500, duration: '2,004 ms', ip: '10.0.4.21', time: '14:22:10' },
    { user: 'Lucy Njeri', initials: 'LN', method: 'GET', path: '/v1/verifications', status: 200, duration: '71 ms', ip: '41.90.64.34', time: '14:18:02' },
];

export async function fetchAuditLogs() {
    await delay();
    return ok({ logs: AUDIT_LOGS, totalActivity: 128430, totalSessions: 342 });
}
