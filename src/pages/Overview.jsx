import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Overview.css';
import badgeIcon from '../assets/badge-new.svg';
import documentIcon from '../assets/document-verify.svg';
import idCardIcon from '../assets/id-card.svg';
import fingerprintIcon from '../assets/fingerprint-new.svg';

export default function Overview() {
    const [stats, setStats] = useState(null);
    const [usageData, setUsageData] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [systemStatus, setSystemStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, usageRes, activityRes, statusRes] = await Promise.all([
                fetch('http://localhost:3001/stats'),
                fetch('http://localhost:3001/usageData'),
                fetch('http://localhost:3001/activityLog'),
                fetch('http://localhost:3001/systemStatus')
            ]);

            const [statsData, usageData, activityData, statusData] = await Promise.all([
                statsRes.json(),
                usageRes.json(),
                activityRes.json(),
                statusRes.json()
            ]);

            setStats(statsData);
            setUsageData(usageData);
            setActivityLog(activityData);
            setSystemStatus(statusData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="overview-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="overview">
            <div className="overview-header">
                <div>
                    <h1>Dashboard Overview</h1>
                    <p className="overview-subtitle">Monitor your verification activity in real-time</p>
                </div>
                <div className="system-status-badge">
                    <span className={`status-indicator status-indicator--${systemStatus?.status}`}></span>
                    <span>{systemStatus?.status === 'operational' ? 'All Systems Operational' : 'System Issue'}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <Card variant="gradient" className="stat-card">
                    <div className="stat-icon stat-icon--cyan">
                        <img src={documentIcon} alt="Total" width="32" height="32" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Verifications</div>
                        <div className="stat-value">{stats?.totalVerifications?.toLocaleString()}</div>
                        <div className="stat-change stat-change--positive">+12% from last month</div>
                    </div>
                </Card>

                <Card variant="gradient" className="stat-card">
                    <div className="stat-icon stat-icon--green">
                        <img src={badgeIcon} alt="Pass Rate" width="32" height="32" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Pass Rate</div>
                        <div className="stat-value">{stats?.passRate}%</div>
                        <div className="stat-change stat-change--positive">+2.3% from last month</div>
                    </div>
                </Card>

                <Card variant="gradient" className="stat-card">
                    <div className="stat-icon stat-icon--blue">
                        <img src={idCardIcon} alt="API Keys" width="32" height="32" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Active API Keys</div>
                        <div className="stat-value">{stats?.activeApiKeys}</div>
                        <div className="stat-change stat-change--neutral">No change</div>
                    </div>
                </Card>

                <Card variant="gradient" className="stat-card">
                    <div className="stat-icon stat-icon--purple">
                        <img src={fingerprintIcon} alt="API Calls" width="32" height="32" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">API Calls Today</div>
                        <div className="stat-value">{stats?.apiCallsToday?.toLocaleString()}</div>
                        <div className="stat-change stat-change--positive">+8% from yesterday</div>
                    </div>
                </Card>
            </div>

            {/* Chart & Activity */}
            <div className="dashboard-grid">
                <Card className="chart-card">
                    <div className="card__header">
                        <h3 className="card__title">Verification Trends</h3>
                        <select className="chart-period-select">
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                            <option>Last 90 days</option>
                        </select>
                    </div>
                    <div className="card__body">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={usageData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 148, 158, 0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#8b949e"
                                    tickFormatter={formatDate}
                                />
                                <YAxis stroke="#8b949e" />
                                <Tooltip
                                    contentStyle={{
                                        background: '#0f1218',
                                        border: '1px solid #1f2937',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="verifications"
                                    stroke="#00f2ff"
                                    strokeWidth={3}
                                    dot={{ fill: '#00f2ff', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="activity-card">
                    <div className="card__header">
                        <h3 className="card__title">Recent Activity</h3>
                    </div>
                    <div className="card__body">
                        <div className="activity-list">
                            {activityLog.map((activity) => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon">
                                        {activity.type === 'verification_completed' && '✓'}
                                        {activity.type === 'verification_failed' && '✗'}
                                        {activity.type === 'verification_pending' && '⏳'}
                                        {activity.type === 'api_key_created' && '🔑'}
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-description">{activity.description}</div>
                                        {activity.verificationId && (
                                            <div className="activity-meta">ID: {activity.verificationId}</div>
                                        )}
                                    </div>
                                    <div className="activity-time">{formatTime(activity.timestamp)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* System Services */}
            <Card>
                <div className="card__header">
                    <h3 className="card__title">System Services</h3>
                    <Badge variant="success">Uptime: {systemStatus?.uptime}%</Badge>
                </div>
                <div className="card__body">
                    <div className="services-grid">
                        {systemStatus?.services.map((service) => (
                            <div key={service.name} className="service-item">
                                <div className="service-status">
                                    <span className={`status-dot status-dot--${service.status}`}></span>
                                    <span className="service-name">{service.name}</span>
                                </div>
                                <div className="service-latency">
                                    <span className="latency-value">{service.latency}ms</span>
                                    <span className="latency-label">latency</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}
