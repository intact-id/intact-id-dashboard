import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// In-console notifications. Everyone has an inbox: a company's users see their company's notifications,
// super admins see the Intact staff inbox (new applications, manual reviews, services down).
const notificationService = {
    // Spring page of { id, companyId, companyName, title, message, link, type, status, createdAt, readAt }
    async inbox({ page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/notifications/inbox', { params: { page, size } }));
    },

    async inboxUnreadCount() {
        return unwrap(await api.get('/api/notifications/inbox/unread-count'));
    },

    async markInboxRead() {
        return unwrap(await api.put('/api/notifications/inbox/read'));
    },

    // Super admins: what was sent to companies. Same page shape as inbox.
    async sent({ page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/notifications', { params: { page, size } }));
    },

    // { companyId, title, message, type: INFO | SUCCESS | WARNING | ERROR }
    async send(notification) {
        return unwrap(await api.post('/api/notifications', notification));
    },

    async markRead(id) {
        return unwrap(await api.put(`/api/notifications/${id}/read`));
    },

    async remove(id) {
        return unwrap(await api.delete(`/api/notifications/${id}`));
    },
};

export default notificationService;
