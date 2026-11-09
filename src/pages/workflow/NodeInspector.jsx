import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { NODE_TYPES, OPERATORS, OUTCOMES } from './graph';

/** Side panel editing the selected node. onChange receives a partial data object to merge. */
export default function NodeInspector({ node, catalog, availableServices, fields, problems, onChange, onDelete, readOnly }) {
    if (!node) {
        return (
            <div className="wf-inspector__empty">
                Select a step to edit it, or drag one from the left onto the canvas. Connect steps by dragging from an
                output (passed, failed, a branch…) to the next step.
            </div>
        );
    }
    const set = (patch) => !readOnly && onChange(patch);

    return (
        <div className="wf-inspector__body">
            <div className="wf-inspector__type">{typeName(node.type)}</div>
            {problems?.length > 0 && (
                <ul className="wf-inspector__problems">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
            )}

            <label className="wf-field">
                <span>Label</span>
                <input value={node.data.label || ''} disabled={readOnly} onChange={(e) => set({ label: e.target.value })} />
            </label>

            {node.type === NODE_TYPES.SERVICE && (
                <ServiceEditor node={node} catalog={catalog} availableServices={availableServices} set={set} readOnly={readOnly} />
            )}
            {node.type === NODE_TYPES.CONDITION && (
                <ConditionEditor branches={node.data.branches || []} fields={fields} readOnly={readOnly}
                                 onChange={(branches) => set({ branches })} />
            )}
            {node.type === NODE_TYPES.END && (
                <label className="wf-field">
                    <span>Outcome</span>
                    <select value={node.data.outcome || ''} disabled={readOnly} onChange={(e) => set({ outcome: e.target.value || null })}>
                        <option value="">Choose…</option>
                        {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                </label>
            )}
            {node.type === NODE_TYPES.MANUAL_REVIEW && (
                <p className="wf-hint">The applicant waits while a reviewer approves or rejects in KYC Reviews.</p>
            )}

            {node.type !== NODE_TYPES.START && !readOnly && (
                <button type="button" className="wf-danger-link" onClick={onDelete}><Trash2 size={14} /> Remove step</button>
            )}
        </div>
    );
}

function typeName(type) {
    return { START: 'Start', SERVICE: 'Service', CONDITION: 'Condition', MANUAL_REVIEW: 'Manual review', END: 'End' }[type] || type;
}

function ServiceEditor({ node, catalog, availableServices, set, readOnly }) {
    const service = catalog[node.data.service];
    const properties = service?.settingsSchema?.properties || {};
    const required = service?.settingsSchema?.required || [];
    const settings = node.data.settings || {};
    const setSetting = (key, value) => {
        const next = { ...settings };
        if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
        else next[key] = value;
        set({ settings: next });
    };

    return (
        <>
            <label className="wf-field">
                <span>Service</span>
                <select value={node.data.service || ''} disabled={readOnly} onChange={(e) => set({ service: e.target.value, settings: {} })}>
                    {!catalog[node.data.service] && <option value={node.data.service}>{node.data.service} (not available)</option>}
                    {availableServices.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
            </label>
            {service && (
                <div className="wf-service-info">
                    <p>{service.description}</p>
                    {service.requires?.length > 0 && <p><strong>Needs before it:</strong> {service.requires.map((r) => catalog[r]?.name || r).join(', ')}</p>}
                    {service.requiredFields?.length > 0 && <p><strong>Asks for:</strong> {service.requiredFields.join(', ')}</p>}
                    {service.captures?.length > 0 && <p><strong>Captures:</strong> {service.captures.join(', ')}</p>}
                    {service.outputs?.length > 0 && <p><strong>Results:</strong> {service.outputs.map((o) => o.key).join(', ')}</p>}
                </div>
            )}
            {Object.entries(properties).map(([key, schema]) => (
                <SettingField key={key} name={key} schema={schema} required={required.includes(key)} readOnly={readOnly}
                              value={settings[key]} onChange={(v) => setSetting(key, v)} />
            ))}
        </>
    );
}

function SettingField({ name, schema, required, value, onChange, readOnly }) {
    const label = `${name}${required ? ' *' : ''}`;
    if (schema.type === 'array' && schema.items?.enum) {
        const selected = Array.isArray(value) ? value : [];
        return (
            <fieldset className="wf-field">
                <span>{label}</span>
                {schema.items.enum.map((option) => (
                    <label key={option} className="wf-check">
                        <input type="checkbox" disabled={readOnly} checked={selected.includes(option)}
                               onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((o) => o !== option))} />
                        {option}
                    </label>
                ))}
            </fieldset>
        );
    }
    if (schema.enum) {
        return (
            <label className="wf-field">
                <span>{label}</span>
                <select value={value ?? ''} disabled={readOnly} onChange={(e) => onChange(e.target.value)}>
                    <option value="">Default</option>
                    {schema.enum.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
            </label>
        );
    }
    const numeric = schema.type === 'number' || schema.type === 'integer';
    return (
        <label className="wf-field">
            <span>{label}</span>
            <input type={numeric ? 'number' : 'text'} value={value ?? ''} disabled={readOnly}
                   min={schema.minimum} max={schema.maximum} step={schema.type === 'integer' ? 1 : 'any'}
                   onChange={(e) => onChange(numeric ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
        </label>
    );
}

/** Branches made of simple rules (all / any). Nested groups fall back to a JSON editor. */
function ConditionEditor({ branches, fields, onChange, readOnly }) {
    const update = (index, branch) => onChange(branches.map((b, i) => (i === index ? branch : b)));
    return (
        <div className="wf-branches">
            <div className="wf-branches__head">
                <span>Branches (first match wins, otherwise else)</span>
                {!readOnly && (
                    <button type="button" className="wf-link" onClick={() => onChange([...branches, {
                        label: `Branch ${branches.length + 1}`,
                        when: { all: [{ field: fields[0]?.key || 'applicant.country', op: 'is', value: '' }] },
                    }])}><Plus size={14} /> Add branch</button>
                )}
            </div>
            {branches.map((branch, index) => (
                <BranchEditor key={index} branch={branch} fields={fields} readOnly={readOnly}
                              onChange={(b) => update(index, b)}
                              onRemove={() => onChange(branches.filter((_, i) => i !== index))} />
            ))}
            <datalist id="wf-fields">{fields.map((f) => <option key={f.key} value={f.key} />)}</datalist>
        </div>
    );
}

function BranchEditor({ branch, fields, onChange, onRemove, readOnly }) {
    const simple = useMemo(() => asSimple(branch.when), [branch.when]);
    const [json, setJson] = useState(() => JSON.stringify(branch.when, null, 2));
    const [jsonError, setJsonError] = useState('');

    const setRules = (mode, rules) => onChange({ ...branch, when: { [mode]: rules } });

    return (
        <div className="wf-branch">
            <div className="wf-branch__row">
                <input className="wf-branch__label" value={branch.label || ''} disabled={readOnly} placeholder="Branch name"
                       onChange={(e) => onChange({ ...branch, label: e.target.value })} />
                {!readOnly && <button type="button" className="wf-icon-btn" title="Remove branch" onClick={onRemove}><Trash2 size={14} /></button>}
            </div>
            {simple ? (
                <>
                    <select className="wf-branch__mode" value={simple.mode} disabled={readOnly}
                            onChange={(e) => setRules(e.target.value, simple.rules)}>
                        <option value="all">All of these are true</option>
                        <option value="any">Any of these is true</option>
                    </select>
                    {simple.rules.map((rule, i) => (
                        <RuleEditor key={i} rule={rule} fields={fields} readOnly={readOnly}
                                    onChange={(r) => setRules(simple.mode, simple.rules.map((x, j) => (j === i ? r : x)))}
                                    onRemove={simple.rules.length > 1 ? () => setRules(simple.mode, simple.rules.filter((_, j) => j !== i)) : null} />
                    ))}
                    {!readOnly && (
                        <button type="button" className="wf-link" onClick={() => setRules(simple.mode, [...simple.rules,
                            { field: fields[0]?.key || 'applicant.country', op: 'is', value: '' }])}><Plus size={14} /> Add rule</button>
                    )}
                </>
            ) : (
                <label className="wf-field">
                    <span>Condition (JSON, grouped)</span>
                    <textarea rows={6} value={json} disabled={readOnly} onChange={(e) => {
                        setJson(e.target.value);
                        try {
                            onChange({ ...branch, when: JSON.parse(e.target.value) });
                            setJsonError('');
                        } catch {
                            setJsonError('Not valid JSON yet');
                        }
                    }} />
                    {jsonError && <small className="wf-error">{jsonError}</small>}
                </label>
            )}
        </div>
    );
}

function RuleEditor({ rule, fields, onChange, onRemove, readOnly }) {
    const field = fields.find((f) => f.key === rule.field);
    const operator = OPERATORS.find((o) => o.value === rule.op) || OPERATORS[0];
    const numeric = field?.type === 'number';
    const parse = (raw) => {
        if (operator.needs === 'list') {
            return raw.split(',').map((v) => v.trim()).filter(Boolean).map((v) => (numeric && !Number.isNaN(Number(v)) ? Number(v) : v));
        }
        if (operator.needs === 'number' || (numeric && raw !== '' && !Number.isNaN(Number(raw)))) return raw === '' ? '' : Number(raw);
        if (field?.type === 'boolean' && (raw === 'true' || raw === 'false')) return raw === 'true';
        return raw;
    };
    const shown = Array.isArray(rule.value) ? rule.value.join(', ') : rule.value ?? '';

    return (
        <div className="wf-rule">
            <input list="wf-fields" value={rule.field || ''} disabled={readOnly} placeholder="field"
                   onChange={(e) => onChange({ ...rule, field: e.target.value })} />
            <select value={rule.op} disabled={readOnly} onChange={(e) => {
                const op = e.target.value;
                const next = { ...rule, op };
                if (OPERATORS.find((o) => o.value === op)?.needs === 'none') delete next.value;
                onChange(next);
            }}>
                {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {operator.needs !== 'none' && (
                <input value={shown} disabled={readOnly} placeholder={operator.needs === 'list' ? 'KEN, UGA' : 'value'}
                       onChange={(e) => onChange({ ...rule, value: parse(e.target.value) })} />
            )}
            {onRemove && !readOnly && <button type="button" className="wf-icon-btn" title="Remove rule" onClick={onRemove}><Trash2 size={13} /></button>}
        </div>
    );
}

/** {mode, rules} when the condition is a single rule or one group of plain rules; null otherwise. */
function asSimple(when) {
    if (!when) return { mode: 'all', rules: [] };
    if (when.field) return { mode: 'all', rules: [when] };
    const mode = when.all ? 'all' : when.any ? 'any' : null;
    if (!mode || !Array.isArray(when[mode])) return null;
    return when[mode].every((r) => r && r.field) ? { mode, rules: when[mode] } : null;
}
