import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const companyService = {
    // Admins only. Returns a Spring page: { content, totalElements, totalPages, number, size }.
    async list({ page = 0, size = 100, status } = {}) {
        const params = { page, size, ...(status && { status }) };
        return unwrap(await api.get('/api/companies', { params }));
    },

    // The signed-in user's own company (auth-server resolves it from the token).
    async getMine() {
        return unwrap(await api.get('/api/companies/me'));
    },

    // Contact details (email, phone, website, support email) live on the communication record.
    async getCommunication(companyId) {
        return unwrap(await api.get(`/api/companies/${companyId}/communication`));
    },

    async suspend(companyId, reason) {
        return unwrap(await api.post(`/api/companies/${companyId}/suspend`, null, { params: reason ? { reason } : {} }));
    },

    async activate(companyId) {
        return unwrap(await api.post(`/api/companies/${companyId}/activate`));
    },
};

export default companyService;
