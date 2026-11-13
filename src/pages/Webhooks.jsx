import { useCallback, useEffect, useState } from 'react';
import { Send, Copy, RotateCw, ShieldCheck, Search } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import webhookService from '../services/webhookService';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { hasAnyRole, isSuperAdmin } from '../utils/roles';
import { humanize, initialsOf } from '../utils/format';
import { DeliveryHealth, DeliveryLog } from './webhooks/Deliveries';
import ApplicantEmails from './webhooks/ApplicantEmails';

// The only events auth-server sends today. There is no per-event subscription in the API.
const EVENTS_SENT = ['verification.completed', 'verification.failed'];

// Payload fields a company can switch on or off. `byDefault` mirrors auth-server's
// CompanyCommunicationDetails.isPayloadFieldEnabled: everything on except raw scores and applicant PII.
const PAYLOAD_FIELDS = [
    { key: 'includeVerificationId', label: 'Verification ID', byDefault: true },
    { key: 'includeCompanyId', label: 'Company ID', byDefault: true },
    { key: 'includeCompanyName', label: 'Company name', byDefault: true },
    { key: 'includeTier', label: 'Verification tier', byDefault: true },
    { key: 'includeTimestamps', label: 'Timestamps', byDefault: true },
    { key: 'includeRejectionReason', label: 'Rejection reason', byDefault: true },
    { key: 'includeResults', label: 'Step results', byDefault: true },
    { key: 'includeRawScores', label: 'Raw scores (inside step results)', byDefault: false },
    { key: 'includeApplicant', label: 'Applicant details (personal data)', byDefault: false },
];

function formFromSettings(settings) {
    const saved = settings?.payloadFields || {};
    return {
        webhookUrl: settings?.webhookUrl || '',
        webhookEnabled: !!settings?.webhookEnabled,
        payloadFields: Object.fromEntries(PAYLOAD_FIELDS.map((f) => [
            f.key,
            typeof saved[f.key] === 'boolean' ? saved[f.key] : f.byDefault,
        ])),
    };
}

function isValidWebhookUrl(value) {
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

export default function Webhooks() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isAdmin = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const superAdmin = isSuperAdmin(user);

    // Admins pick any company; company users only see their own, read-only (changes are admin-only).
    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState(isAdmin ? null : user?.companyId);
    const [search, setSearch] = useState('');

    const [settings, setSettings] = useState(null);
    const [form, setForm] = useState(formFromSettings(null));
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const [newSecret, setNewSecret] = useState(null);
    const [deliveriesRefresh, setDeliveriesRefresh] = useState(0);

    useEffect(() => {
        if (!isAdmin) return;
        companyService
            .list({ size: 100 })
            .then((page) => {
                setCompanies(page.content);
                setCompanyId((current) => current ?? page.content[0]?.id ?? null);
            })
            .catch((error) => setLoadError(errorMessage(error, 'Could not load companies.')));
    }, [isAdmin]);

    const load = useCallback(async (id) => {
        setSettings(null);
        setLoadError('');
        try {
            const data = await webhookService.get(id);
            setSettings(data);
            setForm(formFromSettings(data));
        } catch (error) {
            setLoadError(errorMessage(error, 'Could not load webhook settings.'));
        }
    }, []);

    useEffect(() => {
        if (companyId) load(companyId);
    }, [companyId, load]);

    const saved = formFromSettings(settings);
    const isDirty = JSON.stringify(form) !== JSON.stringify(saved);
    const urlError = form.webhookUrl && !isValidWebhookUrl(form.webhookUrl) ? 'Use a full https:// URL.' : '';

    const save = async () => {
        if (form.webhookEnabled && !form.webhookUrl) {
            toast.error('Add an endpoint URL before enabling webhooks.');
            return;
        }
        if (urlError) {
            toast.error(urlError);
            return;
        }
        setSaving(true);
        try {
            const updated = await webhookService.update(companyId, form);
            setSettings(updated);
            setForm(formFromSettings(updated));
            toast.success('Webhook settings saved');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not save webhook settings.'));
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        setTesting(true);
        try {
            await webhookService.sendTest(companyId);
            toast.success('Test event sent. Check your endpoint logs.');
        } catch (error) {
            toast.error(errorMessage(error, 'The test event could not be delivered.'));
        } finally {
            setTesting(false);
        }
    };

    const rotate = async () => {
        setSaving(true);
        try {
            const updated = await webhookService.rotateSecret(companyId);
            setNewSecret(updated.webhookSecret);
            setConfirmRotate(false);
            await load(companyId); // re-read so the page shows the masked value again
        } catch (error) {
            toast.error(errorMessage(error, 'Could not rotate the signing secret.'));
        } finally {
            setSaving(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(newSecret).then(
            () => toast.success('Copied'),
            () => toast.error('Could not copy — select the text and copy it manually'),
        );
    };

    const selectedCompany = companies.find((c) => c.id === companyId);
    const query = search.trim().toLowerCase();
    const filteredCompanies = companies.filter((c) =>
        [c.legalName, c.tradingName].some((name) => name?.toLowerCase().includes(query)));

    const detail = loadError ? (
        <div className="card"><div className="empty-state">{loadError}</div></div>
    ) : !settings ? (
        <div className="card"><div className="loading-state">Loading webhook settings…</div></div>
    ) : (
        <>
            {selectedCompany && (
                <div className="card">
                    <div className="card-head">
                        <div className="subject-head" style={{ marginBottom: 0 }}>
                            <span className="avatar avatar--dark avatar--lg">{initialsOf(selectedCompany.tradingName || selectedCompany.legalName)}</span>
                            <div>
                                <div className="name-primary">{selectedCompany.legalName}</div>
                                <div className="name-secondary">{settings.webhookEnabled ? 'Webhooks enabled' : 'Webhooks disabled'}</div>
                            </div>
                        </div>
                        <div className="head-actions">
                            <button
                                className="btn btn--secondary btn--sm"
                                onClick={sendTest}
                                disabled={testing || !settings.webhookUrl || isDirty}
                                title={isDirty ? 'Save your changes first' : !settings.webhookUrl ? 'Save an endpoint URL first' : undefined}
                            >
                                <Send size={15} /> {testing ? 'Sending…' : 'Send test event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeliveryHealth companyId={companyId} refreshKey={deliveriesRefresh} />

            <div className="card">
                <div className="settings-grid">
                    <section>
                        <div className="card-head">
                            <h3>Endpoint</h3>
                            <label className="checkbox-row">
                                <span>{form.webhookEnabled ? 'Enabled' : 'Disabled'}</span>
                                <button
                                    type="button"
                                    className={`toggle${form.webhookEnabled ? ' is-on' : ''}`}
                                    onClick={() => setForm((f) => ({ ...f, webhookEnabled: !f.webhookEnabled }))}
                                    disabled={!isAdmin}
                                    aria-pressed={form.webhookEnabled}
                                    aria-label="Send webhooks"
                                >
                                    <span className="toggle-knob" />
                                </button>
                            </label>
                        </div>

                        <div className="field">
                            <label htmlFor="webhook-url">URL</label>
                            <input
                                id="webhook-url"
                                className="input mono"
                                type="url"
                                placeholder="https://api.example.com/hooks/intact"
                                value={form.webhookUrl}
                                onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                                disabled={!isAdmin}
                            />
                            {urlError && <div className="field-error">{urlError}</div>}
                        </div>

                        <div className="field">
                            <label>Signing secret</label>
                            <div className="head-actions" style={{ justifyContent: 'space-between' }}>
                                <div className="copy-field mono" style={{ flex: 1 }}>{settings.webhookSecret || 'Not generated yet'}</div>
                                {isAdmin && (
                                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirmRotate(true)}>
                                        <RotateCw size={14} /> {settings.webhookSecret ? 'Rotate' : 'Generate'}
                                    </button>
                                )}
                            </div>
                            <div className="card-caption" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <ShieldCheck size={14} style={{ flex: 'none', marginTop: 2 }} />
                                <span>
                                    Each event carries <span className="mono">X-Webhook-Signature: sha256=…</span>, an HMAC-SHA256 of the raw
                                    body keyed with this secret. Reject events whose signature does not match. Failed deliveries are retried
                                    after 1, 5 and 15 minutes.
                                </span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="card-head"><h3>Payload</h3></div>

                        <div className="field">
                            <label>Events sent</label>
                            <div className="event-checklist">
                                {EVENTS_SENT.map((event) => <span key={event} className="mono">{event}</span>)}
                            </div>
                        </div>

                        <div className="field">
                            <label>Fields included</label>
                            <div className="event-checklist">
                                {PAYLOAD_FIELDS.map((f) => (
                                    <label key={f.key} className="checkbox-row">
                                        <input
                                            type="checkbox"
                                            checked={form.payloadFields[f.key]}
                                            disabled={!isAdmin || (f.key === 'includeRawScores' && !form.payloadFields.includeResults)}
                                            onChange={(e) => setForm((prev) => ({
                                                ...prev,
                                                payloadFields: { ...prev.payloadFields, [f.key]: e.target.checked },
                                            }))}
                                        />
                                        <span>{f.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {isAdmin && (
                    <div className="modal-footer" style={{ margin: '4px -22px -22px', borderRadius: '0 0 12px 12px' }}>
                        <button className="btn btn--secondary btn--sm" onClick={() => setForm(saved)} disabled={!isDirty || saving}>Discard</button>
                        <button className="btn btn--primary btn--sm" onClick={save} disabled={!isDirty || saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                )}
            </div>

            {superAdmin && <ApplicantEmails key={companyId} companyId={companyId} settings={settings} />}

            <DeliveryLog
                companyId={companyId}
                refreshKey={deliveriesRefresh}
                onRefresh={() => setDeliveriesRefresh((n) => n + 1)}
            />
        </>
    );

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Webhooks</h1>
                    <p>Where Intact ID posts verification events for your systems{superAdmin ? ', and which emails applicants get' : ''}.</p>
                </div>
            </div>

            {isAdmin ? (
                <div className="api-layout">
                    <div className="card api-companies-card">
                        <div className="card-head"><h3>Companies</h3></div>
                        <div className="search-input" style={{ marginBottom: 12 }}>
                            <Search size={14} />
                            <input placeholder="Search company" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="api-company-list">
                            {companies.length === 0 && !loadError && <div className="loading-state">Loading companies…</div>}
                            {filteredCompanies.map((c) => (
                                <button
                                    key={c.id}
                                    className={`api-company-item${c.id === companyId ? ' is-selected' : ''}`}
                                    onClick={() => setCompanyId(c.id)}
                                >
                                    <span className="avatar avatar--light">{initialsOf(c.tradingName || c.legalName)}</span>
                                    <div>
                                        <div className="name-primary">{c.tradingName || c.legalName}</div>
                                        <div className="name-secondary">{[humanize(c.status), c.country].filter(Boolean).join(' · ')}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="api-detail">{detail}</div>
                </div>
            ) : detail}

            <Modal
                isOpen={confirmRotate}
                onClose={() => setConfirmRotate(false)}
                title={settings?.webhookSecret ? 'Rotate the signing secret?' : 'Generate a signing secret?'}
                caption={settings?.webhookSecret
                    ? 'Events are signed with the new secret straight away. Signature checks using the old secret will start failing until the endpoint is updated.'
                    : 'The secret is shown once. Copy it before closing.'}
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setConfirmRotate(false)} disabled={saving}>Cancel</button>
                        <button className="btn btn--primary" onClick={rotate} disabled={saving}>{saving ? 'Working…' : settings?.webhookSecret ? 'Rotate secret' : 'Generate secret'}</button>
                    </>
                )}
            />

            <Modal
                isOpen={!!newSecret}
                onClose={() => setNewSecret(null)}
                title="New signing secret"
                caption="Copy it now. It will not be shown again in full."
                footer={<button className="btn btn--primary" onClick={() => setNewSecret(null)}>I have copied it</button>}
            >
                <button className="copy-field mono" onClick={copySecret}>{newSecret} <Copy size={14} /></button>
            </Modal>
        </div>
    );
}
