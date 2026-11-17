import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// A company's compliance documents for onboarding with Intact ID. Company users work on their own company
// (companyId is ignored); Intact staff pass the company.
const documentService = {
    // { readiness: { required, approved, awaitingReview, actionNeeded },
    //   documents: [{ type, label, category, expires, status, latest, history }] }
    // status: MISSING | PENDING_REVIEW | APPROVED | EXPIRING | EXPIRED | REJECTED
    async overview(companyId) {
        return unwrap(await api.get('/api/v1/company-documents', { params: companyId ? { companyId } : {} }));
    },

    // PDF, JPG or PNG up to 10 MB; expiresOn (YYYY-MM-DD) for documents that expire. A new upload is the next version.
    async upload(companyId, { type, file, expiresOn }) {
        const form = new FormData();
        form.append('type', type);
        form.append('file', file);
        if (expiresOn) form.append('expiresOn', expiresOn);
        return unwrap(await api.post('/api/v1/company-documents', form, { params: companyId ? { companyId } : {} }));
    },

    async download(companyId, version) {
        const response = await api.get(`/api/v1/company-documents/${version.id}/file`, {
            params: companyId ? { companyId } : {}, responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = version.fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // Intact staff: decision is 'APPROVE' or 'REJECT' (a rejection needs a note)
    async review(companyId, versionId, decision, note) {
        return unwrap(await api.post(`/api/v1/company-documents/${versionId}/review`, { decision, note }, { params: { companyId } }));
    },
};

export default documentService;
