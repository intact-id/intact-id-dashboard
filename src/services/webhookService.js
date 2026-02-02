import api from './api';

const webhookService = {
    // Get company communication details (includes webhook settings)
    async getCompanyCommunication(companyId) {
        try {
            const response = await api.get(`/api/companies/${companyId}/communication`);
            return response.data;
        } catch (error) {
            console.error('Get company communication error:', error);
            throw error;
        }
    },

    // Update webhook settings
    async updateWebhookSettings(companyId, webhookData) {
        try {
            const response = await api.put(`/api/companies/${companyId}/communication/webhook`, webhookData);
            return response.data;
        } catch (error) {
            console.error('Update webhook settings error:', error);
            throw error;
        }
    },

    // Test webhook endpoint
    async testWebhook(companyId) {
        try {
            const response = await api.post(`/api/companies/${companyId}/communication/webhook/test`);
            return response.data;
        } catch (error) {
            console.error('Test webhook error:', error);
            throw error;
        }
    },

    // Get webhook logs/history
    async getWebhookLogs(companyId, pagination = { page: 0, size: 20 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size
            });
            const response = await api.get(`/api/companies/${companyId}/communication/webhook/logs?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get webhook logs error:', error);
            throw error;
        }
    }
};

export default webhookService;
