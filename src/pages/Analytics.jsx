import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, Globe, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Tabs from '../components/ui/Tabs';
import { useToast } from '../contexts/ToastContext';
import analyticsService from '../services/analyticsService';
import './Analytics.css';

export default function Analytics() {
    const [timeRange, setTimeRange] = useState('7d');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await analyticsService.getVerificationTrends();
            if (response.success) {
                // Map to expected format
                const formattedData = response.data.map(item => ({
                    date: item.date,
                    verifications: item.total,
                    approved: item.approved,
                    rejected: item.rejected,
                    pending: item.pending
                }));
                setAnalyticsData(formattedData);
            }
        } catch (error) {
            toast.error('Failed to load analytics data');
            setAnalyticsData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (format) => {
        toast.success(`Exporting analytics as ${format.toUpperCase()}`);
        // In production, this would generate and download the file
    };

    // Sample data for different visualizations
    const verificationByType = [
        { name: 'Identity', value: 456, percentage: 45.6 },
        { name: 'Age', value: 234, percentage: 23.4 },
        { name: 'Address', value: 189, percentage: 18.9 },
        { name: 'Biometric', value: 121, percentage: 12.1 }
    ];

    const verificationByCountry = [
        { country: 'United States', verifications: 345, passed: 312, failed: 33 },
        { country: 'Germany', verifications: 234, passed: 218, failed: 16 },
        { country: 'United Kingdom', verifications: 189, passed: 175, failed: 14 },
        { country: 'France', verifications: 156, passed: 143, failed: 13 },
        { country: 'Japan', verifications: 134, passed: 124, failed: 10 },
        { country: 'India', verifications: 123, passed: 109, failed: 14 }
    ];

    const funnelData = [
        { stage: 'Started', count: 1500, percentage: 100 },
        { stage: 'Document Uploaded', count: 1350, percentage: 90 },
        { stage: 'Verification Submitted', count: 1200, percentage: 80 },
        { stage: 'Under Review', count: 1100, percentage: 73 },
        { stage: 'Completed', count: 1050, percentage: 70 }
    ];

    const deviceBreakdown = [
        { name: 'Mobile', value: 58 },
        { name: 'Desktop', value: 32 },
        { name: 'Tablet', value: 10 }
    ];

    const COLORS = ['#00f2ff', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    const timeRangeOptions = [
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 90 Days' }
    ];

    const overviewTab = (
        <div className="analytics-grid">
            <Card variant="glass">
                <div className="metric-card">
                    <div className="metric-header">
                        <h3>Total Verifications</h3>
                        <TrendingUp size={20} className="metric-icon" />
                    </div>
                    <div className="metric-value">1,247</div>
                    <div className="metric-change positive">+12.5% vs last period</div>
                </div>
            </Card>

            <Card variant="glass">
                <div className="metric-card">
                    <div className="metric-header">
                        <h3>Success Rate</h3>
                        <BarChart3 size={20} className="metric-icon" />
                    </div>
                    <div className="metric-value">87.3%</div>
                    <div className="metric-change positive">+2.1% vs last period</div>
                </div>
            </Card>

            <Card variant="glass">
                <div className="metric-card">
                    <div className="metric-header">
                        <h3>Avg. Processing Time</h3>
                        <Calendar size={20} className="metric-icon" />
                    </div>
                    <div className="metric-value">2.3s</div>
                    <div className="metric-change negative">+0.2s vs last period</div>
                </div>
            </Card>

            <Card variant="glass">
                <div className="metric-card">
                    <div className="metric-header">
                        <h3>Countries</h3>
                        <Globe size={20} className="metric-icon" />
                    </div>
                    <div className="metric-value">47</div>
                    <div className="metric-change positive">+3 vs last period</div>
                </div>
            </Card>

            <Card variant="glass" className="chart-card-large">
                <h3 className="chart-title">Verification Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData || []}>
                        <defs>
                            <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00f2ff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{ background: '#0f1218', border: '1px solid #1f2937', borderRadius: '8px', color: '#fff' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="verifications"
                            stroke="#00f2ff"
                            fillOpacity={1}
                            fill="url(#colorVerifications)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Card>

            <Card variant="glass" className="chart-card">
                <h3 className="chart-title">Verification by Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={verificationByType}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name} ${percentage}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {verificationByType.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f1218', border: '1px solid #1f2937', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
            </Card>

            <Card variant="glass" className="chart-card">
                <h3 className="chart-title">Device Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={deviceBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name} ${value}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {deviceBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f1218', border: '1px solid #1f2937', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );

    const geographicTab = (
        <div className="analytics-grid">
            <Card variant="glass" className="chart-card-full">
                <h3 className="chart-title">Verifications by Country</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={verificationByCountry}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="country" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{ background: '#0f1218', border: '1px solid #1f2937', borderRadius: '8px', color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="passed" fill="#10b981" name="Passed" />
                        <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <div className="country-list">
                <h3>Top Countries</h3>
                {verificationByCountry.slice(0, 5).map((country, index) => (
                    <div key={country.country} className="country-item">
                        <div className="country-rank">#{index + 1}</div>
                        <div className="country-info">
                            <span className="country-name">{country.country}</span>
                            <span className="country-stats">
                                {country.verifications} verifications
                            </span>
                        </div>
                        <div className="country-bar">
                            <div
                                className="country-bar-fill"
                                style={{
                                    width: `${(country.verifications / verificationByCountry[0].verifications) * 100}%`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const funnelTab = (
        <div className="analytics-grid">
            <Card variant="glass" className="chart-card-full">
                <h3 className="chart-title">Verification Funnel</h3>
                <div className="funnel-container">
                    {funnelData.map((stage, index) => (
                        <div key={stage.stage} className="funnel-stage">
                            <div className="funnel-stage-info">
                                <span className="funnel-stage-name">{stage.stage}</span>
                                <span className="funnel-stage-count">{stage.count} ({stage.percentage}%)</span>
                            </div>
                            <div className="funnel-stage-bar">
                                <div
                                    className="funnel-stage-bar-fill"
                                    style={{
                                        width: `${stage.percentage}%`,
                                        background: `linear-gradient(90deg, ${COLORS[index]}, ${COLORS[index + 1] || COLORS[0]})`
                                    }}
                                />
                            </div>
                            {index < funnelData.length - 1 && (
                                <div className="funnel-drop">
                                    Drop: {funnelData[index].count - funnelData[index + 1].count}
                                    ({((funnelData[index].count - funnelData[index + 1].count) / funnelData[index].count * 100).toFixed(1)}%)
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );

    return (
        <div className="analytics-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        <BarChart3 size={28} />
                        Advanced Analytics
                    </h1>
                    <p className="page-subtitle">
                        Comprehensive insights and business intelligence
                    </p>
                </div>
                <div className="analytics-controls">
                    <Dropdown
                        options={timeRangeOptions}
                        value={timeRange}
                        onChange={setTimeRange}
                    />
                    <Button variant="secondary" onClick={() => handleExport('csv')}>
                        <Download size={18} />
                        Export CSV
                    </Button>
                    <Button variant="secondary" onClick={() => handleExport('pdf')}>
                        <Download size={18} />
                        Export PDF
                    </Button>
                </div>
            </div>

            <Tabs
                tabs={[
                    { label: 'Overview', icon: BarChart3, content: overviewTab },
                    { label: 'Geographic', icon: Globe, content: geographicTab },
                    { label: 'Funnel Analysis', icon: Filter, content: funnelTab }
                ]}
            />
        </div>
    );
}
