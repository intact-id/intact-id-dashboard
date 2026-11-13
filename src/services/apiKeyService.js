import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Each company has one credential pair per environment ('dev' | 'prod'). All of these are
// admin-only on auth-server; `companyId` is honoured for super admins and ignored for everyone
// else (the server substitutes the caller's own company).
const apiKeyService = {
    // [{ environment: 'PROD' | 'DEV', status, expiresAt, apiKey: '****', apiSecret: '****' }]
    async listKeys(companyId) {
        return unwrap(await api.get('/api/companies/api-keys', { params: { companyId } }));
    },

    // Request totals, last-used times and rate limits for both environments.
    async getUsage(companyId) {
        return unwrap(await api.get('/api/companies/api-keys/usage', { params: { companyId } }));
    },

    // Issues a new key + secret for one environment, replacing any existing pair immediately.
    // The raw values are only ever returned here — they are stored hashed.
    async issueKey(companyId, environment) {
        return unwrap(await api.post(`/api/companies/api-keys/generate/${environment}`, null, { params: { companyId } }));
    },

    async suspendKey(companyId, environment) {
        return unwrap(await api.post(`/api/companies/${companyId}/credentials/suspend`, null, { params: { environment } }));
    },

    async activateKey(companyId, environment) {
        return unwrap(await api.post(`/api/companies/${companyId}/credentials/activate`, null, { params: { environment } }));
    },

    // Super admin only. limits = { dev: { perHour, perDay, perMonth }, prod: { … } }
    async updateRateLimits(companyId, limits) {
        return unwrap(await api.put(`/api/companies/${companyId}/rate-limits`, limits));
    },
};

export default apiKeyService;
