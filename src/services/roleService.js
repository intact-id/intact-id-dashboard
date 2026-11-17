import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Built-in roles and a company's custom roles. Company admins work on their own company (companyId is ignored);
// Intact staff pass the company, or nothing for the built-in and staff roles.
const roleService = {
    // { roles: [{ name, label, description, builtIn, staff, companyId, permissions, users }],
    //   grantable: [{ name, group, label, scope }] — what the caller may put in a custom role }
    async list(companyId) {
        return unwrap(await api.get('/api/v1/roles', { params: companyId ? { companyId } : {} }));
    },

    // Every permission: [{ name, group, label, scope }]
    async permissions() {
        return unwrap(await api.get('/api/v1/permissions'));
    },

    // role = { label, description, permissions: [names] }
    async create(companyId, role) {
        return unwrap(await api.post('/api/v1/roles', role, { params: companyId ? { companyId } : {} }));
    },

    async update(companyId, name, role) {
        return unwrap(await api.put(`/api/v1/roles/${name}`, role, { params: companyId ? { companyId } : {} }));
    },

    async remove(companyId, name) {
        return unwrap(await api.delete(`/api/v1/roles/${name}`, { params: companyId ? { companyId } : {} }));
    },

    // Replaces the person's roles with these role names.
    async assign(userId, roles) {
        return unwrap(await api.put(`/api/v1/users/${userId}/roles`, { roles }));
    },
};

export default roleService;
