import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import './Settings.css';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('team');
    const [team, setTeam] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettingsData();
    }, []);

    const fetchSettingsData = async () => {
        try {
            const [teamRes, webhooksRes] = await Promise.all([
                fetch('http://localhost:3001/team'),
                fetch('http://localhost:3001/webhooks')
            ]);

            const [teamData, webhooksData] = await Promise.all([
                teamRes.json(),
                webhooksRes.json()
            ]);

            setTeam(teamData);
            setWebhooks(webhooksData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings data:', error);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return <div className="page-loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="settings">
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="page-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'team' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('team')}
                >
                    Team Management
                </button>
                <button
                    className={`tab-btn ${activeTab === 'webhooks' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('webhooks')}
                >
                    Webhooks
                </button>
                <button
                    className={`tab-btn ${activeTab === 'profile' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
                <button
                    className={`tab-btn ${activeTab === 'security' ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    Security
                </button>
            </div>

            {/* Team Management Tab */}
            {activeTab === 'team' && (
                <Card>
                    <div className="card__header">
                        <h3 className="card__title">Team Members</h3>
                        <Button variant="primary" size="sm">Invite Member</Button>
                    </div>
                    <div className="card__body">
                        <div className="team-list">
                            {team.map((member) => (
                                <div key={member.id} className="team-member">
                                    <div className="member-avatar">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div className="member-info">
                                        <div className="member-name">{member.name}</div>
                                        <div className="member-email">{member.email}</div>
                                    </div>
                                    <Badge variant={member.role === 'Admin' ? 'info' : 'default'}>
                                        {member.role}
                                    </Badge>
                                    <div className="member-joined">
                                        Joined {formatDate(member.joinedDate)}
                                    </div>
                                    <button className="member-action-btn">•••</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Webhooks Tab */}
            {activeTab === 'webhooks' && (
                <Card>
                    <div className="card__header">
                        <h3 className="card__title">Webhook Endpoints</h3>
                        <Button variant="primary" size="sm">Add Webhook</Button>
                    </div>
                    <div className="card__body">
                        {webhooks.map((webhook) => (
                            <div key={webhook.id} className="webhook-item">
                                <div className="webhook-header">
                                    <code className="webhook-url">{webhook.url}</code>
                                    <Badge variant="success">{webhook.status}</Badge>
                                </div>
                                <div className="webhook-events">
                                    <span className="events-label">Events:</span>
                                    {webhook.events.map((event, idx) => (
                                        <span key={idx} className="event-tag">{event}</span>
                                    ))}
                                </div>
                                <div className="webhook-meta">
                                    <span>Created: {formatDate(webhook.created)}</span>
                                    <span>Last triggered: {formatDate(webhook.lastTriggered)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <Card>
                    <div className="card__header">
                        <h3 className="card__title">Profile Information</h3>
                    </div>
                    <div className="card__body">
                        <form className="settings-form">
                            <Input
                                label="Full Name"
                                name="name"
                                value="Sarah Chen"
                                placeholder="Enter your name"
                            />
                            <Input
                                label="Email Address"
                                type="email"
                                name="email"
                                value="demo@intactid.com"
                                placeholder="Enter your email"
                            />
                            <Input
                                label="Company Name"
                                name="company"
                                value="TechCorp Inc."
                                placeholder="Enter company name"
                            />
                            <Input
                                label="Phone Number"
                                type="tel"
                                name="phone"
                                value=""
                                placeholder="+1 (555) 123-4567"
                            />
                            <div className="form-actions">
                                <Button variant="primary">Save Changes</Button>
                                <Button variant="ghost">Cancel</Button>
                            </div>
                        </form>
                    </div>
                </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="security-section">
                    <Card className="security-card">
                        <div className="card__header">
                            <h3 className="card__title">Change Password</h3>
                        </div>
                        <div className="card__body">
                            <form className="settings-form">
                                <Input
                                    label="Current Password"
                                    type="password"
                                    name="currentPassword"
                                    placeholder="Enter current password"
                                />
                                <Input
                                    label="New Password"
                                    type="password"
                                    name="newPassword"
                                    placeholder="Enter new password"
                                />
                                <Input
                                    label="Confirm New Password"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirm new password"
                                />
                                <Button variant="primary">Update Password</Button>
                            </form>
                        </div>
                    </Card>

                    <Card className="security-card">
                        <div className="card__header">
                            <h3 className="card__title">Two-Factor Authentication</h3>
                            <Badge variant="warning">Not Enabled</Badge>
                        </div>
                        <div className="card__body">
                            <p className="security-description">
                                Add an extra layer of security to your account by enabling two-factor authentication.
                            </p>
                            <Button variant="secondary">Enable 2FA</Button>
                        </div>
                    </Card>

                    <Card className="security-card">
                        <div className="card__header">
                            <h3 className="card__title">Active Sessions</h3>
                        </div>
                        <div className="card__body">
                            <div className="session-item">
                                <div className="session-info">
                                    <div className="session-device">🖥️ Chrome on Linux</div>
                                    <div className="session-location">Current session</div>
                                </div>
                                <Badge variant="success">Active</Badge>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
