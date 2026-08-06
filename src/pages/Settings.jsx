import { useState, useEffect, useCallback } from 'react';
import { Building2, ShieldCheck, ShieldOff, KeyRound, Lock, Monitor, RefreshCw, Trash2, Copy, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ChangePasswordModal from '../components/ui/ChangePasswordModal';
import TwoFactorSetupModal from '../components/ui/TwoFactorSetupModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import companyService from '../services/companyService';
import twoFactorService from '../services/twoFactorService';
import deviceService from '../services/deviceService';
import './Settings.css';

const SECTIONS = [
    { id: 'profile', label: 'Company Profile', description: 'Business identity & details', icon: Building2 },
    { id: 'security', label: 'Security', description: 'Password, 2FA & sessions', icon: KeyRound },
];

export default function Settings() {
    const { user: currentUser, updateUser } = useAuth();
    const { toast } = useToast();

    const [activeSection, setActiveSection] = useState('profile');
    const [loading, setLoading] = useState(true);

    // Profile
    const [company, setCompany] = useState(null);
    const [profileForm, setProfileForm] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);

    // Security
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [showDisable2FA, setShowDisable2FA] = useState(false);
    const [disabling2FA, setDisabling2FA] = useState(false);
    const [backupCodeCount, setBackupCodeCount] = useState(null);
    const [regeneratingCodes, setRegeneratingCodes] = useState(false);
    const [newBackupCodes, setNewBackupCodes] = useState(null);
    const [copiedNewCodes, setCopiedNewCodes] = useState(false);
    const [trustedDevices, setTrustedDevices] = useState([]);
    const [revokingDeviceId, setRevokingDeviceId] = useState(null);

    const companyId = currentUser?.companyId;
    const is2FAEnabled = !!currentUser?.is2faEnabled;

    const fetchProfile = useCallback(async () => {
        if (!companyId) return;
        const res = await companyService.getCurrentCompany(companyId);
        setCompany(res.data);
        setProfileForm({
            tradingName: res.data?.tradingName || '',
            businessType: res.data?.businessType || '',
        });
    }, [companyId]);

    const fetchSecurityData = useCallback(async () => {
        const devicesRes = await deviceService.listTrustedDevices();
        setTrustedDevices(devicesRes.data || []);

        if (is2FAEnabled) {
            const countRes = await twoFactorService.getRemainingBackupCodeCount();
            setBackupCodeCount(countRes.success ? countRes.data : null);
        } else {
            setBackupCodeCount(null);
        }
    }, [is2FAEnabled]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                if (activeSection === 'profile') await fetchProfile();
                if (activeSection === 'security') await fetchSecurityData();
            } catch (error) {
                console.error('Error fetching settings data:', error);
                toast.error('Failed to load settings data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, companyId, is2FAEnabled]);

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const res = await companyService.updateCompany(companyId, profileForm);
            setCompany(res.data);
            toast.success('Company profile updated');
        } catch (error) {
            toast.error(error.response?.data?.errorMessage || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handle2FAEnabled = () => {
        setShow2FASetup(false);
        updateUser({ ...currentUser, is2faEnabled: true });
        toast.success('Two-factor authentication enabled');
    };

    const handleDisable2FA = async () => {
        setDisabling2FA(true);
        try {
            await twoFactorService.disable();
            updateUser({ ...currentUser, is2faEnabled: false });
            toast.success('Two-factor authentication disabled');
            setShowDisable2FA(false);
        } catch (error) {
            toast.error(error.response?.data?.errorMessage || 'Failed to disable 2FA');
        } finally {
            setDisabling2FA(false);
        }
    };

    const handleRegenerateBackupCodes = async () => {
        setRegeneratingCodes(true);
        try {
            const response = await twoFactorService.regenerateBackupCodes();
            if (response.success) {
                setNewBackupCodes(response.data?.codes || []);
                setBackupCodeCount(response.data?.remainingCount ?? null);
            } else {
                toast.error(response.responseMessage || 'Failed to regenerate backup codes');
            }
        } catch (error) {
            toast.error(error.response?.data?.errorMessage || 'Failed to regenerate backup codes');
        } finally {
            setRegeneratingCodes(false);
        }
    };

    const handleCopyNewCodes = async () => {
        if (!newBackupCodes?.length) return;
        await navigator.clipboard.writeText(newBackupCodes.join('\n'));
        setCopiedNewCodes(true);
        setTimeout(() => setCopiedNewCodes(false), 2000);
    };

    const handleRevokeDevice = async (deviceId) => {
        setRevokingDeviceId(deviceId);
        try {
            await deviceService.revokeTrustedDevice(deviceId);
            setTrustedDevices((devices) => devices.filter((d) => d.id !== deviceId));
            toast.success('Device revoked');
        } catch (error) {
            toast.error(error.response?.data?.errorMessage || 'Failed to revoke device');
        } finally {
            setRevokingDeviceId(null);
        }
    };

    const initials = (currentUser?.username || '?').charAt(0).toUpperCase();

    return (
        <div className="settings">
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="page-subtitle">Manage your company profile and account security</p>
                </div>
            </div>

            <div className="settings-layout">
                <nav className="settings-nav">
                    <div className="settings-nav-profile">
                        <div className="settings-nav-avatar">{initials}</div>
                        <div>
                            <div className="settings-nav-username">{currentUser?.username}</div>
                            <div className="settings-nav-email">{currentUser?.email}</div>
                        </div>
                    </div>

                    {SECTIONS.map((section) => {
                        const SectionIcon = section.icon;
                        return (
                            <button
                                key={section.id}
                                className={`settings-nav-item ${activeSection === section.id ? 'settings-nav-item--active' : ''}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <SectionIcon size={18} className="settings-nav-icon" />
                                <span className="settings-nav-text">
                                    <span className="settings-nav-label">{section.label}</span>
                                    <span className="settings-nav-desc">{section.description}</span>
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="settings-content">
                    {activeSection === 'profile' && (
                        !companyId ? (
                            <Card className="settings-panel">
                                <EmptyState
                                    icon={Building2}
                                    title="No Company Profile"
                                    description="This account isn't associated with a single company, so there's no company profile to manage here."
                                />
                            </Card>
                        ) : loading || !profileForm ? (
                            <div className="page-loading"><div className="spinner"></div></div>
                        ) : (
                            <Card className="settings-panel">
                                <div className="card__header">
                                    <div>
                                        <h3 className="card__title">Company Profile</h3>
                                        <p className="card__subtitle">Identity and business details for your organization</p>
                                    </div>
                                    <Badge variant="info">{company?.status || 'Active'}</Badge>
                                </div>
                                <div className="card__body">
                                    <div className="settings-fieldset">
                                        <span className="settings-fieldset-label">Verified identity</span>
                                        <div className="settings-form settings-form--grid">
                                            <Input label="Legal Name" name="legalName" value={company?.legalName || ''} disabled />
                                            <Input label="Registration Number" name="regNumber" value={company?.registrationNumber || ''} disabled />
                                            <Input label="Country" name="country" value={company?.country || ''} disabled />
                                        </div>
                                        <p className="field-hint field-hint--block">
                                            These details are locked to your verified KYB record and can't be edited here.
                                        </p>
                                    </div>

                                    <div className="settings-fieldset">
                                        <span className="settings-fieldset-label">Business details</span>
                                        <div className="settings-form settings-form--grid">
                                            <Input
                                                label="Trading Name"
                                                name="tradingName"
                                                value={profileForm.tradingName}
                                                onChange={(e) => setProfileForm({ ...profileForm, tradingName: e.target.value })}
                                                placeholder="Trading Name"
                                            />
                                            <Input
                                                label="Business Type"
                                                name="businessType"
                                                value={profileForm.businessType}
                                                onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value })}
                                                placeholder="e.g. Fintech, E-commerce"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <Button variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
                                            {savingProfile ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    )}

                    {activeSection === 'security' && (
                        <div className="security-section">
                            <Card className="settings-panel">
                                <div className="card__header">
                                    <div className="card__header-icon"><Lock size={18} /></div>
                                    <div>
                                        <h3 className="card__title">Password</h3>
                                        <p className="card__subtitle">Change your password regularly to keep your account secure</p>
                                    </div>
                                </div>
                                <div className="card__body">
                                    <Button variant="secondary" onClick={() => setShowChangePassword(true)}>
                                        Change Password
                                    </Button>
                                </div>
                            </Card>

                            <Card className="settings-panel">
                                <div className="card__header">
                                    <div className="card__header-icon"><ShieldCheck size={18} /></div>
                                    <div>
                                        <h3 className="card__title">Two-Factor Authentication</h3>
                                        <p className="card__subtitle">Protect your account with a time-based authenticator app</p>
                                    </div>
                                    <Badge variant={is2FAEnabled ? 'success' : 'warning'}>
                                        {is2FAEnabled ? 'Enabled' : 'Not Enabled'}
                                    </Badge>
                                </div>
                                <div className="card__body">
                                    {is2FAEnabled ? (
                                        <>
                                            <div className="settings-inline-actions">
                                                <Button variant="secondary" onClick={() => setShowDisable2FA(true)}>
                                                    <ShieldOff size={16} /> Disable 2FA
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    onClick={handleRegenerateBackupCodes}
                                                    disabled={regeneratingCodes}
                                                >
                                                    <RefreshCw size={16} />
                                                    {regeneratingCodes ? 'Generating...' : 'Regenerate backup codes'}
                                                </Button>
                                            </div>
                                            {backupCodeCount !== null && (
                                                <p className="field-hint field-hint--block">
                                                    {backupCodeCount} backup code{backupCodeCount === 1 ? '' : 's'} remaining
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <Button variant="secondary" onClick={() => setShow2FASetup(true)}>
                                            <ShieldCheck size={16} /> Enable 2FA
                                        </Button>
                                    )}
                                </div>
                            </Card>

                            <Card className="settings-panel">
                                <div className="card__header">
                                    <div className="card__header-icon"><Monitor size={18} /></div>
                                    <div>
                                        <h3 className="card__title">Trusted Devices</h3>
                                        <p className="card__subtitle">Devices that can skip 2FA on this account</p>
                                    </div>
                                </div>
                                <div className="card__body">
                                    {trustedDevices.length === 0 ? (
                                        <p className="field-hint">No trusted devices yet — check "Remember this device" at your next 2FA sign-in.</p>
                                    ) : (
                                        trustedDevices.map((device) => (
                                            <div className="session-item" key={device.id}>
                                                <div className="session-info">
                                                    <div className="session-device">
                                                        <Monitor size={16} className="session-icon" />
                                                        {device.deviceLabel || 'Unknown device'}
                                                    </div>
                                                    <div className="session-location">
                                                        {device.ipAddress ? `${device.ipAddress} · ` : ''}
                                                        Last used {device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : '—'}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => handleRevokeDevice(device.id)}
                                                    disabled={revokingDeviceId === device.id}
                                                >
                                                    <Trash2 size={14} /> Revoke
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            <ChangePasswordModal
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
                userId={currentUser?.id}
                onSuccess={() => {
                    setShowChangePassword(false);
                    toast.success('Password changed successfully');
                }}
            />

            <TwoFactorSetupModal
                isOpen={show2FASetup}
                onClose={() => setShow2FASetup(false)}
                onEnabled={handle2FAEnabled}
            />

            <Modal
                isOpen={showDisable2FA}
                onClose={() => setShowDisable2FA(false)}
                title="Disable Two-Factor Authentication"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowDisable2FA(false)} disabled={disabling2FA}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDisable2FA} disabled={disabling2FA}>
                            {disabling2FA ? 'Disabling...' : 'Disable 2FA'}
                        </Button>
                    </>
                }
            >
                <p className="security-description">
                    This will remove the extra layer of protection from your account. You can re-enable it at any time.
                </p>
            </Modal>

            <Modal
                isOpen={!!newBackupCodes}
                onClose={() => setNewBackupCodes(null)}
                title="Your new backup codes"
                size="sm"
                footer={
                    <Button variant="primary" onClick={() => setNewBackupCodes(null)}>
                        Done
                    </Button>
                }
            >
                <p className="security-description">
                    Your previous backup codes no longer work. Save these somewhere safe — each one
                    can only be used once, and they won't be shown again.
                </p>
                <div className="backup-codes-grid">
                    {(newBackupCodes || []).map((c) => (
                        <code key={c} className="backup-code-item">{c}</code>
                    ))}
                </div>
                <div className="backup-codes-actions">
                    <button type="button" className="copy-btn" onClick={handleCopyNewCodes}>
                        {copiedNewCodes ? <Check size={16} /> : <Copy size={16} />}
                        {copiedNewCodes ? 'Copied' : 'Copy all'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
