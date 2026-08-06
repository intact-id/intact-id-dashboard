import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Copy, Check, ArrowRight, Download } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import twoFactorService from '../../services/twoFactorService';
import './TwoFactorSetupModal.css';

function extractSecret(otpauthUrl) {
    if (!otpauthUrl) return '';
    const queryStart = otpauthUrl.indexOf('?');
    if (queryStart === -1) return '';
    const params = new URLSearchParams(otpauthUrl.substring(queryStart + 1));
    return params.get('secret') || '';
}

export default function TwoFactorSetupModal({ isOpen, onClose, onEnabled }) {
    const [step, setStep] = useState('loading'); // loading | scan | verify | codes | success
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [mustStayOpen, setMustStayOpen] = useState(false);
    const [backupCodes, setBackupCodes] = useState([]);
    const [codesSaved, setCodesSaved] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);

    const startSetup = async () => {
        setMustStayOpen(true);
        setStep('loading');
        setError('');
        try {
            const response = await twoFactorService.enable();
            if (response.success) {
                setQrCodeUrl(response.data?.qrCodeEncodeUrl || '');
                setStep('scan');
            } else {
                setError(response.responseMessage || 'Failed to start 2FA setup');
                setStep('scan');
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || 'Failed to start 2FA setup');
            setStep('scan');
        }
    };

    // Kick off setup the first time the modal opens
    if (isOpen && step === 'loading' && !mustStayOpen) {
        startSetup();
    }

    const handleCopySecret = async () => {
        const secret = extractSecret(qrCodeUrl);
        if (!secret) return;
        await navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');

        if (!/^\d{6}$/.test(code)) {
            setError('Enter the 6-digit code from your authenticator app');
            return;
        }

        setLoading(true);
        try {
            const response = await twoFactorService.verify(Number(code));
            if (response.success && response.data === true) {
                await loadBackupCodes();
            } else {
                setError('Incorrect code. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.errorMessage || 'Incorrect code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadBackupCodes = async () => {
        try {
            const response = await twoFactorService.regenerateBackupCodes();
            setBackupCodes(response.success ? (response.data?.codes || []) : []);
        } catch {
            setBackupCodes([]);
        } finally {
            // 2FA is already enabled at this point regardless of whether backup
            // codes came back — never block the flow on this secondary step.
            setStep('codes');
        }
    };

    const handleCopyCodes = async () => {
        if (!backupCodes.length) return;
        await navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
    };

    const handleDownloadCodes = () => {
        if (!backupCodes.length) return;
        const blob = new Blob([backupCodes.join('\n') + '\n'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'intact-id-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFinish = () => {
        setStep('success');
        setTimeout(() => {
            setMustStayOpen(false);
            setStep('loading');
            setQrCodeUrl('');
            setCode('');
            setBackupCodes([]);
            setCodesSaved(false);
            if (onEnabled) onEnabled();
        }, 1800);
    };

    const handleClose = () => {
        setMustStayOpen(false);
        setStep('loading');
        setQrCodeUrl('');
        setCode('');
        setError('');
        setBackupCodes([]);
        setCodesSaved(false);
        onClose();
    };

    if (!isOpen && !mustStayOpen) return null;

    const secret = extractSecret(qrCodeUrl);

    const subtitleByStep = {
        scan: 'Scan this QR code with Google Authenticator or a similar app',
        verify: 'Enter the 6-digit code shown in your authenticator app',
        codes: 'Save these backup codes somewhere safe — each one can only be used once',
    };

    return (
        <div className="modal-overlay" onClick={step === 'codes' ? undefined : handleClose}>
            <div className="modal two-fa-modal" onClick={(e) => e.stopPropagation()}>
                {step === 'success' ? (
                    <div className="success-content">
                        <div className="success-icon-wrapper">
                            <Check size={32} />
                        </div>
                        <h3 className="success-title">Two-Factor Authentication Enabled</h3>
                        <p className="success-message">Your account is now protected with an authenticator app.</p>
                    </div>
                ) : (
                    <>
                        <div className="modal-header">
                            <div className="modal-header-content">
                                <ShieldCheck className="modal-icon" />
                                <div>
                                    <h2>Enable Two-Factor Authentication</h2>
                                    <p className="modal-subtitle">
                                        {subtitleByStep[step] || ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-body">
                            {error && <div className="error-message">{error}</div>}

                            {step === 'loading' && (
                                <div className="two-fa-loading">
                                    <div className="spinner" />
                                </div>
                            )}

                            {step === 'scan' && qrCodeUrl && (
                                <div className="two-fa-scan">
                                    <div className="qr-code-wrapper">
                                        <QRCodeSVG value={qrCodeUrl} size={200} />
                                    </div>
                                    <div className="manual-key">
                                        <span className="manual-key-label">Can't scan? Enter this key manually:</span>
                                        <div className="manual-key-value">
                                            <code>{secret}</code>
                                            <button type="button" className="copy-btn" onClick={handleCopySecret}>
                                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 'verify' && (
                                <form onSubmit={handleVerify} className="two-fa-verify-form">
                                    <Input
                                        label="Verification Code"
                                        name="code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="two-fa-code-input"
                                    />
                                </form>
                            )}

                            {step === 'codes' && (
                                <div className="two-fa-backup-codes">
                                    <div className="backup-codes-grid">
                                        {backupCodes.length ? backupCodes.map((c) => (
                                            <code key={c} className="backup-code-item">{c}</code>
                                        )) : (
                                            <p className="field-hint">
                                                Backup codes couldn't be generated right now — you can create them
                                                later from Settings.
                                            </p>
                                        )}
                                    </div>

                                    {backupCodes.length > 0 && (
                                        <>
                                            <div className="backup-codes-actions">
                                                <button type="button" className="copy-btn" onClick={handleCopyCodes}>
                                                    {copiedCodes ? <Check size={16} /> : <Copy size={16} />}
                                                    {copiedCodes ? 'Copied' : 'Copy all'}
                                                </button>
                                                <button type="button" className="copy-btn" onClick={handleDownloadCodes}>
                                                    <Download size={16} /> Download
                                                </button>
                                            </div>

                                            <label className="backup-codes-confirm">
                                                <input
                                                    type="checkbox"
                                                    checked={codesSaved}
                                                    onChange={(e) => setCodesSaved(e.target.checked)}
                                                />
                                                <span>I've saved these codes somewhere safe</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {step !== 'codes' && (
                                <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
                                    Cancel
                                </Button>
                            )}
                            {step === 'scan' && (
                                <Button type="button" onClick={() => setStep('verify')} disabled={!qrCodeUrl}>
                                    Next <ArrowRight size={16} />
                                </Button>
                            )}
                            {step === 'verify' && (
                                <Button type="button" onClick={handleVerify} disabled={loading}>
                                    {loading ? 'Verifying...' : 'Verify & Enable'}
                                </Button>
                            )}
                            {step === 'codes' && (
                                <Button
                                    type="button"
                                    onClick={handleFinish}
                                    disabled={backupCodes.length > 0 && !codesSaved}
                                >
                                    Continue <ArrowRight size={16} />
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
