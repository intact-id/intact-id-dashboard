import api from './api';

const authService = {
    /**
     * Login user with username and password
     * @param {string} username - User's username
     * @param {string} password - User's password
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async login(username, password) {
        try {
            // Avoid stale-session crossover when switching accounts.
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // /api/auth/login returns either full tokens, or — when 2FA is required and this
            // browser isn't a trusted device — { mfaRequired: true, mfaToken } and no tokens
            // at all. api.js's request interceptor attaches any stored deviceToken, which
            // lets the backend skip the 2FA step below if this browser is already trusted.
            const response = await api.post('/api/auth/login', {
                username,
                password,
            });

            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.responseMessage || 'Login failed',
                };
            }

            if (response.data.data.mfaRequired) {
                return {
                    success: true,
                    data: { mfaRequired: true, mfaToken: response.data.data.mfaToken },
                };
            }

            return this._persistSession(response.data.data);
        } catch (error) {
            console.error('Login error:', error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            return {
                success: false,
                error: error.response?.data?.responseMessage ||
                    error.response?.data?.errorMessage ||
                    'Connection error. Please check if the server is running.',
            };
        }
    },

    /**
     * Complete a pending 2FA challenge with a TOTP code from an authenticator app.
     */
    async verifyMfaCode(mfaToken, verificationCode, rememberDevice) {
        return this._completeMfaChallenge({ mfaToken, verificationCode, rememberDevice });
    },

    /**
     * Complete a pending 2FA challenge with a single-use backup code instead of a TOTP code.
     */
    async verifyBackupCode(mfaToken, backupCode, rememberDevice) {
        return this._completeMfaChallenge({ mfaToken, backupCode, rememberDevice });
    },

    async _completeMfaChallenge(payload) {
        try {
            const response = await api.post('/api/auth/2fa/login-verify', payload);

            if (!response.data.success) {
                return {
                    success: false,
                    error: response.data.responseMessage || 'Verification failed',
                };
            }

            return this._persistSession(response.data.data);
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.responseMessage ||
                    error.response?.data?.errorMessage ||
                    'Incorrect code. Please try again.',
            };
        }
    },

    /**
     * Store tokens (and a trusted-device token, if one was issued) from a successful
     * login or MFA verification, then fetch and persist the user's profile.
     */
    async _persistSession(loginData) {
        const { accessToken, refreshToken, deviceToken } = loginData;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        if (deviceToken) {
            localStorage.setItem('deviceToken', deviceToken);
        }

        const userData = await this.fetchCurrentUser();
        localStorage.setItem('user', JSON.stringify(userData));

        return {
            success: true,
            data: userData,
        };
    },

    /**
     * Fetch the authenticated user's profile from the backend
     * (username, email, roles, companyId, is2faEnabled, ...).
     * Requires a valid access token to already be set.
     * @returns {Promise<object>}
     */
    async fetchCurrentUser() {
        const response = await api.get('/api/auth/current-user');

        if (!response.data.success) {
            throw new Error(response.data.responseMessage || 'Failed to fetch current user');
        }

        const { id, ...rest } = response.data.data;
        return { id, userId: id, ...rest };
    },

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await api.post('/api/auth/logout', { refreshToken });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage regardless of API call success. Note: deviceToken is
            // intentionally left in place — it marks this browser as trusted independent
            // of any one session, so signing out shouldn't force 2FA again next login.
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    },

    /**
     * Refresh access token
     * @returns {Promise<{accessToken: string, refreshToken: string}>}
     */
    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await api.post('/api/auth/refresh', { refreshToken });

        if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            return { accessToken, refreshToken: newRefreshToken };
        }

        throw new Error('Token refresh failed');
    },

    /**
     * Get current user from localStorage
     * @returns {object|null}
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        // No pending-2FA flag needed anymore: a full accessToken is only ever stored
        // once /api/auth/login (or the MFA verify step) has actually succeeded.
        return !!localStorage.getItem('accessToken');
    },

    /**
     * Get access token
     * @returns {string|null}
     */
    getAccessToken() {
        return localStorage.getItem('accessToken');
    },

    /**
     * Get refresh token
     * @returns {string|null}
     */
    getRefreshToken() {
        return localStorage.getItem('refreshToken');
    },
};

export default authService;
