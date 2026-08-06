import api from './api';

const deviceService = {
    /**
     * List the authenticated user's trusted devices (devices that can skip 2FA).
     * @returns {Promise<object>}
     */
    async listTrustedDevices() {
        try {
            const response = await api.get('/api/auth/2fa/trusted-devices');
            return response.data;
        } catch (error) {
            console.error('List trusted devices error:', error);
            throw error;
        }
    },

    /**
     * Revoke a trusted device, forcing 2FA again next time it's used to log in.
     * @param {string} deviceId
     * @returns {Promise<object>}
     */
    async revokeTrustedDevice(deviceId) {
        try {
            const response = await api.delete(`/api/auth/2fa/trusted-devices/${deviceId}`);
            return response.data;
        } catch (error) {
            console.error('Revoke trusted device error:', error);
            throw error;
        }
    },
};

export default deviceService;
