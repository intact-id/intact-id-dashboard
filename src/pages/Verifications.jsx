import { useEffect, useRef, useState } from 'react';
import { Eye, Download, X, FileText } from 'lucide-react';
import DocumentViewer from '../components/ui/DocumentViewer';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import kycService from '../services/kycService';
import companyService from '../services/companyService';
import './Verifications.css';
import '../components/ModalStyles.css';

const STATUS_OPTIONS = ['all', 'SUBMITTED', 'PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'FAILED', 'COMPLETED', 'MANUAL_REVIEW'];
const TIER_OPTIONS = ['all', 'basic', 'standard', 'enhanced'];

export default function Verifications() {
    const { user } = useAuth();
    const [verifications, setVerifications] = useState([]);
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [viewingDocument, setViewingDocument] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingDocument, setLoadingDocument] = useState(false);
    const [inlinePreviews, setInlinePreviews] = useState({});
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tier: 'all',
        companyId: 'all',
        fromDate: '',
        toDate: ''
    });
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 0,
        size: 15,
        totalPages: 0,
        totalElements: 0
    });

    const isSuperAdmin = Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN');
    const [environment, setEnvironment] = useState('prod');
    const [isPolling, setIsPolling] = useState(false);
    const pollRef = useRef(null);
    const fetchRef = useRef(null);
    const selectedRef = useRef(null);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
        return () => clearTimeout(timeout);
    }, [filters.search]);

    useEffect(() => {
        fetchVerifications();
    }, [
        filters.status,
        filters.tier,
        filters.companyId,
        filters.fromDate,
        filters.toDate,
        debouncedSearch,
        pagination.page,
        pagination.size,
        environment
    ]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchCompanies();
        }
    }, [isSuperAdmin]);

    // Auto-poll every 5s — interval created once, refs keep it always current
    useEffect(() => {
        setIsPolling(true);
        pollRef.current = setInterval(() => {
            if (!selectedRef.current) {
                fetchRef.current(true);
            }
        }, 5000);

        return () => {
            clearInterval(pollRef.current);
            setIsPolling(false);
        };
    }, []);

    useEffect(() => {
        const loadInlinePreviews = async () => {
            if (!selectedVerification?.verificationId || !Array.isArray(selectedVerification.documents)) return;
            const imageDocs = selectedVerification.documents.filter(
                (doc) => typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/')
            );
            if (imageDocs.length === 0) return;

            const entries = await Promise.all(
                imageDocs.map(async (doc) => {
                    try {
                        const blob = await kycService.getDocumentBlob(selectedVerification.verificationId, doc.id);
                        return [doc.id, URL.createObjectURL(blob)];
                    } catch (previewError) {
                        return [doc.id, null];
                    }
                })
            );

            setInlinePreviews((prev) => {
                const next = { ...prev };
                entries.forEach(([id, url]) => {
                    if (url) next[id] = url;
                });
                return next;
            });
        };

        loadInlinePreviews();
    }, [selectedVerification?.verificationId, selectedVerification?.documents]);

    useEffect(() => {
        return () => {
            Object.values(inlinePreviews).forEach((url) => {
                if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, [inlinePreviews]);

    const fetchCompanies = async () => {
        try {
            const response = await companyService.getAllCompanies({}, { page: 0, size: 300 });
            if (response.success) {
                setCompanies(response.data.content || []);
            }
        } catch (fetchError) {
            console.error('Error fetching companies for filter:', fetchError);
        }
    };

    const toDateTimeStart = (date) => (date ? `${date}T00:00:00` : undefined);
    const toDateTimeEnd = (date) => (date ? `${date}T23:59:59` : undefined);

    const fetchVerifications = async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const data = await kycService.listVerifications(
                {
                    status: filters.status === 'all' ? null : filters.status,
                    tier: filters.tier === 'all' ? null : filters.tier,
                    companyId: isSuperAdmin && filters.companyId !== 'all' ? filters.companyId : null,
                    fromDate: toDateTimeStart(filters.fromDate),
                    toDate: toDateTimeEnd(filters.toDate),
                    search: debouncedSearch || null
                },
                { page: pagination.page, size: pagination.size },
                environment
            );
            if (data.success) {
                setVerifications(data.data.content || []);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: data.data.totalPages || 0,
                    totalElements: data.data.totalElements || 0
                }));
            }
        } catch (fetchError) {
            setError(fetchError.response?.data?.responseMessage || fetchError.message || 'Failed to load verifications');
            setVerifications([]);
        } finally {
            setLoading(false);
        }
    };

    // Keep refs pointing at latest values so the interval never goes stale
    fetchRef.current = fetchVerifications;
    selectedRef.current = selectedVerification;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusVariant = (status) => {
        const normalized = status?.toUpperCase();
        if (['COMPLETED', 'PASSED'].includes(normalized)) return 'success';
        if (['APPROVED'].includes(normalized)) return 'success';
        if (['FAILED', 'REJECTED'].includes(normalized)) return 'error';
        if (normalized === 'MANUAL_REVIEW') return 'info';
        return 'warning';
    };

    const getDecisionVariant = (decision) => {
        const normalized = decision?.toUpperCase();
        if (normalized === 'APPROVED') return 'success';
        if (normalized === 'REJECTED') return 'error';
        if (normalized === 'MANUAL_REVIEW') return 'info';
        return null;
    };

    const getInitials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'U';

    const handleViewVerification = async (verification) => {
        setLoadingDetails(true);
        try {
            const response = await kycService.getVerification(verification.verificationId, environment);
            if (response.success) {
                setSelectedVerification(response.data);
            } else {
                setSelectedVerification(verification);
            }
        } catch (fetchError) {
            setSelectedVerification(verification);
        } finally {
            setLoadingDetails(false);
        }
    };

    const openDocument = async (verificationId, doc) => {
        setLoadingDocument(true);
        try {
            const blob = await kycService.getDocumentBlob(verificationId, doc.id);
            const objectUrl = URL.createObjectURL(blob);
            setViewingDocument({
                url: objectUrl,
                filename: doc.originalFilename || doc.documentType || 'document',
                mimeType: doc.mimeType || ''
            });
        } catch (fetchError) {
            setError(fetchError.response?.data?.responseMessage || fetchError.message || 'Unable to open document');
        } finally {
            setLoadingDocument(false);
        }
    };

    const closeModal = () => {
        Object.values(inlinePreviews).forEach((url) => {
            if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        setInlinePreviews({});
        setSelectedVerification(null);
    };

    const updateFilter = (key, value) => {
        setPagination((prev) => ({ ...prev, page: 0 }));
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            tier: 'all',
            companyId: 'all',
            fromDate: '',
            toDate: ''
        });
        setDebouncedSearch('');
        setPagination((prev) => ({ ...prev, page: 0 }));
    };

    return (
        <div className="verifications">
            <div className="page-header">
                <div>
                    <h1>Verifications</h1>
                    <p className="page-subtitle">Manage and monitor identity verification requests.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="env-toggle">
                        <button
                            className={`env-toggle-btn${environment === 'prod' ? ' active' : ''}`}
                            onClick={() => { setEnvironment('prod'); setPagination((prev) => ({ ...prev, page: 0 })); }}
                        >
                            Production
                        </button>
                        <button
                            className={`env-toggle-btn${environment === 'dev' ? ' active' : ''}`}
                            onClick={() => { setEnvironment('dev'); setPagination((prev) => ({ ...prev, page: 0 })); }}
                        >
                            Development
                        </button>
                    </div>
                    <Button variant="secondary">
                        <Download size={16} /> Export
                    </Button>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <Card className="verifications-filters-card">
                <div className="verifications-filters">
                    <input
                        className="panel-input filter-search"
                        placeholder="Search by name, email, company, verification ID..."
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                    />
                    <select className="panel-input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status === 'all' ? 'All Status' : status.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    <select className="panel-input" value={filters.tier} onChange={(e) => updateFilter('tier', e.target.value)}>
                        {TIER_OPTIONS.map((tier) => (
                            <option key={tier} value={tier}>
                                {tier === 'all' ? 'All Tiers' : tier}
                            </option>
                        ))}
                    </select>
                    {isSuperAdmin && (
                        <select className="panel-input" value={filters.companyId} onChange={(e) => updateFilter('companyId', e.target.value)}>
                            <option value="all">All Companies</option>
                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>{company.legalName}</option>
                            ))}
                        </select>
                    )}
                    <input
                        className="panel-input"
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => updateFilter('fromDate', e.target.value)}
                    />
                    <input
                        className="panel-input"
                        type="date"
                        value={filters.toDate}
                        onChange={(e) => updateFilter('toDate', e.target.value)}
                    />
                    <Button size="sm" variant="secondary" onClick={resetFilters}>Reset</Button>
                </div>
            </Card>

            <div className="verifications-container">
                <div className="card-header">
                    <div className="card-title-group">
                        <span className="card-title">All requests</span>
                        <span className="count-badge">{pagination.totalElements} users</span>
                        {isPolling && (
                            <span className="polling-indicator" title="Auto-refreshing every 5s">
                                <span className="polling-dot" />
                                Live
                            </span>
                        )}
                    </div>
                </div>

                <div className="scroll-container">
                    <table className="verifications-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Type</th>
                                <th>Company</th>
                                <th>Decision</th>
                                <th>Files</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="loading-state">Loading...</td></tr>
                            ) : verifications.length === 0 ? (
                                <tr><td colSpan="8" className="empty-state">No verification records found</td></tr>
                            ) : verifications.map((v) => (
                                <tr key={v.verificationId}>
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
                                                    {v.customerData?.email || v.verificationId.substring(0, 10)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge variant={getStatusVariant(v.status)} dot={true}>
                                            {v.status?.replace(/_/g, ' ')}
                                        </Badge>
                                    </td>
                                    <td className="text-secondary">{v.verificationType || '-'}</td>
                                    <td className="text-secondary">{v.companyName || '-'}</td>
                                    <td>
                                        {v.overallDecision && getDecisionVariant(v.overallDecision)
                                            ? <Badge variant={getDecisionVariant(v.overallDecision)}>{v.overallDecision}</Badge>
                                            : <span className="text-secondary">{v.overallDecision || '-'}</span>
                                        }
                                    </td>
                                    <td className="text-secondary">
                                        {Array.isArray(v.documents) && v.documents.length > 0
                                            ? `${v.documents.length} file(s)`
                                            : 'No files'}
                                    </td>
                                    <td className="text-tertiary">{formatDate(v.createdAt)}</td>
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

                <div className="pagination-controls">
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={pagination.page === 0}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className="user-sub">Page {pagination.page + 1} of {Math.max(pagination.totalPages, 1)}</span>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={pagination.page >= pagination.totalPages - 1 || pagination.totalPages === 0}
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {selectedVerification && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="professional-modal verification-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
                        <div className="modal-scroll-content">
                            <div className="modal-top">
                                <h2 className="modal-title">Verification Details</h2>
                                <p className="modal-subtitle">ID: {selectedVerification.verificationId}</p>
                                <div className="modal-badges">
                                    <Badge variant={getStatusVariant(selectedVerification.status)} dot={true}>
                                        {selectedVerification.status?.replace(/_/g, ' ')}
                                    </Badge>
                                    {selectedVerification.overallDecision && getDecisionVariant(selectedVerification.overallDecision) && (
                                        <Badge variant={getDecisionVariant(selectedVerification.overallDecision)}>
                                            {selectedVerification.overallDecision}
                                        </Badge>
                                    )}
                                    <Badge variant="info">{selectedVerification.tier || 'N/A'}</Badge>
                                    <Badge variant="default">{selectedVerification.verificationType || 'individual'}</Badge>
                                </div>
                            </div>

                            {loadingDetails ? (
                                <div className="loading-state">Loading verification details...</div>
                            ) : (
                                <>
                                    <div className="modal-section">
                                        <div className="section-title">Summary</div>
                                        <div className="info-grid">
                                            <div className="info-row"><span className="info-label">Company</span><span className="info-value">{selectedVerification.companyName || '-'}</span></div>
                                            <div className="info-row"><span className="info-label">Verification Type</span><span className="info-value">{selectedVerification.verificationType || '-'}</span></div>
                                            <div className="info-row">
                                                <span className="info-label">Decision</span>
                                                <span className="info-value">
                                                    {selectedVerification.overallDecision && getDecisionVariant(selectedVerification.overallDecision)
                                                        ? <Badge variant={getDecisionVariant(selectedVerification.overallDecision)}>{selectedVerification.overallDecision}</Badge>
                                                        : selectedVerification.overallDecision || '-'
                                                    }
                                                </span>
                                            </div>
                                            <div className="info-row"><span className="info-label">Created</span><span className="info-value">{formatDate(selectedVerification.createdAt)}</span></div>
                                            <div className="info-row"><span className="info-label">Completed</span><span className="info-value">{formatDate(selectedVerification.completedAt)}</span></div>
                                            <div className="info-row"><span className="info-label">Risk Score</span><span className="info-value">{selectedVerification.riskScore ?? '-'}</span></div>
                                            <div className="info-row"><span className="info-label">Failure Reason</span><span className="info-value">{selectedVerification.failureReason || '-'}</span></div>
                                            <div className="info-row"><span className="info-label">Failure Description</span><span className="info-value">{selectedVerification.errorDetails || '-'}</span></div>
                                        </div>
                                    </div>

                                    <div className="modal-section">
                                        <div className="section-title">Customer Information</div>
                                        <div className="info-grid">
                                            {selectedVerification.customerData && Object.entries(selectedVerification.customerData).map(([key, value]) => (
                                                <div key={key} className="info-row">
                                                    <span className="info-label" style={{ textTransform: 'capitalize' }}>
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                    <span className="info-value">
                                                        {Array.isArray(value) && value.length === 3
                                                            ? `${String(value[0])}-${String(value[1]).padStart(2,'0')}-${String(value[2]).padStart(2,'0')}`
                                                            : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="modal-section">
                                        <div className="section-title">Uploaded Files</div>
                                        {selectedVerification.documents?.length ? (
                                            <div className="docs-list">
                                                {selectedVerification.documents.map((doc) => (
                                                    <div className="doc-row" key={doc.id}>
                                                        <div className="doc-preview">
                                                            {doc.mimeType?.startsWith('image/') && inlinePreviews[doc.id] ? (
                                                                <img
                                                                    src={inlinePreviews[doc.id]}
                                                                    alt={doc.originalFilename || doc.documentType || 'Document'}
                                                                    className="doc-thumb"
                                                                />
                                                            ) : (
                                                                <div className="doc-thumb-fallback">
                                                                    <FileText size={18} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="doc-main">
                                                            <div className="doc-name">{doc.originalFilename || doc.documentType || 'Document'}</div>
                                                            <div className="doc-meta">
                                                                Type: {(doc.documentType || 'unknown').replace(/_/g, ' ')}
                                                            </div>
                                                            <div className="doc-meta">
                                                                Format: {doc.mimeType || 'file'}
                                                            </div>
                                                            <div className="doc-meta">
                                                                Size: {doc.fileSize || 0} bytes
                                                            </div>
                                                            <div className="doc-meta">
                                                                Uploaded: {formatDate(doc.uploadedAt)}
                                                            </div>
                                                            {doc.extractedData && Object.keys(doc.extractedData).length > 0 && (
                                                                <div className="doc-ocr">
                                                                    <div className="doc-ocr-title">OCR Extracted Data</div>
                                                                    <div className="doc-ocr-grid">
                                                                        {[
                                                                            ['Document Type', doc.extractedData.document_type],
                                                                            ['Full Name', doc.extractedData.full_name],
                                                                            ['ID Number', doc.extractedData.id_number],
                                                                            ['Date of Birth', doc.extractedData.date_of_birth],
                                                                            ['Nationality', doc.extractedData.nationality],
                                                                            ['Expiry Date', doc.extractedData.expiry_date],
                                                                            ['Country', doc.extractedData.country_iso3],
                                                                            ['Confidence', doc.extractedData.overall_confidence != null
                                                                                ? `${Math.round(doc.extractedData.overall_confidence * 100)}%`
                                                                                : null],
                                                                        ].filter(([, v]) => v).map(([label, value]) => (
                                                                            <div className="doc-ocr-field" key={label}>
                                                                                <span className="doc-ocr-label">{label}</span>
                                                                                <span className="doc-ocr-value">{value}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="doc-actions">
                                                            <Button size="sm" variant="secondary" onClick={() => openDocument(selectedVerification.verificationId, doc)}>
                                                                View
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-tertiary">No files uploaded.</p>
                                        )}
                                    </div>

                                    <div className="modal-section">
                                        <div className="section-title">Verification Steps</div>
                                        {selectedVerification.steps?.length ? (
                                            <div className="steps-cards">
                                                {selectedVerification.steps.map((step, idx) => (
                                                    <div className="step-card" key={`${step.stepName}-${idx}`}>
                                                        <div className="step-card-header">
                                                            <span className="step-card-name">{(step.stepName || '-').replace(/_/g, ' ')}</span>
                                                            <div className="step-card-meta">
                                                                {step.confidenceScore != null && (
                                                                    <span className="step-confidence">{Math.round(step.confidenceScore * 100)}%</span>
                                                                )}
                                                                <Badge variant={getStatusVariant(step.status)}>{step.status || '-'}</Badge>
                                                            </div>
                                                        </div>
                                                        {step.result && Object.keys(step.result).length > 0 && (
                                                            <div className="step-card-result">
                                                                {step.stepName === 'face_match' && (
                                                                    <div className="step-detail-grid">
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Match Score</span>
                                                                            <span className="step-detail-value">{Math.round((step.result.match_score ?? 0) * 100)}%</span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Distance</span>
                                                                            <span className="step-detail-value">{step.result.distance?.toFixed(4)} / {step.result.threshold}</span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Verified</span>
                                                                            <span className={`step-detail-value ${step.result.verified ? 'text-success' : 'text-danger'}`}>
                                                                                {step.result.verified ? '✓ Yes' : '✗ No'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Metric</span>
                                                                            <span className="step-detail-value">{step.result.similarity_metric}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {step.stepName === 'liveness_detection' && (
                                                                    <div className="step-detail-grid">
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Liveness Score</span>
                                                                            <span className="step-detail-value">{step.result.liveness_score}/100</span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Face Detected</span>
                                                                            <span className={`step-detail-value ${step.result.checks?.face_detected ? 'text-success' : 'text-danger'}`}>
                                                                                {step.result.checks?.face_detected ? '✓' : '✗'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Single Face</span>
                                                                            <span className={`step-detail-value ${step.result.checks?.single_face ? 'text-success' : 'text-danger'}`}>
                                                                                {step.result.checks?.single_face ? '✓' : '✗'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Image Quality</span>
                                                                            <span className="step-detail-value">{step.result.checks?.image_quality}</span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Lighting</span>
                                                                            <span className="step-detail-value">{step.result.checks?.lighting}</span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Blur Score</span>
                                                                            <span className="step-detail-value">{step.result.checks?.blur_score?.toFixed(1)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {step.stepName === 'ocr_extraction' && (
                                                                    <div className="step-detail-grid">
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">ID Number Match</span>
                                                                            <span className={`step-detail-value ${step.result.id_number_match === true ? 'text-success' : step.result.id_number_match === false ? 'text-danger' : ''}`}>
                                                                                {step.result.id_number_match === true ? '✓ Match' : step.result.id_number_match === false ? '✗ Mismatch' : step.result.id_number_match}
                                                                            </span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">DOB Match</span>
                                                                            <span className={`step-detail-value ${step.result.dob_match === true ? 'text-success' : step.result.dob_match === false ? 'text-danger' : ''}`}>
                                                                                {step.result.dob_match === true ? '✓ Match' : step.result.dob_match === false ? '✗ Mismatch' : step.result.dob_match}
                                                                            </span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Name Similarity</span>
                                                                            <span className={`step-detail-value ${step.result.name_similarity >= 0.85 ? 'text-success' : 'text-warning'}`}>
                                                                                {step.result.name_similarity != null ? `${Math.round(step.result.name_similarity * 100)}%` : '-'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="step-detail-item">
                                                                            <span className="step-detail-label">Document Type</span>
                                                                            <span className="step-detail-value">{step.result.document_type?.replace(/_/g, ' ')}</span>
                                                                        </div>
                                                                        {step.result.failure_reasons && (
                                                                            <div className="step-detail-item step-detail-full">
                                                                                <span className="step-detail-label">Failures</span>
                                                                                <span className="step-detail-value text-danger">{step.result.failure_reasons.join(', ')}</span>
                                                                            </div>
                                                                        )}
                                                                        {step.result.warnings && (
                                                                            <div className="step-detail-item step-detail-full">
                                                                                <span className="step-detail-label">Warnings</span>
                                                                                <span className="step-detail-value text-warning">{step.result.warnings.join(', ')}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="step-card-time">{formatDate(step.executedAt)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-tertiary">No step history available.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {viewingDocument && (
                <DocumentViewer
                    imageUrl={viewingDocument.url}
                    filename={viewingDocument.filename}
                    mimeType={viewingDocument.mimeType}
                    onClose={() => {
                        if (viewingDocument.url?.startsWith('blob:')) {
                            URL.revokeObjectURL(viewingDocument.url);
                        }
                        setViewingDocument(null);
                    }}
                />
            )}

            {loadingDocument && <div className="document-loading-overlay">Opening document...</div>}
        </div>
    );
}
