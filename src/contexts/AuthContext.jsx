import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        console.log('AuthContext: Checking authentication on mount');
        const currentUser = authService.getCurrentUser();
        const isAuth = authService.isAuthenticated();
        console.log('AuthContext: currentUser=', currentUser);
        console.log('AuthContext: isAuthenticated=', isAuth);

        if (currentUser && isAuth) {
            console.log('AuthContext: Setting user state');
            setUser(currentUser);
        } else {
            console.log('AuthContext: No valid user found');
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        console.log('AuthContext: Login attempt for', username);
        const result = await authService.login(username, password);

        if (result.success) {
            console.log('AuthContext: Login successful, setting user=', result.data);
            setUser(result.data);
        } else {
            console.log('AuthContext: Login failed');
        }

        return result;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const updateUser = (userData) => {
        console.log('Updating user:', userData); // Debug log
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const value = {
        user,
        login,
        logout,
        updateUser,
        loading,
        isAuthenticated: () => authService.isAuthenticated(),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
