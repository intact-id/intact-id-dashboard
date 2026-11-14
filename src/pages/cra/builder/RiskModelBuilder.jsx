import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { can } from '../../../utils/access';
import riskService from '../../../services/riskService';
import { errorMessage } from '../../../services/api';
import AttributeModal from './AttributeModal';
import ThresholdModal from './ThresholdModal';
import BandBar from './BandBar';
import {
    LEVELS, CUSTOMER_TYPES, activationProblems, categoryName, categoryRank, evenWeights, normalizeConfig, ruleRows,
    totalWeightPercent, weightPercent, withAttribute, withCategoryThresholds, withSafeguard, withWeightPercent,
    withoutAttribute,
} from './model';
import './builder.css';

// A score's colour: the risk level of the band it falls in (category bands, else thirds of 0-100)
function scoreColor(score, thresholds) {
    const value = Number(score);
    const band = thresholds?.find((t) => value >= Number(t.minScore) && value <= Number(t.maxScore));
    const level = band?.riskLevel || (value >= 67 ? 'HIGH' : value >= 34 ? 'MEDIUM' : 'LOW');
    return LEVELS.find((l) => l.level === level)?.color;
}

export default function RiskModelBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();

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

    // Drafts are edited only by those who may change risk models; everyone else sees the model read-only
    const isDraft = model.lifeCycleStatus === 'DRAFT' && can(user, 'risk-models.edit');
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
                <div className="rm-layout">
                    <nav className="rm-cats" aria-label="Categories">
                        {categoryKeys.map((key) => (
                            <button key={key} className={`rm-cat${key === activeTab ? ' is-active' : ''}`} onClick={() => setTab(key)}>
                                <span>{categoryName(key)}</span>
                                <span className="rm-cat-count">{attributeCount(key) || ''}</span>
                            </button>
                        ))}
                        {categoryKeys.length === 0 && <span className="card-caption">No attributes are available for this customer type yet.</span>}
                    </nav>

                    {activeTab && (
                        <section className="card rm-pane">
                            <div className="rm-pane-head">
                                <h3>{categoryName(activeTab)}</h3>
                                <p className="card-caption">Score the attributes that matter from 0 (lowest risk) to 100 (highest). The category score is their average.</p>
                            </div>

                            {category && (
                                <div className="rm-levels">
                                    <span className="rm-label">Risk levels</span>
                                    <div className="rm-levels-bar"><BandBar thresholds={category.thresholds} /></div>
                                    {isDraft && <button className="rm-link" onClick={() => setThresholdsFor(activeTab)}>Edit</button>}
                                </div>
                            )}

                            <div className="rm-group">
                                <div className="rm-label">Scored</div>
                                {configured.length === 0 && <p className="rm-empty">Nothing scored in this category yet{isDraft && available.length ? ': add an attribute below.' : '.'}</p>}
                                {configured.map((attribute) => {
                                    const definition = definitionOf(attribute.attributeDefinitionKey);
                                    const rows = ruleRows(attribute);
                                    return (
                                        <div
                                            key={attribute.attributeDefinitionKey}
                                            className={`rm-row${isDraft && definition ? ' is-clickable' : ''}`}
                                            onClick={() => isDraft && definition && setEditingAttribute(definition)}
                                        >
                                            <div className="rm-row-main">
                                                <span className="rm-row-name">{definition?.displayName || attribute.attributeDefinitionKey}</span>
                                                <div className="rm-chips">
                                                    {rows.map((row, i) => (
                                                        <span key={i} className="rm-chip">
                                                            <span className="rm-chip-label">{row.label}</span>
                                                            <span className="rm-chip-score" style={{ color: scoreColor(row.score, category?.thresholds) }}>{row.score}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {isDraft && (
                                                <div className="rm-row-actions" onClick={(e) => e.stopPropagation()}>
                                                    {definition && <button className="rm-icon-btn" onClick={() => setEditingAttribute(definition)} aria-label="Edit scores"><Pencil size={14} /></button>}
                                                    <button className="rm-icon-btn" onClick={() => apply(withoutAttribute(config, activeTab, attribute.attributeDefinitionKey))} aria-label="Remove attribute"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {available.length > 0 && isDraft && (
                                <div className="rm-group">
                                    <div className="rm-label">Not scored</div>
                                    {available.map((definition) => (
                                        <div key={definition.key} className="rm-row rm-row--muted">
                                            <div className="rm-row-main">
                                                <span className="rm-row-name">{definition.displayName}</span>
                                                {definition.description && <span className="rm-row-hint">{definition.description}</span>}
                                            </div>
                                            <button className="rm-link" onClick={() => setEditingAttribute(definition)}><Plus size={13} /> Add</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            ) : (
                <section className="card rm-pane rm-pane--overall">
                    <div className="rm-group">
                        <div className="rm-group-head">
                            <div>
                                <h3>Overall risk levels</h3>
                                <p className="card-caption">Where the overall score (0 to 100) turns from Low to Medium to High.</p>
                            </div>
                            {isDraft && <button className="rm-link" onClick={() => setThresholdsFor('overall')}>Edit</button>}
                        </div>
                        <BandBar thresholds={config.overallThresholds} />
                    </div>

                    <div className="rm-group">
                        <div className="rm-group-head">
                            <div>
                                <h3>Category weighting</h3>
                                <p className="card-caption">How much each category counts towards the overall score. Weights add up to 100%.</p>
                            </div>
                            {isDraft && config.categories.length > 1 && (
                                <button className="rm-link" onClick={() => apply({ ...config, categories: evenWeights(config.categories) })}>Split evenly</button>
                            )}
                        </div>
                        {config.categories.map((c) => (
                            <div key={c.key} className="rm-weight">
                                <span className="rm-weight-name">{c.displayName || categoryName(c.key)}</span>
                                <div className="rm-weight-track"><div className="rm-weight-fill" style={{ width: `${Math.min(100, weightPercent(c) || 0)}%` }} /></div>
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
                        <div className="rm-weight rm-weight--total">
                            <span className="rm-weight-name">Total</span>
                            <span />
                            <strong className={totalWeightPercent(config) === 100 ? '' : 'rm-bad'}>{totalWeightPercent(config)}%</strong>
                        </div>
                    </div>

                    <p className="rm-footnote"><Lock size={13} /> A confirmed sanctions match is always High risk, whatever the score.</p>
                </section>
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
