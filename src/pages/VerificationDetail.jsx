import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, Shield, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../contexts/ToastContext';
import './VerificationDetail.css';

export default function VerificationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [verification, setVerification] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchVerificationDetail();
    }, [id]);

    const fetchVerificationDetail = async () => {
        try {
            const [verResponse, docsResponse] = await Promise.all([
                fetch(`http://localhost:3001/verifications?id=${id}`),
                fetch(`http://localhost:3001/documents?userId=${id}`)
            ]);

            const verData = await verResponse.json();
            const docsData = await docsResponse.json();

            if (verData.length > 0) {
                setVerification(verData[0]);
                setDocuments(docsData);
            }
        } catch (error) {
            toast.error('Failed to load verification details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'passed': return CheckCircle;
            case 'failed': return XCircle;
            case 'pending': return AlertCircle;
            default: return Clock;
        }
    };

    const getRiskLevel = (confidence) => {
        if (confidence >= 90) return { level: 'Low', color: 'success' };
        if (confidence >= 70) return { level: 'Medium', color: 'warning' };
        return { level: 'High', color: 'error' };
    };

    const timeline = [
        { time: '14:23:45', event: 'Verification Completed', status: 'completed' },
        { time: '14:23:12', event: 'Biometric Analysis', status: 'completed' },
        { time: '14:22:58', event: 'Document Validation', status: 'completed' },
        { time: '14:22:30', event: 'Liveness Check', status: 'completed' },
        { time: '14:22:15', event: 'Document Uploaded', status: 'completed' },
        { time: '14:22:00', event: 'Verification Started', status: 'completed' }
    ];

    if (loading) {
        return (
            <div className="verification-detail-page">
                <Skeleton count={10} height="60px" />
            </div>
        );
    }

    if (!verification) {
        return (
            <div className="verification-detail-page">
                <Card>
                    <div className="empty-detail">
                        <Shield size={64} />
                        <h2>Verification Not Found</h2>
                        <Button onClick={() => navigate('/dashboard/verifications')}>
                            Back to Verifications
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const StatusIcon = getStatusIcon(verification.status);
    const risk = verification.confidence ? getRiskLevel(verification.confidence) : null;

    return (
        <div className="verification-detail-page">
            <div className="detail-header">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard/verifications')}
                    className="back-btn"
                >
                    <ArrowLeft size={18} />
                    Back
                </Button>
                <div className="detail-title-section">
                    <h1 className="detail-title">{verification.id}</h1>
                    <Badge variant={verification.status === 'passed' ? 'success' : verification.status === 'failed' ? 'error' : 'warning'}>
                        {verification.status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            <div className="detail-grid">
                {/* User Profile Card */}
                <Card variant="glass" className="profile-card">
                    <div className="card-header-icon">
                        <User size={20} />
                        <h3>User Information</h3>
                    </div>
                    <div className="profile-info">
                        <div className="profile-avatar">
                            <User size={48} />
                        </div>
                        <div className="profile-details">
                            <div className="info-row">
                                <span className="info-label">Name</span>
                                <span className="info-value">{verification.name}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Country</span>
                                <span className="info-value">{verification.country}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Verification Type</span>
                                <span className="info-value">{verification.type}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Method</span>
                                <span className="info-value">{verification.method}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Date</span>
                                <span className="info-value">
                                    {new Date(verification.date).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Risk Score Card */}
                {verification.confidence && (
                    <Card variant="glass" className="risk-card">
                        <div className="card-header-icon">
                            <Shield size={20} />
                            <h3>Risk Assessment</h3>
                        </div>
                        <div className="risk-score-container">
                            <div className="risk-score-circle">
                                <svg className="risk-score-svg" viewBox="0 0 200 200">
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="80"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="20"
                                    />
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="80"
                                        fill="none"
                                        stroke={risk.color === 'success' ? '#10b981' : risk.color === 'warning' ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="20"
                                        strokeDasharray={`${verification.confidence * 5.03} ${502.65 - verification.confidence * 5.03}`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 100 100)"
                                    />
                                </svg>
                                <div className="risk-score-value">
                                    {verification.confidence}%
                                </div>
                            </div>
                            <div className="risk-details">
                                <div className="risk-level">
                                    Risk Level: <Badge variant={risk.color}>{risk.level}</Badge>
                                </div>
                                {verification.details.faceMatch && (
                                    <div className="risk-metric">
                                        <span>Face Match</span>
                                        <span>{verification.details.faceMatch}%</span>
                                    </div>
                                )}
                                {verification.details.livenessCheck && (
                                    <div className="risk-metric">
                                        <span>Liveness Check</span>
                                        <Badge variant={verification.details.livenessCheck === 'passed' ? 'success' : 'error'}>
                                            {verification.details.livenessCheck}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Timeline Card */}
                <Card variant="glass" className="timeline-card">
                    <div className="card-header-icon">
                        <Clock size={20} />
                        <h3>Verification Timeline</h3>
                    </div>
                    <div className="timeline">
                        {timeline.map((item, index) => (
                            <div key={index} className="timeline-item">
                                <div className="timeline-marker">
                                    <div className="timeline-dot" />
                                    {index < timeline.length - 1 && <div className="timeline-line" />}
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-event">{item.event}</div>
                                    <div className="timeline-time">{item.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Documents Card */}
                <Card variant="glass" className="documents-card">
                    <div className="card-header-icon">
                        <FileText size={20} />
                        <h3>Associated Documents</h3>
                    </div>
                    {documents.length > 0 ? (
                        <div className="document-list">
                            {documents.map(doc => (
                                <div key={doc.id} className="document-item-mini">
                                    <FileText size={20} />
                                    <div className="document-mini-info">
                                        <span className="document-mini-type">{doc.type}</span>
                                        <span className="document-mini-number">{doc.documentNumber}</span>
                                    </div>
                                    <Badge variant={doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'error' : 'warning'}>
                                        {doc.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-documents">
                            <FileText size={32} />
                            <p>No documents associated</p>
                        </div>
                    )}
                </Card>

                {/* Status Details Card */}
                <Card variant="glass" className="status-card">
                    <div className="card-header-icon">
                        <StatusIcon size={20} />
                        <h3>Verification Details</h3>
                    </div>
                    <div className="status-details">
                        {verification.details.documentType && (
                            <div className="detail-item">
                                <span className="detail-label">Document Type</span>
                                <span className="detail-value">{verification.details.documentType}</span>
                            </div>
                        )}
                        {verification.details.reason && (
                            <div className="detail-item">
                                <span className="detail-label">Failure Reason</span>
                                <span className="detail-value error-text">{verification.details.reason}</span>
                            </div>
                        )}
                        {verification.details.reviewStatus && (
                            <div className="detail-item">
                                <span className="detail-label">Review Status</span>
                                <span className="detail-value">{verification.details.reviewStatus}</span>
                            </div>
                        )}
                        {verification.details.ageVerified !== undefined && (
                            <div className="detail-item">
                                <span className="detail-label">Age Verified</span>
                                <Badge variant={verification.details.ageVerified ? 'success' : 'error'}>
                                    {verification.details.ageVerified ? 'Yes' : 'No'}
                                </Badge>
                            </div>
                        )}
                        {verification.details.estimatedAge && (
                            <div className="detail-item">
                                <span className="detail-label">Estimated Age</span>
                                <span className="detail-value">{verification.details.estimatedAge} years</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
