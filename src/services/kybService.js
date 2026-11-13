import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Business verification (KYB): the directors and owners behind a business, and who must be checked.
const kybService = {
    // Emails the person their verification link (if they have an email) and returns { link }.
    async invite(verificationId, partyId) {
        return unwrap(await api.post(`/api/v1/kyb/verifications/${verificationId}/parties/${partyId}/invite`));
    },

    // { platformDefault, company? } — each { ownerCheck, ownershipThreshold, includeDirectors, personWorkflow, companyOverride }
    async settings(companyId) {
        return unwrap(await api.get('/api/v1/kyb/settings', { params: companyId ? { companyId } : {} }));
    },

    // Super admins: the default every company without its own settings uses.
    async updateDefault(settings) {
        return unwrap(await api.put('/api/v1/kyb/settings/default', settings));
    },

    async updateCompany(companyId, settings) {
        return unwrap(await api.put('/api/v1/kyb/settings', settings, { params: { companyId } }));
    },

    // The company goes back to the platform default.
    async clearCompany(companyId) {
        return unwrap(await api.delete('/api/v1/kyb/settings', { params: { companyId } }));
    },
};

export default kybService;
