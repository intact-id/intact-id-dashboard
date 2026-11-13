import { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => authService.getStoredUser());

    // Refresh the stored profile on load so role or company changes made by an admin show up
    // without signing out. A dead session is handled by the 401 → refresh → /login interceptor.
    useEffect(() => {
        if (!authService.getStoredUser()) return;
        authService
            .fetchCurrentUser()
            .then((fresh) => {
                setUser(fresh);
                localStorage.setItem('user', JSON.stringify(fresh));
            })
            .catch(() => {});
    }, []);

    // Resolves to { success, mfaRequired?, mfaToken?, error? }. The user is only set once the
    // sign-in is complete — a pending 2FA challenge has no tokens yet.
    const login = async (username, password) => {
        const result = await authService.login(username, password);
        if (!result.success) return result;
        if (result.data.mfaRequired) return { success: true, mfaRequired: true, mfaToken: result.data.mfaToken };
        setUser(result.data);
        return { success: true };
    };

    const verifyTwoFactor = async (params) => {
        const result = await authService.verifyTwoFactor(params);
        if (result.success) setUser(result.data);
        return result;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const updateUser = (patch) => {
        setUser((prev) => {
            const next = { ...prev, ...patch };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, verifyTwoFactor, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
