import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, UserX, UserCheck, Building2, Users, ScrollText, Clock3, Activity } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import companyService from '../services/companyService';
import roleService from '../services/roleService';
import auditService from '../services/auditService';
import './TeamMembers.css';

const DEFAULT_FORM = {
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyId: '',
    roleIds: []
};

const ROLE_COLORS = {
    SUPER_ADMIN: 'primary',
    ADMIN: 'primary',
    CHECKER: 'info',
    MAKER: 'warning',
    VIEWER: 'default',
    COMPLIANCE_OFFICER: 'warning',
};

export default function TeamMembers() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [companyById, setCompanyById] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCompany, setFilterCompany] = useState('all');
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState(DEFAULT_FORM);
    const [logsModalOpen, setLogsModalOpen] = useState(false);
    const [logsTab, setLogsTab] = useState('sessions');
    const [logsTargetUser, setLogsTargetUser] = useState(null);
    const [userSessions, setUserSessions] = useState([]);
    const [userLogs, setUserLogs] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState('');

    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN');

    const [roles, setRoles] = useState([]);

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        fetchData();
    }, [pagination.page, filterStatus, searchTerm]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, page: 0 }));
    }, [filterStatus, searchTerm]);

    const fetchRoles = async () => {
        try {
            const response = await roleService.getRoles();
            if (response.success) {
                setRoles(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersResponse, companiesResponse] = await Promise.allSettled([
                userService.getUsers(
                    {
                        status: filterStatus === 'all' ? undefined : filterStatus,
                        search: searchTerm || undefined
                    },
                    { page: pagination.page, size: pagination.size }
                ),
                companyService.getAllCompanies({}, { page: 0, size: 300 })
            ]);

            if (usersResponse.status === 'fulfilled' && usersResponse.value.success) {
                const usersPage = usersResponse.value.data || {};
                setUsers(usersPage.content || []);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: usersPage.totalPages || 0,
                    totalElements: usersPage.totalElements || 0
                }));
            }

            if (companiesResponse.status === 'fulfilled' && companiesResponse.value.success) {
                const list = companiesResponse.value.data.content || [];
                setCompanies(list);
                setCompanyById(list.reduce((acc, c) => {
                    acc[c.id] = c;
                    return acc;
                }, {}));
            }
        } catch (error) {
            console.error('Error fetching user management data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCompanyName = (companyId) => {
        if (!companyId) return 'Platform';
        return companyById[companyId]?.legalName || companyId;
    };

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                !searchTerm ||
                u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = filterRole === 'all' || u.roles?.includes(filterRole);
            const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
            const matchesCompany = filterCompany === 'all' || (u.companyId || 'platform') === filterCompany;

            return matchesSearch && matchesRole && matchesStatus && matchesCompany;
        });
    }, [users, searchTerm, filterRole, filterStatus, filterCompany]);

    const sortedUsersByCompany = useMemo(() => {
        return [...filteredUsers].sort((a, b) => getCompanyName(a.companyId).localeCompare(getCompanyName(b.companyId)));
    }, [filteredUsers, companyById]);

    const totalUsers = pagination.totalElements || users.length;
    const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
    const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED').length;
    const linkedCompanies = new Set(users.filter((u) => !!u.companyId).map((u) => u.companyId)).size;

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

    const getRoleVariant = (roleName) => ROLE_COLORS[roleName] || 'default';
    const formatDuration = (durationMs) => durationMs != null ? `${durationMs} ms` : 'N/A';

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedUser(null);
        setFormData(DEFAULT_FORM);
        setModalOpen(true);
    };

    const openEditModal = (userRecord) => {
        setModalMode('edit');
        setSelectedUser(userRecord);
        // Map role names back to IDs for the form
        const roleIds = (userRecord.roles || [])
            .map((name) => roles.find((r) => r.name === name)?.id)
            .filter(Boolean);
        setFormData({
            username: userRecord.username || '',
            email: userRecord.email || '',
            firstName: userRecord.firstName || '',
            lastName: userRecord.lastName || '',
            phone: userRecord.phone || '',
            companyId: userRecord.companyId || '',
            roleIds
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedUser(null);
        setFormData({ ...DEFAULT_FORM, roleIds: [] });
    };

    const loadUserLogs = async (userId, sessionId) => {
        try {
            setLogsLoading(true);
            setLogsError('');
            const [sessionsResponse, logsResponse] = await Promise.all([
                auditService.getSessions({ userId }, { page: 0, size: 20 }),
                auditService.getUserLogs(userId, { sessionId }, { page: 0, size: 40 })
            ]);

            if (sessionsResponse.success) {
                const sessionsList = sessionsResponse.data?.content || [];
                setUserSessions(sessionsList);
                if (sessionId) {
                    setSelectedSession(sessionsList.find((entry) => entry.sessionId === sessionId) || null);
                }
            }

            if (logsResponse.success) {
                setUserLogs(logsResponse.data?.content || []);
            }
        } catch (error) {
            setLogsError(error.response?.data?.errorMessage || error.message || 'Failed to load user logs');
        } finally {
            setLogsLoading(false);
        }
    };

    const openLogsModal = async (userRecord) => {
        setLogsTargetUser(userRecord);
        setLogsModalOpen(true);
        setLogsTab('sessions');
        setSelectedSession(null);
        await loadUserLogs(userRecord.id);
    };

    const closeLogsModal = () => {
        setLogsModalOpen(false);
        setLogsTargetUser(null);
        setUserSessions([]);
        setUserLogs([]);
        setSelectedSession(null);
        setLogsError('');
    };

    const handleRoleToggle = (roleId) => {
        setFormData((prev) => ({
            ...prev,
            roleIds: prev.roleIds.includes(roleId)
                ? prev.roleIds.filter((id) => id !== roleId)
                : [...prev.roleIds, roleId]
        }));
    };

    const buildPayload = () => ({
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        roleIds: formData.roleIds,
        companyId: isSuperAdmin ? (formData.companyId || undefined) : undefined
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                const response = await userService.createUser(buildPayload());
                if (response.success) {
                    await fetchData();
                    closeModal();
                }
            } else if (selectedUser) {
                const response = await userService.updateUser(selectedUser.id, buildPayload());
                if (response.success) {
                    await fetchData();
                    closeModal();
                }
            }
        } catch (error) {
            console.error('Error saving user:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await userService.deleteUser(userId);
            await fetchData();
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
            await fetchData();
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    const changePage = (nextPage) => {
        setPagination((prev) => ({ ...prev, page: Math.max(0, nextPage) }));
    };

    return (
        <div className="team-members">
            <div className="page-header">
                <div>
                    <h1>User Management</h1>
                    <p className="page-subtitle">Manage users, roles, and company membership</p>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus size={16} />
                    Add User
                </Button>
            </div>

            <div className="stats-strip">
                <Card className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{totalUsers}</div></Card>
                <Card className="stat-card"><div className="stat-label">Active</div><div className="stat-value">{activeUsers}</div></Card>
                <Card className="stat-card"><div className="stat-label">Suspended</div><div className="stat-value">{suspendedUsers}</div></Card>
                <Card className="stat-card"><div className="stat-label">Companies</div><div className="stat-value">{linkedCompanies}</div></Card>
            </div>

            <div className="view-tabs">
                <button className={`view-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Users</button>
                <button className={`view-tab ${activeTab === 'company' ? 'active' : ''}`} onClick={() => setActiveTab('company')}>By Company</button>
            </div>

            <Card className="filters-card">
                <div className="filters">
                    <div className="search-box">
                        <Search size={16} />
                        <Input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="filter-select">
                        <option value="all">All Roles</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                                {role.name.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                        <option value="all">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                    <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="filter-select">
                        <option value="all">All Companies</option>
                        <option value="platform">Platform</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.legalName}</option>
                        ))}
                    </select>
                </div>
            </Card>

            <Card>
                <div className="users-container">
                    <div className="card-header">
                        <div className="card-title-group">
                            <span className="card-title">{activeTab === 'all' ? 'All users' : 'Users by company'}</span>
                            <span className="count-badge">{totalUsers} users</span>
                        </div>
                    </div>
                    {loading ? (
                    <div className="loading-state"><div className="spinner"></div><p>Loading users...</p></div>
                    ) : filteredUsers.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>No users found</h3>
                        <p>Adjust filters or create a new user.</p>
                    </div>
                    ) : activeTab === 'all' ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Company</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Last Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-small">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                                                <div>
                                                    <div className="user-name">{u.firstName} {u.lastName}</div>
                                                    <div className="user-username">@{u.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <div className="company-cell">
                                                <Building2 size={14} />
                                                <span>{getCompanyName(u.companyId)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="roles-cell">
                                                {(u.roles || []).map((role, idx) => (
                                                    <Badge key={`${u.id}-${idx}`} variant={getRoleVariant(role)}>
                                                        {role.replace(/_/g, ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>{u.status}</Badge>
                                        </td>
                                        <td className="text-secondary">{formatDate(u.lastLoginAt)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn" onClick={() => openEditModal(u)} title="Edit"><Edit2 size={15} /></button>
                                                <button className="action-btn" onClick={() => handleToggleStatus(u.id, u.status)} title={u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}>
                                                    {u.status === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}
                                                </button>
                                                {isSuperAdmin && (
                                                    <button className="action-btn" onClick={() => openLogsModal(u)} title="Logs">
                                                        <ScrollText size={15} />
                                                    </button>
                                                )}
                                                {isSuperAdmin && (
                                                    <button className="action-btn action-btn--delete" onClick={() => handleDeleteUser(u.id)} title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Last Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsersByCompany.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="company-cell">
                                                <Building2 size={14} />
                                                <span>{getCompanyName(u.companyId)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-small">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                                                <div>
                                                    <div className="user-name">{u.firstName} {u.lastName}</div>
                                                    <div className="user-username">@{u.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <div className="roles-cell">
                                                {(u.roles || []).map((role, idx) => (
                                                    <Badge key={`${u.id}-company-${idx}`} variant={getRoleVariant(role)}>
                                                        {role.replace(/_/g, ' ')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td><Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>{u.status}</Badge></td>
                                        <td className="text-secondary">{formatDate(u.lastLoginAt)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn" onClick={() => openEditModal(u)} title="Edit"><Edit2 size={15} /></button>
                                                <button className="action-btn" onClick={() => handleToggleStatus(u.id, u.status)} title={u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}>
                                                    {u.status === 'ACTIVE' ? <UserX size={15} /> : <UserCheck size={15} />}
                                                </button>
                                                {isSuperAdmin && (
                                                    <button className="action-btn" onClick={() => openLogsModal(u)} title="Logs">
                                                        <ScrollText size={15} />
                                                    </button>
                                                )}
                                                {isSuperAdmin && (
                                                    <button className="action-btn action-btn--delete" onClick={() => handleDeleteUser(u.id)} title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={pagination.page === 0}
                            onClick={() => changePage(pagination.page - 1)}
                        >
                            Previous
                        </button>
                        <span className="user-sub">Page {pagination.page + 1} of {Math.max(pagination.totalPages, 1)}</span>
                        <button
                            className="pagination-btn"
                            disabled={pagination.page >= pagination.totalPages - 1 || pagination.totalPages === 0}
                            onClick={() => changePage(pagination.page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </Card>

            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal user-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{modalMode === 'create' ? 'Create User' : 'Edit User'}</h2>
                                <p>{modalMode === 'create' ? 'Create a new platform/company user account.' : 'Update user profile and roles.'}</p>
                            </div>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="modal-grid">
                                    <div className="form-group">
                                        <label>First Name *</label>
                                        <Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name *</label>
                                        <Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Username *</label>
                                        <Input required disabled={modalMode === 'edit'} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email *</label>
                                        <Input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    {isSuperAdmin && (
                                        <div className="form-group">
                                            <label>Company</label>
                                            <select value={formData.companyId || ''} onChange={(e) => setFormData({ ...formData, companyId: e.target.value })} className="filter-select">
                                                <option value="">Platform (No Company)</option>
                                                {companies.map((company) => (
                                                    <option key={company.id} value={company.id}>{company.legalName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Roles *</label>
                                    <div className="role-chip-grid">
                                        {roles.map((role) => (
                                            <button
                                                key={role.id}
                                                type="button"
                                                className={`role-chip ${formData.roleIds.includes(role.id) ? 'role-chip--active' : ''}`}
                                                onClick={() => handleRoleToggle(role.id)}
                                            >
                                                {role.name.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                                <Button type="submit">{modalMode === 'create' ? 'Create User' : 'Save Changes'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {logsModalOpen && (
                <div className="modal-overlay" onClick={closeLogsModal}>
                    <div className="modal user-modal user-logs-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>User Logs</h2>
                                <p>{logsTargetUser?.firstName} {logsTargetUser?.lastName} • @{logsTargetUser?.username}</p>
                            </div>
                            <button className="modal-close" onClick={closeLogsModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="user-logs-summary">
                                <Card className="user-logs-stat">
                                    <div className="user-logs-stat-icon user-logs-stat-icon--blue"><Clock3 size={16} /></div>
                                    <div><div className="stat-label">Sessions</div><div className="stat-value">{userSessions.length}</div></div>
                                </Card>
                                <Card className="user-logs-stat">
                                    <div className="user-logs-stat-icon user-logs-stat-icon--green"><Activity size={16} /></div>
                                    <div><div className="stat-label">Activities</div><div className="stat-value">{userLogs.length}</div></div>
                                </Card>
                            </div>

                            <div className="view-tabs">
                                <button className={`view-tab ${logsTab === 'sessions' ? 'active' : ''}`} onClick={() => setLogsTab('sessions')}>Logs Tab: Sessions</button>
                                <button className={`view-tab ${logsTab === 'activities' ? 'active' : ''}`} onClick={() => setLogsTab('activities')}>Logs Tab: Activities</button>
                            </div>

                            {logsError ? (
                                <div className="empty-state"><p>{logsError}</p></div>
                            ) : logsLoading ? (
                                <div className="loading-state"><div className="spinner"></div><p>Loading user logs...</p></div>
                            ) : logsTab === 'sessions' ? (
                                <div className="user-logs-session-list">
                                    {userSessions.length === 0 ? (
                                        <div className="empty-state"><ScrollText size={32} /><p>No sessions recorded for this user yet.</p></div>
                                    ) : userSessions.map((session) => (
                                        <button
                                            key={session.sessionId}
                                            className={`user-session-card ${selectedSession?.sessionId === session.sessionId ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedSession(session);
                                                loadUserLogs(logsTargetUser.id, session.sessionId);
                                            }}
                                        >
                                            <div className="user-session-card__head">
                                                <div>
                                                    <div className="user-name">{session.sessionId}</div>
                                                    <div className="user-sub">{formatDate(session.loginAt)}</div>
                                                </div>
                                                <Badge variant={session.status === 'ACTIVE' ? 'success' : 'default'}>{session.status}</Badge>
                                            </div>
                                            <div className="user-session-card__meta">
                                                <span>Last activity: {formatDate(session.lastActivityAt)}</span>
                                                <span>IP: {session.ipAddress || 'Unknown'}</span>
                                                <span>Actions: {session.activityCount}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="table-container user-logs-table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Method</th>
                                                <th>Path</th>
                                                <th>Status</th>
                                                <th>Duration</th>
                                                <th>Resource</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-secondary">No activities recorded for the selected scope.</td>
                                                </tr>
                                            ) : userLogs.map((entry) => (
                                                <tr key={entry.id}>
                                                    <td>{formatDate(entry.startedAt)}</td>
                                                    <td><Badge variant="info">{entry.httpMethod || entry.activityType}</Badge></td>
                                                    <td className="user-logs-path">{entry.path}</td>
                                                    <td><Badge variant={entry.statusCode >= 400 ? 'error' : 'success'}>{entry.statusCode || 'N/A'}</Badge></td>
                                                    <td>{formatDuration(entry.durationMs)}</td>
                                                    <td>{entry.resourceType}: {entry.resourceId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
