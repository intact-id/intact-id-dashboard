import { hasAnyRole } from './roles';

// Who may see each page and use each action. The server sends each person's permissions (auth-server's
// Permissions), and each entry below names the permission its page or action needs; null means anyone signed in.
// Keeping the console to the same permissions as the server means nobody is shown what they'd only get an error from.
const ACCESS = {
    overview: 'analytics:view',
    verifications: 'verifications:view',
    waiting: 'kyb:view',
    workflows: null,
    'workflows.edit': 'workflows:manage',
    'kyb-settings': 'kyb:manage',
    documents: 'verifications:view',
    analytics: 'analytics:view',
    api: 'apikeys:view',
    webhooks: 'webhooks:view',
    logs: 'audit:view',
    users: 'users:view',
    'users.roles': 'roles:manage',
    'api.manage': 'apikeys:manage',
    notifications: null,
    'kyc-reviews': 'reviews:view',
    applications: 'applications:view',
    companies: 'companies:view',
    services: 'services:manage-platform',
    'risk-models': null,
    'risk-models.edit': 'risk:manage',
    assessments: null,
    screening: 'screening:view',
    monitoring: 'monitoring:use',
    'data-retention': 'privacy:view',
    billing: null,
    'top-ups': 'topups:manage-platform',
    settings: null,
};

// Until a stored sign-in has been refreshed with permissions, decide from roles as before
const STAFF = ['SUPER_ADMIN'];
const ADMINS = ['SUPER_ADMIN', 'ADMIN'];
const BY_ROLE = {
    logs: STAFF, applications: STAFF, services: STAFF, 'top-ups': STAFF,
};

/** Whether this person may see the page or use the action. Unknown keys are refused, so a typo hides rather than leaks. */
export function can(user, key) {
    if (!(key in ACCESS)) return false;
    if (!user) return false;
    const permission = ACCESS[key];
    if (permission === null) return true;
    if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
    return hasAnyRole(user, BY_ROLE[key] || ADMINS);
}
