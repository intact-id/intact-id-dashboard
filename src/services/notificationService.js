import api from './api';

const notificationService = {
    // Get all notifications (admin)
    getAllNotifications: async (page = 0, size = 20) => {
        try {
            const response = await api.get(`/api/notifications`, {
                params: { page, size }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching all notifications:', error);
            throw error;
        }
    },

    // Get notifications for a specific company
    getNotificationsByCompany: async (companyId) => {
        try {
            const response = await api.get(`/api/notifications/company/${companyId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching company notifications:', error);
            throw error;
        }
    },

    // Get unread count for a company
    getUnreadCount: async (companyId) => {
        try {
            const response = await api.get(`/api/notifications/company/${companyId}/unread-count`);
            return response.data;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            throw error;
        }
    },

    // Create a new notification
    createNotification: async (notificationData) => {
        try {
            const response = await api.post(`/api/notifications`, notificationData);
            return response.data;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    // Mark notification as read
    markAsRead: async (notificationId) => {
        try {
            const response = await api.put(`/api/notifications/${notificationId}/read`);
            return response.data;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    // Delete notification
    deleteNotification: async (notificationId) => {
        try {
            const response = await api.delete(`/api/notifications/${notificationId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
};

export default notificationService;
