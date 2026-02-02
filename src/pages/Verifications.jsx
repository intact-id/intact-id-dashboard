import { useState, useEffect } from 'react';
import { User, MapPin, FileText, Eye } from 'lucide-react';
import Badge from '../components/ui/Badge';
import DocumentViewer from '../components/ui/DocumentViewer';
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
        size: 20,
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

    const formatDuration = (start, end) => {
        if (!start || !end) return 'N/A';
        const diff = new Date(end) - new Date(start);
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getStatusVariant = (status) => {
        const statusMap = {
            'COMPLETED': 'success',
            'PASSED': 'success',
            'PENDING': 'warning',
            'PROCESSING': 'info',
            'FAILED': 'error',
            'REJECTED': 'error'
        };
        return statusMap[status] || 'default';
    };

    const getDecisionBadge = (decision) => {
        if (!decision) return null;
        const decisionMap = {
            'approved': { label: 'APPROVED', variant: 'success' },
            'rejected': { label: 'REJECTED', variant: 'error' },
            'review': { label: 'NEEDS REVIEW', variant: 'warning' },
            'error': { label: 'ERROR', variant: 'error' }
        };
        const config = decisionMap[decision.toLowerCase()] || { label: decision.toUpperCase(), variant: 'default' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const handleViewVerification = async (verification) => {
        try {
            // Fetch full verification details including documents
            const response = await kycService.getVerification(verification.verificationId);
            if (response.success) {
                setSelectedVerification(response.data);
            } else {
                // Fallback to table data if fetch fails
                setSelectedVerification(verification);
            }
        } catch (error) {
            console.error('Error fetching verification details:', error);
            // Fallback to table data
            setSelectedVerification(verification);
        }
    };

    const closeModal = () => setSelectedVerification(null);

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const stats = {
        total: verifications.length,
        completed: verifications.filter(v => v.status === 'COMPLETED').length,
        failed: verifications.filter(v => ['FAILED', 'REJECTED'].includes(v.status)).length,
        pending: verifications.filter(v => ['PENDING', 'PROCESSING'].includes(v.status)).length,
        tier1: verifications.filter(v => v.tier === 'tier1').length,
        tier2: verifications.filter(v => v.tier === 'tier2').length,
        tier3: verifications.filter(v => v.tier === 'tier3').length,
    };

    const successRate = stats.total > 0
        ? ((stats.completed / stats.total) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="verifications">
            <div className="page-header">
                <div>
                    <h1>Verifications</h1>
                    <p className="page-subtitle">
                        Real-time identity verification monitoring
                    </p>
                </div>
                <div className="filters">
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div>
                        <div className="stat-label">Total Verifications</div>
                        <div className="stat-value-large">{pagination.totalElements || stats.total}</div>
                    </div>
                    <div className="stat-subtext">
                        <span className="text-success">{stats.completed} Passed</span>
                        <span className="text-error">{stats.failed} Failed</span>
                        <span className="text-warning">{stats.pending} Pending</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div>
                        <div className="stat-label">Total Revenue</div>
                        <div className="stat-value-large">US$0.00</div>
                    </div>
                    <div className="stat-subtext">
                        Total revenue collected
                    </div>
                </div>

                <div className="stat-card">
                    <div>
                        <div className="stat-label">Tier Breakdown</div>
                        <div className="stat-value-large">{stats.tier1 + stats.tier2}</div>
                    </div>
                    <div className="stat-breakdown">
                        <div className="breakdown-item">
                            <span className="dot bg-blue-500"></span>
                            <span>T1: {stats.tier1}</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="dot bg-purple-500"></span>
                            <span>T2: {stats.tier2}</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="dot bg-pink-500"></span>
                            <span>T3: {stats.tier3}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div>
                        <div className="stat-label">Success Rate</div>
                        <div className="stat-value-large text-success">{successRate}%</div>
                    </div>
                    <div className="stat-subtext">
                        Transactions success rate
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading verifications...</p>
                </div>
            ) : (
                <div className="verifications-container">
                    <table className="verifications-table">
                        <thead>
                            <tr>
                                <th>Verification ID</th>
                                <th>Date & Time</th>
                                <th>User</th>
                                <th>Service</th>
                                <th>Tier</th>
                                <th>Risk Score</th>
                                <th>Region</th>
                                <th>Status</th>
                                <th>Decision</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {verifications.map((verification) => (
                                <tr key={verification.verificationId}>
                                    <td className="mono">{verification.verificationId.substring(0, 13)}...</td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">
                                                {new Date(verification.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-secondary">
                                                {new Date(verification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">
                                                {verification.customerData?.firstName} {verification.customerData?.lastName}
                                            </span>
                                            <span className="text-xs text-secondary mono">
                                                {verification.customerData?.idNumber || 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="uppercase text-xs font-medium text-secondary">
                                        {verification.verificationType}
                                    </td>
                                    <td>
                                        <span className="tier-badge">{verification.tier?.toUpperCase()}</span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span style={{
                                                color: verification.riskScore < 0.3 ? '#10B981' :
                                                    verification.riskScore < 0.7 ? '#F59E0B' : '#EF4444',
                                                fontWeight: 600
                                            }}>
                                                {(verification.riskScore * 100).toFixed(0)}%
                                            </span>
                                            <div style={{
                                                width: '40px',
                                                height: '4px',
                                                background: 'rgba(255,255,255,0.1)',
                                                borderRadius: '2px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${verification.riskScore * 100}%`,
                                                    height: '100%',
                                                    background: verification.riskScore < 0.3 ? '#10B981' :
                                                        verification.riskScore < 0.7 ? '#F59E0B' : '#EF4444'
                                                }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-white">
                                        {verification.customerData?.countryOfResidence || 'N/A'}
                                    </td>
                                    <td>
                                        <Badge variant={getStatusVariant(verification.status)}>
                                            {verification.status}
                                        </Badge>
                                    </td>
                                    <td>{getDecisionBadge(verification.overallDecision)}</td>
                                    <td>
                                        <button
                                            className="view-btn"
                                            onClick={() => handleViewVerification(verification)}
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && pagination.totalElements > 0 && (
                <div className="pagination-controls">
                    <div className="pagination-info">
                        Showing {pagination.page * pagination.size + 1} to {Math.min((pagination.page + 1) * pagination.size, pagination.totalElements)} of {pagination.totalElements} entries
                    </div>
                    <div className="pagination-buttons">
                        <button
                            className="pagination-btn"
                            disabled={pagination.page === 0}
                            onClick={() => handlePageChange(pagination.page - 1)}
                        >
                            Previous
                        </button>
                        <span className="pagination-current">
                            Page {pagination.page + 1} of {pagination.totalPages}
                        </span>
                        <button
                            className="pagination-btn"
                            disabled={pagination.page >= pagination.totalPages - 1}
                            onClick={() => handlePageChange(pagination.page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {selectedVerification && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="professional-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeModal}>×</button>

                        <div className="modal-scroll-content">
                            {/* Verification Summary */}
                            <div className="modal-section">
                                <h2 className="modal-title">Verification Summary</h2>
                                <p className="modal-subtitle">Quick overview</p>

                                <div className="summary-grid">
                                    <div className="summary-item">
                                        <label>Verification ID</label>
                                        <span className="value-primary">{selectedVerification.verificationId}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Status</label>
                                        <Badge variant={getStatusVariant(selectedVerification.status)}>
                                            {selectedVerification.status}
                                        </Badge>
                                    </div>
                                    <div className="summary-item">
                                        <label>Date & Time</label>
                                        <span>{formatDate(selectedVerification.createdAt)}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Decision</label>
                                        {getDecisionBadge(selectedVerification.overallDecision)}
                                    </div>
                                    <div className="summary-item">
                                        <label>Tier</label>
                                        <span className="tier-badge-large">{selectedVerification.tier?.toUpperCase()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <label>Type</label>
                                        <span>{selectedVerification.verificationType}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Progress */}
                            {selectedVerification.completedAt && (
                                <div className="modal-section">
                                    <h3 className="section-title">Verification Progress</h3>
                                    <div className="progress-timeline">
                                        <div className="timeline-item completed">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <p className="timeline-time">{formatDate(selectedVerification.createdAt)}</p>
                                                <p className="timeline-label">Verification initiated</p>
                                            </div>
                                        </div>
                                        {selectedVerification.completedAt && (
                                            <div className="timeline-item completed">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <p className="timeline-time">{formatDate(selectedVerification.completedAt)}</p>
                                                    <p className="timeline-label">
                                                        Verification {selectedVerification.overallDecision}
                                                        ({formatDuration(selectedVerification.createdAt, selectedVerification.completedAt)})
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Risk Assessment */}
                            {selectedVerification.riskScore !== null && (
                                <div className="modal-section">
                                    <h3 className="section-title">Risk Assessment</h3>
                                    <div className="metrics-grid">
                                        <div className="metric-card">
                                            <label>Risk Score</label>
                                            <div className="metric-value" style={{
                                                color: selectedVerification.riskScore < 0.3 ? '#22c55e' :
                                                    selectedVerification.riskScore < 0.7 ? '#f59e0b' : '#ef4444'
                                            }}>
                                                {(selectedVerification.riskScore * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="metric-card">
                                            <label>Risk Level</label>
                                            <div className="metric-value">
                                                {selectedVerification.riskScore < 0.3 ? 'LOW' :
                                                    selectedVerification.riskScore < 0.7 ? 'MEDIUM' : 'HIGH'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Personal Information */}
                            {selectedVerification.customerData && Object.keys(selectedVerification.customerData).length > 0 && (
                                <div className="modal-section">
                                    <div className="section-header-with-icon">
                                        <User size={20} className="section-icon" />
                                        <h3 className="section-title">Personal Information</h3>
                                    </div>
                                    <div className="info-grid">
                                        {selectedVerification.customerData.firstName && (
                                            <div className="info-row">
                                                <span className="info-label">Full Name</span>
                                                <span className="info-value">
                                                    {selectedVerification.customerData.firstName} {selectedVerification.customerData.lastName}
                                                </span>
                                            </div>
                                        )}
                                        {selectedVerification.customerData.dateOfBirth && (
                                            <div className="info-row">
                                                <span className="info-label">Date of Birth</span>
                                                <span className="info-value">
                                                    {new Date(selectedVerification.customerData.dateOfBirth).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        {selectedVerification.customerData.email && (
                                            <div className="info-row">
                                                <span className="info-label">Email</span>
                                                <span className="info-value">{selectedVerification.customerData.email}</span>
                                            </div>
                                        )}
                                        {selectedVerification.customerData.phone && (
                                            <div className="info-row">
                                                <span className="info-label">Phone Number</span>
                                                <span className="info-value">{selectedVerification.customerData.phone}</span>
                                            </div>
                                        )}
                                        {selectedVerification.customerData.nationality && (
                                            <div className="info-row">
                                                <span className="info-label">Nationality</span>
                                                <span className="info-value">{selectedVerification.customerData.nationality}</span>
                                            </div>
                                        )}
                                        {selectedVerification.customerData.countryOfResidence && (
                                            <div className="info-row">
                                                <span className="info-label">Country</span>
                                                <span className="info-value">{selectedVerification.customerData.countryOfResidence}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Document Verification - Enhanced Comparison View */}
                            {selectedVerification.documents && selectedVerification.documents.length > 0 && (
                                <div className="modal-section">
                                    <div className="section-header-with-icon">
                                        <FileText size={20} className="section-icon" />
                                        <h3 className="section-title">Document Verification</h3>
                                        <span className="section-subtitle">Compare photos for manual review</span>
                                    </div>

                                    {/* Main comparison: Selfie vs ID */}
                                    <div className="comparison-container">
                                        {/* Selfie */}
                                        {selectedVerification.documents.find(doc => doc.documentType === 'selfie') && (
                                            <div className="comparison-item">
                                                <div className="comparison-label">
                                                    <User size={16} />
                                                    <span>Live Selfie</span>
                                                </div>
                                                <div className="comparison-photo">
                                                    <img
                                                        src={kycService.getDocumentUrl(
                                                            selectedVerification.verificationId,
                                                            selectedVerification.documents.find(doc => doc.documentType === 'selfie').id
                                                        )}
                                                        alt="Selfie"
                                                        onClick={() => {
                                                            const doc = selectedVerification.documents.find(d => d.documentType === 'selfie');
                                                            setViewingDocument({
                                                                url: kycService.getDocumentUrl(selectedVerification.verificationId, doc.id),
                                                                filename: doc.originalFilename
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <div className="comparison-meta">
                                                    {formatDate(selectedVerification.documents.find(doc => doc.documentType === 'selfie').uploadedAt)}
                                                </div>
                                            </div>
                                        )}

                                        {/* ID Front */}
                                        {selectedVerification.documents.find(doc => doc.documentType === 'id_front') && (
                                            <div className="comparison-item">
                                                <div className="comparison-label">
                                                    <FileText size={16} />
                                                    <span>ID Document (Front)</span>
                                                </div>
                                                <div className="comparison-photo">
                                                    <img
                                                        src={kycService.getDocumentUrl(
                                                            selectedVerification.verificationId,
                                                            selectedVerification.documents.find(doc => doc.documentType === 'id_front').id
                                                        )}
                                                        alt="ID Front"
                                                        onClick={() => {
                                                            const doc = selectedVerification.documents.find(d => d.documentType === 'id_front');
                                                            setViewingDocument({
                                                                url: kycService.getDocumentUrl(selectedVerification.verificationId, doc.id),
                                                                filename: doc.originalFilename
                                                            });
                                                        }}
                                                    />
                                                </div>
                                                <div className="comparison-meta">
                                                    {formatDate(selectedVerification.documents.find(doc => doc.documentType === 'id_front').uploadedAt)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ID Back (if available) */}
                                    {selectedVerification.documents.find(doc => doc.documentType === 'id_back') && (
                                        <div className="secondary-document">
                                            <div className="comparison-label">
                                                <FileText size={16} />
                                                <span>ID Document (Back)</span>
                                            </div>
                                            <div className="secondary-photo">
                                                <img
                                                    src={kycService.getDocumentUrl(
                                                        selectedVerification.verificationId,
                                                        selectedVerification.documents.find(doc => doc.documentType === 'id_back').id
                                                    )}
                                                    alt="ID Back"
                                                    onClick={() => {
                                                        const doc = selectedVerification.documents.find(d => d.documentType === 'id_back');
                                                        setViewingDocument({
                                                            url: kycService.getDocumentUrl(selectedVerification.verificationId, doc.id),
                                                            filename: doc.originalFilename
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional Documents */}
                                    {selectedVerification.documents.filter(doc => !['selfie', 'id_front', 'id_back'].includes(doc.documentType)).length > 0 && (
                                        <div className="additional-documents">
                                            <h4 className="subsection-title">Additional Documents</h4>
                                            <div className="additional-docs-grid">
                                                {selectedVerification.documents
                                                    .filter(doc => !['selfie', 'id_front', 'id_back'].includes(doc.documentType))
                                                    .map((doc) => (
                                                        <div key={doc.id} className="additional-doc-card">
                                                            <div className="doc-preview">
                                                                <img
                                                                    src={kycService.getDocumentUrl(selectedVerification.verificationId, doc.id)}
                                                                    alt={doc.documentType}
                                                                    onClick={() => setViewingDocument({
                                                                        url: kycService.getDocumentUrl(selectedVerification.verificationId, doc.id),
                                                                        filename: doc.originalFilename
                                                                    })}
                                                                />
                                                            </div>
                                                            <div className="doc-info">
                                                                <span className="doc-type">
                                                                    {doc.documentType.replace(/_/g, ' ').toUpperCase()}
                                                                </span>
                                                                <span className="doc-date">{formatDate(doc.uploadedAt)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error Details */}
                            {selectedVerification.failureReason && (
                                <div className="modal-section error-section">
                                    <h3 className="section-title">Error Details</h3>
                                    <div className="info-rows">
                                        <div className="info-row">
                                            <span className="info-label">Failure Reason</span>
                                            <span className="info-value error-text">{selectedVerification.failureReason}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Identifiers */}
                            <div className="modal-section">
                                <h3 className="section-title">Identifiers</h3>
                                <div className="info-rows">
                                    <div className="info-row">
                                        <span className="info-label">Verification ID</span>
                                        <span className="info-value mono">{selectedVerification.verificationId}</span>
                                    </div>
                                    {selectedVerification.customerData?.idNumber && (
                                        <div className="info-row">
                                            <span className="info-label">ID Number</span>
                                            <span className="info-value mono">{selectedVerification.customerData.idNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer */}
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
