import api from './api';

const approvalService = {
    /**
     * Get all company applications (KYB)
     * @param {object} filters - Filter parameters (status)
     * @param {object} pagination - Pagination parameters (page, size)
     * @returns {Promise<object>}
     */
    async getApplications(filters = {}, pagination = { page: 0, size: 10 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size,
                ...(filters.status && { status: filters.status }),
            });

            const response = await api.get(`/api/admin/applications?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get applications error:', error);
            throw error;
        }
    },

    /**
     * Get application by ID
     * @param {string} applicationId - Application ID
     * @returns {Promise<object>}
     */
    async getApplicationById(applicationId) {
        try {
            const response = await api.get(`/api/admin/applications/${applicationId}`);
            return response.data;
        } catch (error) {
            console.error('Get application error:', error);
            throw error;
        }
    },

    /**
     * Perform checker decision (Approve/Reject)
     * @param {string} approvalId - Approval ID
     * @param {string} decision - 'APPROVE' or 'REJECT'
     * @param {string} comments - Optional comments
     * @returns {Promise<object>}
     */
    async checkerDecision(approvalId, payload) {
        try {
            const response = await api.post(`/api/admin/applications/approvals/${approvalId}/checker-decision`, payload);
            return response.data;
        } catch (error) {
            console.error('Checker decision error:', error);
            throw error;
        }
    },

    /**
     * Perform maker action (Submit for approval)
     * @param {string} applicationId - Application ID
     * @param {string} action - Action to perform
     * @returns {Promise<object>}
     */
    async makerAction(applicationId, payload) {
        try {
            const response = await api.post(`/api/company-approval/applications/${applicationId}/maker-action`, payload);
            return response.data;
        } catch (error) {
            console.error('Maker action error:', error);
            throw error;
        }
    },

    /**
     * Get pending maker approvals that need checker action
     * @param {object} pagination - Pagination parameters (page, size)
     * @returns {Promise<object>}
     */
    async getPendingCheckerApprovals(pagination = { page: 0, size: 10 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size,
            });

            const response = await api.get(`/api/admin/applications/approvals/pending-checker?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get pending checker approvals error:', error);
            throw error;
        }
    }
};

export default approvalService;
