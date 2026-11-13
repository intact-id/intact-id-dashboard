import api, { clearSession, errorMessage } from './api';

// Every function returns { success, data?, error? } so the UI never has to catch.
const authService = {
    // /api/auth/login returns tokens, or — when 2FA is required and this browser is not a
    // trusted device — { mfaRequired: true, mfaToken } and no tokens at all.
    async login(username, password) {
        clearSession(); // avoid one account's session leaking into the next sign-in
        try {
            const response = await api.post('/api/auth/login', { username, password });
            if (!response.data.success) {
                return { success: false, error: response.data.responseMessage || 'Sign-in failed' };
            }
            const loginData = response.data.data;
            if (loginData.mfaRequired) {
                return { success: true, data: { mfaRequired: true, mfaToken: loginData.mfaToken } };
            }
            return await this.startSession(loginData);
        } catch (error) {
            clearSession();
            return { success: false, error: errorMessage(error, 'Sign-in failed') };
        }
    },

    // Completes a pending 2FA challenge. Pass either a TOTP `verificationCode` or a `backupCode`.
    async verifyTwoFactor({ mfaToken, verificationCode, backupCode, rememberDevice }) {
        try {
            const response = await api.post('/api/auth/2fa/login-verify', {
                mfaToken,
                verificationCode: verificationCode ? Number(verificationCode) : undefined,
                backupCode: backupCode || undefined,
                rememberDevice,
            });
            if (!response.data.success) {
                return { success: false, error: response.data.responseMessage || 'Verification failed' };
            }
            return await this.startSession(response.data.data);
        } catch (error) {
            return { success: false, error: errorMessage(error, 'Incorrect code. Please try again.') };
        }
    },

    // Stores the tokens, then loads the profile. The profile's companyId is what pages put in
    // company-scoped URLs; auth-server still re-resolves the company from the token server-side.
    async startSession({ accessToken, refreshToken, deviceToken }) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        if (deviceToken) localStorage.setItem('deviceToken', deviceToken);

        const user = await this.fetchCurrentUser();
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true, data: user };
    },

    async fetchCurrentUser() {
        const response = await api.get('/api/auth/current-user');
        if (!response.data.success) {
            throw new Error(response.data.responseMessage || 'Failed to load your profile');
        }
        return response.data.data;
    },

    async logout() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) await api.post('/api/auth/logout', { refreshToken });
        } catch {
            // Signing out locally must succeed even if the server is unreachable.
        } finally {
            // deviceToken stays: it marks this browser as trusted, independent of any one session.
            clearSession();
        }
    },

    getStoredUser() {
        const stored = localStorage.getItem('user');
        return stored && localStorage.getItem('accessToken') ? JSON.parse(stored) : null;
    },
};

export default authService;
