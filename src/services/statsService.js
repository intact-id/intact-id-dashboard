import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const statsService = {
    // { from, to, current, previous, daily, byType, byCountry, checks } — see auth-server VerificationStatsDto
    async verifications({ companyId, days = 30 } = {}) {
        return unwrap(await api.get('/api/v1/stats/verifications', { params: clean({ companyId, days }) }));
    },

    // Super admins. Seconds: averageSeconds, medianSeconds, p90Seconds, stages{queued, checks, waitingForReviewer, underReview}
    async turnaround({ companyId, days = 30 } = {}) {
        return unwrap(await api.get('/api/v1/stats/turnaround', { params: clean({ companyId, days }) }));
    },

    // Super admins. One verification's stages: { totalMs, running, stages: [{ key, label, startedAt, endedAt, durationMs, running, note, checks }] }
    async timeline(verificationId) {
        return unwrap(await api.get(`/api/v1/kyc/verifications/${verificationId}/timeline`));
    },

    // Super admins. { checkedAt, allUp, services: [{ service, label, up, latencyMs, uptime24h, uptime30d, ... }] }
    async systemStatus() {
        return unwrap(await api.get('/api/v1/system/status'));
    },

    // Super admins. { bucketMinutes, services: [{ service, label, points: [{ at, checks, uptime, averageLatencyMs }] }] }
    async systemHistory(hours = 24) {
        return unwrap(await api.get('/api/v1/system/status/history', { params: { hours } }));
    },
};

export default statsService;
