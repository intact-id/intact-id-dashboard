import api from './api';

function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const forCompany = (companyId) => ({ params: companyId ? { companyId } : {} });

// Data retention by country and kind of data (BIOMETRICS, DOCUMENTS, PERSONAL_DATA, RECORD).
const privacyService = {
    // [{ country, name, categories: { BIOMETRICS: { minDays, maxDays, defaultDays, startsFrom, legalBasis } } }]
    async countryRules() {
        return unwrap(await api.get('/api/v1/privacy/country-rules'));
    },
    async updateCountry(country, limits) {
        return unwrap(await api.put(`/api/v1/privacy/country-rules/${encodeURIComponent(country)}`, limits));
    },
    async deleteCountry(country) {
        return unwrap(await api.delete(`/api/v1/privacy/country-rules/${encodeURIComponent(country)}`));
    },
    // [{ country, name, days: { CATEGORY: n }, effective: { CATEGORY: { days, minDays, maxDays, source, adjusted } } }]
    async companyRules(companyId) {
        return unwrap(await api.get('/api/v1/privacy/company-rules', forCompany(companyId)));
    },
    async updateCompany(companyId, country, days) {
        return unwrap(await api.put(`/api/v1/privacy/company-rules/${encodeURIComponent(country)}`, days, forCompany(companyId)));
    },
    async status(verificationId) {
        return unwrap(await api.get(`/api/v1/privacy/verifications/${verificationId}`));
    },
    // { scope, reason, override }. Cannot be undone.
    async erase(verificationId, body) {
        return unwrap(await api.post(`/api/v1/privacy/verifications/${verificationId}/erase`, body));
    },
    async hold(verificationId, reason) {
        return unwrap(await api.put(`/api/v1/privacy/verifications/${verificationId}/hold`, { reason }));
    },
    async release(verificationId) {
        return unwrap(await api.delete(`/api/v1/privacy/verifications/${verificationId}/hold`));
    },
    async relationshipEnded(verificationId, endedAt) {
        return unwrap(await api.post(`/api/v1/privacy/verifications/${verificationId}/relationship-ended`, endedAt ? { endedAt } : {}));
    },
    async holds(companyId) {
        return unwrap(await api.get('/api/v1/privacy/holds', forCompany(companyId)));
    },
    async erasures(companyId) {
        return unwrap(await api.get('/api/v1/privacy/erasures', forCompany(companyId)));
    },
};

export const CATEGORIES = [
    ['BIOMETRICS', 'Biometrics', 'Selfies and liveness frames'],
    ['DOCUMENTS', 'Documents', 'ID documents, proof of address, business documents'],
    ['PERSONAL_DATA', 'Personal details', 'Names, ID numbers, dates of birth, contact, what was read from documents'],
    ['RECORD', 'Verification record', 'The checks, decision trail, people and webhook history'],
];

export const categoryLabel = (code) => CATEGORIES.find(([c]) => c === code)?.[1] || code;

// "365 days" / "Keep"
export const daysLabel = (days) => (days === null || days === undefined ? 'Keep' : days === 1 ? '1 day' : `${days} days`);

export default privacyService;
