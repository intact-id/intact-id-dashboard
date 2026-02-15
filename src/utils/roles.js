export function normalizeRoleName(role) {
    if (!role) return '';
    if (typeof role === 'string') {
        return role.replace(/^ROLE_/, '').toUpperCase();
    }
    if (typeof role === 'object') {
        const candidate = role.name || role.role || role.authority || role.code;
        if (typeof candidate === 'string') {
            return candidate.replace(/^ROLE_/, '').toUpperCase();
        }
    }
    return '';
}

export function hasAnyRole(user, acceptedRoles = []) {
    if (!user || !Array.isArray(user.roles) || user.roles.length === 0) return false;
    const accepted = new Set(acceptedRoles.map((r) => String(r).toUpperCase()));
    return user.roles.some((role) => accepted.has(normalizeRoleName(role)));
}

export function isAdminOrSuperAdmin(user) {
    return hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
}
