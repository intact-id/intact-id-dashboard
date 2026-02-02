import api from './api';

const companyService = {
    /**
     * Get company details by ID
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async getCompanyById(companyId) {
        try {
            const response = await api.get(`/api/companies/${companyId}`);
            return response.data;
        } catch (error) {
            console.error('Get company error:', error);
            throw error;
        }
    },

    /**
     * Get current company details
     * @param {string} companyId - Company ID (optional, if not in token)
     * @returns {Promise<object>}
     */
    async getCurrentCompany(companyId) {
        try {
            // In a real scenario, the backend might extract company from token
            // But the controller expects a query param for now based on my reading
            const params = companyId ? `?companyId=${companyId}` : '';
            const response = await api.get(`/api/companies/me${params}`);
            return response.data;
        } catch (error) {
            console.error('Get current company error:', error);
            throw error;
        }
    },

    /**
     * Update company details
     * @param {string} companyId - Company ID
     * @param {object} data - Update data
     * @returns {Promise<object>}
     */
    async updateCompany(companyId, data) {
        try {
            const response = await api.put(`/api/companies/${companyId}`, data);
            return response.data;
        } catch (error) {
            console.error('Update company error:', error);
            throw error;
        }
    },

    /**
     * Get all companies with filters (Admin)
     * @param {object} filters - Filter parameters (status, country, businessType)
     * @param {object} pagination - Pagination parameters (page, size)
     * @returns {Promise<object>}
     */
    async getAllCompanies(filters = {}, pagination = { page: 0, size: 10 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size,
                ...(filters.status && { status: filters.status }),
                ...(filters.country && { country: filters.country }),
                ...(filters.businessType && { businessType: filters.businessType })
            });

            const response = await api.get(`/api/companies?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get all companies error:', error);
            throw error;
        }
    },

    /**
     * Delete a company
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async deleteCompany(companyId) {
        try {
            const response = await api.delete(`/api/companies/${companyId}`);
            return response.data;
        } catch (error) {
            console.error('Delete company error:', error);
            throw error;
        }
    },

    /**
     * Suspend a company
     * @param {string} companyId - Company ID
     * @param {string} reason - Suspension reason
     * @returns {Promise<object>}
     */
    async suspendCompany(companyId, reason = '') {
        try {
            const response = await api.post(`/api/companies/${companyId}/suspend`, { reason });
            return response.data;
        } catch (error) {
            console.error('Suspend company error:', error);
            throw error;
        }
    },

    /**
     * Activate a company
     * @param {string} companyId - Company ID
     * @returns {Promise<object>}
     */
    async activateCompany(companyId) {
        try {
            const response = await api.post(`/api/companies/${companyId}/activate`);
            return response.data;
        } catch (error) {
            console.error('Activate company error:', error);
            throw error;
        }
    }
};

export default companyService;
