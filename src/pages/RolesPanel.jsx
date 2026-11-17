import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import RowMenu from '../components/ui/RowMenu';
import { useToast } from '../contexts/ToastContext';
import roleService from '../services/roleService';
import { errorMessage } from '../services/api';

/** Groups [{ name, group, label }] by group, keeping the server's order. */
function byGroup(permissions) {
    const groups = new Map();
    permissions.forEach((p) => groups.set(p.group, [...(groups.get(p.group) || []), p]));
    return [...groups.entries()];
}

/**
 * The roles a company can give: built-in ones (fixed) and its own custom roles, which hold company permissions the
 * person making them holds themselves. Intact staff choose the company; with none chosen they see the staff roles.
 */
export default function RolesPanel({ canEdit, isStaff, companies }) {
    const { toast } = useToast();
    const [companyId, setCompanyId] = useState('');
    const [data, setData] = useState(null);
    const [catalogue, setCatalogue] = useState([]);
    const [error, setError] = useState('');
    const [viewing, setViewing] = useState(null); // a role, shown read-only
    const [form, setForm] = useState(null); // { name?, label, description, permissions: Set }
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            setData(await roleService.list(companyId || undefined));
        } catch (e) {
            setError(errorMessage(e, 'Could not load roles.'));
        }
    }, [companyId]);

    useEffect(() => { setData(null); load(); }, [load]);
    useEffect(() => { roleService.permissions().then(setCatalogue).catch(() => {}); }, []);

    const labelOf = useMemo(() => Object.fromEntries(catalogue.map((p) => [p.name, p])), [catalogue]);
    // Custom roles belong to a company, so staff pick one first
    const canCreate = canEdit && (!isStaff || !!companyId);

    const save = async () => {
        setBusy(true);
        const role = { label: form.label.trim(), description: form.description.trim(), permissions: [...form.permissions] };
        try {
            if (form.name) await roleService.update(companyId || undefined, form.name, role);
            else await roleService.create(companyId || undefined, role);
            toast.success(form.name ? 'Role updated' : `${role.label} created`);
            setForm(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the role.'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await roleService.remove(companyId || undefined, deleting.name);
            toast.success(`${deleting.label} deleted`);
            setDeleting(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not delete the role.'));
        } finally {
            setBusy(false);
        }
    };

    const toggle = (name, on) => {
        const next = new Set(form.permissions);
        if (on) next.add(name); else next.delete(name);
        setForm({ ...form, permissions: next });
    };

    const roles = data?.roles ?? [];
    const formError = !form ? '' : !form.label.trim() ? 'Give the role a name.' : form.permissions.size === 0 ? 'Choose at least one permission.' : '';

    return (
        <>
            <div className="filter-bar">
                {isStaff && (
                    <select className="input filter-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
                        <option value="">Intact ID staff roles</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                    </select>
                )}
                {canCreate && (
                    <button className="btn btn--primary btn--sm" style={{ marginLeft: 'auto' }}
                        onClick={() => setForm({ label: '', description: '', permissions: new Set() })}><Plus size={15} /> New role</button>
                )}
            </div>

            <div className="table-card">
                <div className="table-scroll">
                    <table className="data-table">
                        <thead><tr><th>Role</th><th>Kind</th><th>Permissions</th><th>People</th><th /></tr></thead>
                        <tbody>
                            {error ? <tr><td colSpan={5}><div className="empty-state">{error}</div></td></tr>
                                : !data ? <tr><td colSpan={5}><div className="loading-state">Loading roles…</div></td></tr>
                                    : roles.map((r) => (
                                        <tr key={r.name}>
                                            <td>
                                                <div className="name-primary">{r.label}</div>
                                                {r.description && <div className="name-secondary">{r.description}</div>}
                                            </td>
                                            <td><Badge kind={r.builtIn ? 'neutral' : 'ok'}>{r.staff ? 'Intact staff' : r.builtIn ? 'Built-in' : 'Custom'}</Badge></td>
                                            <td>{r.permissions.length}</td>
                                            <td>{r.users}</td>
                                            <td>
                                                <RowMenu items={[
                                                    { label: 'View permissions', onClick: () => setViewing(r) },
                                                    ...(!r.builtIn && canEdit ? [
                                                        { label: 'Edit', onClick: () => setForm({ name: r.name, label: r.label, description: r.description || '', permissions: new Set(r.permissions) }) },
                                                        { label: 'Delete', danger: true, onClick: () => setDeleting(r) },
                                                    ] : []),
                                                ]} />
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={!!viewing} onClose={() => setViewing(null)} size="lg" title={viewing?.label} caption={viewing?.description}
                footer={<button className="btn btn--secondary" onClick={() => setViewing(null)}>Close</button>}>
                {viewing && byGroup(viewing.permissions.map((n) => labelOf[n] || { name: n, group: 'Other', label: n })).map(([group, items]) => (
                    <div key={group} className="field">
                        <label>{group}</label>
                        <ul className="role-perms">{items.map((p) => <li key={p.name}>{p.label}</li>)}</ul>
                    </div>
                ))}
            </Modal>

            <Modal isOpen={!!form} onClose={() => setForm(null)} size="lg" title={form?.name ? 'Edit role' : 'New role'}
                caption="A role can only include what you can do yourself. Changes apply straight away to everyone holding it."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={save} disabled={busy || !!formError}>{busy ? 'Saving…' : 'Save'}</button>
                    </>
                )}>
                {form && (
                    <div className="form-grid">
                        <div className="field"><label>Name</label><input className="input" value={form.label} maxLength={100} onChange={(e) => setForm({ ...form, label: e.target.value })} autoFocus /></div>
                        <div className="field"><label>Description (optional)</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                        {byGroup(data?.grantable ?? []).map(([group, items]) => (
                            <div key={group} className="field form-grid-full">
                                <label>{group}</label>
                                <div className="role-options">
                                    {items.map((p) => (
                                        <label key={p.name} className="checkbox-row">
                                            <input type="checkbox" checked={form.permissions.has(p.name)} onChange={(e) => toggle(p.name, e.target.checked)} />
                                            <span>{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {formError && <div className="field-error form-grid-full">{formError}</div>}
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${deleting?.label}?`}
                caption="Only possible when nobody holds it. This cannot be undone."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--danger-outline" onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
                    </>
                )} />
        </>
    );
}
