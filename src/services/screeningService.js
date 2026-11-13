import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const screeningService = {
    // Spring page of { id, verificationId, companyName, subjectName, verdict, hits, topScore,
    //   pep, adverseMedia, matches, skippedReason, verificationStatus, overallDecision, checkedAt }
    async results({ verdict, search, companyId, page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/v1/screening/results', { params: clean({ verdict, search, companyId, page, size }) }));
    },

    // { since, total, noHit, potentialMatch, confirmedMatch, skipped, pep, adverseMedia }
    async summary({ companyId, days = 30 } = {}) {
        return unwrap(await api.get('/api/v1/screening/results/summary', { params: clean({ companyId, days }) }));
    },

    // Staff only. { type: 'PERSON', firstName, lastName, birthDate } or { type: 'BUSINESS', name, jurisdiction }
    async check(subject) {
        return unwrap(await api.post('/api/v1/screening/check', subject));
    },
};

export default screeningService;
