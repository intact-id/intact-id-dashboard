import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Risk models belong to a company. Company users act for their own; super admins must name one.
const scoped = (companyId, params = {}) => ({ params: { ...params, ...(companyId && { companyId }) } });

const riskService = {
    // [{ key, displayName, dataType, sourceSystem, description, categoryKey, customerType, active }]
    async attributeDefinitions(customerType) {
        return unwrap(await api.get('/api/v1/risk/attribute-definitions', { params: { customerType } }));
    },

    // [{ id, version, description (the name), customerType, lifeCycleStatus, combineMethod, effectiveFrom }]
    async listModels(companyId) {
        return unwrap(await api.get('/api/v1/risk/models', scoped(companyId)));
    },

    // { model, config }
    async getModel(id, companyId) {
        return unwrap(await api.get(`/api/v1/risk/models/${id}`, scoped(companyId)));
    },

    async createModel(config, companyId) {
        return unwrap(await api.post('/api/v1/risk/models', config, scoped(companyId)));
    },

    async updateModel(id, config, companyId) {
        return unwrap(await api.put(`/api/v1/risk/models/${id}`, config, scoped(companyId)));
    },

    async deleteModel(id, companyId) {
        return unwrap(await api.delete(`/api/v1/risk/models/${id}`, scoped(companyId)));
    },

    // New DRAFT copied from any model.
    async cloneModel(id, companyId) {
        return unwrap(await api.post(`/api/v1/risk/models/${id}/clone`, null, scoped(companyId)));
    },

    // Makes the draft the active model for its customer type; the previous one is retired.
    async activateModel(id, companyId) {
        return unwrap(await api.post(`/api/v1/risk/models/${id}/activate`, null, scoped(companyId)));
    },

    // { valid, errors: [{ field, message }], warnings: [...] } — checks without saving.
    async validate(config, forActivation) {
        return unwrap(await api.post('/api/v1/risk/models/validate', config, { params: { forActivation } }));
    },
};

export default riskService;
