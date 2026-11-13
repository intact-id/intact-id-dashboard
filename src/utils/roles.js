// auth-server sends roles as strings, sometimes with Spring's ROLE_ prefix.
export function normalizeRole(role) {
    return String(role || '').replace(/^ROLE_/, '').toUpperCase();
}

export function hasAnyRole(user, accepted) {
    const wanted = new Set(accepted.map(normalizeRole));
    return (user?.roles || []).some((role) => wanted.has(normalizeRole(role)));
}

export const isSuperAdmin = (user) => hasAnyRole(user, ['SUPER_ADMIN']);

// "SUPER_ADMIN" → "Super admin"
export function roleLabel(user) {
    const role = normalizeRole(user?.roles?.[0]);
    if (!role) return '';
    const words = role.toLowerCase().replace(/_/g, ' ');
    return words[0].toUpperCase() + words.slice(1);
}
