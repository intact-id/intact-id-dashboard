import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarRange, Clock3, Filter, Search, Shield, Users, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import auditService from '../services/auditService';
import userService from '../services/userService';
import companyService from '../services/companyService';
import './RequestLogs.css';
import './Verifications.css';
import '../components/ModalStyles.css';

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const DEFAULT_FILTERS = {
    userId: '',
    companyId: '',
    sessionId: '',
    httpMethod: '',
    path: '',
    activityType: '',
    statusCode: '',
    fromDate: '',
    toDate: ''
};

export default function RequestLogs() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('sessions');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [sessions, setSessions] = useState([]);
    const [activities, setActivities] = useState([]);
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionPagination, setSessionPagination] = useState({ page: 0, size: 15, totalPages: 0, totalElements: 0 });
    const [activityPagination, setActivityPagination] = useState({ page: 0, size: 25, totalPages: 0, totalElements: 0 });

    const isSuperAdmin = useMemo(
        () => Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN'),
        [user?.roles]
    );

    useEffect(() => {
        if (!isSuperAdmin) return;
        loadReferenceData();
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!isSuperAdmin) return;
        if (activeTab === 'sessions') {
            loadSessions();
        } else {
            loadActivities();
        }
    }, [isSuperAdmin, activeTab, filters, sessionPagination.page, activityPagination.page]);

    const loadReferenceData = async () => {
        try {
            const [usersResponse, companiesResponse] = await Promise.allSettled([
                userService.getAllUsers({ page: 0, size: 300 }),
                companyService.getAllCompanies({}, { page: 0, size: 300 })
            ]);

            if (usersResponse.status === 'fulfilled' && usersResponse.value.success) {
                setUsers(usersResponse.value.data.content || []);
            }

            if (companiesResponse.status === 'fulfilled' && companiesResponse.value.success) {
                setCompanies(companiesResponse.value.data.content || []);
            }
        } catch (loadError) {
            console.error('Failed to load audit references:', loadError);
        }
    };

    const mapCommonFilters = () => ({
        userId: filters.userId || undefined,
        companyId: filters.companyId || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined
    });

    const loadSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await auditService.getSessions(
                mapCommonFilters(),
                { page: sessionPagination.page, size: sessionPagination.size }
            );

            if (response.success) {
                const data = response.data || {};
                setSessions(data.content || []);
                setSessionPagination((prev) => ({
                    ...prev,
                    totalPages: data.totalPages || 0,
                    totalElements: data.totalElements || 0
                }));
            } else {
                setError(response.responseMessage || 'Failed to load sessions');
            }
        } catch (loadError) {
            setError(loadError.response?.data?.errorMessage || loadError.message || 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const loadActivities = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await auditService.getActivities(
                {
                    ...mapCommonFilters(),
                    sessionId: filters.sessionId || undefined,
                    httpMethod: filters.httpMethod || undefined,
                    path: filters.path || undefined,
                    activityType: filters.activityType || undefined,
                    statusCode: filters.statusCode || undefined
                },
                { page: activityPagination.page, size: activityPagination.size }
            );

            if (response.success) {
                const data = response.data || {};
                setActivities(data.content || []);
                setActivityPagination((prev) => ({
                    ...prev,
                    totalPages: data.totalPages || 0,
                    totalElements: data.totalElements || 0
                }));
            } else {
                setError(response.responseMessage || 'Failed to load activities');
            }
        } catch (loadError) {
            setError(loadError.response?.data?.errorMessage || loadError.message || 'Failed to load activities');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setSessionPagination((prev) => ({ ...prev, page: 0 }));
        setActivityPagination((prev) => ({ ...prev, page: 0 }));
    };

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setSelectedSession(null);
        setSessionPagination((prev) => ({ ...prev, page: 0 }));
        setActivityPagination((prev) => ({ ...prev, page: 0 }));
    };

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString();
    };

    const changePage = (kind, nextPage) => {
        if (kind === 'sessions') {
            setSessionPagination((prev) => ({ ...prev, page: Math.max(0, nextPage) }));
            return;
        }
        setActivityPagination((prev) => ({ ...prev, page: Math.max(0, nextPage) }));
    };

    if (!isSuperAdmin) {
        return (
            <div className="request-logs-page">
                <div className="page-header">
                    <h1>Audit Logs</h1>
                </div>
                <Card className="request-logs-restricted">This page is available to `SUPER_ADMIN` users only.</Card>
            </div>
        );
    }

    const totalSessions = sessionPagination.totalElements || sessions.length;
    const activeSessions = sessions.filter((session) => session.status === 'ACTIVE').length;
    const totalActivities = activityPagination.totalElements || activities.length;

    return (
        <div className="request-logs-page">
            <div className="page-header request-logs-header">
                <div>
                    <h1>Audit Logs</h1>
                    <p className="page-subtitle">Centralized session and activity monitoring for all authenticated users.</p>
                </div>
                <div className="request-logs-tabs">
                    <button className={`request-logs-tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>Sessions</button>
                    <button className={`request-logs-tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>Activities</button>
                </div>
            </div>

            <div className="request-logs-stats">
                <Card className="request-logs-stat-card">
                    <div className="request-logs-stat-icon request-logs-stat-icon--blue"><Shield size={18} /></div>
                    <div><div className="request-logs-stat-label">Sessions</div><div className="request-logs-stat-value">{totalSessions}</div></div>
                </Card>
                <Card className="request-logs-stat-card">
                    <div className="request-logs-stat-icon request-logs-stat-icon--green"><Activity size={18} /></div>
                    <div><div className="request-logs-stat-label">Activities</div><div className="request-logs-stat-value">{totalActivities}</div></div>
                </Card>
                <Card className="request-logs-stat-card">
                    <div className="request-logs-stat-icon request-logs-stat-icon--cyan"><Users size={18} /></div>
                    <div><div className="request-logs-stat-label">Users in Filter</div><div className="request-logs-stat-value">{filters.userId ? 1 : users.length}</div></div>
                </Card>
                <Card className="request-logs-stat-card">
                    <div className="request-logs-stat-icon request-logs-stat-icon--amber"><Clock3 size={18} /></div>
                    <div><div className="request-logs-stat-label">Active Sessions</div><div className="request-logs-stat-value">{activeSessions}</div></div>
                </Card>
            </div>

            <Card className="request-logs-filters-card">
                <div className="request-logs-filters">
                    <div className="request-logs-filter request-logs-filter--search">
                        <label><Search size={14} /> Path</label>
                        <Input value={filters.path} onChange={(e) => handleFilterChange('path', e.target.value)} placeholder="Search endpoint path..." />
                    </div>
                    <div className="request-logs-filter">
                        <label>User</label>
                        <select value={filters.userId} onChange={(e) => handleFilterChange('userId', e.target.value)}>
                            <option value="">All users</option>
                            {users.map((entry) => <option key={entry.id} value={entry.id}>{entry.firstName} {entry.lastName} ({entry.username})</option>)}
                        </select>
                    </div>
                    <div className="request-logs-filter">
                        <label>Company</label>
                        <select value={filters.companyId} onChange={(e) => handleFilterChange('companyId', e.target.value)}>
                            <option value="">All companies</option>
                            {companies.map((company) => <option key={company.id} value={company.id}>{company.legalName}</option>)}
                        </select>
                    </div>
                    <div className="request-logs-filter">
                        <label><Filter size={14} /> Method</label>
                        <select value={filters.httpMethod} onChange={(e) => handleFilterChange('httpMethod', e.target.value)}>
                            <option value="">All methods</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>
                    </div>
                    <div className="request-logs-filter">
                        <label>Activity Type</label>
                        <select value={filters.activityType} onChange={(e) => handleFilterChange('activityType', e.target.value)}>
                            <option value="">All types</option>
                            <option value="API_REQUEST">API Request</option>
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                            <option value="TOKEN_REFRESH">Token Refresh</option>
                        </select>
                    </div>
                    <div className="request-logs-filter">
                        <label>Status Code</label>
                        <Input value={filters.statusCode} onChange={(e) => handleFilterChange('statusCode', e.target.value)} placeholder="200, 401..." />
                    </div>
                    <div className="request-logs-filter">
                        <label><CalendarRange size={14} /> From</label>
                        <Input type="datetime-local" value={filters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value)} />
                    </div>
                    <div className="request-logs-filter">
                        <label>To</label>
                        <Input type="datetime-local" value={filters.toDate} onChange={(e) => handleFilterChange('toDate', e.target.value)} />
                    </div>
                    <div className="request-logs-filter request-logs-filter--actions">
                        <button className="request-logs-reset" onClick={resetFilters}>Reset Filters</button>
                    </div>
                </div>
            </Card>

            {error ? <Card className="request-logs-error">{error}</Card> : null}

            {activeTab === 'sessions' ? (
                <Card className="request-logs-table-card">
                    {loading ? (
                        <div className="request-logs-empty">Loading sessions...</div>
                    ) : sessions.length === 0 ? (
                        <div className="request-logs-empty">No sessions match the current filters.</div>
                    ) : (
                        <>
                            <div className="request-logs-table-wrap">
                                <table className="verifications-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Company</th>
                                            <th>Login</th>
                                            <th>Last Activity</th>
                                            <th>Status</th>
                                            <th>Activities</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.map((session) => (
                                            <tr key={session.sessionId} onClick={() => setSelectedSession(session)} style={{ cursor: 'pointer' }}>
                                                <td>
                                                    <div className="user-group">
                                                        <div className="user-avatar">{getInitials(session.username)}</div>
                                                        <div className="user-info">
                                                            <span className="user-name">{session.username}</span>
                                                            <span className="user-sub">{session.userId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-secondary">{session.companyName || 'Platform'}</td>
                                                <td className="text-secondary">{formatDateTime(session.loginAt)}</td>
                                                <td className="text-secondary">{formatDateTime(session.lastActivityAt)}</td>
                                                <td><Badge variant={session.status === 'ACTIVE' ? 'success' : 'default'} dot={true}>{session.status}</Badge></td>
                                                <td className="text-secondary">{session.activityCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="request-logs-pagination">
                                <button disabled={sessionPagination.page === 0} onClick={() => changePage('sessions', sessionPagination.page - 1)}>Previous</button>
                                <span>Page {sessionPagination.page + 1} of {Math.max(1, sessionPagination.totalPages)}</span>
                                <button disabled={sessionPagination.page >= sessionPagination.totalPages - 1 || sessionPagination.totalPages === 0} onClick={() => changePage('sessions', sessionPagination.page + 1)}>Next</button>
                            </div>
                        </>
                    )}
                </Card>
            ) : (
                <Card className="request-logs-table-card">
                    {loading ? (
                        <div className="request-logs-empty">Loading activities...</div>
                    ) : activities.length === 0 ? (
                        <div className="request-logs-empty">No activities match the current filters.</div>
                    ) : (
                        <>
                            <div className="request-logs-table-wrap">
                                <table className="verifications-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Method</th>
                                            <th>Path</th>
                                            <th>Status</th>
                                            <th>Duration</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.map((activity) => (
                                            <tr key={activity.id} onClick={() => setSelectedActivity(activity)} style={{ cursor: 'pointer' }}>
                                                <td>
                                                    <div className="user-group">
                                                        <div className="user-avatar">{getInitials(activity.username)}</div>
                                                        <div className="user-info">
                                                            <span className="user-name">{activity.username}</span>
                                                            <span className="user-sub">{activity.sessionId?.substring(0, 13)}...</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><Badge variant="info">{activity.httpMethod || activity.activityType}</Badge></td>
                                                <td className="request-logs-path-cell text-secondary">{activity.path}</td>
                                                <td><Badge variant={activity.statusCode >= 400 ? 'error' : 'success'}>{activity.statusCode || 'N/A'}</Badge></td>
                                                <td className="text-secondary">{activity.durationMs != null ? `${activity.durationMs} ms` : 'N/A'}</td>
                                                <td className="text-secondary">{formatDateTime(activity.startedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="request-logs-pagination">
                                <button disabled={activityPagination.page === 0} onClick={() => changePage('activities', activityPagination.page - 1)}>Previous</button>
                                <span>Page {activityPagination.page + 1} of {Math.max(1, activityPagination.totalPages)}</span>
                                <button disabled={activityPagination.page >= activityPagination.totalPages - 1 || activityPagination.totalPages === 0} onClick={() => changePage('activities', activityPagination.page + 1)}>Next</button>
                            </div>
                        </>
                    )}
                </Card>
            )}

            {selectedSession && (
                <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
                    <div className="professional-modal verification-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedSession(null)}><X size={18} /></button>
                        <div className="modal-scroll-content">
                            <div className="modal-top">
                                <h2 className="modal-title">Session Detail</h2>
                                <p className="modal-subtitle">ID: {selectedSession.sessionId}</p>
                                <div className="modal-badges">
                                    <Badge variant={selectedSession.status === 'ACTIVE' ? 'success' : 'default'} dot={true}>{selectedSession.status}</Badge>
                                </div>
                            </div>
                            <div className="modal-section">
                                <div className="section-title">Session Info</div>
                                <div className="info-grid">
                                    <div className="info-row"><span className="info-label">Username</span><span className="info-value">{selectedSession.username}</span></div>
                                    <div className="info-row"><span className="info-label">User ID</span><span className="info-value">{selectedSession.userId}</span></div>
                                    <div className="info-row"><span className="info-label">Company</span><span className="info-value">{selectedSession.companyName || 'Platform'}</span></div>
                                    <div className="info-row"><span className="info-label">IP Address</span><span className="info-value">{selectedSession.ipAddress || 'Unknown'}</span></div>
                                    <div className="info-row"><span className="info-label">Login</span><span className="info-value">{formatDateTime(selectedSession.loginAt)}</span></div>
                                    <div className="info-row"><span className="info-label">Logout</span><span className="info-value">{formatDateTime(selectedSession.logoutAt)}</span></div>
                                    <div className="info-row"><span className="info-label">Last Activity</span><span className="info-value">{formatDateTime(selectedSession.lastActivityAt)}</span></div>
                                    <div className="info-row"><span className="info-label">Total Activities</span><span className="info-value">{selectedSession.activityCount}</span></div>
                                    <div className="info-row"><span className="info-label">User Agent</span><span className="info-value">{selectedSession.userAgent || 'Unknown'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedActivity && (
                <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
                    <div className="professional-modal verification-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedActivity(null)}><X size={18} /></button>
                        <div className="modal-scroll-content">
                            <div className="modal-top">
                                <h2 className="modal-title">Activity Detail</h2>
                                <p className="modal-subtitle">{selectedActivity.path}</p>
                                <div className="modal-badges">
                                    <Badge variant="info">{selectedActivity.httpMethod || selectedActivity.activityType}</Badge>
                                    <Badge variant={selectedActivity.statusCode >= 400 ? 'error' : 'success'}>{selectedActivity.statusCode || 'N/A'}</Badge>
                                </div>
                            </div>
                            <div className="modal-section">
                                <div className="section-title">Request Info</div>
                                <div className="info-grid">
                                    <div className="info-row"><span className="info-label">User</span><span className="info-value">{selectedActivity.username}</span></div>
                                    <div className="info-row"><span className="info-label">Session ID</span><span className="info-value">{selectedActivity.sessionId}</span></div>
                                    <div className="info-row"><span className="info-label">Method</span><span className="info-value">{selectedActivity.httpMethod}</span></div>
                                    <div className="info-row"><span className="info-label">Path</span><span className="info-value">{selectedActivity.path}</span></div>
                                    <div className="info-row"><span className="info-label">Status Code</span><span className="info-value">{selectedActivity.statusCode || 'N/A'}</span></div>
                                    <div className="info-row"><span className="info-label">Duration</span><span className="info-value">{selectedActivity.durationMs != null ? `${selectedActivity.durationMs} ms` : 'N/A'}</span></div>
                                    <div className="info-row"><span className="info-label">Activity Type</span><span className="info-value">{selectedActivity.activityType || 'N/A'}</span></div>
                                    <div className="info-row"><span className="info-label">Resource</span><span className="info-value">{selectedActivity.resourceType}: {selectedActivity.resourceId}</span></div>
                                    <div className="info-row"><span className="info-label">Started At</span><span className="info-value">{formatDateTime(selectedActivity.startedAt)}</span></div>
                                    <div className="info-row"><span className="info-label">Completed At</span><span className="info-value">{formatDateTime(selectedActivity.completedAt)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
