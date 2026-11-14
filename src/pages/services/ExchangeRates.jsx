import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import billingService from '../../services/billingService';
import { errorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';

// Standard prices are in KES. Companies billed in another currency pay them converted at the day's rate plus the markup.
export default function ExchangeRates() {
    const { toast } = useToast();
    const [fx, setFx] = useState(null);
    const [markup, setMarkup] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => billingService.fxRates().then((d) => { setFx(d); setMarkup(String(Number(d.platformMarkupPercent ?? 0))); })
        .catch((e) => setFx({ error: errorMessage(e, 'Billing did not answer.') })), []);
    useEffect(() => { load(); }, [load]);

    const refresh = async () => {
        setBusy(true);
        try {
            await billingService.refreshFxRates();
            toast.success('Rates refreshed');
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not fetch the rates.'));
        } finally {
            setBusy(false);
        }
    };

    const saveMarkup = async () => {
        setBusy(true);
        try {
            await billingService.setFxMarkup(undefined, Number(markup));
            toast.success('Platform FX markup saved');
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the markup.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="table-card" style={{ marginTop: 16 }}>
            <div className="card-head">
                <div>
                    <h3>Exchange rates</h3>
                    <div className="card-caption">
                        Standard prices are in {fx?.base || 'KES'}. A company billed in another currency pays the {fx?.base || 'KES'} price × the day’s rate × (1 + markup). Rates update every morning.
                    </div>
                </div>
                <button className="btn btn--secondary btn--sm" onClick={refresh} disabled={busy}><RefreshCw size={14} /> Refresh now</button>
            </div>
            {!fx ? <div className="loading-state">Loading…</div> : fx.error ? <div className="empty-state">{fx.error}</div> : (
                <>
                    <div className="kv-list" style={{ padding: '0 16px' }}>
                        <div className="kv-row">
                            <span>Platform FX markup</span>
                            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input className="input" type="number" min="0" max="100" step="0.1" style={{ width: 90, padding: '4px 8px' }}
                                       value={markup} onChange={(e) => setMarkup(e.target.value)} aria-label="Platform FX markup percent" />
                                <span>%</span>
                                <button className="btn btn--ghost btn--sm" onClick={saveMarkup} disabled={busy || markup === ''}>Save</button>
                            </span>
                        </div>
                    </div>
                    <div className="table-scroll"><table className="data-table">
                        <thead><tr><th>Currency</th><th>1 {fx.base} =</th><th>1 unit costs</th><th>Rate date</th><th>Fetched</th></tr></thead>
                        <tbody>
                            {fx.rates.map((r) => (
                                <tr key={r.currency}>
                                    <td className="mono">{r.currency}</td>
                                    <td className="mono">{r.rate ? Number(r.rate).toPrecision(6) : '—'}</td>
                                    <td className="mono">{r.rate ? `${(1 / Number(r.rate)).toFixed(2)} ${fx.base}` : '—'}</td>
                                    <td>{r.rateDate || '—'}</td>
                                    <td>{r.fetchedAt ? formatDateTime(r.fetchedAt) : 'Never'} {r.stale && <Badge kind="warn"><TriangleAlert size={12} /> Old</Badge>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                </>
            )}
        </div>
    );
}
