import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert, CircleCheck, X } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDateTime, humanize } from '../../utils/format';
import { OPERATORS, clausesOf, factsBefore, matchModeOf } from './graph';

// ---------------------------------------------------------------------------
// Service settings, generated from the service's JSON Schema
// ---------------------------------------------------------------------------

function SettingField({ name, schema, value, required, onChange, disabled }) {
    const label = <label>{humanize(name.replace(/([A-Z])/g, '_$1'))}{required && <span className="wf-required"> *</span>}</label>;
    if (schema.type === 'array' && schema.items?.enum) {
        const selected = Array.isArray(value) ? value : [];
        return (
            <div className="field">
                {label}
                {schema.items.enum.map((option) => (
                    <label key={option} className="checkbox-row">
                        <input
                            type="checkbox"
                            disabled={disabled}
                            checked={selected.includes(option)}
                            onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((o) => o !== option))}
                        />
                        <span>{humanize(option)}</span>
                    </label>
                ))}
                <span className="wf-hint">{selected.length ? '' : 'None ticked: all are accepted.'}</span>
            </div>
        );
    }
    if (schema.enum) {
        return (
            <div className="field">
                {label}
                <select className="input" disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
                    <option value="">Default</option>
                    {schema.enum.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
                </select>
            </div>
        );
    }
    if (schema.type === 'number' || schema.type === 'integer') {
        return (
            <div className="field">
                {label}
                <input
                    className="input"
                    type="number"
                    disabled={disabled}
                    min={schema.minimum}
                    max={schema.maximum}
                    step={schema.type === 'integer' ? 1 : 'any'}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
                {(schema.minimum !== undefined || schema.maximum !== undefined) && (
                    <span className="wf-hint">Between {schema.minimum ?? '…'} and {schema.maximum ?? '…'}</span>
                )}
            </div>
        );
    }
    if (schema.type === 'boolean') {
        return (
            <label className="checkbox-row">
                <input type="checkbox" disabled={disabled} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
                <span>{humanize(name)}</span>
            </label>
        );
    }
    return (
        <div className="field">
            {label}
            <input className="input" type="text" disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} />
        </div>
    );
}

function ServicePanel({ node, service, readOnly, onChange }) {
    if (!service) return <div className="wf-callout wf-callout--bad">This service is no longer in the catalog. Replace or remove the step.</div>;
    const properties = service.settingsSchema?.properties || {};
    const required = service.settingsSchema?.required || [];
    const settings = node.data.settings || {};
    const setSetting = (key, value) => {
        const next = { ...settings };
        if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[key];
        else next[key] = value;
        onChange({ settings: next });
    };
    return (
        <>
            <p className="wf-panel-text">{service.description}</p>
            {Object.keys(properties).length > 0 && (
                <div className="wf-panel-section">
                    <h4>Settings</h4>
                    {Object.entries(properties).map(([key, schema]) => (
                        <SettingField key={key} name={key} schema={schema} value={settings[key]} required={required.includes(key)} disabled={readOnly} onChange={(v) => setSetting(key, v)} />
                    ))}
                </div>
            )}
            <div className="wf-panel-section">
                <h4>Outcomes</h4>
                <ul className="wf-outcome-list">
                    <li><span className="wf-dot" style={{ background: 'var(--success)' }} /> <strong>Passed</strong> continues along its connection</li>
                    <li><span className="wf-dot" style={{ background: 'var(--danger-dot)' }} /> <strong>Failed</strong> rejects, unless you connect it</li>
                    <li><span className="wf-dot" style={{ background: 'var(--amber-ink)' }} /> <strong>Review</strong> goes to a person, unless you connect it</li>
                </ul>
            </div>
            {(service.requires?.length > 0 || service.captures?.length > 0 || service.outputs?.length > 0) && (
                <div className="wf-panel-section">
                    <h4>Details</h4>
                    {service.requires?.length > 0 && <p className="wf-panel-text">Runs after: {service.requires.map(humanize).join(', ')}</p>}
                    {service.captures?.length > 0 && <p className="wf-panel-text">Collects: {service.captures.map(humanize).join(', ')}</p>}
                    {service.outputs?.length > 0 && (
                        <p className="wf-panel-text">Results for conditions: {service.outputs.map((o) => <code key={o.key}>{o.key}</code>).reduce((a, b) => [a, ' ', b])}</p>
                    )}
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Condition branches
// ---------------------------------------------------------------------------

function parseValue(fact, op, raw) {
    const operator = OPERATORS.find((o) => o.value === op);
    if (operator?.none) return undefined;
    if (operator?.list) return String(raw).split(',').map((v) => v.trim()).filter(Boolean);
    if (fact?.type === 'number' || operator?.numeric) return raw === '' ? '' : Number(raw);
    if (fact?.type === 'boolean') return raw === 'true';
    return raw;
}

function ClauseEditor({ clause, facts, readOnly, onChange, onRemove }) {
    const fact = facts.find((f) => f.key === clause.field);
    const operator = OPERATORS.find((o) => o.value === clause.op);
    const operators = fact?.type === 'boolean' ? OPERATORS.filter((o) => ['is', 'is_not', 'exists'].includes(o.value))
        : fact?.type === 'number' ? OPERATORS.filter((o) => !o.list)
            : OPERATORS.filter((o) => !o.numeric);
    const displayValue = Array.isArray(clause.value) ? clause.value.join(', ') : clause.value ?? '';

    return (
        <div className="wf-clause">
            <select className="input" disabled={readOnly} value={clause.field || ''} onChange={(e) => onChange({ ...clause, field: e.target.value })} aria-label="Field">
                <option value="">Choose a result…</option>
                {facts.map((f) => <option key={f.key} value={f.key}>{f.key} · {f.from}</option>)}
                {clause.field && !fact && <option value={clause.field}>{clause.field}</option>}
            </select>
            <div className="wf-clause-row">
                <select className="input" disabled={readOnly} value={clause.op} onChange={(e) => onChange({ ...clause, op: e.target.value, value: parseValue(fact, e.target.value, displayValue) })} aria-label="Operator">
                    {operators.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {!operator?.none && (fact?.type === 'boolean' ? (
                    <select className="input" disabled={readOnly} value={String(clause.value ?? '')} onChange={(e) => onChange({ ...clause, value: e.target.value === 'true' })} aria-label="Value">
                        <option value="">…</option><option value="true">true</option><option value="false">false</option>
                    </select>
                ) : fact?.values && !operator?.list ? (
                    <select className="input" disabled={readOnly} value={clause.value ?? ''} onChange={(e) => onChange({ ...clause, value: e.target.value })} aria-label="Value">
                        <option value="">…</option>{fact.values.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                ) : (
                    <input
                        className="input"
                        disabled={readOnly}
                        type={fact?.type === 'number' && !operator?.list ? 'number' : 'text'}
                        step="any"
                        placeholder={operator?.list ? 'a, b, c' : 'value'}
                        value={displayValue}
                        onChange={(e) => onChange({ ...clause, value: parseValue(fact, clause.op, e.target.value) })}
                        aria-label="Value"
                    />
                ))}
                {!readOnly && <button className="wf-icon-btn" onClick={onRemove} aria-label="Remove rule"><X size={14} /></button>}
            </div>
        </div>
    );
}

function ConditionPanel({ node, facts, readOnly, onBranchesChange }) {
    const branches = node.data.branches || [];
    const ports = (fn) => Object.fromEntries(branches.map((_, i) => [`branch:${i}`, fn(i)]));

    const updateBranch = (i, branch) => onBranchesChange(branches.map((b, j) => (j === i ? branch : b)), null);
    const addBranch = () => onBranchesChange([...branches, { label: `Branch ${branches.length + 1}`, when: { all: [{ field: '', op: 'is', value: '' }] } }], null);
    const removeBranch = (i) => onBranchesChange(branches.filter((_, j) => j !== i), ports((j) => (j === i ? null : `branch:${j < i ? j : j - 1}`)));
    const moveBranch = (i, delta) => {
        const target = i + delta;
        const next = [...branches];
        [next[i], next[target]] = [next[target], next[i]];
        onBranchesChange(next, ports((j) => `branch:${j === i ? target : j === target ? i : j}`));
    };

    return (
        <>
            <p className="wf-panel-text">Branches are checked from the top; the first one that matches is followed. If none match, the case takes <strong>Else</strong>.</p>
            {branches.map((branch, i) => {
                const clauses = clausesOf(branch.when);
                const mode = matchModeOf(branch.when);
                const setClauses = (next, nextMode = mode) => updateBranch(i, { ...branch, when: { [nextMode]: next } });
                return (
                    <div key={i} className="wf-branch">
                        <div className="wf-branch-head">
                            <input className="input" disabled={readOnly} value={branch.label || ''} onChange={(e) => updateBranch(i, { ...branch, label: e.target.value })} aria-label="Branch name" />
                            {!readOnly && (
                                <div className="wf-branch-actions">
                                    <button className="wf-icon-btn" disabled={i === 0} onClick={() => moveBranch(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
                                    <button className="wf-icon-btn" disabled={i === branches.length - 1} onClick={() => moveBranch(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
                                    <button className="wf-icon-btn" onClick={() => removeBranch(i)} aria-label="Remove branch"><Trash2 size={14} /></button>
                                </div>
                            )}
                        </div>
                        {clauses.length > 1 && (
                            <div className="wf-match-mode">
                                Match
                                <select className="input" disabled={readOnly} value={mode} onChange={(e) => setClauses(clauses, e.target.value)}>
                                    <option value="all">all rules</option>
                                    <option value="any">any rule</option>
                                </select>
                            </div>
                        )}
                        {clauses.map((clause, c) => (
                            <ClauseEditor
                                key={c}
                                clause={clause}
                                facts={facts}
                                readOnly={readOnly}
                                onChange={(next) => setClauses(clauses.map((x, k) => (k === c ? next : x)))}
                                onRemove={() => setClauses(clauses.length > 1 ? clauses.filter((_, k) => k !== c) : [{ field: '', op: 'is', value: '' }])}
                            />
                        ))}
                        {!readOnly && (
                            <button className="link-btn" onClick={() => setClauses([...clauses, { field: '', op: 'is', value: '' }])}><Plus size={12} /> Add rule</button>
                        )}
                    </div>
                );
            })}
            {!readOnly && <button className="btn btn--secondary btn--sm" onClick={addBranch}><Plus size={14} /> Add branch</button>}
        </>
    );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function NodePanel({ node, nodes, edges, catalogByCode, problems, readOnly, onChange, onBranchesChange, onDelete }) {
    const service = node.type === 'SERVICE' ? catalogByCode[node.data.service] : null;
    const title = { START: 'Start', SERVICE: service?.name || 'Service', CONDITION: 'Condition', MANUAL_REVIEW: 'Manual review', END: 'End' }[node.type];
    return (
        <div className="wf-panel">
            <div className="wf-panel-head">
                <h3>{title}</h3>
                {!readOnly && node.type !== 'START' && (
                    <button className="wf-icon-btn" onClick={onDelete} aria-label="Delete step" title="Delete (Del)"><Trash2 size={15} /></button>
                )}
            </div>

            {problems.length > 0 && (
                <div className="wf-callout wf-callout--bad">
                    {problems.map((p) => <div key={p}><TriangleAlert size={13} /> {p}</div>)}
                </div>
            )}

            {node.type !== 'START' && (
                <div className="field">
                    <label>Name on the canvas</label>
                    <input className="input" disabled={readOnly} value={node.data.label || ''} placeholder={service?.name || title} onChange={(e) => onChange({ label: e.target.value })} />
                </div>
            )}

            {node.type === 'START' && <p className="wf-panel-text">Runs when an applicant submits. Connect it to the first step.</p>}
            {node.type === 'SERVICE' && <ServicePanel node={node} service={service} readOnly={readOnly} onChange={onChange} />}
            {node.type === 'CONDITION' && (
                <ConditionPanel node={node} facts={factsBefore(node.id, nodes, edges, catalogByCode)} readOnly={readOnly} onBranchesChange={onBranchesChange} />
            )}
            {node.type === 'MANUAL_REVIEW' && <p className="wf-panel-text">Opens a case in the manual review queue. The reviewer's decision ends the verification.</p>}
            {node.type === 'END' && (
                <div className="field">
                    <label>Outcome</label>
                    <div className="view-toggle">
                        {['APPROVED', 'REJECTED'].map((o) => (
                            <button key={o} disabled={readOnly} className={node.data.outcome === o ? 'is-active' : ''} onClick={() => onChange({ outcome: o })}>{humanize(o)}</button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function SummaryPanel({ validation, versions, saving, readOnly, onSelectNode, onPromote }) {
    const problems = validation?.problems || [];
    const requirements = validation?.requirements;
    const price = validation?.price;
    return (
        <div className="wf-panel">
            <div className="wf-panel-head"><h3>Workflow</h3></div>

            <div className="wf-panel-section">
                <h4>Checks</h4>
                {!validation ? <p className="wf-panel-text">{saving ? 'Checking…' : 'Checked after each change.'}</p>
                    : problems.length === 0 ? <div className="wf-callout wf-callout--ok"><CircleCheck size={14} /> Ready to publish</div>
                        : (
                            <ul className="wf-problem-list">
                                {problems.map((p, i) => (
                                    <li key={i}>
                                        <button className="link-btn" disabled={!p.nodeId} onClick={() => p.nodeId && onSelectNode(p.nodeId)}>
                                            <TriangleAlert size={12} /> {p.message}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
            </div>

            {requirements && (
                <div className="wf-panel-section">
                    <h4>What the applicant provides</h4>
                    <p className="wf-panel-text"><strong>Details:</strong> {requirements.requiredFields?.length ? requirements.requiredFields.map(humanize).join(', ') : 'none'}</p>
                    <p className="wf-panel-text"><strong>Uploads:</strong> {requirements.captures?.length ? requirements.captures.map(humanize).join(', ') : 'none'}</p>
                </div>
            )}

            {price && (
                <div className="wf-panel-section">
                    <h4>Price per verification</h4>
                    <div className="wf-price">{price.currency} {Number(price.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    {(price.services || []).map((s) => (
                        <div key={s.code} className="wf-price-row"><span>{s.name}</span><span>{s.price != null ? Number(s.price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</span></div>
                    ))}
                    {price.unpriced?.length > 0 && <p className="wf-hint">No price set yet for: {price.unpriced.join(', ')}</p>}
                </div>
            )}

            <div className="wf-panel-section">
                <h4>Versions</h4>
                {versions.length === 0 ? <p className="wf-panel-text">Not published yet. Publish to freeze this draft as version 1.</p> : (
                    <ul className="wf-version-list">
                        {[...versions].sort((a, b) => b.number - a.number).map((v) => (
                            <li key={v.number}>
                                <div>
                                    <strong>v{v.number}</strong> {v.live && <Badge kind="ok">Live</Badge>}
                                    <div className="wf-hint">{formatDateTime(v.publishedAt)}{v.publishedBy ? ` · ${v.publishedBy}` : ''}</div>
                                    {v.notes && <div className="wf-hint">{v.notes}</div>}
                                </div>
                                {!v.live && !readOnly && <button className="btn btn--ghost btn--sm" onClick={() => onPromote(v.number)}>Make live</button>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
