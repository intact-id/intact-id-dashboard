import { useState, useEffect } from 'react';
import { Download, Eye, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import DocumentViewer from '../components/ui/DocumentViewer';
import Badge from '../components/ui/Badge';
import kycService from '../services/kycService';
import './Verifications.css';
import '../components/ModalStyles.css';

export default function Verifications() {
    const [verifications, setVerifications] = useState([]);
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [viewingDocument, setViewingDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [pagination, setPagination] = useState({
        page: 0,
        size: 10, // Standard table size per snippet
        totalPages: 0,
        totalElements: 0
    });

    useEffect(() => {
        fetchVerifications();
    }, [filter, pagination.page]);

    const fetchVerifications = async () => {
        setLoading(true);
        try {
            const data = await kycService.listVerifications(
                { status: filter === 'all' ? null : filter.toUpperCase() },
                { page: pagination.page, size: pagination.size }
            );
            if (data.success) {
                setVerifications(data.data.content);
                setPagination(prev => ({
                    ...prev,
                    totalPages: data.data.totalPages,
                    totalElements: data.data.totalElements
                }));
            }
        } catch (error) {
            console.error('Error fetching verifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusVariant = (status) => {
        const s = status?.toUpperCase();
        if (s === 'COMPLETED' || s === 'PASSED' || s === 'APPROVED') return 'success';
        if (s === 'FAILED' || s === 'REJECTED') return 'error';
        return 'warning'; // Pending/Processing
    };

    const getInitials = (first, last) => {
        return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'U';
    };

    const handleViewVerification = async (verification) => {
        try {
            const response = await kycService.getVerification(verification.verificationId);
            if (response.success) setSelectedVerification(response.data);
            else setSelectedVerification(verification);
        } catch (error) {
            setSelectedVerification(verification);
        }
    };

    const closeModal = () => setSelectedVerification(null);
    const handlePageChange = (p) => setPagination(prev => ({ ...prev, page: p }));

    return (
        <div className="verifications">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Verifications</h1>
                    <p className="page-subtitle">Manage and monitor identity verification requests.</p>
                </div>
                <div className="header-actions">
                    <button className="filters-btn">
                        <Download size={16} /> Export
                    </button>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="filters-btn"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Table Card */}
            <div className="verifications-container">
                {/* Card Header */}
                <div className="card-header">
                    <div className="card-title-group">
                        <span className="card-title">All requests</span>
                        <span className="count-badge">{pagination.totalElements} users</span>
                    </div>
                    {/* Could place search bar here */}
                </div>

                {/* Table */}
                <div className="scroll-container">
                    <table className="verifications-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Company</th>
                                <th>Reason</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="loading-state">Loading...</td></tr>
                            ) : verifications.map((v) => (
                                <tr key={v.verificationId}>
                                    {/* User Column (Avatar + Name + ID) */}
                                    <td>
                                        <div className="user-group">
                                            <div className="user-avatar">
                                                {getInitials(v.customerData?.firstName, v.customerData?.lastName)}
                                            </div>
                                            <div className="user-info">
                                                <span className="user-name">
                                                    {v.customerData?.firstName || 'Unknown'} {v.customerData?.lastName || ''}
                                                </span>
                                                <span className="user-sub">
                                                    {v.customerData?.email || v.customerData?.idNumber || v.verificationId.substring(0, 8)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Status Badge with Dot */}
                                    <td>
                                        <Badge variant={getStatusVariant(v.status)} dot={true}>
                                            {v.status}
                                        </Badge>
                                    </td>

                                    {/* Company Text */}
                                    <td className="text-secondary">
                                        {v.companyName || '-'}
                                    </td>

                                    {/* Reason (Own Cell) */}
                                    <td className="text-secondary">
                                        {v.failureReason ? (
                                            <span className="error-text">{v.failureReason}</span>
                                        ) : (
                                            <span>{v.overallDecision || '-'}</span>
                                        )}
                                    </td>

                                    {/* Date */}
                                    <td className="text-tertiary">
                                        {formatDate(v.createdAt)}
                                    </td>

                                    {/* Actions */}
                                    <td>
                                        <div className="icon-btn-group">
                                            <button className="icon-btn" onClick={() => handleViewVerification(v)} title="View Details">
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        disabled={pagination.page === 0}
                        onClick={() => handlePageChange(pagination.page - 1)}
                    >
                        Previous
                    </button>
                    <span className="user-sub">Page {pagination.page + 1} of {pagination.totalPages}</span>
                    <button
                        className="pagination-btn"
                        disabled={pagination.page >= pagination.totalPages - 1}
                        onClick={() => handlePageChange(pagination.page + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* MODAL */}
            {selectedVerification && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="professional-modal" style={{ maxWidth: '720px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
                        <div className="modal-scroll-content">
                            <div style={{ marginBottom: '20px' }}>
                                <h2 className="modal-title">Verification Details</h2>
                                <p className="modal-subtitle">ID: {selectedVerification.verificationId}</p>
                            </div>

                            {selectedVerification.status && (
                                <div style={{ marginBottom: '24px' }}>
                                    <Badge variant={getStatusVariant(selectedVerification.status)} size="md" dot={true}>
                                        {selectedVerification.status}
                                    </Badge>
                                </div>
                            )}

                            <div className="modal-section">
                                <div className="section-title">Customer Information</div>
                                <div className="info-grid">
                                    {selectedVerification.customerData && Object.entries(selectedVerification.customerData).map(([k, v]) => (
                                        <div key={k} className="info-row">
                                            <span className="info-label" style={{ textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="info-value">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedVerification.failureReason && (
                                <div className="error-section">
                                    <div className="section-title">Failure Reason</div>
                                    <p className="error-text">{selectedVerification.failureReason}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {viewingDocument && (
                <DocumentViewer
                    imageUrl={viewingDocument.url}
                    filename={viewingDocument.filename}
                    onClose={() => setViewingDocument(null)}
                />
            )}
        </div>
    );
}
