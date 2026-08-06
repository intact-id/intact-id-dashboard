import api from './api';

const twoFactorService = {
    /**
     * Enable 2FA for the authenticated user. Returns a QR code URL (otpauth:// URI)
     * to be scanned by an authenticator app before the setup can be confirmed.
     * @returns {Promise<object>}
     */
    async enable() {
        try {
            const response = await api.post('/api/auth/2fa/enable');
            return response.data;
        } catch (error) {
            console.error('Enable 2FA error:', error);
            throw error;
        }
    },

    /**
     * Disable 2FA for the authenticated user.
     * @returns {Promise<object>}
     */
    async disable() {
        try {
            const response = await api.post('/api/auth/2fa/disable');
            return response.data;
        } catch (error) {
            console.error('Disable 2FA error:', error);
            throw error;
        }
    },

    /**
     * Verify a TOTP code from an authenticator app.
     * @param {number} verificationCode - 6-digit code
     * @returns {Promise<object>}
     */
    async verify(verificationCode) {
        try {
            const response = await api.post('/api/auth/2fa/verify', { verificationCode });
            return response.data;
        } catch (error) {
            console.error('Verify 2FA error:', error);
            throw error;
        }
    },

    /**
     * Generate (or regenerate) the authenticated user's backup codes. Regenerating
     * invalidates all previously issued codes. The plaintext codes are only ever
     * returned here, once — they can't be retrieved again afterwards.
     * @returns {Promise<object>}
     */
    async regenerateBackupCodes() {
        try {
            const response = await api.post('/api/auth/2fa/backup-codes');
            return response.data;
        } catch (error) {
            console.error('Generate backup codes error:', error);
            throw error;
        }
    },

    /**
     * Get the count of remaining unused backup codes.
     * @returns {Promise<object>}
     */
    async getRemainingBackupCodeCount() {
        try {
            const response = await api.get('/api/auth/2fa/backup-codes/count');
            return response.data;
        } catch (error) {
            console.error('Get remaining backup code count error:', error);
            throw error;
        }
    },
};

export default twoFactorService;
