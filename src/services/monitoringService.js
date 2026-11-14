import api from './api';

function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const forCompany = (companyId, extra = {}) => ({ params: { ...extra, ...(companyId ? { companyId } : {}) } });

// Ongoing monitoring: approved customers re-screened on a schedule; changes become alerts.
const monitoringService = {
    // { enabled, frequency, includePeople, includeBusinesses, includeParties, activeSubjects, openAlerts }
    async settings(companyId) {
        return unwrap(await api.get('/api/v1/monitoring/settings', forCompany(companyId)));
    },
    async updateSettings(companyId, settings) {
        return unwrap(await api.put('/api/v1/monitoring/settings', settings, forCompany(companyId)));
    },
    async subjects({ companyId, status, search, page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/v1/monitoring/subjects', forCompany(companyId, { page, size, ...(status ? { status } : {}), ...(search ? { search } : {}) })));
    },
    async alerts({ companyId, status, page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/v1/monitoring/alerts', forCompany(companyId, { page, size, ...(status ? { status } : {}) })));
    },
    async subject(id) {
        return unwrap(await api.get(`/api/v1/monitoring/subjects/${id}`));
    },
    async forVerification(verificationId) {
        return unwrap(await api.get(`/api/v1/monitoring/verifications/${verificationId}`));
    },
    async start(verificationId) {
        return unwrap(await api.post('/api/v1/monitoring/subjects', { verificationId }));
    },
    async stop(id, reason) {
        return unwrap(await api.post(`/api/v1/monitoring/subjects/${id}/stop`, { reason }));
    },
    async rescreen(id) {
        return unwrap(await api.post(`/api/v1/monitoring/subjects/${id}/rescreen`));
    },
    // decision: CONFIRMED (it is them) or DISMISSED (it is not)
    async resolve(alertId, decision, note) {
        return unwrap(await api.put(`/api/v1/monitoring/alerts/${alertId}`, { decision, note }));
    },
};

export const ALERT_KIND = {
    NEW_MATCH: { label: 'New match', badge: 'bad' },
    MATCH_CHANGED: { label: 'Match changed', badge: 'warn' },
    MATCH_REMOVED: { label: 'Match removed', badge: 'neutral' },
};

export const ALERT_STATUS = {
    OPEN: { label: 'To decide', badge: 'warn' },
    CONFIRMED: { label: 'Confirmed', badge: 'bad' },
    DISMISSED: { label: 'Dismissed', badge: 'neutral' },
    INFO: { label: 'For information', badge: 'info' },
};

export const VERDICT = {
    NO_HIT: { label: 'No match', badge: 'ok' },
    POTENTIAL_MATCH: { label: 'Possible match', badge: 'warn' },
    CONFIRMED_MATCH: { label: 'Confirmed match', badge: 'bad' },
};

export default monitoringService;
