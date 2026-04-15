import { useState, useEffect } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Shield,
  CheckCircle,
  Key,
  Activity,
  X,
} from "lucide-react";
import analyticsService from "../services/analyticsService";
import kycService from "../services/kycService";
import "./Overview.css";
import "./Verifications.css";
import "../components/ModalStyles.css";

const getStatusVariant = (status) => {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'COMPLETED': return 'info';
    case 'REJECTED': return 'error';
    case 'FAILED': return 'error';
    case 'PENDING': return 'warning';
    case 'PROCESSING': return 'warning';
    case 'MANUAL_REVIEW': return 'warning';
    case 'SUBMITTED': return 'default';
    default: return 'default';
  }
};

const getDecisionVariant = (decision) => {
  switch (decision) {
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    case 'MANUAL_REVIEW': return 'info';
    default: return null;
  }
};

const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
};

export default function Overview() {
  const [stats, setStats] = useState({
    totalVerifications: 0,
    passRate: 0,
    activeApiKeys: 0,
    apiCallsToday: 0,
  });
  const [usageData, setUsageData] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    status: "operational",
    uptime: 99.9,
    services: [
      { name: "Verification API", status: "operational", latency: 45 },
      { name: "Face Screening", status: "operational", latency: 125 },
      { name: "Document Validation", status: "operational", latency: 65 },
      { name: "Webhook Service", status: "operational", latency: 25 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState('prod');

  useEffect(() => {
    fetchDashboardData();
  }, [environment]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch real stats from analytics service
      const statsResponse = await analyticsService.getOverviewStats(environment);

      // Fetch trends for chart
      const trendsResponse = await analyticsService.getVerificationTrends({}, environment);

      // Fetch recent verifications for activity log
      const recentVerifications = await kycService.listVerifications(
        {},
        { page: 0, size: 10 },
        environment,
      );

      if (statsResponse.success) {
        // Map service response to component state keys
        setStats({
          totalVerifications: statsResponse.data.totalVerifications,
          passRate: statsResponse.data.successRate, // Mapped from successRate
          activeApiKeys: statsResponse.data.activeApiKeys,
          apiCallsToday: statsResponse.data.apiCallsThisMonth, // Mapped from apiCallsThisMonth
        });
      }

      if (trendsResponse.success) {
        // Map to chart format
        const chartData = trendsResponse.data.map((item) => ({
          date: item.date,
          verifications: item.total,
        }));
        setUsageData(chartData);
      }

      if (recentVerifications.success) {
        const activities = recentVerifications.data.content
          .slice(0, 10)
          .map((v) => ({
            id: v.verificationId,
            firstName: v.customerData?.firstName || '',
            lastName: v.customerData?.lastName || '',
            email: v.customerData?.email || '',
            status: v.status,
            tier: v.verificationType || '-',
            overallDecision: v.overallDecision || null,
            verificationId: v.verificationId,
            timestamp: v.createdAt,
            raw: v,
          }));
        setActivityLog(activities);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set default values on error
      setStats({
        totalVerifications: 0,
        passRate: 0,
        activeApiKeys: 0,
        apiCallsToday: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
          <p className="overview-subtitle">
            Monitor your verification activity in real-time
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="env-toggle">
            <button
              className={`env-toggle-btn${environment === 'prod' ? ' active' : ''}`}
              onClick={() => setEnvironment('prod')}
            >
              Production
            </button>
            <button
              className={`env-toggle-btn${environment === 'dev' ? ' active' : ''}`}
              onClick={() => setEnvironment('dev')}
            >
              Development
            </button>
          </div>
          <div className="system-status-badge">
            <span
              className={`status-indicator status-indicator--${systemStatus?.status}`}
            ></span>
            <span>
              {systemStatus?.status === "operational"
                ? "All Systems Operational"
                : "System Issue"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Strip - Compact Top Row */}
      <div className="stats-strip">
        <Card variant="gradient" className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Verifications</div>
            <div className="stat-value">
              {stats?.totalVerifications?.toLocaleString()}
            </div>
          </div>
          <div className="stat-icon stat-icon--cyan">
            <Shield size={20} />
          </div>
        </Card>

        <Card variant="gradient" className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Success Rate</div>
            <div className="stat-value">{stats?.passRate}%</div>
          </div>
          <div className="stat-icon stat-icon--green">
            <CheckCircle size={20} />
          </div>
        </Card>

        <Card variant="gradient" className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Active API Keys</div>
            <div className="stat-value">{stats?.activeApiKeys}</div>
          </div>
          <div className="stat-icon stat-icon--blue">
            <Key size={20} />
          </div>
        </Card>

        <Card variant="gradient" className="stat-card">
          <div className="stat-content">
            <div className="stat-label">API Calls Today</div>
            <div className="stat-value">
              {stats?.apiCallsToday?.toLocaleString()}
            </div>
          </div>
          <div className="stat-icon stat-icon--amber">
            <Activity size={20} />
          </div>
        </Card>
      </div>

      {/* Bento Grid: Main Content & Side Panel */}
      <div className="bento-grid">
        {/* Left Column: Main Chart */}
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatDate}
                  dy={10}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10, 14, 39, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
                    color: "#F8FAFC",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#F8FAFC" }}
                  labelStyle={{ color: "#94A3B8" }}
                />
                <Line
                  type="monotone"
                  dataKey="verifications"
                  stroke="#6366F1"
                  strokeWidth={3}
                  dot={{
                    fill: "#0A0E27",
                    stroke: "#6366F1",
                    strokeWidth: 2,
                    r: 3,
                  }}
                  activeDot={{ r: 5, fill: "#06B6D4", stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right Column: Activity & Systems */}
        <div className="bento-side-panel">
          <Card className="activity-card">
            <div className="card__header">
              <h3 className="card__title">Recent Activity</h3>
            </div>
            <div className="card__body" style={{ overflowY: 'auto', padding: 0 }}>
              <table className="verifications-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLog.length === 0 ? (
                    <tr><td colSpan="4" className="empty-state">No recent activity</td></tr>
                  ) : activityLog.map((activity) => (
                    <tr key={activity.id} onClick={() => setSelectedActivity(activity)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="user-group">
                          <div className="user-avatar">
                            {getInitials(activity.firstName, activity.lastName)}
                          </div>
                          <div className="user-info">
                            <span className="user-name">
                              {activity.firstName || 'Unknown'} {activity.lastName}
                            </span>
                            <span className="user-sub">{activity.email || activity.verificationId.substring(0, 13) + '...'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={getStatusVariant(activity.status)} dot={true}>
                          {activity.status?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="text-secondary">{activity.tier}</td>
                      <td className="text-secondary">{formatTime(activity.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="system-card">
            <div className="card__header">
              <h3 className="card__title">System Status</h3>
              <Badge variant="success" className="uptime-badge">
                99.9% Uptime
              </Badge>
            </div>
            <div className="card__body">
              <div className="services-grid">
                {systemStatus?.services.map((service) => (
                  <div key={service.name} className="service-item">
                    <div className="service-status">
                      <span
                        className={`status-dot status-dot--${service.status}`}
                      ></span>
                      <span className="service-name">{service.name}</span>
                    </div>
                    <div className="service-latency">
                      <span className="latency-value">{service.latency}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="professional-modal verification-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedActivity(null)}><X size={18} /></button>
            <div className="modal-scroll-content">
              <div className="modal-top">
                <h2 className="modal-title">Verification Details</h2>
                <p className="modal-subtitle">ID: {selectedActivity.verificationId}</p>
                <div className="modal-badges">
                  <Badge variant={getStatusVariant(selectedActivity.status)} dot={true}>
                    {selectedActivity.status?.replace(/_/g, ' ')}
                  </Badge>
                  {selectedActivity.overallDecision && getDecisionVariant(selectedActivity.overallDecision) && (
                    <Badge variant={getDecisionVariant(selectedActivity.overallDecision)}>
                      {selectedActivity.overallDecision}
                    </Badge>
                  )}
                  {selectedActivity.tier && selectedActivity.tier !== '-' && (
                    <Badge variant="info">{selectedActivity.tier}</Badge>
                  )}
                </div>
              </div>

              <div className="modal-section">
                <div className="section-title">Summary</div>
                <div className="info-grid">
                  <div className="info-row"><span className="info-label">Company</span><span className="info-value">{selectedActivity.raw?.companyName || '-'}</span></div>
                  <div className="info-row"><span className="info-label">Verification Type</span><span className="info-value">{selectedActivity.raw?.verificationType || '-'}</span></div>
                  <div className="info-row">
                    <span className="info-label">Decision</span>
                    <span className="info-value">
                      {selectedActivity.overallDecision && getDecisionVariant(selectedActivity.overallDecision)
                        ? <Badge variant={getDecisionVariant(selectedActivity.overallDecision)}>{selectedActivity.overallDecision}</Badge>
                        : selectedActivity.overallDecision || '-'}
                    </span>
                  </div>
                  <div className="info-row"><span className="info-label">Created</span><span className="info-value">{formatDate(selectedActivity.timestamp)}</span></div>
                  <div className="info-row"><span className="info-label">Completed</span><span className="info-value">{formatDate(selectedActivity.raw?.completedAt)}</span></div>
                  <div className="info-row"><span className="info-label">Risk Score</span><span className="info-value">{selectedActivity.raw?.riskScore ?? '-'}</span></div>
                  <div className="info-row"><span className="info-label">Failure Reason</span><span className="info-value">{selectedActivity.raw?.failureReason || '-'}</span></div>
                </div>
              </div>

              <div className="modal-section">
                <div className="section-title">Customer Information</div>
                <div className="info-grid">
                  {selectedActivity.raw?.customerData && Object.entries(selectedActivity.raw.customerData).map(([key, value]) => (
                    <div key={key} className="info-row">
                      <span className="info-label" style={{ textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="info-value">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
