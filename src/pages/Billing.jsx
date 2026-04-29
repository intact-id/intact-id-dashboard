import { useEffect, useMemo, useState } from 'react';
import { Building2, CreditCard, RefreshCcw, Receipt, Send, Wallet } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyRole } from '../utils/roles';
import billingService from '../services/billingService';
import companyService from '../services/companyService';
import './Billing.css';

export default function Billing() {
    const { user } = useAuth();
    const isSuperAdmin = useMemo(() => hasAnyRole(user, ['SUPER_ADMIN']), [user]);
    const isCompanyUser = useMemo(() => hasAnyRole(user, ['COMPANY']), [user]);

    const [tiers, setTiers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [profile, setProfile] = useState(null);
    const [summary, setSummary] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [walletTransactions, setWalletTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [toppingUp, setToppingUp] = useState(false);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);
    const [sendingInvoiceId, setSendingInvoiceId] = useState(null);

    const [profileForm, setProfileForm] = useState({
        billingTierCode: 'TIER_1',
        billingMode: 'POSTPAID',
        unitPrice: '0.0000',
        currency: 'USD',
        billingEmail: '',
        billOnSubmission: false,
        billOnCompleted: true,
        billOnRejected: true,
        billOnFailedNonSystem: true,
        billOnFailedSystem: false,
        lowBalanceThreshold: '0.0000',
        creditLimit: '0.0000',
        invoiceDueDays: 30,
        status: 'ACTIVE',
        effectiveFrom: '',
        effectiveTo: ''
    });

    const [topUpForm, setTopUpForm] = useState({
        amount: '',
        currency: 'USD',
        reference: '',
        description: ''
    });

    const [invoiceForm, setInvoiceForm] = useState({
        periodStart: '',
        periodEnd: ''
    });

    useEffect(() => {
        bootstrap();
    }, [isSuperAdmin, isCompanyUser]);

    const bootstrap = async () => {
        setLoading(true);
        setError('');
        try {
            const tierResponse = await billingService.getTierCatalog().catch(() => ({ success: false, data: { tiers: [] } }));
            setTiers(tierResponse?.data?.tiers || []);

            if (isSuperAdmin) {
                const companyResponse = await companyService.getAllCompanies({}, { page: 0, size: 200 });
                const list = companyResponse?.data?.content || [];
                setCompanies(list);
                if (list.length > 0) {
                    await loadCompanyBilling(list[0]);
                }
            } else if (isCompanyUser) {
                await loadMyBilling();
            }
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    const loadMyBilling = async () => {
        setDetailLoading(true);
        setError('');
        try {
            const [profileResponse, summaryResponse, invoiceResponse, walletResponse] = await Promise.all([
                billingService.getMyBillingProfile(),
                billingService.getMyBillingSummary(),
                billingService.getMyInvoices(),
                billingService.getMyWalletTransactions()
            ]);

            setProfile(profileResponse?.data || null);
            setSummary(summaryResponse?.data || null);
            setInvoices(invoiceResponse?.data || []);
            setWalletTransactions(walletResponse?.data || []);
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to load company billing details');
        } finally {
            setDetailLoading(false);
        }
    };

    const loadCompanyBilling = async (company) => {
        setSelectedCompany(company);
        setDetailLoading(true);
        setError('');
        setSuccess('');
        try {
            const [profileResponse, summaryResponse, invoiceResponse, walletResponse] = await Promise.all([
                billingService.getCompanyBillingProfile(company.id),
                billingService.getCompanyBillingSummary(company.id),
                billingService.getCompanyInvoices(company.id),
                billingService.getCompanyWalletTransactions(company.id)
            ]);

            const nextProfile = profileResponse?.data || null;
            setProfile(nextProfile);
            setSummary(summaryResponse?.data || null);
            setInvoices(invoiceResponse?.data || []);
            setWalletTransactions(walletResponse?.data || []);

            if (nextProfile) {
                setProfileForm({
                    billingTierCode: nextProfile.billingTierCode || 'TIER_1',
                    billingMode: nextProfile.billingMode || 'POSTPAID',
                    unitPrice: `${nextProfile.unitPrice ?? '0.0000'}`,
                    currency: nextProfile.currency || 'USD',
                    billingEmail: nextProfile.billingEmail || '',
                    billOnSubmission: !!nextProfile.billOnSubmission,
                    billOnCompleted: !!nextProfile.billOnCompleted,
                    billOnRejected: !!nextProfile.billOnRejected,
                    billOnFailedNonSystem: !!nextProfile.billOnFailedNonSystem,
                    billOnFailedSystem: !!nextProfile.billOnFailedSystem,
                    lowBalanceThreshold: `${nextProfile.lowBalanceThreshold ?? '0.0000'}`,
                    creditLimit: `${nextProfile.creditLimit ?? '0.0000'}`,
                    invoiceDueDays: nextProfile.invoiceDueDays ?? 30,
                    status: nextProfile.status || 'ACTIVE',
                    effectiveFrom: nextProfile.effectiveFrom || '',
                    effectiveTo: nextProfile.effectiveTo || ''
                });
                setTopUpForm((prev) => ({ ...prev, currency: nextProfile.currency || 'USD' }));
            }
        } catch (err) {
            setProfile(null);
            setSummary(null);
            setInvoices([]);
            setWalletTransactions([]);
            const message = err.response?.status === 404
                ? 'No billing profile found for this company yet. Configure one below.'
                : (err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to load billing details');
            setError(message);
        } finally {
            setDetailLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(Number(amount || 0));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const selectedTier = tiers.find((tier) => tier.tierKey === (profile?.billingTierCode || profileForm.billingTierCode));
    const canTopUp = (profile?.billingMode || profileForm.billingMode) === 'PREPAID';

    const handleProfileChange = (field, value) => {
        setProfileForm((prev) => ({ ...prev, [field]: value }));
    };

    const saveProfile = async () => {
        if (!selectedCompany) return;
        setSavingProfile(true);
        setError('');
        setSuccess('');
        try {
            await billingService.updateCompanyBillingProfile(selectedCompany.id, {
                ...profileForm,
                unitPrice: Number(profileForm.unitPrice),
                lowBalanceThreshold: Number(profileForm.lowBalanceThreshold),
                creditLimit: Number(profileForm.creditLimit),
                invoiceDueDays: Number(profileForm.invoiceDueDays)
            });
            setSuccess('Billing profile saved successfully.');
            await loadCompanyBilling(selectedCompany);
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to save billing profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const submitTopUp = async () => {
        if (!selectedCompany) return;
        setToppingUp(true);
        setError('');
        setSuccess('');
        try {
            await billingService.topUpWallet(selectedCompany.id, {
                ...topUpForm,
                amount: Number(topUpForm.amount)
            });
            setSuccess('Wallet topped up successfully.');
            setTopUpForm((prev) => ({ ...prev, amount: '', reference: '', description: '' }));
            await loadCompanyBilling(selectedCompany);
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to top up wallet');
        } finally {
            setToppingUp(false);
        }
    };

    const generateInvoice = async () => {
        if (!selectedCompany) return;
        setGeneratingInvoice(true);
        setError('');
        setSuccess('');
        try {
            await billingService.generateInvoice(selectedCompany.id, invoiceForm);
            setSuccess('Invoice generated successfully.');
            await loadCompanyBilling(selectedCompany);
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to generate invoice');
        } finally {
            setGeneratingInvoice(false);
        }
    };

    const sendInvoice = async (invoiceId, recipientEmail) => {
        setSendingInvoiceId(invoiceId);
        setError('');
        setSuccess('');
        try {
            await billingService.sendInvoice(invoiceId, recipientEmail || undefined);
            setSuccess('Invoice email sent successfully.');
            if (selectedCompany) {
                await loadCompanyBilling(selectedCompany);
            } else {
                await loadMyBilling();
            }
        } catch (err) {
            setError(err.response?.data?.responseMessage || err.response?.data?.errorMessage || err.message || 'Failed to send invoice');
        } finally {
            setSendingInvoiceId(null);
        }
    };

    if (loading) {
        return <div className="page-loading"><div className="spinner"></div></div>;
    }

    if (!isSuperAdmin && !isCompanyUser) {
        return (
            <div className="billing">
                <div className="page-header">
                    <div>
                        <h1>Billing & Usage</h1>
                    </div>
                </div>
                <Card className="billing-empty">This page is available to `SUPER_ADMIN` and `COMPANY` users only.</Card>
            </div>
        );
    }

    return (
        <div className="billing">
            <div className="page-header">
                <div>
                    <h1>Billing & Usage</h1>
                    <p className="page-subtitle">
                        {isSuperAdmin ? 'Manage company billing profiles, wallets, and invoices.' : 'Review your billing profile, balance, and invoices.'}
                    </p>
                </div>
                <Button variant="secondary" onClick={bootstrap}>
                    <RefreshCcw size={14} />
                    Refresh
                </Button>
            </div>

            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}

            <div className={`billing-layout ${isSuperAdmin ? 'billing-layout--admin' : ''}`}>
                {isSuperAdmin && (
                    <Card className="billing-sidebar">
                        <div className="panel-header">
                            <h3>Companies</h3>
                            <Badge variant="info">{companies.length}</Badge>
                        </div>
                        <div className="billing-company-list">
                            {companies.map((company) => (
                                <button
                                    key={company.id}
                                    className={`billing-company-item ${selectedCompany?.id === company.id ? 'active' : ''}`}
                                    onClick={() => loadCompanyBilling(company)}
                                >
                                    <div className="billing-company-main">
                                        <Building2 size={14} />
                                        <span>{company.legalName}</span>
                                    </div>
                                    <Badge variant={company.status === 'ACTIVE' ? 'success' : 'warning'}>
                                        {company.status}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </Card>
                )}

                <div className="billing-main">
                    {detailLoading ? (
                        <Card className="billing-empty">Loading billing details...</Card>
                    ) : (
                        <>
                            <Card variant="gradient" className="plan-card">
                                <div className="plan-header">
                                    <div>
                                        <div className="plan-badge">
                                            <Badge variant="info">{isSuperAdmin ? 'Selected Company' : 'Active Billing Profile'}</Badge>
                                        </div>
                                        <h2 className="plan-name">{selectedTier?.name || profile?.billingTierCode || 'Billing not configured'}</h2>
                                        <p className="plan-cycle">
                                            {isSuperAdmin ? (selectedCompany?.legalName || 'No company selected') : 'Authenticated company billing'}
                                        </p>
                                    </div>
                                    <div className="plan-cost">
                                        <div className="cost-label">Unit Price</div>
                                        <div className="cost-value">{formatCurrency(profile?.unitPrice || profileForm.unitPrice)}</div>
                                    </div>
                                </div>

                                <div className="plan-meta-grid">
                                    <div className="plan-meta-card">
                                        <span className="meta-label">Billing Mode</span>
                                        <strong>{profile?.billingMode || profileForm.billingMode}</strong>
                                    </div>
                                    <div className="plan-meta-card">
                                        <span className="meta-label">Current Balance</span>
                                        <strong>{formatCurrency(summary?.currentBalance)}</strong>
                                    </div>
                                    <div className="plan-meta-card">
                                        <span className="meta-label">Ready To Invoice</span>
                                        <strong>{formatCurrency(summary?.readyToInvoiceAmount)}</strong>
                                    </div>
                                    <div className="plan-meta-card">
                                        <span className="meta-label">Credit Limit</span>
                                        <strong>{formatCurrency(profile?.creditLimit || profileForm.creditLimit)}</strong>
                                    </div>
                                </div>

                                <div className="plan-features">
                                    <h4>Tier Features</h4>
                                    <div className="features-grid">
                                        {(selectedTier?.features || []).map((feature, index) => (
                                            <div key={index} className="feature-item">
                                                <span className="feature-icon">•</span>
                                                <span className="feature-text">{feature}</span>
                                            </div>
                                        ))}
                                        {!selectedTier?.features?.length && (
                                            <div className="feature-empty">No tier features available.</div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <div className="summary-grid">
                                <Card className="summary-card">
                                    <div className="summary-icon"><Wallet size={18} /></div>
                                    <span className="summary-label">Debited</span>
                                    <strong>{formatCurrency(summary?.debitedAmount)}</strong>
                                </Card>
                                <Card className="summary-card">
                                    <div className="summary-icon"><Receipt size={18} /></div>
                                    <span className="summary-label">Invoiced</span>
                                    <strong>{formatCurrency(summary?.invoicedAmount)}</strong>
                                </Card>
                                <Card className="summary-card">
                                    <div className="summary-icon"><CreditCard size={18} /></div>
                                    <span className="summary-label">Low Balance Threshold</span>
                                    <strong>{formatCurrency(profile?.lowBalanceThreshold || profileForm.lowBalanceThreshold)}</strong>
                                </Card>
                            </div>

                            {isSuperAdmin && selectedCompany && (
                                <div className="admin-grid">
                                    <Card className="billing-form-card">
                                        <div className="card__header">
                                            <h3 className="card__title">Billing Profile</h3>
                                        </div>
                                        <div className="form-grid">
                                            <label>
                                                <span>Tier</span>
                                                <select value={profileForm.billingTierCode} onChange={(e) => handleProfileChange('billingTierCode', e.target.value)} className="billing-input">
                                                    {tiers.map((tier) => (
                                                        <option key={tier.tierKey} value={tier.tierKey}>{tier.tierKey} - {tier.name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label>
                                                <span>Billing Mode</span>
                                                <select value={profileForm.billingMode} onChange={(e) => handleProfileChange('billingMode', e.target.value)} className="billing-input">
                                                    <option value="POSTPAID">POSTPAID</option>
                                                    <option value="PREPAID">PREPAID</option>
                                                </select>
                                            </label>
                                            <label>
                                                <span>Unit Price</span>
                                                <input className="billing-input" value={profileForm.unitPrice} onChange={(e) => handleProfileChange('unitPrice', e.target.value)} />
                                            </label>
                                            <label>
                                                <span>Currency</span>
                                                <input className="billing-input" value={profileForm.currency} onChange={(e) => handleProfileChange('currency', e.target.value.toUpperCase())} />
                                            </label>
                                            <label>
                                                <span>Billing Email</span>
                                                <input className="billing-input" value={profileForm.billingEmail} onChange={(e) => handleProfileChange('billingEmail', e.target.value)} />
                                            </label>
                                            <label>
                                                <span>Status</span>
                                                <select value={profileForm.status} onChange={(e) => handleProfileChange('status', e.target.value)} className="billing-input">
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="SUSPENDED">SUSPENDED</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                </select>
                                            </label>
                                            <label>
                                                <span>Low Balance Threshold</span>
                                                <input className="billing-input" value={profileForm.lowBalanceThreshold} onChange={(e) => handleProfileChange('lowBalanceThreshold', e.target.value)} />
                                            </label>
                                            <label>
                                                <span>Credit Limit</span>
                                                <input className="billing-input" value={profileForm.creditLimit} onChange={(e) => handleProfileChange('creditLimit', e.target.value)} />
                                            </label>
                                            <label>
                                                <span>Invoice Due Days</span>
                                                <input className="billing-input" type="number" value={profileForm.invoiceDueDays} onChange={(e) => handleProfileChange('invoiceDueDays', e.target.value)} />
                                            </label>
                                            <label>
                                                <span>Effective From</span>
                                                <input className="billing-input" type="date" value={profileForm.effectiveFrom} onChange={(e) => handleProfileChange('effectiveFrom', e.target.value)} />
                                            </label>
                                            <label>
                                                <span>Effective To</span>
                                                <input className="billing-input" type="date" value={profileForm.effectiveTo} onChange={(e) => handleProfileChange('effectiveTo', e.target.value)} />
                                            </label>
                                        </div>

                                        <div className="billing-switches">
                                            {[
                                                ['billOnSubmission', 'Bill On Submission'],
                                                ['billOnCompleted', 'Bill On Completion'],
                                                ['billOnRejected', 'Bill On Rejection'],
                                                ['billOnFailedNonSystem', 'Bill On Non-System Failure'],
                                                ['billOnFailedSystem', 'Bill On System Failure']
                                            ].map(([field, label]) => (
                                                <label key={field} className="switch-row">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!profileForm[field]}
                                                        onChange={(e) => handleProfileChange(field, e.target.checked)}
                                                    />
                                                    <span>{label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="billing-actions">
                                            <Button onClick={saveProfile} disabled={savingProfile}>
                                                Save Profile
                                            </Button>
                                        </div>
                                    </Card>

                                    <div className="admin-side-stack">
                                        <Card className="billing-form-card">
                                            <div className="card__header">
                                                <h3 className="card__title">Wallet Top-Up</h3>
                                            </div>
                                            <div className="form-grid form-grid--compact">
                                                <label>
                                                    <span>Amount</span>
                                                    <input className="billing-input" value={topUpForm.amount} onChange={(e) => setTopUpForm((prev) => ({ ...prev, amount: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span>Currency</span>
                                                    <input className="billing-input" value={topUpForm.currency} onChange={(e) => setTopUpForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
                                                </label>
                                                <label>
                                                    <span>Reference</span>
                                                    <input className="billing-input" value={topUpForm.reference} onChange={(e) => setTopUpForm((prev) => ({ ...prev, reference: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span>Description</span>
                                                    <input className="billing-input" value={topUpForm.description} onChange={(e) => setTopUpForm((prev) => ({ ...prev, description: e.target.value }))} />
                                                </label>
                                            </div>
                                            <Button onClick={submitTopUp} disabled={toppingUp || !canTopUp}>
                                                Top Up Wallet
                                            </Button>
                                            {!canTopUp && <p className="helper-text">Top-up is only available for PREPAID companies.</p>}
                                        </Card>

                                        <Card className="billing-form-card">
                                            <div className="card__header">
                                                <h3 className="card__title">Generate Invoice</h3>
                                            </div>
                                            <div className="form-grid form-grid--compact">
                                                <label>
                                                    <span>Period Start</span>
                                                    <input className="billing-input" type="date" value={invoiceForm.periodStart} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, periodStart: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span>Period End</span>
                                                    <input className="billing-input" type="date" value={invoiceForm.periodEnd} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, periodEnd: e.target.value }))} />
                                                </label>
                                            </div>
                                            <Button onClick={generateInvoice} disabled={generatingInvoice || profile?.billingMode !== 'POSTPAID'}>
                                                Generate Invoice
                                            </Button>
                                            {profile?.billingMode !== 'POSTPAID' && <p className="helper-text">Invoice generation is available for POSTPAID companies.</p>}
                                        </Card>
                                    </div>
                                </div>
                            )}

                            <div className="billing-data-grid">
                                <Card className="billing-table-card">
                                    <div className="panel-header">
                                        <h3>Invoices</h3>
                                        <Badge variant="info">{invoices.length}</Badge>
                                    </div>
                                    {invoices.length === 0 ? (
                                        <div className="billing-empty">No invoices available.</div>
                                    ) : (
                                        <div className="table-wrap">
                                            <table className="billing-table">
                                                <thead>
                                                    <tr>
                                                        <th>Invoice</th>
                                                        <th>Period</th>
                                                        <th>Total</th>
                                                        <th>Status</th>
                                                        <th>Recipient</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invoices.map((invoice) => (
                                                        <tr key={invoice.id}>
                                                            <td>{invoice.invoiceNumber}</td>
                                                            <td>{formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</td>
                                                            <td>{formatCurrency(invoice.total)}</td>
                                                            <td><Badge variant={invoice.status === 'PAID' ? 'success' : invoice.status === 'SENT' ? 'info' : 'warning'}>{invoice.status}</Badge></td>
                                                            <td>{invoice.recipientEmail || 'Pending resolution'}</td>
                                                            <td>
                                                                {isSuperAdmin ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={sendingInvoiceId === invoice.id}
                                                                        onClick={() => sendInvoice(invoice.id, invoice.recipientEmail)}
                                                                    >
                                                                        <Send size={14} />
                                                                        Send
                                                                    </Button>
                                                                ) : 'View only'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>

                                <Card className="billing-table-card">
                                    <div className="panel-header">
                                        <h3>Wallet Transactions</h3>
                                        <Badge variant="info">{walletTransactions.length}</Badge>
                                    </div>
                                    {walletTransactions.length === 0 ? (
                                        <div className="billing-empty">No wallet transactions available.</div>
                                    ) : (
                                        <div className="table-wrap">
                                            <table className="billing-table">
                                                <thead>
                                                    <tr>
                                                        <th>Type</th>
                                                        <th>Amount</th>
                                                        <th>Reference</th>
                                                        <th>Balance After</th>
                                                        <th>Created</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {walletTransactions.map((transaction) => (
                                                        <tr key={transaction.id}>
                                                            <td><Badge variant={transaction.type === 'TOPUP' ? 'success' : 'warning'}>{transaction.type}</Badge></td>
                                                            <td>{formatCurrency(transaction.amount)}</td>
                                                            <td>{transaction.reference || '-'}</td>
                                                            <td>{formatCurrency(transaction.balanceAfter)}</td>
                                                            <td>{formatDate(transaction.createdAt)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            </div>

                            <div className="pricing-section">
                                <h2 className="section-title">Tier Catalog</h2>
                                <div className="pricing-grid">
                                    {tiers.map((tier) => (
                                        <Card
                                            key={tier.tierKey}
                                            className={`pricing-card ${(profile?.billingTierCode || profileForm.billingTierCode) === tier.tierKey ? 'pricing-card--current' : ''}`}
                                        >
                                            <div className="pricing-header">
                                                <h3>{tier.name}</h3>
                                                <div className="pricing-cost">
                                                    <span className="price-value">${tier.priceRange?.[0] ?? '0.00'} - ${tier.priceRange?.[1] ?? '0.00'}</span>
                                                    <span className="price-unit">per verification</span>
                                                </div>
                                            </div>
                                            <div className="pricing-features">
                                                {(tier.features || []).slice(0, 6).map((feature, index) => (
                                                    <div key={index} className="pricing-feature">{feature}</div>
                                                ))}
                                            </div>
                                            <Badge variant={(profile?.billingTierCode || profileForm.billingTierCode) === tier.tierKey ? 'success' : 'default'}>
                                                {tier.tierKey}
                                            </Badge>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
