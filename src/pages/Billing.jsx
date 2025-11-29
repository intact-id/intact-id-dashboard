import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import './Billing.css';

export default function Billing() {
    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            const response = await fetch('http://localhost:3001/billing');
            const data = await response.json();
            setBilling(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching billing data:', error);
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const usagePercentage = billing ? (billing.usedThisMonth / billing.monthlyQuota) * 100 : 0;

    if (loading) {
        return <div className="page-loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="billing">
            <div className="page-header">
                <div>
                    <h1>Billing & Usage</h1>
                    <p className="page-subtitle">Manage your subscription and view usage details</p>
                </div>
            </div>

            {/* Current Plan */}
            <Card variant="gradient" className="plan-card">
                <div className="plan-header">
                    <div>
                        <div className="plan-badge">
                            <Badge variant="info">Current Plan</Badge>
                        </div>
                        <h2 className="plan-name">{billing?.currentPlan}</h2>
                        <p className="plan-cycle">Billed {billing?.billingCycle}</p>
                    </div>
                    <div className="plan-cost">
                        <div className="cost-label">Current Month</div>
                        <div className="cost-value">{formatCurrency(billing?.currentMonthCost)}</div>
                    </div>
                </div>

                <div className="plan-features">
                    <h4>Plan Features</h4>
                    <div className="features-grid">
                        {billing?.features.map((feature, index) => (
                            <div key={index} className="feature-item">
                                <span className="feature-icon">✓</span>
                                <span className="feature-text">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Usage Meter */}
            <Card>
                <div className="card__header">
                    <h3 className="card__title">Monthly Usage</h3>
                    <Badge variant={usagePercentage > 90 ? 'warning' : 'info'}>
                        {billing?.usedThisMonth.toLocaleString()} / {billing?.monthlyQuota.toLocaleString()}
                    </Badge>
                </div>
                <div className="card__body">
                    <div className="usage-meter">
                        <div className="usage-bar">
                            <div
                                className={`usage-fill ${usagePercentage > 90 ? 'usage-fill--warning' : ''}`}
                                style={{ width: `${usagePercentage}%` }}
                            ></div>
                        </div>
                        <div className="usage-stats">
                            <div className="usage-stat">
                                <span className="stat-label">Used</span>
                                <span className="stat-value">{billing?.usedThisMonth.toLocaleString()}</span>
                            </div>
                            <div className="usage-stat">
                                <span className="stat-label">Remaining</span>
                                <span className="stat-value">{billing?.remainingQuota.toLocaleString()}</span>
                            </div>
                            <div className="usage-stat">
                                <span className="stat-label">Per Verification</span>
                                <span className="stat-value">{formatCurrency(billing?.costPerVerification)}</span>
                            </div>
                            <div className="usage-stat">
                                <span className="stat-label">Next Billing</span>
                                <span className="stat-value">{formatDate(billing?.nextBillingDate)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Pricing Tiers */}
            <div className="pricing-section">
                <h2 className="section-title">Available Plans</h2>
                <div className="pricing-grid">
                    <Card className="pricing-card">
                        <div className="pricing-header">
                            <h3>Start-up</h3>
                            <div className="pricing-cost">
                                <span className="price-value">$0.75</span>
                                <span className="price-unit">per verification</span>
                            </div>
                        </div>
                        <div className="pricing-features">
                            <div className="pricing-feature">✓ Up to 1,000 verifications/month</div>
                            <div className="pricing-feature">✓ 2 API Keys</div>
                            <div className="pricing-feature">✓ Email Support</div>
                            <div className="pricing-feature">✓ Basic Analytics</div>
                        </div>
                        <Button variant="ghost" size="md" className="pricing-btn">
                            Downgrade
                        </Button>
                    </Card>

                    <Card variant="gradient" className="pricing-card pricing-card--current">
                        <div className="current-plan-badge">
                            <Badge variant="success">Current Plan</Badge>
                        </div>
                        <div className="pricing-header">
                            <h3>Enterprise</h3>
                            <div className="pricing-cost">
                                <span className="price-value">$0.50</span>
                                <span className="price-unit">per verification</span>
                            </div>
                        </div>
                        <div className="pricing-features">
                            <div className="pricing-feature">✓ Up to 10,000 verifications/month</div>
                            <div className="pricing-feature">✓ Unlimited API Keys</div>
                            <div className="pricing-feature">✓ Priority Support</div>
                            <div className="pricing-feature">✓ Advanced Analytics</div>
                            <div className="pricing-feature">✓ Custom Webhooks</div>
                            <div className="pricing-feature">✓ Team Management</div>
                        </div>
                        <Button variant="primary" size="md" className="pricing-btn" disabled>
                            Current Plan
                        </Button>
                    </Card>

                    <Card className="pricing-card">
                        <div className="pricing-header">
                            <h3>Custom</h3>
                            <div className="pricing-cost">
                                <span className="price-value">Custom</span>
                                <span className="price-unit">pricing</span>
                            </div>
                        </div>
                        <div className="pricing-features">
                            <div className="pricing-feature">✓ Unlimited verifications</div>
                            <div className="pricing-feature">✓ Dedicated infrastructure</div>
                            <div className="pricing-feature">✓ 24/7 Premium Support</div>
                            <div className="pricing-feature">✓ Custom integrations</div>
                            <div className="pricing-feature">✓ SLA guarantees</div>
                            <div className="pricing-feature">✓ Dedicated account manager</div>
                        </div>
                        <Button variant="secondary" size="md" className="pricing-btn">
                            Contact Sales
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
