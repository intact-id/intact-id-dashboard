import api from './api';

function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Data retention and erasure. Days count from when a verification finished; null keeps the data.
const privacyService = {
    // { platformDefault: { documentsDays, personalDataDays }, company: { ..., companyOverride } }
    async retention(companyId) {
        return unwrap(await api.get('/api/v1/privacy/retention', { params: companyId ? { companyId } : {} }));
    },
    async updateDefault(rule) {
        return unwrap(await api.put('/api/v1/privacy/retention/default', rule));
    },
    async updateCompany(companyId, rule) {
        return unwrap(await api.put('/api/v1/privacy/retention', rule, { params: { companyId } }));
    },
    async clearCompany(companyId) {
        return unwrap(await api.delete('/api/v1/privacy/retention', { params: { companyId } }));
    },
    // Erases a finished verification's documents and personal details. Cannot be undone.
    async erase(verificationId, reason) {
        return unwrap(await api.post(`/api/v1/privacy/verifications/${verificationId}/erase`, { reason }));
    },
    // [{ verificationId, scope, trigger, reason, performedBy, documentsDeleted, createdAt }]
    async erasures(companyId) {
        return unwrap(await api.get('/api/v1/privacy/erasures', { params: companyId ? { companyId } : {} }));
    },
};

export default privacyService;
