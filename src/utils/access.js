import { hasAnyRole } from './roles';

// Who may see each page and use each action, matching what auth-server allows, so nobody is shown something
// they would only get an error from. One place to change; a roles-and-permissions screen can replace it later.
const STAFF = ['SUPER_ADMIN'];
const ADMINS = ['SUPER_ADMIN', 'ADMIN'];
const SIGNED_IN = null;

const ACCESS = {
    overview: ADMINS,
    verifications: ADMINS,
    waiting: ADMINS,
    workflows: SIGNED_IN,
    'workflows.edit': ADMINS,
    'kyb-settings': ADMINS,
    documents: ADMINS,
    analytics: ADMINS,
    api: ADMINS,
    webhooks: ADMINS,
    logs: STAFF,
    users: ADMINS,
    notifications: SIGNED_IN,
    'kyc-reviews': ADMINS,
    applications: STAFF,
    companies: ADMINS,
    services: STAFF,
    'risk-models': SIGNED_IN,
    'risk-models.edit': ADMINS,
    assessments: SIGNED_IN,
    screening: ADMINS,
    monitoring: ADMINS,
    'data-retention': ADMINS,
    billing: SIGNED_IN,
    'top-ups': STAFF,
    settings: SIGNED_IN,
};

/** Whether this person may see the page or use the action. Unknown keys are refused, so a typo hides rather than leaks. */
export function can(user, key) {
    if (!(key in ACCESS)) return false;
    const roles = ACCESS[key];
    return roles === SIGNED_IN ? Boolean(user) : hasAnyRole(user, roles);
}
