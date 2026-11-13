import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Each company has one key pair, which works only on this server (the test server and production have
// separate databases). All of these are admin-only on auth-server; `companyId` is honoured for super
// admins and ignored for everyone else (the server substitutes the caller's own company).
const apiKeyService = {
    // [{ status, expiresAt, apiKey: '****', apiSecret: '****' }] — empty when no key was issued yet
    async listKeys(companyId) {
        return unwrap(await api.get('/api/companies/api-keys', { params: { companyId } }));
    },

    // { totalRequests, totalSuccessfulRequests, totalFailedRequests, lastUsedAt, rateLimitPerHour/Day/Month }
    async getUsage(companyId) {
        return unwrap(await api.get('/api/companies/api-keys/usage', { params: { companyId } }));
    },

    // Issues a new key + secret, replacing the existing pair immediately.
    // The raw values are only ever returned here — they are stored hashed.
    async issueKey(companyId) {
        return unwrap(await api.post('/api/companies/api-keys/generate', null, { params: { companyId } }));
    },

    async suspendKey(companyId) {
        return unwrap(await api.post(`/api/companies/${companyId}/credentials/suspend`));
    },

    async activateKey(companyId) {
        return unwrap(await api.post(`/api/companies/${companyId}/credentials/activate`));
    },

    // Super admin only. limits = { perHour, perDay, perMonth }; a negative value removes that limit.
    async updateRateLimits(companyId, limits) {
        return unwrap(await api.put(`/api/companies/${companyId}/rate-limits`, limits));
    },
};

export default apiKeyService;
