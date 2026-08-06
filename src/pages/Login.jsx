import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import logoIcon from '../assets/intact-logo.svg';
import { User, Lock, AlertCircle } from 'lucide-react';
import authService from '../services/authService';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('credentials'); // 'credentials' | 'verify'
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [rememberDevice, setRememberDevice] = useState(false);
    const [mfaToken, setMfaToken] = useState(null);
    const { login, completeTwoFactorLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);
            if (result.success) {
                if (result.data?.mfaRequired) {
                    setMfaToken(result.data.mfaToken);
                    setStep('verify');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(result.error || 'Login failed');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');

        if (useBackupCode) {
            if (!backupCode.trim()) {
                setError('Enter one of your backup codes');
                return;
            }
        } else if (!/^\d{6}$/.test(verificationCode)) {
            setError('Enter the 6-digit code from your authenticator app');
            return;
        }

        setLoading(true);
        try {
            const result = useBackupCode
                ? await authService.verifyBackupCode(mfaToken, backupCode.trim(), rememberDevice)
                : await authService.verifyMfaCode(mfaToken, Number(verificationCode), rememberDevice);

            if (result.success) {
                completeTwoFactorLogin(result.data);
                navigate('/dashboard');
            } else {
                setError(result.error || 'Incorrect code. Please try again.');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        // No tokens were ever issued during a pending 2FA challenge, so there's nothing
        // to log out of on the backend — just reset the local step state.
        setVerificationCode('');
        setBackupCode('');
        setUseBackupCode(false);
        setRememberDevice(false);
        setMfaToken(null);
        setError('');
        setStep('credentials');
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo-container">
                            <img src={logoIcon} alt="Intact ID" className="login-logo-img" />
                            <h1 className="login-logo-text">
                                <span className="logo-text">Intact</span>
                                <span className="logo-accent">ID</span>
                            </h1>
                        </div>
                        <p className="login-subtitle">Identity Verification Platform</p>
                    </div>

                    {step === 'credentials' ? (
                        <>
                            <form onSubmit={handleSubmit} className="login-form">
                                <div className="form-group">
                                    <div className="input-wrapper">
                                        <User size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            name="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Username"
                                            className="form-input"
                                            required
                                            autoComplete="username"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="input-wrapper">
                                        <Lock size={18} className="input-icon" />
                                        <input
                                            type="password"
                                            name="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Password"
                                            className="form-input"
                                            required
                                            autoComplete="current-password"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="login-error">
                                        <AlertCircle size={18} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="login-button"
                                    disabled={loading}
                                >
                                    {loading ? 'Sign in...' : 'Sign in'}
                                </button>
                            </form>

                            <div className="login-footer">
                                <div className="demo-credentials">
                                    <strong>Demo Access</strong>
                                    <div>admin / Admin@123</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleVerify} className="login-form">
                            <p className="login-verify-hint">
                                {useBackupCode
                                    ? 'Enter one of your unused backup codes'
                                    : 'Enter the 6-digit code from your authenticator app'}
                            </p>

                            <div className="form-group">
                                {useBackupCode ? (
                                    <input
                                        type="text"
                                        name="backupCode"
                                        value={backupCode}
                                        onChange={(e) => setBackupCode(e.target.value.toUpperCase().slice(0, 9))}
                                        placeholder="XXXX-XXXX"
                                        className="form-input login-code-input"
                                        autoComplete="one-time-code"
                                        autoFocus
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="verificationCode"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="form-input login-code-input"
                                        autoComplete="one-time-code"
                                        autoFocus
                                    />
                                )}
                            </div>

                            <label className="login-remember-device">
                                <input
                                    type="checkbox"
                                    checked={rememberDevice}
                                    onChange={(e) => setRememberDevice(e.target.checked)}
                                />
                                <span>Remember this device for 30 days</span>
                            </label>

                            {error && (
                                <div className="login-error">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="login-button"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify & Continue'}
                            </button>

                            <button
                                type="button"
                                className="login-back-link"
                                onClick={() => {
                                    setUseBackupCode(!useBackupCode);
                                    setVerificationCode('');
                                    setBackupCode('');
                                    setError('');
                                }}
                                disabled={loading}
                            >
                                {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code instead'}
                            </button>

                            <button
                                type="button"
                                className="login-back-link"
                                onClick={handleBackToLogin}
                                disabled={loading}
                            >
                                Back to login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
