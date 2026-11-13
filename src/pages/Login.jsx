import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight, CircleCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const HIGHLIGHTS = [
    'Full audit trail on every review',
    'Maker–checker approvals built in',
    'Scoped keys for sandbox and production',
];

export default function Login() {
    const { login, verifyTwoFactor } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberDevice, setRememberDevice] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // Set when the password step passed but auth-server wants a second factor.
    const [mfaToken, setMfaToken] = useState(null);
    const [code, setCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            setError('Enter your username and password.');
            return;
        }
        setError('');
        setBusy(true);
        const res = await login(username.trim(), password);
        setBusy(false);
        if (!res.success) setError(res.error);
        else if (res.mfaRequired) setMfaToken(res.mfaToken);
        else navigate('/dashboard');
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!code.trim()) {
            setError(useBackupCode ? 'Enter one of your backup codes.' : 'Enter the 6-digit code from your authenticator app.');
            return;
        }
        setError('');
        setBusy(true);
        const res = await verifyTwoFactor({
            mfaToken,
            rememberDevice,
            ...(useBackupCode ? { backupCode: code.trim() } : { verificationCode: code.trim() }),
        });
        setBusy(false);
        if (res.success) navigate('/dashboard');
        else setError(res.error);
    };

    const backToPassword = () => {
        setMfaToken(null);
        setCode('');
        setUseBackupCode(false);
        setError('');
    };

    return (
        <div className="login-screen">
            <div className="login-brand">
                <div className="brand-row">
                    <ShieldCheck size={22} />
                    <span>Intact ID</span>
                </div>

                <div className="login-message">
                    <div className="eyebrow-row">
                        <span className="eyebrow-rule" />
                        <span className="eyebrow eyebrow--on-ink">SECURE ACCESS</span>
                    </div>
                    <h1>The verification console for regulated teams.</h1>
                    <p>
                        Review identity checks, trace every decision back to its evidence, and keep your operators
                        inside one audited workflow.
                    </p>
                    <ul className="login-highlights">
                        {HIGHLIGHTS.map((h) => (
                            <li key={h}>
                                <CircleCheck size={17} />
                                <span>{h}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="login-footer">
                    <span>© 2026 Intact ID</span>
                    <span>·</span>
                    <span>support@intactid.com</span>
                </div>
            </div>

            <div className="login-form-panel">
                {mfaToken ? (
                    <form className="login-card" onSubmit={handleVerify}>
                        <div className="login-card-head">
                            <h1>Two-factor check</h1>
                            <p>
                                {useBackupCode
                                    ? 'Enter one of the backup codes you saved when you set up two-factor authentication.'
                                    : 'Enter the 6-digit code from your authenticator app.'}
                            </p>
                        </div>

                        <div className="login-fields">
                            <div className="field">
                                <label htmlFor="mfa-code">{useBackupCode ? 'Backup code' : 'Authentication code'}</label>
                                <div className="input-with-icon">
                                    <KeyRound size={16} />
                                    <input
                                        id="mfa-code"
                                        type="text"
                                        inputMode={useBackupCode ? 'text' : 'numeric'}
                                        autoComplete="one-time-code"
                                        placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
                                        maxLength={useBackupCode ? 32 : 6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <div className="login-meta-row">
                            <label className="checkbox-row">
                                <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} />
                                <span>Trust this device</span>
                            </label>
                            <a href="#backup" onClick={(e) => { e.preventDefault(); setUseBackupCode((v) => !v); setCode(''); setError(''); }}>
                                {useBackupCode ? 'Use authenticator code' : 'Use a backup code'}
                            </a>
                        </div>

                        <button className="btn btn--primary login-submit" type="submit" disabled={busy}>
                            {busy ? 'Verifying…' : 'Verify and sign in'}
                            {!busy && <ArrowRight size={17} />}
                        </button>

                        <div className="login-note">
                            <div className="divider" />
                            <p>
                                <a href="#back" onClick={(e) => { e.preventDefault(); backToPassword(); }}>Back to sign in</a>
                            </p>
                        </div>
                    </form>
                ) : (
                <form className="login-card" onSubmit={handleSubmit}>
                    <div className="login-card-head">
                        <h1>Sign in</h1>
                        <p>Use the work account issued by your administrator.</p>
                    </div>

                    <div className="login-fields">
                        <div className="field">
                            <label htmlFor="username">Username</label>
                            <div className="input-with-icon">
                                <User size={16} />
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="frank.mwangi"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="password">Password</label>
                            <div className="input-with-icon">
                                <Lock size={16} />
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <div className="login-meta-row">
                        <label className="checkbox-row">
                            <input type="checkbox" checked={rememberDevice} onChange={(e) => setRememberDevice(e.target.checked)} />
                            <span>Remember this device</span>
                        </label>
                        <a href="#forgot">Forgot password?</a>
                    </div>

                    <button className="btn btn--primary login-submit" type="submit" disabled={busy}>
                        {busy ? 'Signing in…' : 'Sign in'}
                        {!busy && <ArrowRight size={17} />}
                    </button>

                    <div className="login-note">
                        <div className="divider" />
                        <p>Two-factor confirmation is requested after this step.</p>
                    </div>
                </form>
                )}
            </div>
        </div>
    );
}
