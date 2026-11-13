import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import webhookService from '../../services/webhookService';
import { errorMessage } from '../../services/api';
import '../insights/insights.css';

// [setting, label, default when never saved]
const FLAGS = [
    ['notifyApplicantOnApproval', 'When a verification is approved', true],
    ['notifyApplicantOnRejection', 'When a verification is rejected', true],
    ['notifyApplicantOnPendingReview', 'When it goes to manual review', false],
];

function flagsFrom(saved = {}) {
    return Object.fromEntries(FLAGS.map(([key, , byDefault]) => [key, typeof saved[key] === 'boolean' ? saved[key] : byDefault]));
}

// Super admins only: whether Intact ID emails the person being verified, for one company.
// `settings` is the company's communication record, which already carries notificationSettings.
// The parent remounts this per company (key={companyId}), so the form starts from that company's saved values.
export default function ApplicantEmails({ companyId, settings }) {
    const { toast } = useToast();
    const [saved, setSaved] = useState(() => flagsFrom(settings?.notificationSettings));
    const [flags, setFlags] = useState(saved);
    const [saving, setSaving] = useState(false);
    const isDirty = FLAGS.some(([key]) => flags[key] !== saved[key]);

    const save = async () => {
        setSaving(true);
        try {
            await webhookService.updateApplicantEmails(companyId, flags);
            setSaved(flags);
            toast.success('Applicant emails saved');
        } catch (e) {
            toast.error(errorMessage(e, 'Could not save applicant emails.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card">
            <div className="card-head">
                <div>
                    <h3>Emails to applicants</h3>
                    <div className="card-caption">Whether Intact ID also emails the person being verified, alongside the webhook.</div>
                </div>
                <span className="staff-tag"><Lock size={11} /> Super admins</span>
            </div>
            <div className="settings-item-list">
                {FLAGS.map(([key, label]) => (
                    <div key={key} className="settings-toggle-row">
                        <span>{label}</span>
                        <button className={`toggle${flags[key] ? ' is-on' : ''}`} onClick={() => setFlags({ ...flags, [key]: !flags[key] })}
                                aria-pressed={flags[key]} aria-label={label}>
                            <span className="toggle-knob" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="head-actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                <button className="btn btn--secondary btn--sm" onClick={() => setFlags(saved)} disabled={!isDirty || saving}>Discard</button>
                <button className="btn btn--primary btn--sm" onClick={save} disabled={!isDirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
        </div>
    );
}
