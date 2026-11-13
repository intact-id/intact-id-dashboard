import axios from 'axios';

// Without a scheme the browser treats the value as a path on this site, so every call silently fails.
const withScheme = (url) => (url && !/^https?:\/\//i.test(url) ? `https://${url}` : url);
export const API_BASE_URL = withScheme(import.meta.env.VITE_API_BASE_URL) || 'https://api.intact-io.com';

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/auth/2fa/login-verify'];

export function clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Lets /api/auth/login skip the 2FA step on a browser the user marked as trusted.
    const deviceToken = localStorage.getItem('deviceToken');
    if (deviceToken) config.headers['X-Device-Token'] = deviceToken;

    return config;
});

// auth-server rotates the refresh token on every refresh, so concurrent 401s must share one
// refresh call — a second call with the already-used token would fail and log the user out.
let refreshInFlight = null;

function refreshAccessToken() {
    if (!refreshInFlight) {
        refreshInFlight = axios
            .post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken: localStorage.getItem('refreshToken') })
            .then((response) => {
                if (!response.data.success) throw new Error('Token refresh failed');
                const { accessToken, refreshToken } = response.data.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                return accessToken;
            })
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => original?.url?.includes(path));

        // 403 means a valid token without the permission — refreshing would not help.
        const shouldRefresh = error.response?.status === 401
            && !original?._retry
            && !isAuthEndpoint
            && localStorage.getItem('refreshToken');

        if (!shouldRefresh) return Promise.reject(error);

        original._retry = true;
        try {
            const accessToken = await refreshAccessToken();
            original.headers.Authorization = `Bearer ${accessToken}`;
            return api(original);
        } catch (refreshError) {
            clearSession();
            if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }
);

// auth-server wraps every response as { responseCode, responseMessage, success, data }.
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
    const body = error?.response?.data;
    if (body?.responseMessage) return body.responseMessage;
    if (body?.errorMessage) return body.errorMessage;
    if (!error?.response) return 'Cannot reach the server. Check your connection and try again.';
    return fallback;
}

export default api;
