import { useEffect, useMemo } from 'react';
import { CircleCheck, CircleX, UserCheck, X } from 'lucide-react';
import { START_FACTS, clausesOf, simulate } from './graph';

const OUTCOMES = [['passed', 'Passed'], ['failed', 'Failed'], ['review', 'Review']];
const DECISIONS = {
    APPROVED: { label: 'Approved', icon: CircleCheck, tone: 'ok' },
    REJECTED: { label: 'Rejected', icon: CircleX, tone: 'bad' },
    MANUAL_REVIEW: { label: 'Sent to manual review', icon: UserCheck, tone: 'warn' },
};

/**
 * "What happens if…": choose how each service turns out and the values conditions read; the
 * decision and the path light up on the canvas. Runs the same rules as the server, in the browser.
 */
export default function TestRunPanel({ nodes, edges, catalogByCode, inputs, onInputsChange, onResult, onClose }) {
    const services = useMemo(() => [...new Set(nodes.filter((n) => n.type === 'SERVICE').map((n) => n.data.service))], [nodes]);

    const fields = useMemo(() => {
        const known = Object.fromEntries([
            ...START_FACTS.map((f) => [f.key, f]),
            ...Object.values(catalogByCode).flatMap((s) => (s.outputs || []).map((o) => [o.key, o])),
        ]);
        const used = new Set(nodes.filter((n) => n.type === 'CONDITION')
            .flatMap((n) => (n.data.branches || []).flatMap((b) => clausesOf(b.when).map((c) => c.field)))
            .filter(Boolean));
        return [...used].map((key) => known[key] || { key, type: 'string' });
    }, [nodes, catalogByCode]);

    const result = useMemo(() => simulate(nodes, edges, inputs.outcomes, inputs.facts), [nodes, edges, inputs]);
    useEffect(() => { onResult(result); }, [result, onResult]);

    const setOutcome = (code, value) => onInputsChange({ ...inputs, outcomes: { ...inputs.outcomes, [code]: value } });
    const setFact = (field, value) => onInputsChange({ ...inputs, facts: { ...inputs.facts, [field.key]: value } });
    const decision = DECISIONS[result.decision];
    const Icon = decision.icon;

    return (
        <div className="wf-test nodrag nopan">
            <div className="wf-test-head">
                <strong>Test run</strong>
                <span className="wf-hint">Nothing is saved or sent.</span>
                <button className="wf-icon-btn" onClick={onClose} aria-label="Close test run"><X size={15} /></button>
            </div>
            <div className="wf-test-body">
                <div className="wf-test-inputs">
                    {services.length === 0 && <p className="wf-hint">Add a service step to try outcomes.</p>}
                    {services.map((code) => (
                        <div key={code} className="wf-test-row">
                            <span>{catalogByCode[code]?.name || code}</span>
                            <div className="view-toggle">
                                {OUTCOMES.map(([value, label]) => (
                                    <button key={value} className={(inputs.outcomes[code] || 'passed') === value ? 'is-active' : ''} onClick={() => setOutcome(code, value)}>{label}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {fields.map((field) => (
                        <div key={field.key} className="wf-test-row">
                            <code>{field.key}</code>
                            {field.type === 'boolean' ? (
                                <select className="input" value={String(inputs.facts[field.key] ?? '')} onChange={(e) => setFact(field, e.target.value === '' ? undefined : e.target.value === 'true')}>
                                    <option value="">not set</option><option value="true">true</option><option value="false">false</option>
                                </select>
                            ) : field.values ? (
                                <select className="input" value={inputs.facts[field.key] ?? ''} onChange={(e) => setFact(field, e.target.value || undefined)}>
                                    <option value="">not set</option>{field.values.map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            ) : (
                                <input
                                    className="input"
                                    type={field.type === 'number' ? 'number' : 'text'}
                                    step="any"
                                    placeholder="not set"
                                    value={inputs.facts[field.key] ?? ''}
                                    onChange={(e) => setFact(field, e.target.value === '' ? undefined : field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className={`wf-test-result wf-test-result--${decision.tone}`}>
                    <Icon size={22} />
                    <div>
                        <strong>{decision.label}</strong>
                        {result.reason && <div className="wf-hint">{result.reason}</div>}
                        <div className="wf-hint">{result.path.length} steps on the highlighted path</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
