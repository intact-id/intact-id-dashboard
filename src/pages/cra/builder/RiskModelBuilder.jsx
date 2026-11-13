import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../contexts/ToastContext';
import riskService from '../../../services/riskService';
import { errorMessage } from '../../../services/api';
import AttributeModal from './AttributeModal';
import ThresholdModal from './ThresholdModal';
import BandBar from './BandBar';
import {
    CUSTOMER_TYPES, activationProblems, categoryName, categoryRank, evenWeights, normalizeConfig, ruleRows,
    totalWeightPercent, weightPercent, withAttribute, withCategoryThresholds, withSafeguard, withWeightPercent,
    withoutAttribute,
} from './model';
import './builder.css';

export default function RiskModelBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [model, setModel] = useState(null);
    const [config, setConfig] = useState(null);
    const [definitions, setDefinitions] = useState([]);
    const [loadError, setLoadError] = useState('');

    const [step, setStep] = useState(1);
    const [tab, setTab] = useState(null);
    const [saving, setSaving] = useState(false);
    const [problems, setProblems] = useState([]);

    const [editingAttribute, setEditingAttribute] = useState(null); // attribute definition
    const [thresholdsFor, setThresholdsFor] = useState(null); // 'overall' or a category key
    const [renaming, setRenaming] = useState(null); // the name being typed

    const load = useCallback(async () => {
        try {
            const [detail, allDefinitions] = await Promise.all([riskService.getModel(id), riskService.attributeDefinitions()]);
            setModel(detail.model);
            setConfig(normalizeConfig(detail.config));
            setDefinitions(allDefinitions.filter((d) => d.active
                && (d.customerType === 'BOTH' || d.customerType === detail.model.customerType)));
        } catch (error) {
            setLoadError(errorMessage(error, 'Could not load this risk model.'));
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    // Every confirmed change is saved to the draft straight away. If the save fails, the change is undone.
    const apply = async (next) => {
        const previous = config;
        setConfig(next);
        setProblems([]);
        setSaving(true);
        try {
            const saved = await riskService.updateModel(id, withSafeguard(next));
            setModel(saved.model);
            setConfig(normalizeConfig(saved.config));
            return true;
        } catch (error) {
            setConfig(previous);
            toast.error(errorMessage(error, 'Could not save that change.'));
            return false;
        } finally {
            setSaving(false);
        }
    };

    if (loadError) {
        return (
            <div className="page">
                <Link to="/dashboard/risk-models" className="back-link"><ArrowLeft size={15} /> Back to risk models</Link>
                <div className="card"><div className="empty-state">{loadError}</div></div>
            </div>
        );
    }
    if (!config) return <div className="page"><div className="loading-state">Loading risk model…</div></div>;

    const isDraft = model.lifeCycleStatus === 'DRAFT';
    const categoryKeys = [...new Set([...definitions.map((d) => d.categoryKey), ...config.categories.map((c) => c.key)])]
        .sort((a, b) => categoryRank(a) - categoryRank(b));
    const activeTab = categoryKeys.includes(tab) ? tab : categoryKeys[0];
    const category = config.categories.find((c) => c.key === activeTab);
    const configured = category?.attributes || [];
    const available = definitions.filter((d) => d.categoryKey === activeTab
        && !configured.some((a) => a.attributeDefinitionKey === d.key));
    const definitionOf = (key) => definitions.find((d) => d.key === key);
    const attributeCount = (key) => config.categories.find((c) => c.key === key)?.attributes.length || 0;

    const goToOverall = () => {
        if (!config.categories.length) {
            setProblems(['Add at least one attribute before moving on.']);
            return;
        }
        setProblems([]);
        setStep(2);
    };

    const confirmAttribute = async (attribute) => {
        const definition = editingAttribute;
        setEditingAttribute(null);
        await apply(withAttribute(config, definition.categoryKey, attribute));
    };

    const confirmThresholds = async (thresholds) => {
        const target = thresholdsFor;
        setThresholdsFor(null);
        await apply(target === 'overall' ? { ...config, overallThresholds: thresholds } : withCategoryThresholds(config, target, thresholds));
    };

    const rename = async () => {
        const name = renaming.trim();
        if (!name) return;
        setRenaming(null);
        await apply({ ...config, description: name });
    };

    const saveWeights = () => {
        if (config.categories.some((c) => weightPercent(c) <= 0)) {
            setProblems(['Every category needs a weight above 0%.']);
            return;
        }
        apply(config);
    };

    const activate = async () => {
        const blocking = activationProblems(config);
        if (blocking.length) {
            setProblems(blocking);
            return;
        }
        setSaving(true);
        try {
            const check = await riskService.validate(withSafeguard(config), true);
            if (!check.valid) {
                setProblems(check.errors.map((e) => e.message));
                return;
            }
            await riskService.activateModel(id);
            toast.success(`${config.description || 'Risk model'} is now active`);
            navigate('/dashboard/risk-models');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not activate the risk model.'));
        } finally {
            setSaving(false);
        }
    };

    const thresholdsBeingEdited = thresholdsFor === 'overall'
        ? config.overallThresholds
        : config.categories.find((c) => c.key === thresholdsFor)?.thresholds;

    return (
        <div className="page">
            <div className="rm-head">
                <div>
                    <Link to="/dashboard/risk-models" className="back-link"><ArrowLeft size={15} /> Risk models</Link>
                    <div className="rm-title">
                        <h1>{config.description || 'Untitled risk model'}</h1>
                        {isDraft && (
                            <button className="rm-icon-btn" onClick={() => setRenaming(config.description || '')} aria-label="Rename"><Pencil size={15} /></button>
                        )}
                    </div>
                    <div className="detail-subline">
                        <span>{CUSTOMER_TYPES[model.customerType]?.label || model.customerType}</span>
                        <span>·</span><span>Version {model.version}</span>
                        <span>·</span>
                        <span>{!isDraft ? `${model.lifeCycleStatus[0]}${model.lifeCycleStatus.slice(1).toLowerCase()} · read-only` : saving ? 'Saving…' : 'Draft · all changes saved'}</span>
                    </div>
                </div>

                <div className="rm-steps">
                    <button className={`rm-step${step === 1 ? ' is-active' : ' is-done'}`} onClick={() => setStep(1)}>
                        <span className="rm-step-chip">{step === 1 ? '1' : <Check size={13} />}</span> Categories
                    </button>
                    <span className="rm-step-line" />
                    <button className={`rm-step${step === 2 ? ' is-active' : ''}`} onClick={goToOverall}>
                        <span className="rm-step-chip">2</span> Overall
                    </button>
                </div>

                <div className="head-actions">
                    {step === 2 && <button className="btn btn--secondary" onClick={() => setStep(1)}>Back</button>}
                    {step === 1 && <button className="btn btn--primary" onClick={goToOverall}>Next</button>}
                    {step === 2 && isDraft && (
                        <button className="btn btn--primary" onClick={activate} disabled={saving}>{saving ? 'Working…' : 'Activate'}</button>
                    )}
                </div>
            </div>

            {problems.length > 0 && (
                <div className="note note--warn">
                    <div className="note-head"><TriangleAlert size={16} /><span>{problems.length === 1 ? problems[0] : 'Fix these before continuing'}</span></div>
                    {problems.length > 1 && <ul className="rm-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
                </div>
            )}

            {step === 1 ? (
                <div className="card">
                    <p className="card-caption" style={{ marginBottom: 14 }}>
                        Pick the attributes that matter in each category and score their values from 0 (lowest risk) to 100 (highest risk).
                    </p>

                    <div className="rm-tabs" role="tablist">
                        {categoryKeys.map((key) => (
                            <button key={key} role="tab" aria-selected={key === activeTab} className={key === activeTab ? 'is-active' : ''} onClick={() => setTab(key)}>
                                {categoryName(key)}
                                {attributeCount(key) > 0 && <span className="rm-tab-count">{attributeCount(key)}</span>}
                            </button>
                        ))}
                    </div>

                    {categoryKeys.length === 0 && <div className="empty-state">No attributes are available for this customer type yet.</div>}

                    {configured.map((attribute) => {
                        const definition = definitionOf(attribute.attributeDefinitionKey);
                        return (
                            <div key={attribute.attributeDefinitionKey} className="rm-attribute">
                                <div className="rm-attribute-head">
                                    <strong>{definition?.displayName || attribute.attributeDefinitionKey}</strong>
                                    {isDraft && (
                                        <div className="head-actions">
                                            {definition && <button className="rm-icon-btn" onClick={() => setEditingAttribute(definition)} aria-label="Edit scores"><Pencil size={15} /></button>}
                                            <button className="rm-icon-btn" onClick={() => apply(withoutAttribute(config, activeTab, attribute.attributeDefinitionKey))} aria-label="Remove attribute"><Trash2 size={15} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="rm-rule-table">
                                    <div className="rm-rule-head"><span>Values</span><span>Score</span></div>
                                    {ruleRows(attribute).map((row, i) => (
                                        <div key={i} className="rm-rule-row"><span>{row.label}</span><span className="mono">{row.score}</span></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {category && (
                        <div className="rm-box">
                            <div className="rm-box-head">
                                <div>
                                    <strong>{categoryName(activeTab)} risk levels</strong>
                                    <div className="card-caption">The category score is the average of its attribute scores.</div>
                                </div>
                                {isDraft && <button className="rm-icon-btn" onClick={() => setThresholdsFor(activeTab)} aria-label="Edit category risk levels"><Pencil size={15} /></button>}
                            </div>
                            <BandBar thresholds={category.thresholds} />
                        </div>
                    )}

                    {available.length > 0 && isDraft && (
                        <>
                            <div className="rm-section-title">
                                <strong>{configured.length ? 'Other attributes' : 'Attributes'}</strong>
                                <div className="card-caption">{configured.length ? 'Not used in the score until you add them.' : 'Add the ones this model should score.'}</div>
                            </div>
                            {available.map((definition) => (
                                <div key={definition.key} className="rm-available">
                                    <div>
                                        <strong>{definition.displayName}</strong>
                                        {definition.description && <div className="card-caption">{definition.description}</div>}
                                    </div>
                                    <button className="btn btn--secondary btn--sm" onClick={() => setEditingAttribute(definition)}>Add</button>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            ) : (
                <>
                    <div className="card">
                        <div className="rm-box-head">
                            <div>
                                <h3>Overall risk levels</h3>
                                <div className="card-caption">Where the overall score (0 to 100) turns from Low to Medium to High.</div>
                            </div>
                            {isDraft && <button className="rm-icon-btn" onClick={() => setThresholdsFor('overall')} aria-label="Edit overall risk levels"><Pencil size={15} /></button>}
                        </div>
                        <BandBar thresholds={config.overallThresholds} />
                    </div>

                    <div className="card">
                        <div className="rm-box-head">
                            <div>
                                <h3>Category weighting</h3>
                                <div className="card-caption">How much each category counts towards the overall score. Weights add up to 100%.</div>
                            </div>
                            {isDraft && config.categories.length > 1 && (
                                <button className="btn btn--ghost btn--sm" onClick={() => apply({ ...config, categories: evenWeights(config.categories) })}>Split evenly</button>
                            )}
                        </div>
                        <div className="rm-weights">
                            {config.categories.map((c) => (
                                <div key={c.key} className="rm-weight-row">
                                    <span>{c.displayName || categoryName(c.key)}</span>
                                    <div className="rm-weight-input">
                                        <input
                                            className="input"
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={weightPercent(c) || ''}
                                            disabled={!isDraft}
                                            onChange={(e) => setConfig(withWeightPercent(config, c.key, Number(e.target.value)))}
                                            onBlur={saveWeights}
                                            aria-label={`${c.displayName || categoryName(c.key)} weight`}
                                        />
                                        <span>%</span>
                                    </div>
                                </div>
                            ))}
                            <div className="rm-weight-row rm-weight-row--total">
                                <span>Total</span>
                                <strong className={totalWeightPercent(config) === 100 ? '' : 'rm-bad'}>{totalWeightPercent(config)}%</strong>
                            </div>
                        </div>
                    </div>

                    <div className="note note--lock">
                        <div className="note-head"><Lock size={15} /><span>Always applied</span></div>
                        <p>A confirmed sanctions match is always <Badge kind="bad" dot={false}>High risk</Badge>, whatever the score.</p>
                    </div>
                </>
            )}

            {editingAttribute && (
                <AttributeModal
                    key={editingAttribute.key}
                    definition={editingAttribute}
                    attribute={config.categories.find((c) => c.key === editingAttribute.categoryKey)
                        ?.attributes.find((a) => a.attributeDefinitionKey === editingAttribute.key)}
                    onClose={() => setEditingAttribute(null)}
                    onConfirm={confirmAttribute}
                />
            )}

            {thresholdsFor && (
                <ThresholdModal
                    key={thresholdsFor}
                    title={thresholdsFor === 'overall' ? 'Overall risk levels' : `${categoryName(thresholdsFor)} risk levels`}
                    caption="Scores run from 0 to 100. Each level starts where the one before it ends."
                    thresholds={thresholdsBeingEdited}
                    onClose={() => setThresholdsFor(null)}
                    onConfirm={confirmThresholds}
                />
            )}

            <Modal
                isOpen={renaming !== null}
                onClose={() => setRenaming(null)}
                title="Rename risk model"
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setRenaming(null)}>Cancel</button>
                        <button className="btn btn--primary" onClick={rename} disabled={!renaming?.trim()}>Save</button>
                    </>
                )}
            >
                <div className="field">
                    <label htmlFor="rm-name">Name</label>
                    <input id="rm-name" className="input" type="text" value={renaming ?? ''} onChange={(e) => setRenaming(e.target.value)} autoFocus />
                </div>
            </Modal>
        </div>
    );
}
