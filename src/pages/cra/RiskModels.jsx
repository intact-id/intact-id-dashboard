import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import riskService from '../../services/riskService';
import companyService from '../../services/companyService';
import { errorMessage } from '../../services/api';
import { isSuperAdmin } from '../../utils/roles';
import { formatDate } from '../../utils/format';
import { CUSTOMER_TYPES, newModelConfig } from './builder/model';
import './builder/builder.css';

const STATUS_BADGE = { ACTIVE: 'ok', DRAFT: 'warn', RETIRED: 'neutral' };
const statusLabel = (status) => `${status[0]}${status.slice(1).toLowerCase()}`;

export default function RiskModels() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const superAdmin = isSuperAdmin(user);

    // Risk models belong to a company. Super admins choose which one to act for.
    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState(superAdmin ? null : user?.companyId);

    const [models, setModels] = useState(null);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('models');
    const [busy, setBusy] = useState(false);

    const [creating, setCreating] = useState(null); // { name, customerType } while the dialog is open
    const [deleting, setDeleting] = useState(null); // the draft being deleted

    useEffect(() => {
        if (!superAdmin) return;
        companyService.list({ size: 100 })
            .then((page) => {
                setCompanies(page.content);
                setCompanyId((current) => current ?? page.content[0]?.id ?? null);
            })
            .catch((e) => setError(errorMessage(e, 'Could not load companies.')));
    }, [superAdmin]);

    const load = useCallback(async () => {
        setError('');
        try {
            setModels(await riskService.listModels(superAdmin ? companyId : undefined));
        } catch (e) {
            setModels([]);
            setError(errorMessage(e, 'Could not load risk models.'));
        }
    }, [companyId, superAdmin]);

    useEffect(() => {
        if (superAdmin && !companyId) return;
        setModels(null);
        load();
    }, [companyId, superAdmin, load]);

    const create = async () => {
        setBusy(true);
        try {
            const detail = await riskService.createModel(newModelConfig(creating.name.trim(), creating.customerType), superAdmin ? companyId : undefined);
            navigate(`/dashboard/risk-models/${detail.model.id}`);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not create the risk model.'));
        } finally {
            setBusy(false);
        }
    };

    const editAsDraft = async (model) => {
        setBusy(true);
        try {
            const draft = await riskService.cloneModel(model.id);
            navigate(`/dashboard/risk-models/${draft.id}`);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not create a draft from this model.'));
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = async () => {
        setBusy(true);
        try {
            await riskService.deleteModel(deleting.id);
            toast.success('Draft deleted');
            setDeleting(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not delete the draft.'));
        } finally {
            setBusy(false);
        }
    };

    const all = models || [];
    const drafts = all.filter((m) => m.lifeCycleStatus === 'DRAFT');
    const published = all.filter((m) => m.lifeCycleStatus !== 'DRAFT')
        .sort((a, b) => (a.lifeCycleStatus === 'ACTIVE' ? -1 : 1) - (b.lifeCycleStatus === 'ACTIVE' ? -1 : 1));
    const rows = tab === 'drafts' ? drafts : published;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Risk models</h1>
                    <p>How customers are scored Low, Medium or High risk. One model is active per customer type.</p>
                </div>
                <div className="head-actions">
                    {superAdmin && companies.length > 0 && (
                        <select className="input filter-select" value={companyId || ''} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                        </select>
                    )}
                    <button className="btn btn--primary btn--sm" onClick={() => setCreating({ name: '', customerType: 'INDIVIDUAL' })}>
                        <Plus size={15} /> Create
                    </button>
                </div>
            </div>

            <div className="table-card">
                <div className="rm-tabs" role="tablist" style={{ padding: '0 14px', marginBottom: 0 }}>
                    <button role="tab" aria-selected={tab === 'models'} className={tab === 'models' ? 'is-active' : ''} onClick={() => setTab('models')}>
                        Risk models <span className="rm-tab-count">{published.length}</span>
                    </button>
                    <button role="tab" aria-selected={tab === 'drafts'} className={tab === 'drafts' ? 'is-active' : ''} onClick={() => setTab('drafts')}>
                        Drafts <span className="rm-tab-count">{drafts.length}</span>
                    </button>
                </div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr><th>Name</th><th>Status</th><th>Customer type</th><th>Version</th><th>Active since</th><th /></tr>
                        </thead>
                        <tbody>
                            {error ? (
                                <tr><td colSpan={6}><div className="empty-state">{error}</div></td></tr>
                            ) : !models ? (
                                <tr><td colSpan={6}><div className="loading-state">Loading risk models…</div></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6}><div className="empty-state">{tab === 'drafts' ? 'No drafts.' : 'No risk models yet. Create one to start scoring customers.'}</div></td></tr>
                            ) : rows.map((m) => (
                                <tr key={m.id}>
                                    <td><Link to={`/dashboard/risk-models/${m.id}`} className="name-primary">{m.description || 'Untitled risk model'}</Link></td>
                                    <td><Badge kind={STATUS_BADGE[m.lifeCycleStatus] || 'neutral'}>{statusLabel(m.lifeCycleStatus)}</Badge></td>
                                    <td>{CUSTOMER_TYPES[m.customerType]?.label || m.customerType}</td>
                                    <td className="mono">v{m.version}</td>
                                    <td>{formatDate(m.effectiveFrom)}</td>
                                    <td>
                                        <div className="head-actions" style={{ justifyContent: 'flex-end' }}>
                                            {m.lifeCycleStatus === 'DRAFT' ? (
                                                <>
                                                    <Link className="btn btn--secondary btn--sm" to={`/dashboard/risk-models/${m.id}`}>Edit</Link>
                                                    <button className="btn btn--ghost btn--sm" onClick={() => setDeleting(m)}>Delete</button>
                                                </>
                                            ) : (
                                                <>
                                                    <Link className="btn btn--ghost btn--sm" to={`/dashboard/risk-models/${m.id}`}>View</Link>
                                                    <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => editAsDraft(m)}>Edit as new draft</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={!!creating}
                onClose={() => setCreating(null)}
                title="Create risk model"
                caption="Name the model and choose who it scores. The customer type cannot be changed afterwards."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setCreating(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={create} disabled={busy || !creating?.name.trim()}>{busy ? 'Creating…' : 'Next'}</button>
                    </>
                )}
            >
                {creating && (
                    <>
                        <div className="field">
                            <label htmlFor="rm-new-name">Name</label>
                            <input id="rm-new-name" className="input" type="text" placeholder="e.g. Retail customers" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} autoFocus />
                        </div>
                        <div className="field" style={{ marginTop: 14 }}>
                            <label>Customer type</label>
                            {Object.entries(CUSTOMER_TYPES).map(([value, { label }]) => (
                                <label key={value} className="rm-radio">
                                    <input type="radio" name="rm-customer-type" checked={creating.customerType === value} onChange={() => setCreating({ ...creating, customerType: value })} />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                title={`Delete “${deleting?.description || 'Untitled risk model'}”?`}
                caption="This draft is removed for good. Active models are not affected."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--danger-outline" onClick={confirmDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete draft'}</button>
                    </>
                )}
            />
        </div>
    );
}
