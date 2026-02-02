import api from './api';

const credentialsService = {
    // Suspend company credentials
    async suspendCredentials(companyId, reason = 'Suspended via dashboard') {
        try {
            const params = new URLSearchParams({ reason });
            const response = await api.post(`/api/companies/${companyId}/credentials/suspend?${params}`);
            return response.data;
        } catch (error) {
            console.error('Suspend credentials error:', error);
            throw error;
        }
    },

    // Activate company credentials
    async activateCredentials(companyId) {
        try {
            const response = await api.post(`/api/companies/${companyId}/credentials/activate`);
            return response.data;
        } catch (error) {
            console.error('Activate credentials error:', error);
            throw error;
        }
    }
};

export default credentialsService;
