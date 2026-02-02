import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import logoIcon from '../assets/intact-logo.svg';
import { User, Lock, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);
            if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
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
                </div>
            </div>
        </div>
    );
}
