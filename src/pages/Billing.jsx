import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Send, ChevronDown } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
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
    const isPrepaid = summary?.billingMode === 'PREPAID' || (profile?.billingMode || profileForm.billingMode) === 'PREPAID';

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
            <div className="billing billing--static">
                <div className="page-header">
                    <div>
                        <h1>Billing & Usage</h1>
                    </div>
                </div>
                <div className="billing-panel billing-empty">This page is available to `SUPER_ADMIN` and `COMPANY` users only.</div>
            </div>
        );
    }

    const invoicesTabContent = (
        invoices.length === 0 ? (
            <div className="billing-empty">No invoices available.</div>
        ) : (
            <div className="scroll-container">
                <table className="billing-table">
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Period</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Recipient</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr key={invoice.id}>
                                <td className="mono">{invoice.invoiceNumber}</td>
                                <td>{formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}</td>
                                <td>{formatCurrency(invoice.total)}</td>
                                <td><Badge variant={invoice.status === 'PAID' ? 'success' : invoice.status === 'SENT' ? 'info' : 'warning'}>{invoice.status}</Badge></td>
                                <td className="text-tertiary">{invoice.recipientEmail || 'Pending resolution'}</td>
                                <td className="cell-action">
                                    {isSuperAdmin && (
                                        <button
                                            className="icon-btn"
                                            disabled={sendingInvoiceId === invoice.id}
                                            onClick={() => sendInvoice(invoice.id, invoice.recipientEmail)}
                                            title="Send invoice"
                                        >
                                            <Send size={14} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    );

    const transactionsTabContent = (
        walletTransactions.length === 0 ? (
            <div className="billing-empty">{isPrepaid ? 'No wallet transactions available.' : 'No debit transactions recorded.'}</div>
        ) : (
            <div className="scroll-container">
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
                                <td className="text-tertiary">{transaction.reference || '-'}</td>
                                <td>{formatCurrency(transaction.balanceAfter)}</td>
                                <td className="text-tertiary">{formatDate(transaction.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    );

    const profileTabContent = (
        <div className="tab-scroll">
            <div className="field-grid">
                <label className="field">
                    <span>Tier</span>
                    <select value={profileForm.billingTierCode} onChange={(e) => handleProfileChange('billingTierCode', e.target.value)} className="field-input">
                        {tiers.map((tier) => (
                            <option key={tier.tierKey} value={tier.tierKey}>{tier.tierKey} — {tier.name}</option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Billing Mode</span>
                    <select value={profileForm.billingMode} onChange={(e) => handleProfileChange('billingMode', e.target.value)} className="field-input">
                        <option value="POSTPAID">POSTPAID</option>
                        <option value="PREPAID">PREPAID</option>
                    </select>
                </label>
                <label className="field">
                    <span>Unit Price</span>
                    <input className="field-input" value={profileForm.unitPrice} onChange={(e) => handleProfileChange('unitPrice', e.target.value)} />
                </label>
                <label className="field">
                    <span>Currency</span>
                    <input className="field-input" value={profileForm.currency} onChange={(e) => handleProfileChange('currency', e.target.value.toUpperCase())} />
                </label>
                <label className="field">
                    <span>Billing Email</span>
                    <input className="field-input" value={profileForm.billingEmail} onChange={(e) => handleProfileChange('billingEmail', e.target.value)} />
                </label>
                <label className="field">
                    <span>Status</span>
                    <select value={profileForm.status} onChange={(e) => handleProfileChange('status', e.target.value)} className="field-input">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </label>
                <label className="field">
                    <span>Low Balance Threshold</span>
                    <input className="field-input" value={profileForm.lowBalanceThreshold} onChange={(e) => handleProfileChange('lowBalanceThreshold', e.target.value)} />
                </label>
                <label className="field">
                    <span>Credit Limit</span>
                    <input className="field-input" value={profileForm.creditLimit} onChange={(e) => handleProfileChange('creditLimit', e.target.value)} />
                </label>
                <label className="field">
                    <span>Invoice Due Days</span>
                    <input className="field-input" type="number" value={profileForm.invoiceDueDays} onChange={(e) => handleProfileChange('invoiceDueDays', e.target.value)} />
                </label>
                <label className="field">
                    <span>Effective From</span>
                    <input className="field-input" type="date" value={profileForm.effectiveFrom} onChange={(e) => handleProfileChange('effectiveFrom', e.target.value)} />
                </label>
                <label className="field">
                    <span>Effective To</span>
                    <input className="field-input" type="date" value={profileForm.effectiveTo} onChange={(e) => handleProfileChange('effectiveTo', e.target.value)} />
                </label>
            </div>

            <div className="field-toggles">
                {[
                    ['billOnSubmission', 'Bill on submission'],
                    ['billOnCompleted', 'Bill on completion'],
                    ['billOnRejected', 'Bill on rejection'],
                    ['billOnFailedNonSystem', 'Bill on non-system failure'],
                    ['billOnFailedSystem', 'Bill on system failure']
                ].map(([field, label]) => (
                    <label key={field} className="toggle-row">
                        <input
                            type="checkbox"
                            checked={!!profileForm[field]}
                            onChange={(e) => handleProfileChange(field, e.target.checked)}
                        />
                        <span>{label}</span>
                    </label>
                ))}
            </div>

            <div className="tab-actions">
                <Button onClick={saveProfile} disabled={savingProfile}>Save Profile</Button>
            </div>
        </div>
    );

    const walletTabContent = (
        <div className="tab-scroll">
            <div className="wallet-actions-grid">
                <div className="wallet-action">
                    <h4>Top Up Wallet</h4>
                    <p className="text-tertiary">Credit the company wallet immediately. Available for PREPAID companies only.</p>
                    <div className="field-grid field-grid--single">
                        <label className="field">
                            <span>Amount</span>
                            <input className="field-input" value={topUpForm.amount} onChange={(e) => setTopUpForm((prev) => ({ ...prev, amount: e.target.value }))} />
                        </label>
                        <label className="field">
                            <span>Currency</span>
                            <input className="field-input" value={topUpForm.currency} onChange={(e) => setTopUpForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} />
                        </label>
                        <label className="field">
                            <span>Reference</span>
                            <input className="field-input" value={topUpForm.reference} onChange={(e) => setTopUpForm((prev) => ({ ...prev, reference: e.target.value }))} />
                        </label>
                        <label className="field">
                            <span>Description</span>
                            <input className="field-input" value={topUpForm.description} onChange={(e) => setTopUpForm((prev) => ({ ...prev, description: e.target.value }))} />
                        </label>
                    </div>
                    <div className="tab-actions">
                        <Button onClick={submitTopUp} disabled={toppingUp || !canTopUp}>Top Up Wallet</Button>
                    </div>
                    {!canTopUp && <p className="helper-text">Only available for PREPAID companies.</p>}
                </div>

                <div className="wallet-action">
                    <h4>Generate Invoice</h4>
                    <p className="text-tertiary">Roll up charges for a period into a new invoice. Available for POSTPAID companies only.</p>
                    <div className="field-grid field-grid--single">
                        <label className="field">
                            <span>Period Start</span>
                            <input className="field-input" type="date" value={invoiceForm.periodStart} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, periodStart: e.target.value }))} />
                        </label>
                        <label className="field">
                            <span>Period End</span>
                            <input className="field-input" type="date" value={invoiceForm.periodEnd} onChange={(e) => setInvoiceForm((prev) => ({ ...prev, periodEnd: e.target.value }))} />
                        </label>
                    </div>
                    <div className="tab-actions">
                        <Button onClick={generateInvoice} disabled={generatingInvoice || profile?.billingMode !== 'POSTPAID'}>Generate Invoice</Button>
                    </div>
                    {profile?.billingMode !== 'POSTPAID' && <p className="helper-text">Only available for POSTPAID companies.</p>}
                </div>
            </div>
        </div>
    );

    const plansTabContent = (
        <div className="scroll-container">
            <table className="billing-table plans-table">
                <thead>
                    <tr>
                        <th>Tier</th>
                        <th>Price / Verification</th>
                        <th>Highlights</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {tiers.map((tier) => {
                        const isCurrent = (profile?.billingTierCode || profileForm.billingTierCode) === tier.tierKey;
                        return (
                            <tr key={tier.tierKey} className={isCurrent ? 'row-current' : ''}>
                                <td>
                                    <span className="text-primary">{tier.name}</span>
                                    <span className="tier-key mono">{tier.tierKey}</span>
                                </td>
                                <td>${tier.priceRange?.[0] ?? '0.00'} – ${tier.priceRange?.[1] ?? '0.00'}</td>
                                <td className="text-tertiary">{(tier.features || []).slice(0, 3).join(' · ') || '—'}</td>
                                <td className="cell-action">{isCurrent && <Badge variant="success">Current</Badge>}</td>
                            </tr>
                        );
                    })}
                    {tiers.length === 0 && (
                        <tr><td colSpan={4} className="billing-empty">No tiers available.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const tabs = [];
    if (isSuperAdmin && selectedCompany) {
        tabs.push({ label: 'Billing Profile', content: profileTabContent });
        tabs.push({ label: 'Wallet & Invoicing', content: walletTabContent });
    }
    tabs.push({ label: 'Invoices', badge: invoices.length || undefined, content: invoicesTabContent });
    tabs.push({ label: isPrepaid ? 'Wallet Transactions' : 'Charge Activity', badge: walletTransactions.length || undefined, content: transactionsTabContent });
    tabs.push({ label: 'Plans', content: plansTabContent });

    return (
        <div className="billing">
            <div className="page-header">
                <div>
                    <h1>Billing & Usage</h1>
                    <p className="page-subtitle">
                        {isSuperAdmin ? 'Manage company billing profiles, credit, wallet funding, and invoices.' : 'Track your live balance, credit position, and billing history.'}
                    </p>
                </div>
                <div className="page-header-actions">
                    {isSuperAdmin && (
                        <div className="company-select">
                            <select
                                value={selectedCompany?.id || ''}
                                onChange={(e) => {
                                    const next = companies.find((c) => String(c.id) === e.target.value);
                                    if (next) loadCompanyBilling(next);
                                }}
                            >
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>{company.legalName}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="company-select__chevron" />
                        </div>
                    )}
                    <Button variant="secondary" onClick={bootstrap}>
                        <RefreshCcw size={14} />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}

            {detailLoading ? (
                <div className="billing-panel billing-empty">Loading billing details…</div>
            ) : (
                <>
                    <div className="billing-context">
                        <div className="billing-context__plan">
                            <span className="billing-context__name">{selectedTier?.name || profile?.billingTierCode || 'Not configured'}</span>
                            <Badge variant="info">{profile?.billingMode || profileForm.billingMode}</Badge>
                            {isSuperAdmin && selectedCompany && (
                                <span className="billing-context__company">{selectedCompany.legalName}</span>
                            )}
                        </div>
                        <div className="billing-context__stats">
                            <div className="stat">
                                <span className="stat__label">Unit Price</span>
                                <strong className="stat__value">{formatCurrency(profile?.unitPrice || profileForm.unitPrice)}</strong>
                            </div>
                            <div className="stat">
                                <span className="stat__label">{isPrepaid ? 'Balance' : 'Outstanding'}</span>
                                <strong className={`stat__value ${isPrepaid && Number(summary?.currentBalance || 0) < 0 ? 'stat__value--alert' : ''}`}>
                                    {formatCurrency(isPrepaid ? summary?.currentBalance : summary?.outstandingAmount)}
                                </strong>
                            </div>
                            <div className="stat">
                                <span className="stat__label">{isPrepaid ? 'Available To Spend' : 'Ready To Invoice'}</span>
                                <strong className="stat__value">{formatCurrency(isPrepaid ? summary?.availableToSpend : summary?.readyToInvoiceAmount)}</strong>
                            </div>
                            <div className="stat">
                                <span className="stat__label">{isPrepaid ? 'Credit Limit' : 'Invoiced'}</span>
                                <strong className="stat__value">{formatCurrency(isPrepaid ? (profile?.creditLimit || profileForm.creditLimit) : summary?.invoicedAmount)}</strong>
                            </div>
                            <div className="stat">
                                <span className="stat__label">{isPrepaid ? 'Submissions Left' : 'Debited'}</span>
                                <strong className="stat__value">{isPrepaid ? (summary?.estimatedSubmissionsRemaining ?? 0) : formatCurrency(summary?.debitedAmount)}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="billing-tabs">
                        <Tabs tabs={tabs} />
                    </div>
                </>
            )}
        </div>
    );
}
