// Converts between what the risk model builder shows and sactions-service's RiskModelConfig.
//
// The builder keeps scoring simple to read:
//   - each attribute maps values to a score from 0 to 100, plus an "everything else" score;
//   - a category's score is the average of its attribute scores (0–100);
//   - the overall score is the categories' scores weighted by percentages that add up to 100 (0–100);
//   - thresholds split 0–100 into Low / Medium / High.

export const CUSTOMER_TYPES = {
    INDIVIDUAL: { label: 'Person' },
    BUSINESS: { label: 'Company' },
};

const CATEGORY_ORDER = ['basic_information', 'country', 'product', 'channel', 'screening'];
const CATEGORY_NAMES = {
    basic_information: 'Basic information',
    country: 'Country',
    product: 'Product',
    channel: 'Channel',
    screening: 'Screening',
};

export const categoryName = (key) => CATEGORY_NAMES[key] || key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const categoryRank = (key) => {
    const i = CATEGORY_ORDER.indexOf(key);
    return i === -1 ? CATEGORY_ORDER.length : i;
};

export const LEVELS = [
    { level: 'LOW', label: 'Low', badge: 'ok', color: 'var(--success)' },
    { level: 'MEDIUM', label: 'Medium', badge: 'warn', color: 'var(--amber-ink)' },
    { level: 'HIGH', label: 'High', badge: 'bad', color: 'var(--danger-dot)' },
];

export const DEFAULT_THRESHOLDS = [
    { riskLevel: 'LOW', minScore: 0, maxScore: 40 },
    { riskLevel: 'MEDIUM', minScore: 40, maxScore: 70 },
    { riskLevel: 'HIGH', minScore: 70, maxScore: 100 },
];

// sactions-service will not activate a model without this rule.
export const SANCTIONS_SAFEGUARD = {
    condition: { attribute: 'sanctions', op: 'eq', value: 'CONFIRMED_MATCH' },
    forceLevel: 'HIGH',
    reason: 'A confirmed sanctions match is always high risk, whatever the score.',
};

const isSanctionsSafeguard = (rule) =>
    rule?.forceLevel === 'HIGH' && rule?.condition?.attribute === 'sanctions'
    && rule?.condition?.op === 'eq' && rule?.condition?.value === 'CONFIRMED_MATCH';

export function newModelConfig(name, customerType) {
    return {
        customerType,
        combineMethod: 'WEIGHTED_SUM',
        description: name,
        overallThresholds: DEFAULT_THRESHOLDS,
        overrideRules: [SANCTIONS_SAFEGUARD],
        categories: [],
    };
}

// ---------------------------------------------------------------------------
// Thresholds: three levels, each starting where the previous one ends.
// ---------------------------------------------------------------------------

/** The two boundaries the user edits: where Low ends and where Medium ends. */
export function boundariesOf(thresholds) {
    const band = (level) => thresholds?.find((t) => t.riskLevel === level);
    const lowTo = Number(band('LOW')?.maxScore ?? 40);
    const mediumTo = Number(band('MEDIUM')?.maxScore ?? Math.max(lowTo + 1, 70));
    return { lowTo, mediumTo };
}

export function thresholdsFrom(lowTo, mediumTo) {
    return [
        { riskLevel: 'LOW', minScore: 0, maxScore: lowTo },
        { riskLevel: 'MEDIUM', minScore: lowTo, maxScore: mediumTo },
        { riskLevel: 'HIGH', minScore: mediumTo, maxScore: 100 },
    ];
}

export function thresholdError(lowTo, mediumTo) {
    if (!Number.isFinite(lowTo) || !Number.isFinite(mediumTo)) return 'Enter both boundaries.';
    if (lowTo <= 0) return 'Low must end above 0.';
    if (mediumTo <= lowTo) return 'Medium must end above where Low ends.';
    if (mediumTo >= 100) return 'Medium must end below 100 so High has a range.';
    return '';
}

// ---------------------------------------------------------------------------
// Attribute rules ↔ editor rows
// ---------------------------------------------------------------------------

export const isRangeType = (dataType) => dataType === 'NUMBER' || dataType === 'CURRENCY_AMOUNT';
export const isBooleanType = (dataType) => dataType === 'BOOLEAN';

const BOOLEAN_LABELS = {
    pep: ['Politically exposed person', 'Not a PEP'],
    adverse_media: ['Adverse media found', 'No adverse media'],
};
export const booleanLabels = (key) => BOOLEAN_LABELS[key] || ['Yes', 'No'];

export const unitFor = (key) => (key === 'age' ? 'years' : '');

const parseList = (text) => text.split(',').map((v) => v.trim()).filter(Boolean);
const toNumberOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/** Editor state for an attribute: rows plus the "everything else" score. */
export function editorStateFrom(dataType, attribute) {
    const rules = [...(attribute?.rules || [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const fallback = rules.find((r) => r.matchType === 'DEFAULT');
    const elseScore = fallback?.score ?? attribute?.defaultScore ?? '';

    if (isBooleanType(dataType)) {
        const scoreFor = (value) => rules.find((r) => r.matchType === 'BOOLEAN' && r.matchValue?.eq === value)?.score ?? '';
        return { yesScore: scoreFor(true), noScore: scoreFor(false) };
    }
    if (isRangeType(dataType)) {
        const rows = rules.filter((r) => r.matchType === 'RANGE')
            .map((r) => ({ min: r.matchValue?.min ?? '', max: r.matchValue?.max ?? '', score: r.score ?? '' }));
        return { rows: rows.length ? rows : [{ min: '', max: '', score: '' }], elseScore };
    }
    const rows = rules.filter((r) => r.matchType === 'SET' || r.matchType === 'EXACT')
        .map((r) => ({
            values: r.matchType === 'SET' ? (r.matchValue?.in || []).join(', ') : String(r.matchValue?.eq ?? ''),
            score: r.score ?? '',
        }));
    return { rows: rows.length ? rows : [{ values: '', score: '' }], elseScore };
}

const validScore = (s) => s !== '' && Number.isInteger(Number(s)) && Number(s) >= 0 && Number(s) <= 100;

/** Returns an error message, or '' when the editor state can be saved. */
export function editorError(dataType, state) {
    if (isBooleanType(dataType)) {
        return validScore(state.yesScore) && validScore(state.noScore) ? '' : 'Give both answers a score from 0 to 100.';
    }
    const rows = state.rows.filter((r) => !isBlankRow(dataType, r));
    if (!rows.length) return 'Add at least one row.';
    for (const row of rows) {
        if (!validScore(row.score)) return 'Every score must be a whole number from 0 to 100.';
        if (isRangeType(dataType)) {
            const min = toNumberOrNull(row.min);
            const max = toNumberOrNull(row.max);
            if (min === null && max === null) return 'Each range needs a from or a to value.';
            if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) return 'Ranges must be numbers.';
            if (min !== null && max !== null && min > max) return 'A range cannot start after it ends.';
        } else if (!parseList(row.values).length) {
            return 'Each row needs at least one value.';
        }
    }
    if (!validScore(state.elseScore)) return 'Score "everything else" from 0 to 100.';
    return '';
}

const isBlankRow = (dataType, row) => (isRangeType(dataType)
    ? row.min === '' && row.max === '' && row.score === ''
    : row.values.trim() === '' && row.score === '');

/** Builds the attribute config the API expects from a valid editor state. */
export function attributeFrom(key, dataType, state) {
    let rules;
    let defaultScore;
    if (isBooleanType(dataType)) {
        rules = [
            { matchType: 'BOOLEAN', matchValue: { eq: true }, score: Number(state.yesScore), priority: 1 },
            { matchType: 'BOOLEAN', matchValue: { eq: false }, score: Number(state.noScore), priority: 2 },
        ];
        defaultScore = Number(state.noScore); // a missing answer scores like "no"
    } else {
        const rows = state.rows.filter((r) => !isBlankRow(dataType, r));
        rules = rows.map((row, i) => (isRangeType(dataType)
            ? {
                matchType: 'RANGE',
                matchValue: { min: toNumberOrNull(row.min), max: toNumberOrNull(row.max) },
                score: Number(row.score),
                priority: i + 1,
            }
            : { matchType: 'SET', matchValue: { in: parseList(row.values) }, score: Number(row.score), priority: i + 1 }));
        rules.push({ matchType: 'DEFAULT', matchValue: null, score: Number(state.elseScore), priority: rules.length + 1 });
        defaultScore = Number(state.elseScore); // a missing value scores like "everything else"
    }
    return {
        attributeDefinitionKey: key,
        weight: 1,
        required: false,
        missingBehavior: 'DEFAULT_SCORE',
        defaultScore,
        rules,
    };
}

/** One row per rule for the read-only table on the category tab. */
export function ruleRows(attribute) {
    const unit = unitFor(attribute.attributeDefinitionKey);
    const [yes, no] = booleanLabels(attribute.attributeDefinitionKey);
    return [...(attribute.rules || [])]
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
        .map((r) => {
            let label;
            if (r.matchType === 'DEFAULT') label = 'Everything else';
            else if (r.matchType === 'BOOLEAN') label = r.matchValue?.eq ? yes : no;
            else if (r.matchType === 'RANGE') {
                const { min, max } = r.matchValue || {};
                label = min != null && max != null ? `${min} – ${max}` : min != null ? `${min} and over` : `Up to ${max}`;
                if (unit) label += ` ${unit}`;
            } else if (r.matchType === 'SET') label = (r.matchValue?.in || []).join(', ');
            else label = String(r.matchValue?.eq ?? '');
            return { label, score: r.score };
        });
}

/** API responses may leave lists out; the builder always works with arrays. */
export function normalizeConfig(config) {
    return {
        ...config,
        overallThresholds: config.overallThresholds?.length ? config.overallThresholds : DEFAULT_THRESHOLDS,
        overrideRules: config.overrideRules || [],
        categories: (config.categories || []).map((c) => ({ ...c, attributes: c.attributes || [] })),
    };
}

// ---------------------------------------------------------------------------
// Categories and weights
// ---------------------------------------------------------------------------

/** Adds or replaces an attribute in its category, creating the category when needed. */
export function withAttribute(config, categoryKey, attribute) {
    const existing = config.categories.find((c) => c.key === categoryKey);
    const categories = existing
        ? config.categories.map((c) => (c.key !== categoryKey ? c : {
            ...c,
            attributes: c.attributes.some((a) => a.attributeDefinitionKey === attribute.attributeDefinitionKey)
                ? c.attributes.map((a) => (a.attributeDefinitionKey === attribute.attributeDefinitionKey ? attribute : a))
                : [...c.attributes, attribute],
        }))
        : [...config.categories, {
            key: categoryKey,
            displayName: categoryName(categoryKey),
            weight: 1,
            rollupMethod: 'WEIGHTED_AVG',
            timing: 'ONBOARDING',
            ordering: categoryRank(categoryKey),
            thresholds: DEFAULT_THRESHOLDS,
            attributes: [attribute],
        }];
    return { ...config, categories: existing ? categories : evenWeights(categories) };
}

/** Removes an attribute; a category left empty is dropped (an empty category cannot be scored). */
export function withoutAttribute(config, categoryKey, attributeKey) {
    const categories = config.categories
        .map((c) => (c.key !== categoryKey ? c : { ...c, attributes: c.attributes.filter((a) => a.attributeDefinitionKey !== attributeKey) }))
        .filter((c) => c.attributes.length > 0);
    return { ...config, categories: categories.length === config.categories.length ? categories : evenWeights(categories) };
}

export function withCategoryThresholds(config, categoryKey, thresholds) {
    return { ...config, categories: config.categories.map((c) => (c.key === categoryKey ? { ...c, thresholds } : c)) };
}

/** Splits 100% evenly across categories; rounding leftovers go to the first ones. */
export function evenWeights(categories) {
    if (!categories.length) return categories;
    const base = Math.floor(100 / categories.length);
    let leftover = 100 - base * categories.length;
    return categories.map((c) => {
        const percent = base + (leftover-- > 0 ? 1 : 0);
        return { ...c, weight: percent / 100 };
    });
}

export const weightPercent = (category) => Math.round(Number(category.weight) * 100);

export function withWeightPercent(config, categoryKey, percent) {
    return {
        ...config,
        categories: config.categories.map((c) => (c.key === categoryKey ? { ...c, weight: percent / 100 } : c)),
    };
}

export const totalWeightPercent = (config) => config.categories.reduce((sum, c) => sum + weightPercent(c), 0);

export const hasSanctionsSafeguard = (config) => (config.overrideRules || []).some(isSanctionsSafeguard);

/** What stops the model from being activated, in plain words. Empty when it is ready. */
export function activationProblems(config) {
    const problems = [];
    if (!config.categories.length) problems.push('Add at least one attribute.');
    if (config.categories.some((c) => weightPercent(c) <= 0)) problems.push('Every category needs a weight above 0%.');
    if (totalWeightPercent(config) !== 100) problems.push(`Category weights add up to ${totalWeightPercent(config)}%, not 100%.`);
    return problems;
}

/** Makes sure the sanctions safeguard is present before saving. */
export function withSafeguard(config) {
    return hasSanctionsSafeguard(config) ? config : { ...config, overrideRules: [...(config.overrideRules || []), SANCTIONS_SAFEGUARD] };
}
