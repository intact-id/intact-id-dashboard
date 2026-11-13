import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const verificationService = {
    // Spring page of verifications, newest first. Filters are optional:
    // { status, verificationType: 'individual'|'business', companyId, fromDate, toDate, search, page, size }
    async list(filters = {}) {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''));
        return unwrap(await api.get('/api/v1/kyc/verifications', { params }));
    },

    // Full verification: steps, documents, applicant data. Staff also get `review` and `webhookDeliveries`.
    async get(verificationId) {
        return unwrap(await api.get(`/api/v1/kyc/verify/${verificationId}`));
    },

    // Documents need the auth header, so they are fetched as blobs rather than linked directly.
    async getDocument(verificationId, documentId) {
        const response = await api.get(`/api/v1/kyc/verifications/${verificationId}/documents/${documentId}`, { responseType: 'blob' });
        return response.data;
    },

    // Staff only. assignee: 'all' | 'mine' | 'unassigned'. Longest-waiting first.
    async reviewQueue({ assignee = 'all', page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/admin/verifications/pending-review', { params: { assignee, page, size } }));
    },

    // decision: 'approved' | 'rejected'
    async resolveReview(verificationId, decision, notes) {
        const params = { decision, ...(notes && { notes }) };
        return unwrap(await api.post(`/api/admin/verifications/${verificationId}/review`, null, { params }));
    },

    async assignToMe(verificationId) {
        return unwrap(await api.post(`/api/admin/verifications/${verificationId}/assign`));
    },

    async unassign(verificationId) {
        return unwrap(await api.delete(`/api/admin/verifications/${verificationId}/assign`));
    },

    // Puts an ON_HOLD verification (held while a dependency was down) back in the processing queue.
    async releaseHeld(verificationId) {
        return unwrap(await api.post(`/api/v1/kyc/verifications/${verificationId}/release`));
    },
};

export default verificationService;
