import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, Receipt, Plus, Pencil, Building2, Lock } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import CompanySelect from '../components/ui/CompanySelect';
import StackedBarChart from '../components/ui/StackedBarChart';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import billingService from '../services/billingService';
import { errorMessage } from '../services/api';
import { isSuperAdmin } from '../utils/roles';
import { formatDate, formatDateTime, humanize } from '../utils/format';
import { formatCount, formatMoney, shortDate } from '../utils/insights';
import './insights/insights.css';
import './billing.css';

const INVOICE_STATUS = { ISSUED: { label: 'Due', badge: 'warn' }, PAID: { label: 'Paid', badge: 'ok' }, VOID: { label: 'Void', badge: 'neutral' } };
const MODEL_LABEL = { PER_CALL: 'Pay per verification', FLAT_PERIODIC: 'Flat fee', HYBRID: 'Flat fee + per verification' };
const SPEND_DAYS = 30;
const SPEND_SERIES = [{ key: 'spent', label: 'Spent', color: 'var(--brand-green)' }];

// Wallet debits per day over the last SPEND_DAYS days.
function dailySpend(transactions) {
    const days = [];
    const today = new Date();
    for (let i = SPEND_DAYS - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push({ date: d.toISOString().slice(0, 10), spent: 0 });
    }
    const byDate = new Map(days.map((d) => [d.date, d]));
    transactions.filter((t) => t.type === 'DEBIT').forEach((t) => {
        const day = byDate.get(String(t.createdAt).slice(0, 10));
        if (day) day.spent += Number(t.amount);
    });
    return days;
}

function SetUpBilling({ companyId, onDone }) {
    const { toast } = useToast();
    const [form, setForm] = useState({ billingModel: 'PER_CALL', paymentType: 'PREPAID', currency: 'KES', pricePerCall: '', freeQuota: '' });
    const [busy, setBusy] = useState(false);
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const save = async () => {
        setBusy(true);
        try {
            await billingService.setUp(companyId, {
                ...form,
                currency: form.currency.trim().toUpperCase(),
                pricePerCall: form.pricePerCall === '' ? undefined : Number(form.pricePerCall),
                freeQuota: form.freeQuota === '' ? undefined : Number(form.freeQuota),
            });
            toast.success('Billing set up');
            onDone();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not set up billing.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="card bill-setup">
            <div className="card-head"><div><h3>Set up billing</h3><div className="card-caption">Choose how this company pays. You can change the terms later.</div></div></div>
            <div className="form-grid">
                <div className="field"><label>Billing model</label>
                    <select value={form.billingModel} onChange={set('billingModel')}>
                        {Object.entries(MODEL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>
                <div className="field"><label>Payment</label>
                    <select value={form.paymentType} onChange={set('paymentType')}>
                        <option value="PREPAID">Prepaid wallet</option>
                        <option value="POSTPAID">Postpaid, invoiced</option>
                    </select>
                </div>
                <div className="field"><label>Currency</label><input type="text" maxLength={3} value={form.currency} onChange={set('currency')} /></div>
                <div className="field"><label>Price per verification</label><input type="number" min="0" step="0.01" value={form.pricePerCall} onChange={set('pricePerCall')} placeholder="Optional" /></div>
                <div className="field"><label>Free verifications</label><input type="number" min="0" step="1" value={form.freeQuota} onChange={set('freeQuota')} placeholder="0" /></div>
            </div>
            <div className="bill-setup-foot">
                <button className="btn btn--primary" disabled={busy || !/^[A-Za-z]{3}$/.test(form.currency.trim())} onClick={save}>{busy ? 'Setting up…' : 'Set up billing'}</button>
            </div>
        </div>
    );
}

export default function Billing() {
    const { user } = useAuth();
    const { toast } = useToast();
    const superAdmin = isSuperAdmin(user);
    const [companyId, setCompanyId] = useState('');
    const [data, setData] = useState(null); // { account, prices, invoices, history } or { notSetUp: true }
    const [error, setError] = useState('');
    const [modal, setModal] = useState(null); // 'topup' | 'price'
    const [form, setForm] = useState({});
    const [busy, setBusy] = useState(false);

    const company = superAdmin ? companyId : undefined;
    const ready = !superAdmin || companyId;

    const load = useCallback(async () => {
        if (!ready) return;
        setError('');
        setData(null);
        try {
            const account = await billingService.account(company);
            const [prices, invoices, history] = await Promise.all([
                billingService.prices(company).catch(() => []),
                account.billingProfile ? billingService.invoices(company).catch(() => []) : [],
                account.wallet ? billingService.walletHistory(company).catch(() => []) : [],
            ]);
            setData({ account, prices: prices || [], invoices: invoices || [], history: history || [] });
        } catch (e) {
            if (e.response?.status === 404) setData({ notSetUp: true });
            else setError(errorMessage(e, 'Could not load billing.'));
        }
    }, [company, ready]);

    useEffect(() => { load(); }, [load]);

    const history = useMemo(() => [...(data?.history || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [data]);
    const spend = useMemo(() => dailySpend(history), [history]);

    const run = async (action, success) => {
        setBusy(true);
        try {
            await action();
            toast.success(success);
            setModal(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'That did not work.'));
        } finally {
            setBusy(false);
        }
    };

    const account = data?.account;
    const profile = account?.billingProfile;
    const currency = profile?.currency || account?.wallet?.currency;
    const pricing = account?.perCallPricing;
    const prepaid = profile?.paymentType === 'PREPAID';
    const outstanding = (data?.invoices || []).filter((i) => i.status === 'ISSUED').reduce((sum, i) => sum + Number(i.amount), 0);
    const spent = spend.reduce((sum, d) => sum + d.spent, 0);
    const callsLeft = prepaid && pricing?.pricePerCall > 0 ? Math.floor(Number(account.wallet?.balance || 0) / Number(pricing.pricePerCall)) : null;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Billing</h1>
                    <p>{superAdmin ? 'A company’s balance, prices, invoices and wallet activity.' : 'Your balance, prices, invoices and wallet activity.'}</p>
                </div>
                {superAdmin && (
                    <div className="head-actions">
                        <CompanySelect value={companyId} onChange={setCompanyId} allLabel="" placeholder="Choose a company" />
                    </div>
                )}
            </div>

            {!ready ? (
                <div className="card bill-empty"><Building2 size={22} /><strong>Choose a company</strong><span>Billing is kept per company. Pick one above to see and manage its account.</span></div>
            ) : error ? <div className="card"><div className="empty-state">{error}</div></div> : !data ? (
                <div className="card"><div className="loading-state">Loading billing…</div></div>
            ) : data.notSetUp ? (
                superAdmin ? <SetUpBilling companyId={companyId} onDone={load} /> : (
                    <div className="card bill-empty"><Receipt size={22} /><strong>Billing isn’t set up yet</strong><span>Intact ID sets up your billing terms. Contact your account manager to get started.</span></div>
                )
            ) : (
                <>
                    <div className="bill-hero">
                        <div className="bill-balance">
                            <div className="bill-balance-head">
                                <span>{prepaid ? 'Wallet balance' : 'Outstanding'}</span>
                                <Wallet size={17} />
                            </div>
                            <div className="bill-balance-value">{formatMoney(prepaid ? account.wallet?.balance : outstanding, currency)}</div>
                            <div className="bill-balance-foot">
                                {prepaid
                                    ? callsLeft !== null ? `About ${formatCount(callsLeft)} verifications at the standard price` : 'Verifications are paid from this balance'
                                    : `${(data.invoices || []).filter((i) => i.status === 'ISSUED').length} unpaid invoice(s)`}
                            </div>
                            {superAdmin && prepaid && (
                                <button className="btn bill-balance-btn" onClick={() => { setForm({ amount: '', externalRef: '', description: '', retryRef: `topup-${crypto.randomUUID()}` }); setModal('topup'); }}>
                                    <Plus size={15} /> Top up wallet
                                </button>
                            )}
                        </div>

                        <div className="card bill-spend">
                            <div className="card-head">
                                <div><h3>{formatMoney(spent, currency)}</h3><div className="card-caption">Spent in the last {SPEND_DAYS} days</div></div>
                            </div>
                            {prepaid ? (
                                <StackedBarChart data={spend} series={SPEND_SERIES} labelKey="date" formatLabel={shortDate} height={130}
                                                 formatValue={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v)))} />
                            ) : <div className="empty-state">Postpaid accounts are charged on their invoices.</div>}
                        </div>

                        <div className="card">
                            <div className="card-head">
                                <h3>Plan</h3>
                                {superAdmin && pricing && (
                                    <button className="btn btn--secondary btn--sm" onClick={() => { setForm({ pricePerCall: pricing.pricePerCall ?? '', freeQuota: pricing.freeQuota ?? '' }); setModal('price'); }}>
                                        <Pencil size={13} /> Edit price
                                    </button>
                                )}
                            </div>
                            <div className="kv-list">
                                <div className="kv-row"><span>Model</span><strong>{MODEL_LABEL[profile?.billingModel] || humanize(profile?.billingModel)}</strong></div>
                                <div className="kv-row"><span>Payment</span><strong>{prepaid ? 'Prepaid wallet' : 'Postpaid, invoiced'}</strong></div>
                                <div className="kv-row"><span>Standard price</span><strong>{pricing ? `${formatMoney(pricing.pricePerCall, currency)} / verification` : 'Per service'}</strong></div>
                                <div className="kv-row"><span>Free verifications</span><strong>{pricing ? formatCount(pricing.freeQuota) : '—'}</strong></div>
                                <div className="kv-row"><span>Status</span><strong>{profile?.isActive === false ? <Badge kind="bad">Inactive</Badge> : <Badge kind="ok">Active</Badge>}</strong></div>
                            </div>
                        </div>
                    </div>

                    <div className="ins-grid-2">
                        <div className="table-card">
                            <div className="card-head"><div><h3>Prices</h3></div><span className="card-caption">What each service costs</span></div>
                            <div className="table-scroll"><table className="data-table bill-table">
                                <thead><tr><th>Service</th><th>Price</th><th>Source</th></tr></thead>
                                <tbody>
                                    {data.prices.length === 0 ? <tr><td colSpan={3}><div className="empty-state">No service prices set. The standard price applies.</div></td></tr>
                                        : data.prices.map((p) => (
                                            <tr key={p.serviceCode}>
                                                <td><div className="name-primary">{p.name || humanize(p.serviceCode)}</div><div className="name-secondary mono">{p.serviceCode}</div></td>
                                                <td className="bill-amount">{formatMoney(p.price, p.currency || currency)}</td>
                                                <td>{String(p.source).toUpperCase().includes('GLOBAL') ? <Badge kind="neutral">Standard</Badge> : <Badge kind="info">Agreed price</Badge>}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table></div>
                        </div>

                        <div className="table-card">
                            <div className="card-head"><div><h3>Invoices</h3></div>{outstanding > 0 && <Badge kind="warn">{formatMoney(outstanding, currency)} due</Badge>}</div>
                            <div className="table-scroll"><table className="data-table bill-table">
                                <thead><tr><th>Period</th><th>Amount</th><th>Status</th>{superAdmin && <th />}</tr></thead>
                                <tbody>
                                    {data.invoices.length === 0 ? <tr><td colSpan={4}><div className="empty-state">No invoices yet.</div></td></tr>
                                        : [...data.invoices].sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart)).map((inv) => {
                                            const status = INVOICE_STATUS[inv.status] || { label: humanize(inv.status), badge: 'neutral' };
                                            return (
                                                <tr key={inv.id}>
                                                    <td><div className="name-primary">{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</div><div className="name-secondary mono">{inv.id.slice(0, 8)}</div></td>
                                                    <td className="bill-amount">{formatMoney(inv.amount, inv.currency)}</td>
                                                    <td><Badge kind={status.badge}>{status.label}</Badge></td>
                                                    {superAdmin && (
                                                        <td className="bill-actions">
                                                            {inv.status === 'ISSUED' && <>
                                                                <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => run(() => billingService.markInvoicePaid(inv.id), 'Invoice marked paid')}>Mark paid</button>
                                                                <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => run(() => billingService.voidInvoice(inv.id), 'Invoice voided')}>Void</button>
                                                            </>}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table></div>
                        </div>
                    </div>

                    {account.wallet && (
                        <div className="table-card">
                            <div className="card-head"><div><h3>Wallet activity</h3></div><span className="card-caption">Newest first</span></div>
                            <div className="table-scroll"><table className="data-table bill-table">
                                <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th className="num">Amount</th><th className="num">Balance after</th></tr></thead>
                                <tbody>
                                    {history.length === 0 ? <tr><td colSpan={5}><div className="empty-state">No wallet activity yet.</div></td></tr>
                                        : history.slice(0, 50).map((t) => (
                                            <tr key={t.id}>
                                                <td>{formatDateTime(t.createdAt)}</td>
                                                <td>{t.description || (t.type === 'CREDIT' ? 'Top-up' : 'Verification charge')}</td>
                                                <td className="mono name-secondary">{t.externalRef || '—'}</td>
                                                <td className={`num bill-amount ${t.type === 'CREDIT' ? 'amount-pos' : 'amount-neg'}`}>{t.type === 'CREDIT' ? '+' : '−'} {formatMoney(t.amount, currency)}</td>
                                                <td className="num">{formatMoney(t.balanceAfter, currency)}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table></div>
                        </div>
                    )}
                </>
            )}

            <Modal isOpen={modal === 'topup'} onClose={() => setModal(null)} title="Top up wallet" caption={<><Lock size={11} /> Super admins · adds credit to this company’s wallet</>}
                   footer={<>
                       <button className="btn btn--secondary" onClick={() => setModal(null)}>Cancel</button>
                       <button className="btn btn--primary" disabled={busy || !(Number(form.amount) > 0)}
                               onClick={() => run(() => billingService.creditWallet(companyId, { amount: Number(form.amount), externalRef: form.externalRef.trim() || form.retryRef, description: form.description || undefined }), 'Wallet topped up')}>
                           {busy ? 'Adding…' : `Add ${form.amount ? formatMoney(form.amount, currency) : 'credit'}`}
                       </button>
                   </>}>
                <div className="field"><label>Amount ({currency})</label><input type="number" min="0" step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus /></div>
                <div className="field">
                    <label>Payment reference</label>
                    <input type="text" value={form.externalRef || ''} onChange={(e) => setForm({ ...form, externalRef: e.target.value })} placeholder="e.g. bank or M-Pesa reference" />
                    <span className="field-hint">A reference can only be used once, so pressing Add again never credits twice.</span>
                </div>
                <div className="field"><label>Note</label><input type="text" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
            </Modal>

            <Modal isOpen={modal === 'price'} onClose={() => setModal(null)} title="Standard price" caption="Applies to services without their own price"
                   footer={<>
                       <button className="btn btn--secondary" onClick={() => setModal(null)}>Cancel</button>
                       <button className="btn btn--primary" disabled={busy || form.pricePerCall === ''}
                               onClick={() => run(() => billingService.updatePerCallPricing(companyId, { pricePerCall: Number(form.pricePerCall), freeQuota: form.freeQuota === '' ? undefined : Number(form.freeQuota) }), 'Price updated')}>
                           {busy ? 'Saving…' : 'Save'}
                       </button>
                   </>}>
                <div className="form-grid">
                    <div className="field"><label>Price per verification ({currency})</label><input type="number" min="0" step="0.01" value={form.pricePerCall ?? ''} onChange={(e) => setForm({ ...form, pricePerCall: e.target.value })} /></div>
                    <div className="field"><label>Free verifications</label><input type="number" min="0" step="1" value={form.freeQuota ?? ''} onChange={(e) => setForm({ ...form, freeQuota: e.target.value })} /></div>
                </div>
            </Modal>
        </div>
    );
}
