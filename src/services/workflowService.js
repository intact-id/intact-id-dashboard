import api from './api';

// Super admins act for a company with ?companyId=; merchants act on their own company.
const scoped = (companyId, extra = {}) => ({ params: { ...(companyId ? { companyId } : {}), ...extra } });

const workflowService = {
    async availableServices(subjectType) {
        const response = await api.get('/api/v1/workflow/catalog/available', { params: subjectType ? { subjectType } : {} });
        return response.data;
    },

    async list(companyId) {
        const response = await api.get('/api/v1/workflows', scoped(companyId));
        return response.data;
    },

    async templates() {
        const response = await api.get('/api/v1/workflows/templates');
        return response.data;
    },

    async create(companyId, payload) {
        const response = await api.post('/api/v1/workflows', payload, scoped(companyId));
        return response.data;
    },

    async get(companyId, id, template = false) {
        const response = await api.get(`/api/v1/workflows/${id}`, scoped(companyId, template ? { template } : {}));
        return response.data;
    },

    async saveDraft(companyId, id, payload, template = false) {
        const response = await api.put(`/api/v1/workflows/${id}/draft`, payload, scoped(companyId, template ? { template } : {}));
        return response.data;
    },

    async validate(companyId, id, template = false) {
        const response = await api.post(`/api/v1/workflows/${id}/validate`, null, scoped(companyId, template ? { template } : {}));
        return response.data;
    },

    async publish(companyId, id, notes, template = false) {
        const response = await api.post(`/api/v1/workflows/${id}/publish`, { notes }, scoped(companyId, template ? { template } : {}));
        return response.data;
    },

    async promote(companyId, id, version) {
        const response = await api.post(`/api/v1/workflows/${id}/promote`, { version }, scoped(companyId));
        return response.data;
    },

    async archive(companyId, id) {
        const response = await api.delete(`/api/v1/workflows/${id}`, scoped(companyId));
        return response.data;
    },

    // Service catalog administration (Intact admins)
    async catalog(status) {
        const response = await api.get('/api/v1/workflow/catalog', { params: status ? { status } : {} });
        return response.data;
    },

    async createService(payload) {
        const response = await api.post('/api/v1/workflow/catalog', payload);
        return response.data;
    },

    async updateService(code, payload) {
        const response = await api.patch(`/api/v1/workflow/catalog/${code}`, payload);
        return response.data;
    },

    async changeServiceStatus(code, status) {
        const response = await api.post(`/api/v1/workflow/catalog/${code}/status`, { status });
        return response.data;
    },

    async deleteService(code) {
        const response = await api.delete(`/api/v1/workflow/catalog/${code}`);
        return response.data;
    },
};

/** The API's message, including 422 problem lists, for display. */
export function apiError(err, fallback = 'Something went wrong') {
    return err?.response?.data?.responseMessage || err?.response?.data?.message || err?.message || fallback;
}

export default workflowService;
