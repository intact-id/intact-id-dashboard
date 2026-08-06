import { useState, useEffect, useCallback } from 'react';
import Badge from '../components/ui/Badge';
import kycService from '../services/kycService';
import approvalService from '../services/approvalService';
import './Approvals.css';

export default function Approvals() {
    const [activeTab, setActiveTab] = useState('kyc');
    const [kycItems, setKycItems] = useState([]);
    const [kybItems, setKybItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewItem, setReviewItem] = useState(null);
    const [notes, setNotes] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0 });
    const [docBlobs, setDocBlobs] = useState({});
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'kyc') {
                const data = await kycService.getPendingReviews({ page: pagination.page, size: pagination.size });
                if (data.success) {
                    setKycItems(data.data.content);
                    setPagination(prev => ({ ...prev, totalPages: data.data.totalPages }));
                }
            } else {
                const data = await approvalService.getApplications(
                    { status: 'PENDING' },
                    { page: pagination.page, size: pagination.size }
                );
                if (data.success) {
                    setKybItems(data.data.content);
                    setPagination(prev => ({ ...prev, totalPages: data.data.totalPages }));
                }
            }
        } catch (e) {
            console.error('Error fetching approvals:', e);
        } finally {
            setLoading(false);
        }
    }, [activeTab, pagination.page, pagination.size]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openReview = async (item) => {
        setReviewItem(item);
        setNotes('');
        setDocBlobs({});
        if (item.documents) {
            const blobs = {};
            await Promise.all(item.documents.map(async (doc) => {
                try {
                    const blob = await kycService.getDocumentBlob(item.verificationId, doc.id);
                    blobs[doc.id] = URL.createObjectURL(blob);
                } catch (e) { /* silently skip */ }
            }));
            setDocBlobs(blobs);
        }
    };

    const closeReview = () => {
        Object.values(docBlobs).forEach(url => URL.revokeObjectURL(url));
        setReviewItem(null);
        setDocBlobs({});
        setNotes('');
    };

    const handleDecision = async (decision) => {
        if (!reviewItem) return;
        setActionLoading(true);
        try {
            if (activeTab === 'kyc') {
                await kycService.resolveReview(reviewItem.verificationId, decision, notes);
            } else {
                const id = reviewItem.approvalId || reviewItem.id;
                await approvalService.checkerDecision(id, decision === 'approved' ? 'APPROVE' : 'REJECT', notes || `${decision} via Dashboard`);
            }
            showToast(`Successfully ${decision}.`);
            closeReview();
            fetchData();
        } catch (e) {
            showToast('Failed: ' + (e.response?.data?.responseMessage || e.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const fmt = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const fmtDob = (val) => {
        if (!val) return '—';
        if (Array.isArray(val) && val.length === 3) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`;
        return String(val);
    };

    return (
        <div className="approvals">
            <div className="page-header">
                <div>
                    <h1>Approvals</h1>
                    <p className="page-subtitle">
                        {(activeTab === 'kyc' ? kycItems.length : kybItems.length)} pending {activeTab === 'kyc' ? 'KYC' : 'KYB'} requests
                    </p>
                </div>
            </div>

            <div className="approvals-tabs">
                <button className={`tab-btn ${activeTab === 'kyc' ? 'tab-btn--active' : ''}`}
                    onClick={() => { setActiveTab('kyc'); setPagination(p => ({ ...p, page: 0 })); }}>
                    KYC Reviews
                </button>
                <button className={`tab-btn ${activeTab === 'kyb' ? 'tab-btn--active' : ''}`}
                    onClick={() => { setActiveTab('kyb'); setPagination(p => ({ ...p, page: 0 })); }}>
                    KYB Requests
                </button>
            </div>

            {loading ? (
                <div className="loading-state"><div className="spinner" /><p>Loading...</p></div>
            ) : (
                <div className="approvals-container">
                    <table className="approvals-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>{activeTab === 'kyc' ? 'Name' : 'Company'}</th>
                                <th>Tier</th>
                                <th>Submitted</th>
                                <th>Risk</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'kyc' ? (
                                kycItems.length > 0 ? kycItems.map(item => (
                                    <tr key={item.verificationId}>
                                        <td className="mono">{item.verificationId?.substring(0, 12)}…</td>
                                        <td>{item.customerData?.firstName} {item.customerData?.lastName}</td>
                                        <td><span className="tier-badge">{item.tier}</span></td>
                                        <td>{fmt(item.createdAt)}</td>
                                        <td>
                                            <span className={`risk-score risk-score--${item.riskScore >= 0.7 ? 'high' : item.riskScore >= 0.4 ? 'medium' : 'low'}`}>
                                                {item.riskScore != null ? (item.riskScore * 100).toFixed(0) + '%' : '—'}
                                            </span>
                                        </td>
                                        <td><Badge variant="warning">{item.status}</Badge></td>
                                        <td>
                                            <button className="review-btn" onClick={() => openReview(item)}>Review →</button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="7" className="no-data">No pending KYC reviews</td></tr>
                            ) : (
                                kybItems.length > 0 ? kybItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="mono">{item.id?.substring(0, 12)}…</td>
                                        <td>{item.legalName}</td>
                                        <td>—</td>
                                        <td>{fmt(item.createdAt)}</td>
                                        <td>—</td>
                                        <td><Badge variant="warning">{item.status}</Badge></td>
                                        <td>
                                            <button className="review-btn" onClick={() => openReview(item)}>Review →</button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="7" className="no-data">No pending KYB requests</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== KYC REVIEW MODAL ===== */}
            {reviewItem && activeTab === 'kyc' && (
                <div className="review-overlay" onClick={closeReview}>
                    <div className="review-modal" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="review-modal-header">
                            <div>
                                <h2>KYC Manual Review</h2>
                                <span className="mono review-id">{reviewItem.verificationId}</span>
                            </div>
                            <div className="review-header-meta">
                                <span className="tier-badge">{reviewItem.tier?.toUpperCase()}</span>
                                {reviewItem.riskScore != null && (
                                    <span className={`risk-score risk-score--${reviewItem.riskScore >= 0.7 ? 'high' : reviewItem.riskScore >= 0.4 ? 'medium' : 'low'}`}>
                                        Risk: {(reviewItem.riskScore * 100).toFixed(0)}%
                                    </span>
                                )}
                                <button className="modal-close" onClick={closeReview}>✕</button>
                            </div>
                        </div>

                        <div className="review-modal-body">
                            {/* Documents row */}
                            {reviewItem.documents?.length > 0 && (
                                <div className="review-section">
                                    <h3 className="section-title">Documents</h3>
                                    <div className="doc-images-row">
                                        {reviewItem.documents.map(doc => (
                                            <div key={doc.id} className="doc-image-card">
                                                <div className="doc-image-label">{doc.documentType?.replace(/_/g, ' ').toUpperCase()}</div>
                                                {docBlobs[doc.id]
                                                    ? <img src={docBlobs[doc.id]} alt={doc.documentType} className="doc-image" />
                                                    : <div className="doc-image-placeholder">Loading…</div>
                                                }
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Data comparison */}
                            <div className="review-section">
                                <h3 className="section-title">Data Comparison</h3>
                                <div className="comparison-grid">
                                    {/* Submitted by customer */}
                                    <div className="comparison-col">
                                        <div className="comparison-col-header submitted">Submitted by Customer</div>
                                        <DataRow label="Full Name" value={`${reviewItem.customerData?.firstName || ''} ${reviewItem.customerData?.lastName || ''}`.trim()} />
                                        <DataRow label="Date of Birth" value={fmtDob(reviewItem.customerData?.dateOfBirth)} />
                                        <DataRow label="ID Number" value={reviewItem.customerData?.idNumber} />
                                        <DataRow label="ID Type" value={reviewItem.customerData?.idType} />
                                        <DataRow label="Nationality" value={reviewItem.customerData?.nationality} />
                                    </div>

                                    {/* OCR extracted from ID */}
                                    {(() => {
                                        const idDoc = reviewItem.documents?.find(d => d.documentType === 'id_front' || d.documentType === 'id_card');
                                        const ocr = idDoc?.extractedData;
                                        return (
                                            <div className="comparison-col">
                                                <div className="comparison-col-header ocr">Extracted by OCR</div>
                                                <DataRow label="Full Name" value={ocr?.full_name} highlight={compareField(reviewItem.customerData?.firstName + ' ' + reviewItem.customerData?.lastName, ocr?.full_name, 'fuzzy')} />
                                                <DataRow label="Date of Birth" value={ocr?.date_of_birth} highlight={compareField(fmtDob(reviewItem.customerData?.dateOfBirth), ocr?.date_of_birth, 'exact')} />
                                                <DataRow label="ID Number" value={ocr?.id_number} highlight={compareField(reviewItem.customerData?.idNumber, ocr?.id_number, 'exact')} />
                                                <DataRow label="Document Type" value={ocr?.document_type} />
                                                <DataRow label="Nationality" value={ocr?.nationality} />
                                                <DataRow label="Expiry Date" value={ocr?.expiry_date} />
                                                <DataRow label="OCR Confidence" value={ocr?.overall_confidence != null ? (ocr.overall_confidence * 100).toFixed(1) + '%' : null} />
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Verification steps */}
                            {reviewItem.steps?.length > 0 && (
                                <div className="review-section">
                                    <h3 className="section-title">Verification Results</h3>
                                    <div className="steps-row">
                                        {reviewItem.steps.map(step => (
                                            <StepCard key={step.stepName} step={step} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes + actions */}
                            <div className="review-section review-actions-section">
                                <textarea
                                    className="review-notes"
                                    placeholder="Add review notes (optional)…"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={3}
                                />
                                <div className="action-buttons">
                                    <button className="btn-reject" onClick={() => handleDecision('rejected')} disabled={actionLoading}>
                                        {actionLoading ? '…' : 'Reject'}
                                    </button>
                                    <button className="btn-approve" onClick={() => handleDecision('approved')} disabled={actionLoading}>
                                        {actionLoading ? '…' : 'Approve'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KYB review modal — simple */}
            {reviewItem && activeTab === 'kyb' && (
                <div className="review-overlay" onClick={closeReview}>
                    <div className="review-modal review-modal--sm" onClick={e => e.stopPropagation()}>
                        <div className="review-modal-header">
                            <div>
                                <h2>KYB Review</h2>
                                <span className="mono review-id">{reviewItem.id}</span>
                            </div>
                            <button className="modal-close" onClick={closeReview}>✕</button>
                        </div>
                        <div className="review-modal-body">
                            <div className="review-section">
                                <h3 className="section-title">Company Details</h3>
                                <DataRow label="Legal Name" value={reviewItem.legalName} />
                                <DataRow label="Registration Number" value={reviewItem.registrationNumber} />
                                <DataRow label="Trading Name" value={reviewItem.tradingName} />
                                <DataRow label="Submitted" value={fmt(reviewItem.createdAt)} />
                            </div>
                            <div className="review-section review-actions-section">
                                <textarea className="review-notes" placeholder="Notes…" value={notes}
                                    onChange={e => setNotes(e.target.value)} rows={3} />
                                <div className="action-buttons">
                                    <button className="btn-reject" onClick={() => handleDecision('rejected')} disabled={actionLoading}>
                                        {actionLoading ? '…' : 'Reject'}
                                    </button>
                                    <button className="btn-approve" onClick={() => handleDecision('approved')} disabled={actionLoading}>
                                        {actionLoading ? '…' : 'Approve'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="notification-toast" style={{
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: toast.type === 'success' ? '#10b981' : '#ef4444'
                }}>
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)}>×</button>
                </div>
            )}
        </div>
    );
}

function DataRow({ label, value, highlight }) {
    const display = value != null && value !== '' ? String(value) : '—';
    return (
        <div className="data-row">
            <span className="data-label">{label}</span>
            <span className={`data-value ${highlight === 'match' ? 'match' : highlight === 'mismatch' ? 'mismatch' : ''}`}>
                {display}
            </span>
        </div>
    );
}

function StepCard({ step }) {
    const r = step.result || {};
    const passed = step.status === 'COMPLETED' || step.status === 'passed';
    const skipped = step.status === 'skipped';

    return (
        <div className={`step-result-card ${passed ? 'passed' : skipped ? 'skipped' : 'failed'}`}>
            <div className="step-result-header">
                <span className="step-result-name">{step.stepName?.replace(/_/g, ' ')}</span>
                <span className={`step-result-badge ${passed ? 'badge-passed' : skipped ? 'badge-skipped' : 'badge-failed'}`}>
                    {passed ? '✓ Passed' : skipped ? '— Skipped' : '✗ Failed'}
                </span>
            </div>
            <div className="step-result-details">
                {step.stepName === 'face_match' && <>
                    <MiniRow label="Match Score" value={r.match_score != null ? (r.match_score * 100).toFixed(1) + '%' : null} />
                    <MiniRow label="Distance" value={r.distance?.toFixed(4)} />
                    <MiniRow label="Threshold" value={r.threshold?.toFixed(4)} />
                    <MiniRow label="Metric" value={r.similarity_metric} />
                </>}
                {step.stepName === 'liveness_detection' && <>
                    <MiniRow label="Liveness Score" value={r.liveness_score != null ? r.liveness_score + '/100' : null} />
                    {r.checks && Object.entries(r.checks).map(([k, v]) => (
                        <MiniRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
                    ))}
                    {r.issues?.length > 0 && <MiniRow label="Issues" value={r.issues.join(', ')} />}
                </>}
                {step.stepName === 'ocr_extraction' && <>
                    <MiniRow label="ID Match" value={String(r.id_number_match)} />
                    <MiniRow label="DOB Match" value={String(r.dob_match)} />
                    <MiniRow label="Name Similarity" value={r.name_similarity != null ? (r.name_similarity * 100).toFixed(0) + '%' : null} />
                    {r.failure_reasons?.length > 0 && <MiniRow label="Failures" value={r.failure_reasons.join(', ')} danger />}
                    {r.warnings?.length > 0 && <MiniRow label="Warnings" value={r.warnings.join(', ')} warn />}
                </>}
                {step.confidenceScore != null && (
                    <MiniRow label="Confidence" value={(step.confidenceScore * 100).toFixed(1) + '%'} />
                )}
            </div>
        </div>
    );
}

function MiniRow({ label, value, danger, warn }) {
    if (value == null || value === 'null' || value === 'undefined') return null;
    return (
        <div className="mini-row">
            <span className="mini-label">{label}</span>
            <span className={`mini-value ${danger ? 'text-danger' : warn ? 'text-warn' : ''}`}>{value}</span>
        </div>
    );
}

function compareField(submitted, ocr, mode) {
    if (!submitted || !ocr) return null;
    const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    if (mode === 'exact') {
        return norm(submitted) === norm(ocr) ? 'match' : 'mismatch';
    }
    // fuzzy — basic starts-with or contains check
    const a = norm(submitted), b = norm(ocr);
    return (a.includes(b) || b.includes(a) || a.split(' ').some(w => b.includes(w))) ? 'match' : 'mismatch';
}
