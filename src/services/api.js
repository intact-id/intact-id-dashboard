import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh and auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 (Unauthorized) and 403 (Forbidden) errors
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
                    refreshToken,
                });

                if (response.data.success) {
                    const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', newRefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }

                throw new Error('Token refresh failed');
            } catch (refreshError) {
                // Refresh failed, logout user
                console.error('Token refresh failed:', refreshError);

                // Clear all auth data
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');

                // Redirect to login page
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
