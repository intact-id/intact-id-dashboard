import api from './api';

const buildParams = (filters = {}, pagination = {}) => {
    const params = new URLSearchParams();

    Object.entries({
        ...filters,
        page: pagination.page ?? 0,
        size: pagination.size ?? 20
    }).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, value);
        }
    });

    return params.toString();
};

const auditService = {
    async getSessions(filters = {}, pagination = { page: 0, size: 20 }) {
        const params = buildParams(filters, pagination);
        const response = await api.get(`/api/admin/audit/sessions?${params}`);
        return response.data;
    },

    async getSession(sessionId) {
        const response = await api.get(`/api/admin/audit/sessions/${sessionId}`);
        return response.data;
    },

    async getActivities(filters = {}, pagination = { page: 0, size: 50 }) {
        const params = buildParams(filters, pagination);
        const response = await api.get(`/api/admin/audit/activities?${params}`);
        return response.data;
    },

    async getUserLogs(userId, filters = {}, pagination = { page: 0, size: 50 }) {
        const params = buildParams(filters, pagination);
        const response = await api.get(`/api/admin/users/${userId}/logs?${params}`);
        return response.data;
    }
};

export default auditService;
