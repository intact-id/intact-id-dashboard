import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Webhook settings live on the company's communication record. Reading is open to the company's
// own users; every change is admin-only. `webhookSecret` comes back masked except on rotate.
const webhookService = {
    async get(companyId) {
        return unwrap(await api.get(`/api/companies/${companyId}/communication`));
    },

    // Partial update: fields left out (or null) are kept as they are.
    // settings = { webhookUrl?, webhookEnabled?, payloadFields? }
    async update(companyId, settings) {
        return unwrap(await api.put(`/api/companies/${companyId}/communication/webhook`, settings));
    },

    // Super admins only. flags = { notifyApplicantOnApproval, notifyApplicantOnRejection, notifyApplicantOnPendingReview }
    async updateApplicantEmails(companyId, flags) {
        return unwrap(await api.put(`/api/companies/${companyId}/communication/notification-settings`, flags));
    },

    // Posts a test event to the saved URL. Fails if no URL is saved or the endpoint errors.
    async sendTest(companyId) {
        return unwrap(await api.post(`/api/companies/${companyId}/communication/webhook/test`));
    },

    // The only response that carries the full secret — it must be copied now.
    async rotateSecret(companyId) {
        return unwrap(await api.post(`/api/companies/${companyId}/communication/webhook/rotate-secret`));
    },

    // Delivery log, newest first. status: PENDING | DELIVERED | FAILED | RETRYING (optional).
    // Returns a Spring page: { content, totalElements, totalPages, number, size }.
    async listDeliveries(companyId, { status, page = 0, size = 20 } = {}) {
        const params = { page, size, ...(status && { status }) };
        return unwrap(await api.get(`/api/companies/${companyId}/communication/webhook/deliveries`, { params }));
    },

    // { since, total, delivered, failed, retrying, pending } for the last `hours` hours.
    async getDeliverySummary(companyId, hours = 24) {
        return unwrap(await api.get(`/api/companies/${companyId}/communication/webhook/deliveries/summary`, { params: { hours } }));
    },
};

export default webhookService;
