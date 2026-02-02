import React, { useState, useEffect } from 'react';
import { Bell, Send, Trash2, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import companyService from '../services/companyService';
import notificationService from '../services/notificationService';
import './Notifications.css';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        companyId: '',
        title: '',
        message: '',
        type: 'INFO'
    });

    useEffect(() => {
        fetchNotifications();
        fetchCompanies();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationService.getAllNotifications(0, 100);
            if (response.success) {
                setNotifications(response.data.content || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await companyService.getAllCompanies({}, { page: 0, size: 100 });
            if (response.success) {
                setCompanies(response.data.content || []);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const handleCreateNotification = async (e) => {
        e.preventDefault();
        try {
            const response = await notificationService.createNotification(createForm);
            if (response.success) {
                setShowCreateModal(false);
                setCreateForm({ companyId: '', title: '', message: '', type: 'INFO' });
                fetchNotifications();
            }
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            fetchNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this notification?')) {
            try {
                await notificationService.deleteNotification(id);
                fetchNotifications();
            } catch (error) {
                console.error('Error deleting notification:', error);
            }
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle size={20} />;
            case 'ERROR': return <AlertCircle size={20} />;
            case 'WARNING': return <AlertTriangle size={20} />;
            default: return <Info size={20} />;
        }
    };

    const getTypeBadge = (type) => {
        const variants = {
            'SUCCESS': 'success',
            'ERROR': 'danger',
            'WARNING': 'warning',
            'INFO': 'info'
        };
        return <Badge variant={variants[type] || 'info'}>{type}</Badge>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="notifications-page">
            <div className="page-header">
                <div>
                    <h1><Bell size={32} /> Notifications</h1>
                    <p className="page-subtitle">Manage system notifications</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Send size={16} /> Send Notification
                </Button>
            </div>

            <Card>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading notifications...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="notifications-list">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`notification-item ${notification.status === 'UNREAD' ? 'unread' : ''}`}
                            >
                                <div className="notification-icon">
                                    {getTypeIcon(notification.type)}
                                </div>
                                <div className="notification-content">
                                    <div className="notification-header">
                                        <h4>{notification.title}</h4>
                                        {getTypeBadge(notification.type)}
                                    </div>
                                    <p className="notification-message">{notification.message}</p>
                                    <div className="notification-meta">
                                        <span className="company-name">{notification.companyName}</span>
                                        <span className="notification-date">{formatDate(notification.createdAt)}</span>
                                        {notification.status === 'READ' && notification.readAt && (
                                            <span className="read-date">Read: {formatDate(notification.readAt)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="notification-actions">
                                    {notification.status === 'UNREAD' && (
                                        <button
                                            className="action-btn action-btn--success"
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            title="Mark as Read"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button
                                        className="action-btn action-btn--delete"
                                        onClick={() => handleDelete(notification.id)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-data">No notifications found</div>
                )}
            </Card>

            {/* Create Notification Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Send Notification</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateNotification}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Company</label>
                                    <select
                                        value={createForm.companyId}
                                        onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>
                                                {company.legalName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        value={createForm.type}
                                        onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                                        required
                                    >
                                        <option value="INFO">Info</option>
                                        <option value="SUCCESS">Success</option>
                                        <option value="WARNING">Warning</option>
                                        <option value="ERROR">Error</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Title</label>
                                    <Input
                                        value={createForm.title}
                                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                        required
                                        placeholder="Notification title"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Message</label>
                                    <textarea
                                        value={createForm.message}
                                        onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                                        required
                                        placeholder="Notification message"
                                        rows="4"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    <Send size={16} /> Send Notification
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
