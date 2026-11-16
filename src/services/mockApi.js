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

