import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import userService from '../../services/userService';
import './ChangePasswordModal.css';

export default function ChangePasswordModal({ isOpen, onClose, userId, onSuccess }) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }


        setLoading(true);
        setError(''); // Clear any previous errors

        try {
            const response = await userService.changePassword(userId, {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword
            });

            if (response.success) {
                // Clear form
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

                // Show success state
                setIsSuccess(true);

                // Close after delay
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                }, 2000);
            } else {
                setError(response.errorMessage || 'Failed to change password');
            }
        } catch (err) {
            console.error('Password change error:', err);
            // Handle different error scenarios
            if (err.response) {
                // Server responded with an error
                const errorMessage = err.response.data?.errorMessage ||
                    err.response.data?.message ||
                    'Failed to change password';
                setError(errorMessage);
            } else if (err.request) {
                // Request was made but no response
                setError('No response from server. Please try again.');
            } else {
                // Something else happened
                setError('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="modal change-password-modal" onClick={(e) => e.stopPropagation()}>
                {isSuccess ? (
                    <div className="success-content">
                        <div className="success-icon-wrapper">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="success-title">Password Changed</h3>
                        <p className="success-message">Your password has been updated successfully.</p>
                    </div>
                ) : (
                    <>
                        <div className="modal-header">
                            <div className="modal-header-content">
                                <Lock className="modal-icon" />
                                <div>
                                    <h2>Change Password</h2>
                                    <p className="modal-subtitle">Please update your password to continue</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {error && (
                                    <div className="error-message">
                                        {error}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Current Password *</label>
                                    <div className="password-input-wrapper">
                                        <Input
                                            type={showPasswords.current ? 'text' : 'password'}
                                            required
                                            value={formData.currentPassword}
                                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        >
                                            {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>New Password *</label>
                                    <div className="password-input-wrapper">
                                        <Input
                                            type={showPasswords.new ? 'text' : 'password'}
                                            required
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        >
                                            {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="field-hint">At least 8 characters with uppercase, lowercase, number, and special character</p>
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password *</label>
                                    <div className="password-input-wrapper">
                                        <Input
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            required
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        >
                                            {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Changing...' : 'Change Password'}
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
