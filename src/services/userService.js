import api from './api';

const userService = {
    async getAllUsers(pagination = { page: 0, size: 100 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size
            });

            const response = await api.get(`/api/admin/users?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get all users error:', error);
            throw error;
        }
    },

    /**
     * Get all users with optional filters
     * @param {object} filters - Filter parameters (status, search)
     * @param {object} pagination - Pagination parameters (page, size)
     * @returns {Promise<object>}
     */
    async getUsers(filters = {}, pagination = { page: 0, size: 10 }) {
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                size: pagination.size,
                ...(filters.status && { status: filters.status }),
                ...(filters.search && { search: filters.search }),
            });

            const response = await api.get(`/api/admin/users?${params}`);
            return response.data;
        } catch (error) {
            console.error('Get users error:', error);
            throw error;
        }
    },

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async getUserById(userId) {
        try {
            const response = await api.get(`/api/admin/users/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Get user error:', error);
            throw error;
        }
    },

    /**
     * Create new user
     * @param {object} userData - User data
     * @returns {Promise<object>}
     */
    async createUser(userData) {
        try {
            const response = await api.post('/api/admin/users', userData);
            return response.data;
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    },

    /**
     * Update user
     * @param {string} userId - User ID
     * @param {object} userData - Updated user data
     * @returns {Promise<object>}
     */
    async updateUser(userId, userData) {
        try {
            const response = await api.put(`/api/admin/users/${userId}`, userData);
            return response.data;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    },

    /**
     * Delete user
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async deleteUser(userId) {
        try {
            const response = await api.delete(`/api/admin/users/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    },

    /**
     * Suspend user
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async suspendUser(userId) {
        try {
            const response = await api.post(`/api/admin/users/${userId}/suspend`);
            return response.data;
        } catch (error) {
            console.error('Suspend user error:', error);
            throw error;
        }
    },

    /**
     * Activate user
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async activateUser(userId) {
        try {
            const response = await api.post(`/api/admin/users/${userId}/activate`);
            return response.data;
        } catch (error) {
            console.error('Activate user error:', error);
            throw error;
        }
    },

    /**
     * Unlock user account
     * @param {string} userId - User ID
     * @returns {Promise<object>}
     */
    async unlockUser(userId) {
        try {
            const response = await api.post(`/api/admin/users/${userId}/unlock`);
            return response.data;
        } catch (error) {
            console.error('Unlock user error:', error);
            throw error;
        }
    },

    /**
     * Assign roles to user
     * @param {string} userId - User ID
     * @param {string[]} roleIds - Array of role IDs
     * @returns {Promise<object>}
     */
    async assignRoles(userId, roleIds) {
        try {
            const response = await api.post(`/api/admin/users/${userId}/roles`, roleIds);
            return response.data;
        } catch (error) {
            console.error('Assign roles error:', error);
            throw error;
        }
    },

    /**
     * Remove role from user
     * @param {string} userId - User ID
     * @param {string} roleId - Role ID to remove
     * @returns {Promise<object>}
     */
    async removeRole(userId, roleId) {
        try {
            const response = await api.delete(`/api/admin/users/${userId}/roles/${roleId}`);
            return response.data;
        } catch (error) {
            console.error('Remove role error:', error);
            throw error;
        }
    },

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {object} passwordData - Password change data (currentPassword, newPassword, confirmPassword)
     * @returns {Promise<object>}
     */
    async changePassword(userId, passwordData) {
        try {
            const response = await api.post(`/api/admin/users/${userId}/change-password`, passwordData);
            return response.data;
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    },
};

export default userService;
