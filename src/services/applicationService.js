import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Businesses applying for API access. Super admins review them in two steps: a maker reviews first,
// then a different person (the checker) makes the final decision. Approval creates the company.
const applicationService = {
    // Returns a Spring page: { content, totalElements, ... }. status is a GlobalStatuses name.
    async list({ status, page = 0, size = 200 } = {}) {
        const params = { page, size, ...(status && { status }) };
        return unwrap(await api.get('/api/admin/applications', { params }));
    },

    // First review. action: APPROVED (sends it for final approval) | INFO_REQUESTED | REJECTED.
    async review(applicationId, { action, note, messageToApplicant }) {
        return unwrap(await api.post(`/api/company-approval/applications/${applicationId}/maker-action`, {
            performedByAction: action,
            approverNote: note || null,
            endUserMessage: messageToApplicant || null,
        }));
    },

    // Applications waiting for the final decision, with who reviewed them first and their note.
    async awaitingFinalDecision({ page = 0, size = 200 } = {}) {
        return unwrap(await api.get('/api/admin/applications/approvals/pending-checker', { params: { page, size } }));
    },

    // Final decision. action: APPROVED (creates the company and its API credentials) | REJECTED.
    async decide(approvalId, { action, note, messageToApplicant }) {
        return unwrap(await api.post(`/api/admin/applications/approvals/${approvalId}/checker-decision`, {
            finalAction: action,
            approverNote: note || null,
            endUserMessage: messageToApplicant || null,
        }));
    },
};

export default applicationService;
