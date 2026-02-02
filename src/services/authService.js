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
            const response = await api.post('/api/auth/login', {
                username,
                password,
            });

            if (response.data.success) {
                const { accessToken, refreshToken, userId, ...restUserData } = response.data.data;

                // Ensure userId is included in userData
                const userData = { id: userId, userId, ...restUserData };

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('user', JSON.stringify(userData));

                console.log('authService: Tokens and user saved to localStorage');

                return {
                    success: true,
                    data: userData,
                };
            }

            return {
                success: false,
                error: response.data.responseMessage || 'Login failed',
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.responseMessage ||
                    error.response?.data?.errorMessage ||
                    'Connection error. Please check if the server is running.',
            };
        }
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
            // Clear local storage regardless of API call success
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
