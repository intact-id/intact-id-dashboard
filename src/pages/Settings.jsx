import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import userService from '../services/userService';
import companyService from '../services/companyService';
import authService from '../services/authService';
import './Settings.css';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('team');
    const [team, setTeam] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        fetchSettingsData(user);
    }, [activeTab]);

    const fetchSettingsData = async (user) => {
        setLoading(true);
        try {
            if (activeTab === 'team') {
                const teamData = await userService.getUsers();
                setTeam(teamData.data.content || []);
            } else if (activeTab === 'profile') {
                const companyData = await companyService.getCurrentCompany(user?.companyId);
                setCompany(companyData.data);
            }
            // Webhooks not yet implemented in backend
            setWebhooks([]);
        } catch (error) {
            console.error('Error fetching settings data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading && !company && team.length === 0) {
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
                            {team.length > 0 ? (
                                team.map((member) => (
                                    <div key={member.id} className="team-member">
                                        <div className="member-avatar">
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="member-info">
                                            <div className="member-name">{member.username}</div>
                                            <div className="member-email">{member.email}</div>
                                        </div>
                                        <div className="member-roles">
                                            {member.roles && member.roles.map(role => (
                                                <Badge key={role.id} variant="info" className="mr-1">
                                                    {role.name}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="member-joined">
                                            Joined {formatDate(member.createdAt)}
                                        </div>
                                        <button className="member-action-btn">•••</button>
                                    </div>
                                ))
                            ) : (
                                <div className="no-data">No team members found</div>
                            )}
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
                        <div className="placeholder-state">
                            <p>Webhook management is coming soon.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <Card>
                    <div className="card__header">
                        <h3 className="card__title">Company Profile</h3>
                    </div>
                    <div className="card__body">
                        <form className="settings-form">
                            <Input
                                label="Company Name"
                                name="company"
                                value={company?.legalName || ''}
                                placeholder="Company Name"
                                disabled
                            />
                            <Input
                                label="Trading Name"
                                name="tradingName"
                                value={company?.tradingName || ''}
                                placeholder="Trading Name"
                                disabled
                            />
                            <Input
                                label="Registration Number"
                                name="regNumber"
                                value={company?.registrationNumber || ''}
                                placeholder="Registration Number"
                                disabled
                            />
                            <Input
                                label="Country"
                                name="country"
                                value={company?.country || ''}
                                placeholder="Country"
                                disabled
                            />
                            <div className="form-actions">
                                <Button variant="primary" disabled>Save Changes</Button>
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
                                    <div className="session-device">Current Session</div>
                                    <div className="session-location">Logged in as {currentUser?.username}</div>
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
