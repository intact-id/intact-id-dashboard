import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Admins see their own company's users; super admins see everyone. Most changes are super-admin only.
const userService = {
    // Spring page of { id, username, email, firstName, lastName, phone, status, lastLoginAt, roles, companyId, ... }
    async list({ status, search, page = 0, size = 20 } = {}) {
        // The list is a native SQL query, so the sort names the column (created_at), not the Java field.
        const params = { page, size, sort: 'created_at,desc', ...(status && { status }), ...(search && { search }) };
        return unwrap(await api.get('/api/admin/users', { params }));
    },

    // Super admins only: [{ id, name, description, status }]
    async roles() {
        return unwrap(await api.get('/api/admin/users/roles'));
    },

    // { username, email, password, firstName, lastName, phone, roleIds, mustChangePassword, companyId }
    async create(user) {
        return unwrap(await api.post('/api/admin/users', user));
    },

    // Fields left out stay as they are.
    async update(userId, user) {
        return unwrap(await api.put(`/api/admin/users/${userId}`, user));
    },

    async assignRoles(userId, roleIds) {
        return unwrap(await api.post(`/api/admin/users/${userId}/roles`, roleIds));
    },

    async removeRole(userId, roleId) {
        return unwrap(await api.delete(`/api/admin/users/${userId}/roles/${roleId}`));
    },

    async suspend(userId) {
        return unwrap(await api.post(`/api/admin/users/${userId}/suspend`));
    },

    async activate(userId) {
        return unwrap(await api.post(`/api/admin/users/${userId}/activate`));
    },

    // Clears a lock from too many failed sign-ins.
    async unlock(userId) {
        return unwrap(await api.post(`/api/admin/users/${userId}/unlock`));
    },

    // Ends every session the user has.
    async signOutEverywhere(userId) {
        return unwrap(await api.post(`/api/admin/users/${userId}/logout`));
    },

    async remove(userId) {
        return unwrap(await api.delete(`/api/admin/users/${userId}`));
    },
};

export default userService;
