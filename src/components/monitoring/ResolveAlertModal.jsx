import { useState } from 'react';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import monitoringService from '../../services/monitoringService';
import { errorMessage } from '../../services/api';
import AlertMatches from './AlertMatches';

// Confirm (it is them) or dismiss (it is not) a monitoring alert
export default function ResolveAlertModal({ pending, onClose, onResolved }) {
    const { toast } = useToast();
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    if (!pending) return null;
    const { alert, decision, name } = pending;

    const save = async () => {
        setBusy(true);
        try {
            await monitoringService.resolve(alert.id, decision, note);
            toast.success(decision === 'CONFIRMED' ? 'Marked as a true match' : 'Dismissed; this entry is ignored unless it changes');
            setNote('');
            onResolved();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not update the alert.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={() => !busy && onClose()}
            title={decision === 'CONFIRMED' ? `Is this ${name}?` : `Not ${name}?`}
            caption={decision === 'CONFIRMED'
                ? 'Confirm that the watchlist entry is this customer. Decide what to do with the customer under your own policy; the verification itself is not changed.'
                : 'Dismiss it as a false positive. It is not raised again for this customer unless the entry gains new topics.'}
            footer={<>
                <button className="btn btn--secondary" onClick={onClose} disabled={busy}>Cancel</button>
                <button className={decision === 'CONFIRMED' ? 'btn btn--danger-outline' : 'btn btn--primary'} onClick={save} disabled={busy}>
                    {busy ? 'Saving…' : decision === 'CONFIRMED' ? 'Confirm match' : 'Dismiss'}
                </button>
            </>}
        >
            <AlertMatches matches={alert.matches} />
            <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="ra-note">Note (optional)</label>
                <input id="ra-note" className="input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
                       placeholder={decision === 'DISMISSED' ? 'e.g. Different date of birth' : 'e.g. Same ID number on the listing'} />
            </div>
        </Modal>
    );
}
