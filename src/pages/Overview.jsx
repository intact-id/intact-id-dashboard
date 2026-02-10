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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  DollarSign,
  Shield,
  CheckCircle,
  Key,
  Activity,
} from "lucide-react";
import analyticsService from "../services/analyticsService";
import kycService from "../services/kycService";
import "./Overview.css";

export default function Overview() {
  const [stats, setStats] = useState({
    totalVerifications: 0,
    passRate: 0,
    activeApiKeys: 0,
    apiCallsToday: 0,
  });
  const [usageData, setUsageData] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch real stats from analytics service
      const statsResponse = await analyticsService.getOverviewStats();

      // Fetch trends for chart
      const trendsResponse = await analyticsService.getVerificationTrends();

      // Fetch recent verifications for activity log
      const recentVerifications = await kycService.listVerifications(
        {},
        { page: 0, size: 10 },
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
        // Convert to activity log format
        const activities = recentVerifications.data.content
          .slice(0, 10)
          .map((v) => ({
            id: v.verificationId,
            type:
              v.status === "APPROVED"
                ? "verification_completed"
                : v.status === "REJECTED"
                  ? "verification_failed"
                  : "verification_pending",
            description: `${v.customerData?.firstName} ${v.customerData?.lastName} - ${v.status}`,
            verificationId: v.verificationId.substring(0, 13) + "...",
            timestamp: v.createdAt,
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
            <div className="card__body">
              <div className="activity-list">
                {activityLog.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === "verification_completed" && "●"}
                      {activity.type === "verification_failed" && "●"}
                      {activity.type === "verification_pending" && "●"}
                      {activity.type === "api_key_created" && "●"}
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">
                        {activity.description}
                      </div>
                      {activity.verificationId && (
                        <div className="activity-meta">
                          ID: {activity.verificationId}
                        </div>
                      )}
                    </div>
                    <div className="activity-time">
                      {formatTime(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
