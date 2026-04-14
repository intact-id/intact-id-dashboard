import api from './api';

const roleService = {
    async getRoles() {
        try {
            const response = await api.get('/api/admin/users/roles');
            return response.data;
        } catch (error) {
            console.error('Get roles error:', error);
            throw error;
        }
    },
};

export default roleService;
