import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import kycService from '../services/kycService';
import approvalService from '../services/approvalService';
import './Approvals.css';
import '../components/ModalStyles.css';

export default function Approvals() {
    const [activeTab, setActiveTab] = useState('kyc');
    const [kycItems, setKycItems] = useState([]);
    const [kybItems, setKybItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0 });

    // Notification modal states
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success'); // 'success' or 'error'

    useEffect(() => {
        fetchData();
    }, [activeTab, pagination.page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'kyc') {
                const data = await kycService.listVerifications(
                    { status: 'PENDING' },
                    { page: pagination.page, size: pagination.size }
                );
                if (data.success) {
                    setKycItems(data.data.content);
                    setPagination(prev => ({
                        ...prev,
                        totalPages: data.data.totalPages,
                        totalElements: data.data.totalElements
                    }));
                }
            } else {
                const data = await approvalService.getApplications(
                    { status: 'PENDING' },
                    { page: pagination.page, size: pagination.size }
                );
                if (data.success) {
                    setKybItems(data.data.content);
                    setPagination(prev => ({
                        ...prev,
                        totalPages: data.data.totalPages,
                        totalElements: data.data.totalElements
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching approvals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (item) => {
        try {
            if (activeTab === 'kyb') {
                const id = item.approvalId || item.id;
                await approvalService.checkerDecision(id, 'APPROVE', 'Approved via Dashboard');
                fetchData();
                setSelectedItem(null);
            } else {
                console.log('KYC Approve not implemented yet');
            }
        } catch (error) {
            console.error('Approval failed:', error);
            setNotificationMessage('Failed to approve: ' + (error.response?.data?.errorMessage || error.message));
            setNotificationType('error');
            setShowNotificationModal(true);
        }
    };

    const handleReject = async (item) => {
        try {
            if (activeTab === 'kyb') {
                const id = item.approvalId || item.id;
                await approvalService.checkerDecision(id, 'REJECT', 'Rejected via Dashboard');
                fetchData();
                setSelectedItem(null);
            } else {
                console.log('KYC Reject not implemented yet');
            }
        } catch (error) {
            console.error('Rejection failed:', error);
            setNotificationMessage('Failed to reject: ' + (error.response?.data?.errorMessage || error.message));
            setNotificationType('error');
            setShowNotificationModal(true);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const closeModal = () => setSelectedItem(null);

    return (
        <div className="approvals">
            <div className="page-header">
                <div>
                    <h1>Approvals</h1>
                    <p className="page-subtitle">
                        {activeTab === 'kyc' ? kycItems.length : kybItems.length} pending {activeTab === 'kyc' ? 'KYC' : 'KYB'} requests
                    </p>
                </div>
            </div>

            <div className="approvals-tabs">
                <button
                    className={`tab-btn ${activeTab === 'kyc' ? 'tab-btn--active' : ''}`}
                    onClick={() => { setActiveTab('kyc'); setPagination(p => ({ ...p, page: 0 })); }}
                >
                    KYC Approvals
                </button>
                <button
                    className={`tab-btn ${activeTab === 'kyb' ? 'tab-btn--active' : ''}`}
                    onClick={() => { setActiveTab('kyb'); setPagination(p => ({ ...p, page: 0 })); }}
                >
                    KYB Requests
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading pending approvals...</p>
                </div>
            ) : (
                <div className="approvals-container">
                    <table className="approvals-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Entity Name</th>
                                <th>Type</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'kyc' ? (
                                kycItems.length > 0 ? kycItems.map(item => (
                                    <>
                                        <tr
                                            key={item.verificationId}
                                            className={selectedItem?.verificationId === item.verificationId ? 'selected' : ''}
                                        >
                                            <td className="mono">{item.verificationId.substring(0, 13)}...</td>
                                            <td>
                                                {item.customerData?.firstName} {item.customerData?.lastName}
                                            </td>
                                            <td>Individual</td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td><Badge variant="warning">{item.status}</Badge></td>
                                            <td>
                                                <button
                                                    className="review-btn"
                                                    onClick={() => setSelectedItem(selectedItem?.verificationId === item.verificationId ? null : item)}
                                                >
                                                    {selectedItem?.verificationId === item.verificationId ? 'Close' : 'Review'}
                                                </button>
                                            </td>
                                        </tr>
                                        {selectedItem?.verificationId === item.verificationId && (
                                            <tr className="details-row">
                                                <td colSpan="6">
                                                    <div className="details-panel">
                                                        <div className="details-grid">
                                                            <div className="detail-section">
                                                                <h4>Personal Information</h4>
                                                                {selectedItem.customerData?.email && (
                                                                    <div className="detail-item">
                                                                        <span>Email:</span>
                                                                        <span>{selectedItem.customerData.email}</span>
                                                                    </div>
                                                                )}
                                                                {selectedItem.customerData?.phone && (
                                                                    <div className="detail-item">
                                                                        <span>Phone:</span>
                                                                        <span>{selectedItem.customerData.phone}</span>
                                                                    </div>
                                                                )}
                                                                {selectedItem.customerData?.nationality && (
                                                                    <div className="detail-item">
                                                                        <span>Nationality:</span>
                                                                        <span>{selectedItem.customerData.nationality}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="detail-section">
                                                                <h4>Request Details</h4>
                                                                <div className="detail-item">
                                                                    <span>Request ID:</span>
                                                                    <span className="mono">{selectedItem.verificationId}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <span>Submitted:</span>
                                                                    <span>{formatDate(selectedItem.createdAt)}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <span>Type:</span>
                                                                    <span>Individual (KYC)</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="action-buttons">
                                                            <button className="btn-approve" onClick={() => handleApprove(selectedItem)}>
                                                                Approve
                                                            </button>
                                                            <button className="btn-reject" onClick={() => handleReject(selectedItem)}>
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )) : <tr><td colSpan="6" className="no-data">No pending KYC approvals</td></tr>
                            ) : (
                                kybItems.length > 0 ? kybItems.map(item => (
                                    <>
                                        <tr
                                            key={item.id}
                                            className={selectedItem?.id === item.id ? 'selected' : ''}
                                        >
                                            <td className="mono">{item.id.substring(0, 13)}...</td>
                                            <td>{item.legalName}</td>
                                            <td>Company</td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td><Badge variant="warning">{item.status}</Badge></td>
                                            <td>
                                                <button
                                                    className="review-btn"
                                                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                                >
                                                    {selectedItem?.id === item.id ? 'Close' : 'Review'}
                                                </button>
                                            </td>
                                        </tr>
                                        {selectedItem?.id === item.id && (
                                            <tr className="details-row">
                                                <td colSpan="8">
                                                    <div className="details-panel">
                                                        <div className="details-grid">
                                                            <div className="detail-section">
                                                                <h4>Company Details</h4>
                                                                <div className="detail-item">
                                                                    <span>Legal Name:</span>
                                                                    <span>{selectedItem.legalName}</span>
                                                                </div>
                                                                {selectedItem.registrationNumber && (
                                                                    <div className="detail-item">
                                                                        <span>Registration Number:</span>
                                                                        <span className="mono">{selectedItem.registrationNumber}</span>
                                                                    </div>
                                                                )}
                                                                {selectedItem.tradingName && (
                                                                    <div className="detail-item">
                                                                        <span>Trading Name:</span>
                                                                        <span>{selectedItem.tradingName}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="detail-section">
                                                                <h4>Request Details</h4>
                                                                <div className="detail-item">
                                                                    <span>Request ID:</span>
                                                                    <span className="mono">{selectedItem.id}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <span>Submitted:</span>
                                                                    <span>{formatDate(selectedItem.createdAt)}</span>
                                                                </div>
                                                                <div className="detail-item">
                                                                    <span>Type:</span>
                                                                    <span>Company (KYB)</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="action-buttons">
                                                            <button className="btn-approve" onClick={() => handleApprove(selectedItem)}>
                                                                Approve
                                                            </button>
                                                            <button className="btn-reject" onClick={() => handleReject(selectedItem)}>
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )) : <tr><td colSpan="6" className="no-data">No pending KYB requests</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Inline Notification Toast */}
            {showNotificationModal && (
                <div className="notification-toast" style={{
                    background: notificationType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${notificationType === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: notificationType === 'success' ? '#10b981' : '#ef4444'
                }}>
                    <span>{notificationMessage}</span>
                    <button onClick={() => setShowNotificationModal(false)}>×</button>
                </div>
            )}
        </div>
    );
}
