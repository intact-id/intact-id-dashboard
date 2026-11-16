import api from './api';

function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Leaves out empty filters so the server sees only what was chosen
const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// Who did what in the console and API, and their sign-in sessions (super admins only). Newest first.
const auditService = {
    // { content: [{ username, companyName, activityType, httpMethod, path, queryString, statusCode, durationMs, ipAddress, startedAt, sessionId, userId }], totalElements, totalPages }
    async activities(params) {
        return unwrap(await api.get('/api/admin/audit/activities', { params: clean(params) }));
    },
    // { content: [{ sessionId, username, companyName, loginAt, logoutAt, lastActivityAt, status, ipAddress, userAgent, activityCount }], ... }
    async sessions(params) {
        return unwrap(await api.get('/api/admin/audit/sessions', { params: clean(params) }));
    },
};

export default auditService;
