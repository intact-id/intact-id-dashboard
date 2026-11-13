import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Search, ChevronLeft, ChevronRight, Copy, RefreshCw } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import RowMenu from '../components/ui/RowMenu';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import userService from '../services/userService';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { hasAnyRole, isSuperAdmin, normalizeRole } from '../utils/roles';
import { formatDateTime, humanize, initialsOf } from '../utils/format';

const PAGE_SIZE = 20;
const STATUS_BADGE = { ACTIVE: 'ok', PENDING: 'warn', PENDING_APPROVAL: 'warn', SUSPENDED: 'bad', INACTIVE: 'neutral', LOCKED: 'bad' };
const STATUS_FILTERS = ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING'];

// Meets auth-server's rule: 8+ characters with upper, lower, digit and one of @$!%*?&.
function temporaryPassword() {
    const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@$!%*?&'];
    const pick = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
    const chars = [...sets.map(pick), ...Array.from({ length: 8 }, () => pick(sets.join('')))];
    return chars.sort(() => crypto.getRandomValues(new Uint32Array(1))[0] - 2 ** 31).join('');
}

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function UserManagement() {
    const { user: me } = useAuth();
    const { toast } = useToast();
    const superAdmin = isSuperAdmin(me);
    const canManage = hasAnyRole(me, ['ADMIN', 'SUPER_ADMIN']);

    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const [roles, setRoles] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [form, setForm] = useState(null); // { mode: 'create' | 'edit', ...fields }
    const [confirm, setConfirm] = useState(null); // { title, caption, action, danger }
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!superAdmin) return;
        userService.roles().then(setRoles).catch(() => {});
        companyService.list({ size: 100 }).then((p) => setCompanies(p.content)).catch(() => {});
    }, [superAdmin]);

    useEffect(() => {
        const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const load = useCallback(async () => {
        setError('');
        try {
            setResult(await userService.list({ status: status || undefined, search: query || undefined, page, size: PAGE_SIZE }));
        } catch (e) {
            setError(errorMessage(e, 'Could not load users.'));
        }
    }, [status, query, page]);

    useEffect(() => {
        if (!canManage) return;
        setResult(null);
        load();
    }, [canManage, load]);

    const companyName = (id) => companies.find((c) => c.id === id)?.tradingName || companies.find((c) => c.id === id)?.legalName;
    const roleId = (name) => roles.find((r) => normalizeRole(r.name) === normalizeRole(name))?.id;

    const openCreate = () => setForm({
        mode: 'create', firstName: '', lastName: '', email: '', username: '', usernameEdited: false, phone: '',
        password: temporaryPassword(), mustChangePassword: true, roleIds: [], companyId: superAdmin ? '' : me?.companyId,
    });

    const openEdit = (u) => setForm({
        mode: 'edit', id: u.id, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '',
        username: u.username, phone: u.phone || '', companyId: u.companyId || '',
        roleIds: (u.roles || []).map(roleId).filter(Boolean), originalRoleIds: (u.roles || []).map(roleId).filter(Boolean),
    });

    const formError = (() => {
        if (!form) return '';
        if (!form.firstName.trim() || !form.lastName.trim()) return 'Enter a first and last name.';
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.';
        if (form.username.trim().length < 3) return 'The username needs at least 3 characters.';
        if (form.mode === 'create' && !PASSWORD_RULE.test(form.password)) return 'The password needs 8+ characters with upper and lower case, a digit and one of @$!%*?&.';
        return '';
    })();

    const save = async () => {
        setBusy(true);
        const fields = {
            firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
            username: form.username.trim(), phone: form.phone.trim() || undefined,
            ...(superAdmin && form.companyId !== undefined ? { companyId: form.companyId } : {}),
        };
        try {
            if (form.mode === 'create') {
                await userService.create({
                    ...fields, password: form.password, mustChangePassword: form.mustChangePassword,
                    ...(form.roleIds.length ? { roleIds: form.roleIds } : {}),
                });
                toast.success(`${fields.firstName} ${fields.lastName} added`);
            } else {
                await userService.update(form.id, fields);
                const added = form.roleIds.filter((id) => !form.originalRoleIds.includes(id));
                const removed = form.originalRoleIds.filter((id) => !form.roleIds.includes(id));
                if (added.length) await userService.assignRoles(form.id, added);
                for (const id of removed) await userService.removeRole(form.id, id);
                toast.success('User updated');
            }
            setForm(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save the user.'));
        } finally {
            setBusy(false);
        }
    };

    const runConfirmed = async () => {
        setBusy(true);
        try {
            await confirm.action();
            toast.success(confirm.done);
            setConfirm(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'That did not work.'));
        } finally {
            setBusy(false);
        }
    };

    const actionsFor = (u) => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
        const items = [];
        const isMe = u.id === me?.id;
        if (superAdmin) items.push({ label: 'Edit details and roles', onClick: () => openEdit(u) });
        items.push({ label: 'Unlock sign-in', onClick: () => setConfirm({ title: `Unlock ${name}?`, caption: 'Clears a lock from too many failed sign-in attempts.', action: () => userService.unlock(u.id), done: `${name} unlocked` }) });
        if (superAdmin && !isMe) {
            items.push({ label: 'Sign out everywhere', onClick: () => setConfirm({ title: `Sign ${name} out everywhere?`, caption: 'Every open session ends; they can sign in again straight away.', action: () => userService.signOutEverywhere(u.id), done: `${name} signed out` }) });
            items.push(u.status === 'SUSPENDED'
                ? { label: 'Activate', onClick: () => setConfirm({ title: `Activate ${name}?`, caption: 'They can sign in again.', action: () => userService.activate(u.id), done: `${name} activated` }) }
                : { label: 'Suspend', danger: true, onClick: () => setConfirm({ title: `Suspend ${name}?`, caption: 'They are signed out and cannot sign in until activated.', action: () => userService.suspend(u.id), done: `${name} suspended`, danger: true }) });
            items.push({ label: 'Delete', danger: true, onClick: () => setConfirm({ title: `Delete ${name}?`, caption: 'This cannot be undone. Their audit history stays.', action: () => userService.remove(u.id), done: `${name} deleted`, danger: true }) });
        }
        return items;
    };

    if (!canManage) {
        return (
            <div className="page">
                <div className="page-head"><div><h1>User management</h1></div></div>
                <div className="card"><div className="empty-state">Only administrators can manage users.</div></div>
            </div>
        );
    }

    const rows = result?.content ?? [];
    const totalPages = result?.totalPages ?? 0;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>User management</h1>
                    <p>{superAdmin ? 'Everyone who can sign in to the console, across companies.' : 'Everyone in your company who can sign in to the console.'}</p>
                </div>
                <div className="head-actions">
                    <button className="btn btn--primary btn--sm" onClick={openCreate}><UserPlus size={15} /> Add user</button>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-input">
                    <Search size={15} />
                    <input placeholder="Search name, username or email" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="input filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status">
                    <option value="">All statuses</option>
                    {STATUS_FILTERS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </select>
            </div>

            <div className="table-card">
                <div className="card-head">
                    <div className="result-sentence"><strong>{result ? result.totalElements.toLocaleString() : '…'}</strong><span>users</span></div>
                    <button className="btn btn--ghost btn--sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
                </div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead><tr><th>User</th>{superAdmin && <th>Company</th>}<th>Roles</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
                        <tbody>
                            {error ? <tr><td colSpan={6}><div className="empty-state">{error}</div></td></tr>
                                : !result ? <tr><td colSpan={6}><div className="loading-state">Loading users…</div></td></tr>
                                    : rows.length === 0 ? <tr><td colSpan={6}><div className="empty-state">No users match.</div></td></tr>
                                        : rows.map((u) => {
                                            const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;
                                            return (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div className="name-cell">
                                                            <span className="avatar avatar--light">{initialsOf(name)}</span>
                                                            <div>
                                                                <div className="name-primary">{name}{u.id === me?.id && <span className="name-secondary"> · you</span>}</div>
                                                                <div className="name-secondary">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {superAdmin && <td>{u.companyId ? companyName(u.companyId) || '—' : <span className="name-secondary">Intact ID</span>}</td>}
                                                    <td><div className="head-actions" style={{ flexWrap: 'wrap', gap: 4 }}>{(u.roles || []).map((r) => <span key={r} className="role-chip">{humanize(normalizeRole(r))}</span>)}</div></td>
                                                    <td>
                                                        <Badge kind={STATUS_BADGE[u.status] || 'neutral'}>{humanize(u.status)}</Badge>
                                                        {u.mustChangePassword && <div className="name-secondary">Must change password</div>}
                                                    </td>
                                                    <td>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="name-secondary">Never</span>}</td>
                                                    <td><RowMenu items={actionsFor(u)} /></td>
                                                </tr>
                                            );
                                        })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="pagination">
                        <span>Page {page + 1} of {totalPages}</span>
                        <div className="pagination-controls">
                            <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Previous</button>
                            <button className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!form}
                onClose={() => setForm(null)}
                size="lg"
                title={form?.mode === 'create' ? 'Add user' : 'Edit user'}
                caption={form?.mode === 'create' ? 'They sign in with the username and temporary password below. Share them securely.' : undefined}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={save} disabled={busy || !!formError}>{busy ? 'Saving…' : form?.mode === 'create' ? 'Add user' : 'Save'}</button>
                    </>
                )}
            >
                {form && (
                    <div className="form-grid">
                        <div className="field"><label>First name</label><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoFocus /></div>
                        <div className="field"><label>Last name</label><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                        <div className="field"><label>Email</label>
                            <input className="input" type="email" value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value, username: form.mode === 'create' && !form.usernameEdited ? e.target.value : form.username })} />
                        </div>
                        <div className="field"><label>Username</label>
                            <input className="input" value={form.username} disabled={form.mode === 'edit'} onChange={(e) => setForm({ ...form, username: e.target.value, usernameEdited: true })} />
                        </div>
                        <div className="field"><label>Phone (optional)</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        {superAdmin && (
                            <div className="field"><label>Company</label>
                                <select className="input" value={form.companyId || ''} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                                    <option value="">Intact ID (staff)</option>
                                    {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                                </select>
                            </div>
                        )}
                        {form.mode === 'create' && (
                            <div className="field form-grid-full">
                                <label>Temporary password</label>
                                <div className="head-actions">
                                    <input className="input mono" style={{ flex: 1 }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                    <button className="btn btn--ghost btn--sm" onClick={() => setForm({ ...form, password: temporaryPassword() })}>New</button>
                                    <button className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard.writeText(form.password).then(() => toast.success('Copied'))}><Copy size={14} /></button>
                                </div>
                                <label className="checkbox-row"><input type="checkbox" checked={form.mustChangePassword} onChange={(e) => setForm({ ...form, mustChangePassword: e.target.checked })} /><span>Ask them to choose a new password when they first sign in</span></label>
                            </div>
                        )}
                        {superAdmin && roles.length > 0 && (
                            <div className="field form-grid-full">
                                <label>Roles</label>
                                <div className="role-options">
                                    {roles.map((r) => (
                                        <label key={r.id} className="checkbox-row" title={r.description}>
                                            <input type="checkbox" checked={form.roleIds.includes(r.id)}
                                                onChange={(e) => setForm({ ...form, roleIds: e.target.checked ? [...form.roleIds, r.id] : form.roleIds.filter((id) => id !== r.id) })} />
                                            <span><strong>{humanize(normalizeRole(r.name))}</strong> <span className="name-secondary">{r.description}</span></span>
                                        </label>
                                    ))}
                                </div>
                                {form.mode === 'create' && !form.roleIds.length && <span className="name-secondary">No role ticked: they get read-only access (Viewer).</span>}
                            </div>
                        )}
                        {formError && <div className="field-error form-grid-full">{formError}</div>}
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                title={confirm?.title}
                caption={confirm?.caption}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
                        <button className={confirm?.danger ? 'btn btn--danger-outline' : 'btn btn--primary'} onClick={runConfirmed} disabled={busy}>{busy ? 'Working…' : 'Confirm'}</button>
                    </>
                )}
            />
        </div>
    );
}
