import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import verificationService from '../../services/verificationService';
import { errorMessage } from '../../services/api';

/**
 * Approve or reject a verification in manual review. auth-server records the reviewer, time and
 * notes; the automated risk score stays as it was. A rejection needs a note.
 *
 * pending = { verificationId, name, decision: 'approved' | 'rejected' } or null when closed.
 */
export default function ReviewDecisionModal({ pending, onClose, onResolved }) {
    const { toast } = useToast();
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const isReject = pending?.decision === 'rejected';

    const close = () => {
        setNotes('');
        onClose();
    };

    const submit = async () => {
        if (isReject && !notes.trim()) {
            toast.error('Add a note explaining the rejection.');
            return;
        }
        setSaving(true);
        try {
            const updated = await verificationService.resolveReview(pending.verificationId, pending.decision, notes.trim());
            toast.success(`${pending.name} ${isReject ? 'rejected' : 'approved'}`);
            setNotes('');
            onResolved(updated);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not record the decision.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={!!pending}
            onClose={close}
            title={isReject ? `Reject ${pending?.name}?` : `Approve ${pending?.name}?`}
            caption="Your name, the time and your note are saved with the decision. The company is notified by webhook."
            footer={(
                <>
                    <button className="btn btn--secondary" onClick={close} disabled={saving}>Cancel</button>
                    <button className={isReject ? 'btn btn--danger-outline' : 'btn btn--primary'} onClick={submit} disabled={saving}>
                        {saving ? 'Saving…' : isReject ? 'Reject verification' : 'Approve verification'}
                    </button>
                </>
            )}
        >
            <div className="field">
                <label htmlFor="review-notes">{isReject ? 'Reason for rejecting' : 'Note (optional)'}</label>
                <textarea
                    id="review-notes"
                    className="input"
                    rows={4}
                    placeholder={isReject ? 'e.g. Selfie does not match the ID photo' : 'e.g. Matched against passport photo'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
        </Modal>
    );
}
