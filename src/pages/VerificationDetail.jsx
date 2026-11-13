import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, X, Check, ShieldQuestion, FileText, Image as ImageIcon, ExternalLink, PlayCircle } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import verificationService from '../services/verificationService';
import { errorMessage } from '../services/api';
import { hasAnyRole, isSuperAdmin } from '../utils/roles';
import { formatDate, formatDateTime, humanize, initialsOf } from '../utils/format';
import {
    STEP_STATUS, TYPE_LABEL, applicantName, decisionOf, maskId, riskOf, statusOf, stepLabel,
} from '../utils/verification';
import ReviewDecisionModal from './verifications/ReviewDecisionModal';
import TurnaroundPanel from './verifications/TurnaroundPanel';

const percent = (value) => (typeof value === 'number' ? `${Math.round(value <= 1 ? value * 100 : value)}%` : null);

// One line per step from what its result actually carries.
function stepSummary(step) {
    const r = step.result || {};
    if (step.errorMessage) return step.errorMessage;
    switch (step.stepName) {
        case 'ocr_extraction':
            return [r.document_type && humanize(r.document_type), percent(r.overall_confidence) && `read confidence ${percent(r.overall_confidence)}`]
                .filter(Boolean).join(' · ') || null;
        case 'face_match':
            return r.match_score !== undefined ? `Match score ${r.match_score}` : null;
        case 'liveness_detection':
            return r.passed === undefined ? null : r.passed ? 'Live person detected' : 'Liveness not confirmed';
        case 'sanctions_screening':
            return [r.verdict && humanize(r.verdict), r.hits !== undefined && `${r.hits} hits`, r.pep && 'PEP', r.adverse_media && 'adverse media']
                .filter(Boolean).join(' · ') || r.reason || null;
        case 'risk_assessment':
            return [r.level && `${humanize(r.level)} risk`, r.score !== undefined && `score ${r.score}`].filter(Boolean).join(' · ') || r.reason || null;
        default:
            return r.reason || null;
    }
}

const resultOf = (verification, stepName) => verification.steps?.find((s) => s.stepName === stepName)?.result || null;

function DocumentCard({ verificationId, doc }) {
    const { toast } = useToast();
    const isImage = doc.mimeType?.startsWith('image/');
    const [thumbnail, setThumbnail] = useState(null);

    useEffect(() => {
        if (!isImage) return;
        let url;
        verificationService.getDocument(verificationId, doc.id)
            .then((blob) => { url = URL.createObjectURL(blob); setThumbnail(url); })
            .catch(() => {});
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [verificationId, doc.id, isImage]);

    const open = async () => {
        try {
            const blob = await verificationService.getDocument(verificationId, doc.id);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error) {
            toast.error(errorMessage(error, 'Could not open the document.'));
        }
    };

    const size = doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB` : null;
    return (
        <button className="doc-card" onClick={open} title="Open document">
            <div className="doc-thumb">
                {thumbnail ? <img src={thumbnail} alt={humanize(doc.documentType)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : isImage ? <ImageIcon size={26} /> : <FileText size={26} />}
            </div>
            <div className="doc-card-meta">
                <div className="doc-name">{humanize(doc.documentType)}</div>
                <div className="doc-card-row">
                    <span className="doc-meta">{[size, doc.mimeType].filter(Boolean).join(' · ') || doc.originalFilename}</span>
                    <ExternalLink size={13} />
                </div>
            </div>
        </button>
    );
}

export default function VerificationDetail() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const environment = searchParams.get('env') === 'DEV' ? 'DEV' : 'PROD';
    const { user } = useAuth();
    const { toast } = useToast();
    const isStaff = hasAnyRole(user, ['ADMIN', 'SUPER_ADMIN']);
    const superAdmin = isSuperAdmin(user);

    const [v, setV] = useState(null);
    const [error, setError] = useState('');
    const [decision, setDecision] = useState(null);
    const [releasing, setReleasing] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            setV(await verificationService.get(id, environment));
        } catch (e) {
            setError(errorMessage(e, 'Could not load this verification.'));
        }
    }, [id, environment]);

    useEffect(() => { load(); }, [load]);

    const release = async () => {
        setReleasing(true);
        try {
            await verificationService.releaseHeld(v.verificationId);
            toast.success('Released for processing');
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not release the verification.'));
        } finally {
            setReleasing(false);
        }
    };

    if (error) {
        return (
            <div className="page">
                <Link to="/dashboard/verifications" className="back-link"><ArrowLeft size={15} /> Back to verifications</Link>
                <div className="card"><div className="empty-state">{error}</div></div>
            </div>
        );
    }
    if (!v) return <div className="page"><div className="loading-state">Loading verification…</div></div>;

    const name = applicantName(v);
    const data = v.customerData || {};
    const status = statusOf(v.status);
    const outcome = decisionOf(v.overallDecision);
    const risk = riskOf(v.riskScore);
    const review = v.review;
    const inReview = v.status === 'PENDING_APPROVAL';
    const cra = resultOf(v, 'risk_assessment');
    const screening = resultOf(v, 'sanctions_screening');

    const reviewedBy = review?.reviewedBy
        || (inReview ? 'Waiting for review' : v.completedAt ? 'Automated decision' : '—');

    return (
        <div className="page">
            <Link to="/dashboard/verifications" className="back-link"><ArrowLeft size={15} /> Back to verifications</Link>

            <div className="page-head">
                <div>
                    <h1>{name}</h1>
                    <div className="detail-subline">
                        <span className="mono">{v.verificationId}</span>
                        {v.externalReference && <><span>·</span><span className="mono">{v.externalReference}</span></>}
                        <span>·</span>
                        <span>Submitted {formatDateTime(v.createdAt)}</span>
                    </div>
                </div>
                <div className="head-actions">
                    {isStaff && v.status === 'ON_HOLD' && (
                        <button className="btn btn--secondary" onClick={release} disabled={releasing}>
                            <PlayCircle size={15} /> {releasing ? 'Releasing…' : 'Release for processing'}
                        </button>
                    )}
                    {isStaff && inReview && (
                        <>
                            <button className="btn btn--danger-outline" onClick={() => setDecision({ verificationId: v.verificationId, name, decision: 'rejected' })}>
                                <X size={15} /> Reject
                            </button>
                            <button className="btn btn--primary" onClick={() => setDecision({ verificationId: v.verificationId, name, decision: 'approved' })}>
                                <Check size={15} /> Approve
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="detail-stat-row">
                <div className="detail-stat"><span>Status</span><Badge kind={status.badge}>{status.label}</Badge></div>
                <div className="detail-stat"><span>Decision</span>{v.overallDecision ? <Badge kind={outcome.badge}>{outcome.label}</Badge> : <Badge kind="neutral">Pending</Badge>}</div>
                <div className="detail-stat"><span>Risk score</span>{risk ? <Badge kind={risk.badge}>{risk.level} · {risk.value}/100</Badge> : <Badge kind="neutral">—</Badge>}</div>
                <div className="detail-stat"><span>Type</span><Badge kind="neutral">{TYPE_LABEL[v.verificationType] || v.verificationType || '—'}</Badge></div>
                <div className="detail-stat"><span>Reviewed by</span><Badge kind="neutral">{reviewedBy}</Badge></div>
            </div>

            <div className="detail-body">
                <div className="detail-main">
                    <div className="card">
                        <div className="card-head">
                            <div>
                                <h3>Verification timeline</h3>
                                <div className="card-caption">{v.steps?.length ? `${v.steps.length} checks, in the order they ran` : 'No checks have run yet'}</div>
                            </div>
                        </div>
                        <div className="timeline-list">
                            {(v.steps || []).map((step, i) => {
                                const stepStatus = STEP_STATUS[step.status] || { label: humanize(step.status), badge: 'neutral' };
                                return (
                                    <div key={`${step.stepName}-${i}`} className="timeline-row">
                                        <span className="timeline-check">{i + 1}</span>
                                        <div className="timeline-text">
                                            <div className="timeline-name">{stepLabel(step.stepName)}</div>
                                            <div className="timeline-detail">{stepSummary(step) || (percent(step.confidenceScore) ? `Confidence ${percent(step.confidenceScore)}` : '—')}</div>
                                        </div>
                                        <span className="timeline-duration">{step.executedAt ? formatDateTime(step.executedAt).split(', ')[1] : ''}</span>
                                        <Badge kind={stepStatus.badge}>{stepStatus.label}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <div><h3>Documents</h3><div className="card-caption">{v.documents?.length || 0} files captured · click to open</div></div>
                        </div>
                        {v.documents?.length ? (
                            <div className="doc-grid">
                                {v.documents.map((doc) => <DocumentCard key={doc.id} verificationId={v.verificationId} doc={doc} />)}
                            </div>
                        ) : <div className="empty-state">No documents on this verification.</div>}
                    </div>

                    {isStaff && v.webhookDeliveries && (
                        <div className="table-card">
                            <div className="card-head"><div><h3>Webhook deliveries</h3><div className="card-caption">Events sent to {v.companyName || 'the company'} about this verification</div></div></div>
                            {v.webhookDeliveries.length === 0 ? <div className="empty-state">No webhook events were sent for this verification.</div> : (
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead><tr><th>Event</th><th>Status</th><th>Response</th><th>Retries</th><th>Sent</th></tr></thead>
                                        <tbody>
                                            {v.webhookDeliveries.map((d) => (
                                                <tr key={d.id}>
                                                    <td className="mono">{d.eventType}</td>
                                                    <td><Badge kind={{ DELIVERED: 'ok', FAILED: 'bad', RETRYING: 'warn' }[d.status] || 'neutral'}>{humanize(d.status)}</Badge></td>
                                                    <td className="mono">{d.httpStatusCode ?? '—'}</td>
                                                    <td>{d.retryCount ?? 0}</td>
                                                    <td>{formatDateTime(d.deliveredAt || d.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="detail-aside">
                    {superAdmin && <TurnaroundPanel verificationId={v.verificationId} version={`${v.status}-${v.overallDecision}`} />}
                    {isStaff && review && (review.reason || review.reviewedBy) && (
                        <div className={inReview ? 'note note--warn' : 'card'}>
                            {inReview ? (
                                <>
                                    <div className="note-head"><ShieldQuestion size={16} /><span>Waiting for manual review</span></div>
                                    <p>{review.reason || 'The automated checks could not decide.'}</p>
                                    <p>{review.assignedTo ? `Assigned to ${review.assignedTo}` : 'Not assigned'} · in queue since {formatDateTime(review.requestedAt)}</p>
                                </>
                            ) : (
                                <>
                                    <div className="card-head"><h3>Manual review</h3></div>
                                    <div className="kv-list">
                                        <div className="kv-row"><span>Why it was held</span><strong>{review.reason || '—'}</strong></div>
                                        <div className="kv-row"><span>Reviewed by</span><strong>{review.reviewedBy || '—'}</strong></div>
                                        <div className="kv-row"><span>Reviewed</span><strong>{formatDateTime(review.reviewedAt)}</strong></div>
                                        <div className="kv-row"><span>Notes</span><strong>{review.notes || '—'}</strong></div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="card">
                        <div className="card-head"><h3>Applicant</h3></div>
                        <div className="subject-head">
                            <span className="avatar avatar--light avatar--lg">{initialsOf(name)}</span>
                            <div>
                                <div className="name-primary">{name}</div>
                                <div className="name-secondary">{data.email || '—'}</div>
                            </div>
                        </div>
                        <div className="kv-list">
                            <div className="kv-row"><span>Phone</span><strong>{data.phone || '—'}</strong></div>
                            <div className="kv-row"><span>Date of birth</span><strong>{formatDate(data.dateOfBirth)}</strong></div>
                            <div className="kv-row"><span>Nationality</span><strong>{data.nationality || '—'}</strong></div>
                            <div className="kv-row"><span>Country of residence</span><strong>{data.countryOfResidence || '—'}</strong></div>
                            <div className="kv-row"><span>ID type</span><strong>{humanize(data.idType)}</strong></div>
                            <div className="kv-row"><span>ID number</span><strong className="mono">{maskId(data.idNumber)}</strong></div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head"><h3>Risk</h3></div>
                        <div className="risk-score-block">
                            <div className="risk-score-value">{risk ? `${risk.value} / 100` : '—'}</div>
                            {risk && <Badge kind={risk.badge} dot={false}>{risk.level}</Badge>}
                        </div>
                        <div className="kv-list">
                            <div className="kv-row"><span>Risk assessment (CRA)</span><strong>{cra?.level ? `${humanize(cra.level)}${cra.score !== undefined ? ` · ${cra.score}` : ''}` : 'Not run'}</strong></div>
                            <div className="kv-row"><span>Sanctions and PEP</span><strong>{screening?.verdict ? humanize(screening.verdict) : 'Not run'}</strong></div>
                            {screening && <div className="kv-row"><span>Adverse media</span><strong>{screening.adverse_media ? 'Hits found' : 'No hits'}</strong></div>}
                            {v.failureReason && <div className="kv-row"><span>Automated reason</span><strong>{v.failureReason}</strong></div>}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head"><h3>Request</h3></div>
                        <div className="kv-list">
                            <div className="kv-row"><span>Company</span><strong>{v.companyName || '—'}</strong></div>
                            <div className="kv-row"><span>Environment</span><strong>{v.environment === 'DEV' ? 'Sandbox' : v.environment === 'PROD' ? 'Production' : '—'}</strong></div>
                            <div className="kv-row"><span>Tier</span><strong>{v.tier || '—'}</strong></div>
                            <div className="kv-row"><span>Workflow</span><strong className="mono">{v.workflowId ? `${v.workflowId.slice(0, 8)} · v${v.workflowVersion ?? '?'}` : 'Standard checks'}</strong></div>
                            <div className="kv-row"><span>Completed</span><strong>{formatDateTime(v.completedAt)}</strong></div>
                        </div>
                    </div>
                </div>
            </div>

            <ReviewDecisionModal
                pending={decision}
                onClose={() => setDecision(null)}
                onResolved={() => { setDecision(null); load(); }}
            />
        </div>
    );
}
