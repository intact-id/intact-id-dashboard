import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import logoIcon from '../assets/intact-logo.svg';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Login failed');
        }

        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <div className="login-container">
                <Card variant="elevated" className="login-card">
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
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="demo@intactid.com"
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />

                        {error && (
                            <div className="login-error">
                                <span className="error-icon">⚠️</span>
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={loading}
                            className="login-button"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="login-footer">
                        <p className="demo-credentials">
                            <strong>Demo Credentials:</strong><br />
                            Email: demo@intactid.com<br />
                            Password: demo123
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
