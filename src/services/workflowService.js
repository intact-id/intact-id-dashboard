import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Workflows belong to a company; super admins name the company, or work on Intact templates.
const scoped = (companyId, extra = {}) => ({ params: { ...extra, ...(companyId && { companyId }) } });

const workflowService = {
    // [{ id, key, name, description, subjectType, template, latestVersion, liveVersion, draftUpdatedAt, livePrice, currency }]
    async list(companyId) {
        return unwrap(await api.get('/api/v1/workflows', scoped(companyId)));
    },

    async templates() {
        return unwrap(await api.get('/api/v1/workflows/templates'));
    },

    // request = { key, name, description, subjectType, graph?, fromTemplateId?, template? }
    async create(request, companyId) {
        return unwrap(await api.post('/api/v1/workflows', request, scoped(companyId)));
    },

    // { workflow, draft: { nodes, edges }, versions: [...] }
    async get(id, { companyId, template = false } = {}) {
        return unwrap(await api.get(`/api/v1/workflows/${id}`, scoped(companyId, template ? { template } : {})));
    },

    async saveDraft(id, { name, description, graph }, { companyId, template = false } = {}) {
        return unwrap(await api.put(`/api/v1/workflows/${id}/draft`, { name, description, graph }, scoped(companyId, template ? { template } : {})));
    },

    // { valid, problems: [{ nodeId, message }], services, requirements, price }
    async validate(id, { companyId, template = false } = {}) {
        return unwrap(await api.post(`/api/v1/workflows/${id}/validate`, null, scoped(companyId, template ? { template } : {})));
    },

    // Freezes the current draft as the next version. It is not live until promoted.
    async publish(id, notes, { companyId, template = false } = {}) {
        return unwrap(await api.post(`/api/v1/workflows/${id}/publish`, { notes: notes || null }, scoped(companyId, template ? { template } : {})));
    },

    // Makes a published version the one new verifications run.
    async promote(id, version, { companyId } = {}) {
        return unwrap(await api.post(`/api/v1/workflows/${id}/promote`, { version }, scoped(companyId)));
    },

    async archive(id, { companyId, template = false } = {}) {
        return unwrap(await api.delete(`/api/v1/workflows/${id}`, scoped(companyId, template ? { template } : {})));
    },

    // Archived workflows of the company, or archived templates (super admins).
    async archived({ companyId, template = false } = {}) {
        return unwrap(await api.get('/api/v1/workflows/archived', scoped(companyId, template ? { template } : {})));
    },

    // Brings it back with its versions and live version as they were.
    async restore(id, { companyId, template = false } = {}) {
        return unwrap(await api.post(`/api/v1/workflows/${id}/restore`, null, scoped(companyId, template ? { template } : {})));
    },

    // Services a workflow may use (AVAILABLE ones, filtered by applicant type).
    async catalog(subjectType) {
        return unwrap(await api.get('/api/v1/workflow/catalog/available', { params: subjectType ? { subjectType } : {} }));
    },

    // Admins only: every catalog service including ones still in development.
    async fullCatalog() {
        return unwrap(await api.get('/api/v1/workflow/catalog'));
    },

    // --- Catalog management (super admins) ---
    // { code, name, description, category, subjectTypes, countries, requires, requiredFields, captures, outputs, ui, settingsSchema, sortOrder }
    // New services start IN_DEVELOPMENT.
    async createService(service) {
        return unwrap(await api.post('/api/v1/workflow/catalog', service));
    },

    // Fields left out are kept; the code can't change.
    async updateService(code, changes) {
        return unwrap(await api.patch(`/api/v1/workflow/catalog/${code}`, changes));
    },

    // IN_DEVELOPMENT -> AVAILABLE | RETIRED; AVAILABLE -> DEPRECATED; DEPRECATED -> AVAILABLE | RETIRED
    async changeServiceStatus(code, status) {
        return unwrap(await api.post(`/api/v1/workflow/catalog/${code}/status`, { status }));
    },

    // Only services never made available; others are retired instead.
    async deleteService(code) {
        return unwrap(await api.delete(`/api/v1/workflow/catalog/${code}`));
    },
};

export default workflowService;
