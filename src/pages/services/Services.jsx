import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, TriangleAlert } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import RowMenu from '../../components/ui/RowMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import workflowService from '../../services/workflowService';
import billingService from '../../services/billingService';
import { errorMessage } from '../../services/api';
import { isSuperAdmin } from '../../utils/roles';
import { formatMoney } from '../../utils/insights';
import { CATEGORY_LABELS, serviceIcon } from '../workflows/icons';
import ServiceEditor from './ServiceEditor';
import './services.css';

const STATUS = {
    AVAILABLE: { label: 'Available', badge: 'ok' },
    IN_DEVELOPMENT: { label: 'In development', badge: 'info' },
    DEPRECATED: { label: 'Deprecated', badge: 'warn' },
    RETIRED: { label: 'Retired', badge: 'neutral' },
};
const TABS = [['', 'All'], ['AVAILABLE', 'Available'], ['IN_DEVELOPMENT', 'In development'], ['DEPRECATED', 'Deprecated'], ['RETIRED', 'Retired']];
const SUBJECT_LABEL = { INDIVIDUAL: 'KYC', BUSINESS: 'KYB' };

// What each change means for merchants, shown before it is made.
const CHANGES = {
    AVAILABLE: {
        title: (s) => `Make ${s.name} available`,
        button: 'Make available',
        effect: 'Merchants can add it to their workflows right away, and each run is charged.',
    },
    DEPRECATED: {
        title: (s) => `Deprecate ${s.name}`,
        button: 'Deprecate',
        effect: 'Merchants can no longer add it to workflows. Workflows that already use it keep running. You can make it available again.',
    },
    RETIRED: {
        title: (s) => `Retire ${s.name}`,
        button: 'Retire',
        effect: 'Workflows that use it can no longer be published. This can’t be undone.',
        danger: true,
    },
    DELETE: {
        title: (s) => `Delete ${s.name}`,
        button: 'Delete',
        effect: 'Removes it from the catalog for good. Allowed because it was never made available.',
        danger: true,
    },
};

export default function Services() {
    const { user } = useAuth();
    const { toast } = useToast();
    const superAdmin = isSuperAdmin(user);
    const [services, setServices] = useState(null);
    const [prices, setPrices] = useState({}); // standard price per service code
    const [pricesFailed, setPricesFailed] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('');
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null); // a service, 'new', or null
    const [change, setChange] = useState(null); // { service, target }
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            setServices(await workflowService.fullCatalog());
        } catch (e) {
            setError(errorMessage(e, 'Could not load the service catalog.'));
        }
        try {
            const charges = await billingService.standardPrices();
            setPrices(Object.fromEntries((charges || []).map((c) => [c.serviceCode, c])));
            setPricesFailed(false);
        } catch {
            setPricesFailed(true);
        }
    }, []);

    useEffect(() => { if (superAdmin) load(); }, [load, superAdmin]);

    const counts = useMemo(() => Object.fromEntries(TABS.map(([status]) => [status,
        (services || []).filter((s) => !status || s.status === status).length])), [services]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (services || [])
            .filter((s) => !tab || s.status === tab)
            .filter((s) => !q || [s.name, s.code, s.description].some((v) => v?.toLowerCase().includes(q)));
    }, [services, tab, search]);

    const applyChange = async () => {
        const { service, target } = change;
        setBusy(true);
        try {
            if (target === 'DELETE') await workflowService.deleteService(service.code);
            else await workflowService.changeServiceStatus(service.code, target);
            toast.success(target === 'DELETE' ? `${service.name} deleted` : `${service.name} is now ${STATUS[target].label.toLowerCase()}`);
            setChange(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'That change was refused.'));
        } finally {
            setBusy(false);
        }
    };

    if (!superAdmin) {
        return (
            <div className="page">
                <div className="page-head"><div><h1>Services</h1></div></div>
                <div className="card"><div className="empty-state">The service catalog is managed by Intact ID staff.</div></div>
            </div>
        );
    }

    const menuFor = (s) => {
        const items = [];
        if (s.status !== 'RETIRED') items.push({ label: 'Edit', onClick: () => setEditing(s) });
        if (s.status === 'AVAILABLE') items.push({ label: 'Deprecate', onClick: () => setChange({ service: s, target: 'DEPRECATED' }) });
        if (s.status === 'IN_DEVELOPMENT' || s.status === 'DEPRECATED') items.push({ label: 'Retire', danger: true, onClick: () => setChange({ service: s, target: 'RETIRED' }) });
        if (s.status === 'IN_DEVELOPMENT') items.push({ label: 'Delete', danger: true, onClick: () => setChange({ service: s, target: 'DELETE' }) });
        return items;
    };

    const changing = change && CHANGES[change.target];
    const changePrice = change && prices[change.service.code];
    const blockedBy = change?.target === 'AVAILABLE'
        ? (change.service.requires || []).filter((code) => services?.find((s) => s.code === code)?.status !== 'AVAILABLE')
        : [];
    const unpriced = change?.target === 'AVAILABLE' && !changePrice && !pricesFailed;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Services</h1>
                    <p>The checks workflows can include. Merchants only see available services.</p>
                </div>
                <div className="head-actions">
                    <button className="btn btn--primary" onClick={() => setEditing('new')}><Plus size={15} /> Add service</button>
                </div>
            </div>

            {pricesFailed && (
                <div className="note note--warn">
                    <div className="note-head"><TriangleAlert size={16} /><span>Prices unavailable</span></div>
                    <p>Billing did not answer, so prices are not shown. The catalog itself can still be managed.</p>
                </div>
            )}

            <div className="table-card">
                <div className="card-head svc-toolbar">
                    <div className="view-toggle">
                        {TABS.map(([status, label]) => (
                            <button key={status || 'all'} className={tab === status ? 'is-active' : ''} onClick={() => setTab(status)}>
                                {label} <span className="svc-count">{counts[status] ?? 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="search-input svc-search">
                        <Search size={14} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services" aria-label="Search services" />
                    </div>
                </div>
                <div className="table-scroll"><table className="data-table">
                    <thead><tr><th>Service</th><th>Category</th><th>Verifies</th><th>Needs</th><th>Standard price</th><th>Status</th><th /></tr></thead>
                    <tbody>
                        {error ? (
                            <tr><td colSpan={7}><div className="empty-state">{error}</div></td></tr>
                        ) : !services ? (
                            <tr><td colSpan={7}><div className="loading-state">Loading services…</div></td></tr>
                        ) : shown.length === 0 ? (
                            <tr><td colSpan={7}><div className="empty-state">No services here.</div></td></tr>
                        ) : shown.map((s) => {
                            const Icon = serviceIcon(s);
                            const status = STATUS[s.status] || { label: s.status, badge: 'neutral' };
                            const price = prices[s.code];
                            const needs = [...(s.requiredFields || []), ...(s.captures || [])];
                            return (
                                <tr key={s.code} className={s.status === 'RETIRED' ? 'svc-row--retired' : ''}>
                                    <td>
                                        <button className="svc-name" onClick={() => s.status !== 'RETIRED' && setEditing(s)} disabled={s.status === 'RETIRED'}>
                                            <span className="svc-icon"><Icon size={16} /></span>
                                            <span>
                                                <span className="name-primary">{s.name}</span>
                                                <span className="name-secondary mono">{s.code}</span>
                                            </span>
                                        </button>
                                    </td>
                                    <td>{CATEGORY_LABELS[s.category] || s.category}</td>
                                    <td><div className="svc-chips">{(s.subjectTypes || []).map((t) => <span key={t} className="svc-chip">{SUBJECT_LABEL[t] || t}</span>)}</div></td>
                                    <td>
                                        {needs.length === 0 ? <span className="name-secondary">Nothing extra</span> : (
                                            <span className="svc-needs" title={needs.join(', ')}>
                                                {needs.slice(0, 3).join(', ')}{needs.length > 3 ? ` +${needs.length - 3}` : ''}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {pricesFailed ? '—' : price
                                            ? <span className="svc-price">{formatMoney(price.price, price.currency)}</span>
                                            : <span className="svc-unpriced">Not priced</span>}
                                    </td>
                                    <td><Badge kind={status.badge}>{status.label}</Badge></td>
                                    <td className="svc-actions">
                                        {(s.status === 'IN_DEVELOPMENT' || s.status === 'DEPRECATED') && (
                                            <button className="btn btn--secondary btn--sm" onClick={() => setChange({ service: s, target: 'AVAILABLE' })}>Make available</button>
                                        )}
                                        <RowMenu items={menuFor(s)} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table></div>
            </div>

            {editing && (
                <ServiceEditor
                    service={editing === 'new' ? null : editing}
                    charge={editing === 'new' ? null : prices[editing.code]}
                    services={services || []}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}

            <Modal isOpen={Boolean(change)} onClose={() => setChange(null)} title={changing ? changing.title(change.service) : ''}
                   footer={<>
                       <button className="btn btn--secondary" onClick={() => setChange(null)}>Cancel</button>
                       {unpriced && <button className="btn btn--secondary" onClick={() => { setEditing(change.service); setChange(null); }}>Set a price</button>}
                       <button className={changing?.danger ? 'btn btn--danger-outline' : 'btn btn--primary'} disabled={busy || blockedBy.length > 0 || unpriced} onClick={applyChange}>
                           {busy ? 'Working…' : changing?.button}
                       </button>
                   </>}>
                {change && (
                    <>
                        <p className="svc-effect">{changing.effect}</p>
                        {change.target === 'AVAILABLE' && changePrice && (
                            <div className="kv-list">
                                <div className="kv-row"><span>Standard price per run</span><strong>{formatMoney(changePrice.price, changePrice.currency)}</strong></div>
                                {(change.service.requiredFields || []).length > 0 && (
                                    <div className="kv-row"><span>Asks applicants for</span><strong>{change.service.requiredFields.join(', ')}</strong></div>
                                )}
                            </div>
                        )}
                        {unpriced && (
                            <div className="note note--warn">
                                <div className="note-head"><TriangleAlert size={16} /><span>No standard price</span></div>
                                <p>Set a price first (0 for free), so runs are charged correctly.</p>
                            </div>
                        )}
                        {blockedBy.length > 0 && (
                            <div className="note note--warn">
                                <div className="note-head"><TriangleAlert size={16} /><span>Depends on services that aren’t available</span></div>
                                <p>Make these available first: {blockedBy.join(', ')}.</p>
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
}
