import { useCallback, useEffect, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import topUpService, { TOP_UP_METHOD, TOP_UP_STATUS, openReceipt } from '../../services/topUpService';
import { errorMessage } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { formatMoney } from '../../utils/insights';

const EMPTY = { amount: '', reference: '', paidOn: '', bankName: '', note: '', receipt: null };

// A company's own top-ups: report a bank transfer with its receipt, and see what was credited.
export default function BankTopUp({ companyId, open, onClose, onChanged }) {
    const { toast } = useToast();
    const [info, setInfo] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [busy, setBusy] = useState(false);
    const [list, setList] = useState(null);

    const load = useCallback(() => topUpService.list({ companyId }).then(setList).catch(() => setList({ content: [] })), [companyId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (open) topUpService.instructions(companyId).then(setInfo).catch(() => setInfo(null)); }, [open, companyId]);

    const submit = async () => {
        setBusy(true);
        try {
            await topUpService.submitBank(companyId, form);
            toast.success('Sent for review. Your wallet is credited once Intact confirms the transfer.');
            setForm(EMPTY);
            onClose();
            load();
            onChanged?.();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not submit the top-up.'));
        } finally {
            setBusy(false);
        }
    };

    const cancel = async (t) => {
        try {
            await topUpService.cancel(t.id);
            toast.success('Top-up cancelled');
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not cancel it.'));
        }
    };

    const ready = Number(form.amount) > 0 && form.reference.trim() && form.paidOn && form.receipt;
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <>
            <div className="table-card">
                <div className="card-head"><div><h3>Top-ups</h3><div className="card-caption">Bank transfers you reported, newest first</div></div></div>
                {!list ? <div className="loading-state">Loading…</div> : list.content.length === 0 ? <div className="empty-state">No top-ups yet.</div> : (
                    <div className="table-scroll"><table className="data-table">
                        <thead><tr><th>Submitted</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th>Status</th><th /></tr></thead>
                        <tbody>{list.content.map((t) => {
                            const status = TOP_UP_STATUS[t.status] || { label: t.status, badge: 'neutral' };
                            return (
                                <tr key={t.id}>
                                    <td>{formatDateTime(t.createdAt)}</td>
                                    <td>{TOP_UP_METHOD[t.method] || t.method}{t.bankName ? <div className="name-secondary">{t.bankName}</div> : null}</td>
                                    <td className="mono">{t.reference}</td>
                                    <td className="num">{formatMoney(t.creditedAmount ?? t.amount, t.currency)}
                                        {t.creditedAmount != null && Number(t.creditedAmount) !== Number(t.amount) && <div className="name-secondary">reported {formatMoney(t.amount, t.currency)}</div>}
                                    </td>
                                    <td><Badge kind={status.badge}>{status.label}</Badge>{t.reviewNote && <div className="name-secondary">{t.reviewNote}</div>}</td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {t.receiptFilename && <button className="btn btn--ghost btn--sm" onClick={() => openReceipt(t.id).catch(() => toast.error('Could not open the receipt'))}><FileText size={13} /> Receipt</button>}
                                        {t.status === 'PENDING_REVIEW' && <button className="btn btn--ghost btn--sm" onClick={() => cancel(t)}>Cancel</button>}
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                )}
            </div>

            <Modal
                isOpen={open}
                onClose={() => !busy && onClose()}
                title="Top up by bank transfer"
                caption="Transfer the money, then tell us about it here with the bank receipt. Intact checks it and credits your wallet, usually the same working day."
                footer={<>
                    <button className="btn btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn--primary" onClick={submit} disabled={busy || !ready}>{busy ? 'Sending…' : 'Send for review'}</button>
                </>}
            >
                {info?.bankInstructions && (
                    <div className="note" style={{ marginBottom: 12, whiteSpace: 'pre-line' }}>
                        <div className="note-head"><span>Pay to</span></div>
                        <p>{info.bankInstructions}</p>
                    </div>
                )}
                <div className="form-grid">
                    <div className="field"><label htmlFor="tu-amount">Amount transferred ({info?.currency || '…'})</label>
                        <input id="tu-amount" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} /></div>
                    <div className="field"><label htmlFor="tu-date">Transfer date</label>
                        <input id="tu-date" type="date" max={new Date().toISOString().slice(0, 10)} value={form.paidOn} onChange={set('paidOn')} /></div>
                    <div className="field"><label htmlFor="tu-ref">Bank reference</label>
                        <input id="tu-ref" type="text" maxLength={255} value={form.reference} onChange={set('reference')} placeholder="As on the receipt" /></div>
                    <div className="field"><label htmlFor="tu-bank">Your bank (optional)</label>
                        <input id="tu-bank" type="text" maxLength={255} value={form.bankName} onChange={set('bankName')} /></div>
                </div>
                <div className="field" style={{ marginTop: 10 }}>
                    <label htmlFor="tu-receipt">Receipt (PDF or image, up to 10 MB)</label>
                    <label className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
                        <Upload size={14} /> {form.receipt ? form.receipt.name : 'Choose file'}
                        <input id="tu-receipt" type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp"
                               onChange={(e) => setForm({ ...form, receipt: e.target.files[0] || null })} />
                    </label>
                </div>
                <div className="field" style={{ marginTop: 10 }}><label htmlFor="tu-note">Note (optional)</label>
                    <input id="tu-note" className="input" maxLength={1000} value={form.note} onChange={set('note')} /></div>
                {form.paidOn && <p className="field-hint">Transfer of {form.amount || '…'} {info?.currency} on {formatDate(form.paidOn)}.</p>}
            </Modal>
        </>
    );
}
