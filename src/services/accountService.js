import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// The signed-in user's own security settings.
const accountService = {
    async changePassword(userId, { currentPassword, newPassword, confirmPassword }) {
        return unwrap(await api.post(`/api/admin/users/${userId}/change-password`, { currentPassword, newPassword, confirmPassword }));
    },

    // Starts 2FA set-up: { qrCodeEncodeUrl } — an otpauth:// link to show as a QR code.
    async startTwoFactor() {
        return unwrap(await api.post('/api/auth/2fa/enable'));
    },

    // Confirms set-up with a code from the authenticator app.
    async verifyTwoFactor(code) {
        return unwrap(await api.post('/api/auth/2fa/verify', { verificationCode: Number(code) }));
    },

    async disableTwoFactor() {
        return unwrap(await api.post('/api/auth/2fa/disable'));
    },

    // New single-use codes; the old ones stop working. { codes, remainingCount }
    async newBackupCodes() {
        return unwrap(await api.post('/api/auth/2fa/backup-codes'));
    },

    async backupCodesLeft() {
        return unwrap(await api.get('/api/auth/2fa/backup-codes/count'));
    },

    // Browsers that skip the 2FA step: [{ id, deviceLabel, ipAddress, lastUsedAt, createdAt }]
    async trustedDevices() {
        return unwrap(await api.get('/api/auth/2fa/trusted-devices'));
    },

    async forgetDevice(id) {
        return unwrap(await api.delete(`/api/auth/2fa/trusted-devices/${id}`));
    },
};

export default accountService;
