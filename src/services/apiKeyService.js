import api from './api';

const apiKeyService = {
    /**
     * Generate new API key for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async generateApiKey(companyId) {
        try {
            const response = await api.post('/api/companies/api-keys/generate', null, {
                params: { companyId }
            });
            return response.data;
        } catch (error) {
            console.error('Generate API key error:', error);
            throw error;
        }
    },

    /**
     * Generate or regenerate DEV API key for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async generateDevApiKey(companyId) {
        try {
            const response = await api.post('/api/companies/api-keys/generate/dev', null, {
                params: { companyId }
            });
            return response.data;
        } catch (error) {
            console.error('Generate DEV API key error:', error);
            throw error;
        }
    },

    /**
     * Generate or regenerate PROD API key for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async generateProdApiKey(companyId) {
        try {
            const response = await api.post('/api/companies/api-keys/generate/prod', null, {
                params: { companyId }
            });
            return response.data;
        } catch (error) {
            console.error('Generate PROD API key error:', error);
            throw error;
        }
    },

    /**
     * Revoke an API key
     * @param {string} companyId - Company ID
     * @param {string} keyId - API Key ID to revoke
     * @returns {Promise<object>}
     */
    async revokeApiKey(companyId, keyId) {
        try {
            const response = await api.delete(`/api/companies/api-keys/${keyId}`, {
                params: { companyId }
            });
            return response.data;
        } catch (error) {
            console.error('Revoke API key error:', error);
            throw error;
        }
    },

    /**
     * Get all API keys for a company
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async getApiKeys(companyId) {
        try {
            const response = await api.get('/api/companies/api-keys', {
                params: { companyId }
            });
            return response.data;
        } catch (error) {
            console.error('Get API keys error:', error);
            throw error;
        }
    },

    /**
     * Get API usage metrics (SUPER_ADMIN only)
     * @param {string} companyId - Optional company ID
     * @returns {Promise<object>}
     */
    async getUsage(companyId) {
        try {
            const response = await api.get('/api/companies/api-keys/usage', {
                params: companyId ? { companyId } : undefined
            });
            return response.data;
        } catch (error) {
            console.error('Get API usage error:', error);
            throw error;
        }
    }
};

export default apiKeyService;
