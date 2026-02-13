import api from './api';

const kycService = {
    /**
     * Submit a new KYC verification
     * @param {string} tier - Verification tier (e.g., 'basic', 'standard')
     * @param {FormData} formData - Form data containing files and fields
     * @returns {Promise<object>}
     */
    async submitVerification(tier, formData) {
        try {
            const response = await api.post(`/api/v1/kyc/verify/${tier}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Submit verification error:', error);
            throw error;
        }
    },

    /**
     * Get verification status/details
     * @param {string} verificationId - Verification ID
     * @returns {Promise<object>}
     */
    async getVerification(verificationId) {
        try {
            const response = await api.get(`/api/v1/kyc/verify/${verificationId}`);
            return response.data;
        } catch (error) {
            console.error('Get verification error:', error);
            throw error;
        }
    },

    /**
     * List verifications with filters
     * @param {object} filters - Filter parameters (status, tier, fromDate, toDate)
     * @param {object} pagination - Pagination parameters (page, size)
     * @returns {Promise<object>}
     */
    async listVerifications(filters = {}, pagination = { page: 0, size: 10 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size,
                ...(filters.status && filters.status !== 'all' && { status: filters.status }),
                ...(filters.tier && filters.tier !== 'all' && { tier: filters.tier }),
                ...(filters.fromDate && { fromDate: filters.fromDate }),
                ...(filters.toDate && { toDate: filters.toDate }),
                ...(filters.companyId && { companyId: filters.companyId }),
                ...(filters.search && { search: filters.search }),
            });

            const response = await api.get(`/api/v1/kyc/verifications?${params}`);
            return response.data;
        } catch (error) {
            console.error('List verifications error:', error);
            throw error;
        }
    },

    /**
     * Build document URL
     * @param {string} verificationId - Verification ID
     * @param {string} documentId - Document ID
     * @returns {string} Document URL
     */
    getDocumentUrl(verificationId, documentId) {
        return `/api/v1/kyc/verifications/${verificationId}/documents/${documentId}`;
    },

    /**
     * Fetch document as blob using authenticated API client.
     * This is required because <img> requests do not include Authorization headers automatically.
     */
    async getDocumentBlob(verificationId, documentId) {
        const response = await api.get(
            `/api/v1/kyc/verifications/${verificationId}/documents/${documentId}`,
            { responseType: 'blob' }
        );
        return response.data;
    }
};

export default kycService;
