import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { boundariesOf, thresholdError, thresholdsFrom } from './model';

/**
 * Sets where Low ends and where Medium ends. Each level starts where the previous one stops,
 * so the three always cover 0 to 100 with no gaps.
 */
export default function ThresholdModal({ title, caption, thresholds, onClose, onConfirm }) {
    const initial = boundariesOf(thresholds);
    const [lowTo, setLowTo] = useState(String(initial.lowTo));
    const [mediumTo, setMediumTo] = useState(String(initial.mediumTo));
    const [error, setError] = useState('');

    const confirm = () => {
        const low = lowTo === '' ? NaN : Number(lowTo);
        const medium = mediumTo === '' ? NaN : Number(mediumTo);
        const problem = thresholdError(low, medium);
        if (problem) {
            setError(problem);
            return;
        }
        onConfirm(thresholdsFrom(low, medium));
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={title}
            caption={caption}
            footer={(
                <>
                    <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn--primary" onClick={confirm}>Confirm</button>
                </>
            )}
        >
            <div className="rm-level-row">
                <Badge kind="ok" dot={false}>Low risk</Badge>
                <span>from</span><input className="input" value="0" disabled aria-label="Low from" />
                <span>to</span>
                <input className="input" type="number" min="1" max="98" value={lowTo} onChange={(e) => setLowTo(e.target.value)} aria-label="Low to" autoFocus />
            </div>
            <div className="rm-level-row">
                <Badge kind="warn" dot={false}>Medium risk</Badge>
                <span>from</span><input className="input" value={lowTo} disabled aria-label="Medium from" />
                <span>to</span>
                <input className="input" type="number" min="2" max="99" value={mediumTo} onChange={(e) => setMediumTo(e.target.value)} aria-label="Medium to" />
            </div>
            <div className="rm-level-row">
                <Badge kind="bad" dot={false}>High risk</Badge>
                <span>from</span><input className="input" value={mediumTo} disabled aria-label="High from" />
                <span>to</span><input className="input" value="100" disabled aria-label="High to" />
            </div>
            {error && <div className="field-error">{error}</div>}
        </Modal>
    );
}
