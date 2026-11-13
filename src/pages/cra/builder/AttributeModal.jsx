import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import {
    attributeFrom, booleanLabels, editorError, editorStateFrom, isBooleanType, isRangeType, unitFor,
} from './model';

const ScoreInput = ({ value, onChange, label }) => (
    <input className="input rm-score-input" type="number" min="0" max="100" step="1" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
);

/**
 * Scores one attribute: each row maps values to a score from 0 (lowest risk) to 100 (highest).
 * Yes/no attributes get one score per answer; numbers get ranges; everything else gets lists of values.
 */
export default function AttributeModal({ definition, attribute, onClose, onConfirm }) {
    const { key, displayName, dataType, description } = definition;
    const [state, setState] = useState(() => editorStateFrom(dataType, attribute));
    const [error, setError] = useState('');

    const setRow = (index, patch) => setState((s) => ({ ...s, rows: s.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
    const addRow = () => setState((s) => ({ ...s, rows: [...s.rows, isRangeType(dataType) ? { min: '', max: '', score: '' } : { values: '', score: '' }] }));
    const removeRow = (index) => setState((s) => ({ ...s, rows: s.rows.filter((_, i) => i !== index) }));

    const confirm = () => {
        const problem = editorError(dataType, state);
        if (problem) {
            setError(problem);
            return;
        }
        onConfirm(attributeFrom(key, dataType, state));
    };

    const [yesLabel, noLabel] = booleanLabels(key);
    const unit = unitFor(key);

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="lg"
            title={displayName}
            caption={`${description || ''} Score each value from 0 (lowest risk) to 100 (highest risk).`.trim()}
            footer={(
                <>
                    <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn--primary" onClick={confirm}>Confirm</button>
                </>
            )}
        >
            <div className="rm-rule-table">
                <div className="rm-rule-head"><span>Values</span><span>Score</span></div>

                {isBooleanType(dataType) ? (
                    <>
                        <div className="rm-rule-row">
                            <span>{yesLabel}</span>
                            <ScoreInput value={state.yesScore} onChange={(v) => setState((s) => ({ ...s, yesScore: v }))} label={`${yesLabel} score`} />
                        </div>
                        <div className="rm-rule-row">
                            <span>{noLabel}</span>
                            <ScoreInput value={state.noScore} onChange={(v) => setState((s) => ({ ...s, noScore: v }))} label={`${noLabel} score`} />
                        </div>
                    </>
                ) : (
                    <>
                        {state.rows.map((row, i) => (
                            <div key={i} className="rm-rule-row">
                                {isRangeType(dataType) ? (
                                    <div className="rm-range">
                                        <span>From</span>
                                        <input className="input" type="number" value={row.min} onChange={(e) => setRow(i, { min: e.target.value })} aria-label="From" />
                                        <span>to</span>
                                        <input className="input" type="number" value={row.max} onChange={(e) => setRow(i, { max: e.target.value })} aria-label="To" />
                                        {unit && <span>{unit}</span>}
                                    </div>
                                ) : (
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder={dataType === 'COUNTRY' ? 'Countries, separated by commas' : 'Values, separated by commas'}
                                        value={row.values}
                                        onChange={(e) => setRow(i, { values: e.target.value })}
                                        aria-label="Values"
                                    />
                                )}
                                <div className="rm-score-cell">
                                    <ScoreInput value={row.score} onChange={(v) => setRow(i, { score: v })} label="Score" />
                                    {state.rows.length > 1 && (
                                        <button className="rm-icon-btn" onClick={() => removeRow(i)} aria-label="Remove row"><X size={15} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="rm-rule-row rm-rule-row--else">
                            <span>Everything else</span>
                            <div className="rm-score-cell">
                                <ScoreInput value={state.elseScore} onChange={(v) => setState((s) => ({ ...s, elseScore: v }))} label="Everything else score" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {!isBooleanType(dataType) && (
                <button className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} onClick={addRow}><Plus size={14} /> Add row</button>
            )}
            {error && <div className="field-error">{error}</div>}
        </Modal>
    );
}
