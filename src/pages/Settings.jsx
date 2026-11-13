import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserRound, ShieldCheck, Building2, Copy, Briefcase } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import accountService from '../services/accountService';
import companyService from '../services/companyService';
import api, { errorMessage } from '../services/api';
import { hasAnyRole, isSuperAdmin, roleLabel } from '../utils/roles';
import OwnerCheckSettings from '../components/kyb/OwnerCheckSettings';
import { formatDateTime } from '../utils/format';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

function AccountTab({ user }) {
    const { toast } = useToast();
    const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [saving, setSaving] = useState(false);

    const problem = !pw.currentPassword ? 'Enter your current password.'
        : !PASSWORD_RULE.test(pw.newPassword) ? 'The new password needs 8+ characters with upper and lower case, a digit and one of @$!%*?&.'
            : pw.newPassword !== pw.confirmPassword ? 'The new passwords do not match.' : '';

    const change = async () => {
        setSaving(true);
        try {
            await accountService.changePassword(user.id, pw);
            toast.success('Password changed');
            setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (e) {
            toast.error(errorMessage(e, 'Could not change the password.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="card">
                <div className="card-head"><h3>Your account</h3></div>
                <div className="kv-grid">
                    <div className="kv-cell"><span>Name</span><strong>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</strong></div>
                    <div className="kv-cell"><span>Username</span><strong>{user.username}</strong></div>
                    <div className="kv-cell"><span>Email</span><strong>{user.email || '—'}</strong></div>
                    <div className="kv-cell"><span>Phone</span><strong>{user.phone || '—'}</strong></div>
                    <div className="kv-cell"><span>Role</span><strong>{roleLabel(user) || '—'}</strong></div>
                    <div className="kv-cell"><span>Last sign-in</span><strong>{formatDateTime(user.lastLoginAt)}</strong></div>
                </div>
                <p className="card-caption" style={{ marginTop: 12 }}>To change your name or email, ask a super admin (User management).</p>
            </div>

            <div className="card">
                <div className="card-head"><h3>Change password</h3></div>
                <div className="form-grid">
                    <div className="field form-grid-full">
                        <label htmlFor="pw-current">Current password</label>
                        <input id="pw-current" className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
                    </div>
                    <div className="field">
                        <label htmlFor="pw-new">New password</label>
                        <input id="pw-new" className="input" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                    </div>
                    <div className="field">
                        <label htmlFor="pw-confirm">Repeat new password</label>
                        <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} />
                    </div>
                </div>
                {pw.currentPassword && problem && <div className="field-error">{problem}</div>}
                <div className="head-actions" style={{ marginTop: 14 }}>
                    <button className="btn btn--primary btn--sm" disabled={!!problem || saving} onClick={change}>{saving ? 'Saving…' : 'Change password'}</button>
                </div>
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Security: 2FA, backup codes, trusted browsers
// ---------------------------------------------------------------------------

const secretOf = (url) => {
    try { return new URL(url).searchParams.get('secret') || ''; } catch { return ''; }
};

function SecurityTab({ user, onUserChange }) {
    const { toast } = useToast();
    const enabled = !!user.is2faEnabled;
    const [setup, setSetup] = useState(null); // { url, code, codes }
    const [codesLeft, setCodesLeft] = useState(null);
    const [devices, setDevices] = useState(null);
    const [confirmDisable, setConfirmDisable] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        accountService.trustedDevices().then(setDevices).catch(() => setDevices([]));
        if (enabled) accountService.backupCodesLeft().then(setCodesLeft).catch(() => {});
    }, [enabled]);

    useEffect(() => { load(); }, [load]);

    const start = async () => {
        setBusy(true);
        try {
            const result = await accountService.startTwoFactor();
            setSetup({ url: result.qrCodeEncodeUrl, code: '', codes: null });
        } catch (e) {
            toast.error(errorMessage(e, 'Could not start two-factor set-up.'));
        } finally {
            setBusy(false);
        }
    };

    const verify = async () => {
        setBusy(true);
        try {
            await accountService.verifyTwoFactor(setup.code);
            const backup = await accountService.newBackupCodes();
            setSetup({ ...setup, codes: backup.codes });
            onUserChange({ is2faEnabled: true });
            setCodesLeft(backup.remainingCount ?? backup.codes.length);
        } catch (e) {
            toast.error(errorMessage(e, 'That code did not match. Try the newest one in your app.'));
        } finally {
            setBusy(false);
        }
    };

    const regenerate = async () => {
        setBusy(true);
        try {
            const backup = await accountService.newBackupCodes();
            setSetup({ url: null, code: '', codes: backup.codes });
            setCodesLeft(backup.remainingCount ?? backup.codes.length);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not create new backup codes.'));
        } finally {
            setBusy(false);
        }
    };

    const disable = async () => {
        setBusy(true);
        try {
            await accountService.disableTwoFactor();
            onUserChange({ is2faEnabled: false });
            setConfirmDisable(false);
            toast.success('Two-factor authentication turned off');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not turn off two-factor authentication.'));
        } finally {
            setBusy(false);
        }
    };

    const forget = async (device) => {
        try {
            await accountService.forgetDevice(device.id);
            setDevices((list) => list.filter((d) => d.id !== device.id));
            toast.success('Browser forgotten; it will ask for a code next time');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not forget that browser.'));
        }
    };

    const copyCodes = () => navigator.clipboard.writeText(setup.codes.join('\n')).then(() => toast.success('Backup codes copied'));

    return (
        <>
            <div className="card">
                <div className="card-head">
                    <div>
                        <h3>Two-factor authentication</h3>
                        <div className="card-caption">A code from an authenticator app (Google Authenticator, Authy, 1Password…) at every sign-in.</div>
                    </div>
                    {enabled ? <Badge kind="ok">On</Badge> : <Badge kind="warn">Off</Badge>}
                </div>
                {enabled ? (
                    <div className="head-actions">
                        <span className="card-caption">{codesLeft !== null ? `${codesLeft} backup codes left` : ''}</span>
                        <button className="btn btn--secondary btn--sm" onClick={regenerate} disabled={busy}>New backup codes</button>
                        <button className="btn btn--danger-outline btn--sm" onClick={() => setConfirmDisable(true)}>Turn off</button>
                    </div>
                ) : (
                    <button className="btn btn--primary btn--sm" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Set up two-factor'}</button>
                )}
            </div>

            <div className="table-card">
                <div className="card-head"><div><h3>Trusted browsers</h3><div className="card-caption">These skip the code at sign-in.</div></div></div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead><tr><th>Browser</th><th>IP address</th><th>Last used</th><th /></tr></thead>
                        <tbody>
                            {!devices ? <tr><td colSpan={4}><div className="loading-state">Loading…</div></td></tr>
                                : devices.length === 0 ? <tr><td colSpan={4}><div className="empty-state">No trusted browsers.</div></td></tr>
                                    : devices.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.deviceLabel || 'Unknown browser'}</td>
                                            <td className="mono">{d.ipAddress || '—'}</td>
                                            <td>{formatDateTime(d.lastUsedAt || d.createdAt)}</td>
                                            <td><button className="btn btn--ghost btn--sm" onClick={() => forget(d)}>Forget</button></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={!!setup}
                onClose={() => setSetup(null)}
                title={setup?.codes ? 'Save your backup codes' : 'Set up two-factor authentication'}
                caption={setup?.codes
                    ? 'Each code works once, if you lose your phone. They will not be shown again.'
                    : 'Scan the QR code with your authenticator app, then enter the 6-digit code it shows.'}
                footer={setup?.codes ? (
                    <>
                        <button className="btn btn--secondary" onClick={copyCodes}><Copy size={14} /> Copy</button>
                        <button className="btn btn--primary" onClick={() => setSetup(null)}>I have saved them</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn--secondary" onClick={() => setSetup(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={verify} disabled={busy || !/^\d{6}$/.test(setup?.code || '')}>{busy ? 'Checking…' : 'Turn on'}</button>
                    </>
                )}
            >
                {setup?.codes ? (
                    <div className="backup-codes mono">{setup.codes.map((c) => <span key={c}>{c}</span>)}</div>
                ) : setup?.url && (
                    <div className="twofa-setup">
                        <div className="twofa-qr"><QRCodeSVG value={setup.url} size={168} /></div>
                        <div className="field">
                            <label>Can't scan? Enter this key</label>
                            <code className="mono">{secretOf(setup.url)}</code>
                            <label htmlFor="twofa-code" style={{ marginTop: 12 }}>Code from the app</label>
                            <input id="twofa-code" className="input mono" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="123456"
                                value={setup.code} onChange={(e) => setSetup({ ...setup, code: e.target.value.replace(/\D/g, '') })} autoFocus />
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={confirmDisable}
                onClose={() => setConfirmDisable(false)}
                title="Turn off two-factor authentication?"
                caption="Signing in will only need your password. Your backup codes stop working."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setConfirmDisable(false)} disabled={busy}>Cancel</button>
                        <button className="btn btn--danger-outline" onClick={disable} disabled={busy}>{busy ? 'Working…' : 'Turn off'}</button>
                    </>
                )}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Company and applicant emails
// ---------------------------------------------------------------------------

const COMPANY_FIELDS = [
    ['tradingName', 'Trading name'], ['businessType', 'Business type'], ['website', 'Website'],
    ['email', 'Main email'], ['phone', 'Main phone'], ['supportEmail', 'Support email'],
    ['billingEmail', 'Billing email'], ['secondaryEmail', 'Secondary email'], ['secondaryPhone', 'Secondary phone'],
];

function CompanyTab({ canEdit }) {
    const { toast } = useToast();
    const [company, setCompany] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const mine = await companyService.getMine();
            const contact = await companyService.getCommunication(mine.id).catch(() => ({}));
            setCompany(mine);
            setForm(Object.fromEntries(COMPANY_FIELDS.map(([key]) => [key, (key in mine ? mine[key] : contact[key]) || ''])));
        } catch (e) {
            setError(errorMessage(e, 'Could not load your company.'));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
            await api.put(`/api/companies/${company.id}`, body).then((r) => { if (!r.data.success) throw new Error(r.data.responseMessage); });
            toast.success('Company details saved');
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save company details.'));
        } finally {
            setSaving(false);
        }
    };

    if (error) return <div className="card"><div className="empty-state">{error}</div></div>;
    if (!form) return <div className="card"><div className="loading-state">Loading…</div></div>;

    return (
        <div className="card">
            <div className="card-head">
                <div><h3>{company.legalName}</h3><div className="card-caption">{[company.registrationNumber, company.country, company.companyIdentifierCode].filter(Boolean).join(' · ')}</div></div>
                <Badge kind={company.status === 'ACTIVE' ? 'ok' : 'warn'}>{company.status}</Badge>
            </div>
            <div className="form-grid">
                {COMPANY_FIELDS.map(([key, label]) => (
                    <div key={key} className="field">
                        <label>{label}</label>
                        <input className="input" disabled={!canEdit} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </div>
                ))}
            </div>
            {canEdit ? (
                <div className="head-actions" style={{ marginTop: 14 }}>
                    <button className="btn btn--primary btn--sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
            ) : <p className="card-caption" style={{ marginTop: 12 }}>Only administrators can change company details.</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------

export default function Settings() {
    const { user, updateUser } = useAuth();
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);

    const tabs = [
        { id: 'account', label: 'Account', desc: 'Your profile and password', icon: UserRound },
        { id: 'security', label: 'Security', desc: 'Two-factor and trusted browsers', icon: ShieldCheck },
        ...(user?.companyId ? [{ id: 'company', label: 'Company', desc: 'Contact details', icon: Building2 }] : []),
        ...(isSuperAdmin(user) || (isAdmin && user?.companyId)
            ? [{ id: 'kyb', label: 'Business verification', desc: 'Who is checked behind a business', icon: Briefcase }] : []),
    ];
    const [tab, setTab] = useState('account');

    if (!user) return null;

    return (
        <div className="page">
            <div className="page-head">
                <div><h1>Settings</h1><p>Your account and security{user.companyId ? ', and your company' : ''}.</p></div>
            </div>
            <div className="settings-layout">
                <nav className="settings-nav">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} className={`settings-nav-item${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
                                <Icon size={16} />
                                <div><div className="settings-nav-label">{t.label}</div><div className="settings-nav-desc">{t.desc}</div></div>
                            </button>
                        );
                    })}
                </nav>
                <div className="settings-content">
                    {tab === 'account' && <AccountTab user={user} />}
                    {tab === 'security' && <SecurityTab user={user} onUserChange={updateUser} />}
                    {tab === 'company' && <CompanyTab canEdit={isAdmin} />}
                    {tab === 'kyb' && <OwnerCheckSettings companyId={isSuperAdmin(user) ? undefined : user.companyId} />}
                </div>
            </div>
        </div>
    );
}
