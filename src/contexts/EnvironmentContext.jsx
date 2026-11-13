import { createContext, useContext, useState } from 'react';

// Which API keys' data the console shows: PROD (production keys) or DEV (sandbox keys).
// Remembered per browser so the topbar switch survives a reload.
const STORAGE_KEY = 'consoleEnvironment';
const EnvironmentContext = createContext(null);

function storedEnvironment() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'DEV' ? 'DEV' : 'PROD';
    } catch {
        return 'PROD';
    }
}

export function EnvironmentProvider({ children }) {
    const [environment, setEnvironmentState] = useState(storedEnvironment);

    const setEnvironment = (value) => {
        setEnvironmentState(value);
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch {
            // Private windows can refuse storage; the switch still works for this visit.
        }
    };

    return (
        <EnvironmentContext.Provider value={{ environment, setEnvironment }}>
            {children}
        </EnvironmentContext.Provider>
    );
}

export function useEnvironment() {
    const ctx = useContext(EnvironmentContext);
    if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider');
    return ctx;
}
