import api from './api';

const credentialsService = {
    // Suspend company credentials for a specific environment ('dev' | 'prod')
    async suspendCredentials(companyId, environment) {
        try {
            const params = new URLSearchParams({ environment });
            const response = await api.post(`/api/companies/${companyId}/credentials/suspend?${params}`);
            return response.data;
        } catch (error) {
            console.error('Suspend credentials error:', error);
            throw error;
        }
    },

    // Activate company credentials for a specific environment ('dev' | 'prod')
    async activateCredentials(companyId, environment) {
        try {
            const params = new URLSearchParams({ environment });
            const response = await api.post(`/api/companies/${companyId}/credentials/activate?${params}`);
            return response.data;
        } catch (error) {
            console.error('Activate credentials error:', error);
            throw error;
        }
    }
};

export default credentialsService;
