import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Shield, Users, UserX, UserCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import userService from '../services/userService';
import './TeamMembers.css';

export default function TeamMembers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        roles: []
    });

    const roles = [
        { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'error' },
        { value: 'ADMIN', label: 'Admin', color: 'primary' },
        { value: 'CHECKER', label: 'Checker', color: 'info' },
        { value: 'VIEWER', label: 'Viewer', color: 'default' },
        { value: 'COMPLIANCE_OFFICER', label: 'Compliance Officer', color: 'warning' }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getAllUsers({ page: 0, size: 100 });
            if (response.success) {
                setUsers(response.data.content || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await userService.createUser(formData);
            if (response.success) {
                await fetchUsers();
                setShowCreateModal(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await userService.updateUser(selectedUser.id, formData);
            if (response.success) {
                await fetchUsers();
                setShowEditModal(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await userService.deleteUser(userId);
            await fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        try {
            if (currentStatus === 'ACTIVE') {
                await userService.suspendUser(userId);
            } else {
                await userService.activateUser(userId);
            }
            await fetchUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            roles: user.roles || []
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            firstName: '',
            lastName: '',
            roles: []
        });
        setSelectedUser(null);
    };

    const handleRoleToggle = (roleName) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.includes(roleName)
                ? prev.roles.filter(r => r !== roleName)
                : [...prev.roles, roleName]
        }));
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = filterRole === 'all' ||
            user.roles?.includes(filterRole);

        const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadgeVariant = (roleName) => {
        const role = roles.find(r => r.value === roleName);
        return role?.color || 'default';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="team-members">
            <div className="page-header">
                <div>
                    <h1>Team Members</h1>
                    <p className="page-subtitle">
                        Manage admin users and their permissions
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    Add Team Member
                </Button>
            </div>

            {/* Filters */}
            <Card className="filters-card">
                <div className="filters">
                    <div className="search-box">
                        <Search size={18} />
                        <Input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Roles</option>
                        {roles.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                </div>
            </Card>

            {/* Users Table */}
            <Card>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading team members...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>No team members found</h3>
                        <p>Add your first team member to get started</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Last Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-small">
                                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <div className="user-name">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                    <div className="user-username">@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <div className="roles-cell">
                                                {user.roles?.map((role, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant={getRoleBadgeVariant(role)}
                                                    >
                                                        {role?.replace(/_/g, ' ') || 'Unknown'}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge variant={user.status === 'ACTIVE' ? 'success' : 'error'}>
                                                {user.status}
                                            </Badge>
                                        </td>
                                        <td className="text-secondary">
                                            {formatDate(user.lastLoginAt)}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn"
                                                    onClick={() => openEditModal(user)}
                                                    title="Edit user"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                                    title={user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                                >
                                                    {user.status === 'ACTIVE' ?
                                                        <UserX size={16} /> :
                                                        <UserCheck size={16} />
                                                    }
                                                </button>
                                                <button
                                                    className="action-btn action-btn--delete"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal create-user-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-content">
                                <div className="modal-icon">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h2>Add Team Member</h2>
                                    <p className="modal-subtitle">Create a new admin user account</p>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="modal-body">
                                <div className="info-box">
                                    <Shield size={16} />
                                    <div>
                                        <strong>Automatic Password Generation</strong>
                                        <p>A secure password will be generated and emailed to the user.</p>
                                    </div>
                                </div>

                                <div className="form-columns">
                                    <div className="form-column">
                                        <div className="form-group">
                                            <label>First Name *</label>
                                            <Input
                                                required
                                                value={formData.firstName}
                                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                placeholder="John"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Username *</label>
                                            <Input
                                                required
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                placeholder="john.doe"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Phone (Optional)</label>
                                            <Input
                                                type="tel"
                                                value={formData.phone || ''}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+1234567890"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-column">
                                        <div className="form-group">
                                            <label>Last Name *</label>
                                            <Input
                                                required
                                                value={formData.lastName}
                                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                placeholder="Doe"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email *</label>
                                            <Input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="john.doe@company.com"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Roles *</label>
                                            <div className="role-checkboxes-compact">
                                                {roles.map(role => (
                                                    <label key={role.value} className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.roles.includes(role.value)}
                                                            onChange={() => handleRoleToggle(role.value)}
                                                        />
                                                        <span>{role.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create User</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Team Member</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name</label>
                                        <Input
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name</label>
                                        <Input
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Username</label>
                                    <Input
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Roles</label>
                                    <div className="role-checkboxes">
                                        {roles.map(role => (
                                            <label key={role.value} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.roles.includes(role.value)}
                                                    onChange={() => handleRoleToggle(role.value)}
                                                />
                                                <span>{role.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Update User</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
