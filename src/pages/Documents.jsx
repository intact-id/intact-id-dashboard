import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, UploadCloud, FileText } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import RowMenu from '../components/ui/RowMenu';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import documentService from '../services/documentService';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { can } from '../utils/access';
import { formatDate } from '../utils/format';

const STATUS_BADGE = { APPROVED: 'ok', PENDING_REVIEW: 'warn', EXPIRING: 'warn', EXPIRED: 'bad', REJECTED: 'bad', MISSING: 'bad' };
const STATUS_LABEL = {
    APPROVED: 'Approved', PENDING_REVIEW: 'Awaiting review', EXPIRING: 'Expiring soon',
    EXPIRED: 'Expired', REJECTED: 'Rejected', MISSING: 'Missing',
};
const NEEDS_ACTION = ['MISSING', 'REJECTED', 'EXPIRED', 'EXPIRING'];
const ACCEPT = 'application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024;

const daysUntil = (date) => Math.ceil((new Date(`${date}T00:00:00`) - new Date()) / 86400000);
const today = () => new Date().toISOString().slice(0, 10);

/** Why a row needs attention, in a line under its name. */
function noteFor(row) {
    const latest = row.latest;
    if (row.status === 'REJECTED') return `Rejected: ${latest.reviewNote}. Upload a corrected one.`;
    if (row.status === 'EXPIRING') return `Expires in ${daysUntil(latest.expiresOn)} days. Upload the renewed one.`;
    if (row.status === 'EXPIRED') return 'Expired. Upload the renewed one.';
    return null;
}

/**
 * The compliance documents a company keeps with Intact ID. The company uploads them (each upload is a new version);
 * Intact staff approve or reject them. Staff choose the company first.
 */
export default function Documents() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isStaff = !user?.companyId;
    const canUpload = can(user, 'documents.upload');
    const canReview = can(user, 'documents.review');

    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    const [upload, setUpload] = useState(null); // { type, file, expiresOn }
    const [history, setHistory] = useState(null); // a row
    const [rejecting, setRejecting] = useState(null); // { row, note }
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInput = useRef(null);

    const scope = isStaff ? companyId : undefined;

    useEffect(() => {
        if (!isStaff) return;
        companyService.list({ size: 100 }).then((p) => setCompanies(p.content)).catch(() => {});
    }, [isStaff]);

    const load = useCallback(async () => {
        if (isStaff && !companyId) return;
        setError('');
        try {
            setData(await documentService.overview(isStaff ? companyId : undefined));
        } catch (e) {
            setError(errorMessage(e, 'Could not load documents.'));
        }
    }, [isStaff, companyId]);

    useEffect(() => { setData(null); load(); }, [load]);

    const startUpload = (type, file) => {
        const first = data?.documents.find((d) => NEEDS_ACTION.includes(d.status));
        setUpload({ type: type || first?.type || data?.documents[0]?.type || '', file: file || null, expiresOn: '' });
    };

    const uploadType = data?.documents.find((d) => d.type === upload?.type);
    const uploadError = (() => {
        if (!upload) return '';
        if (!upload.file) return 'Choose a file.';
        if (!ACCEPT.split(',').includes(upload.file.type)) return 'Upload a PDF, JPG or PNG.';
        if (upload.file.size > MAX_BYTES) return 'Files can be up to 10 MB.';
        if (uploadType?.expires && !upload.expiresOn) return 'Enter the expiry date printed on the document.';
        return '';
    })();

    const submitUpload = async () => {
        setBusy(true);
        try {
            await documentService.upload(scope, upload);
            toast.success(`${uploadType?.label} uploaded. Intact ID will review it.`);
            setUpload(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not upload the document.'));
        } finally {
            setBusy(false);
        }
    };

    const download = async (version) => {
        try {
            await documentService.download(scope, version);
        } catch (e) {
            toast.error(errorMessage(e, 'Could not download the file.'));
        }
    };

    const review = async (row, decision, note) => {
        setBusy(true);
        try {
            await documentService.review(companyId, row.latest.id, decision, note);
            toast.success(`${row.label} ${decision === 'APPROVE' ? 'approved' : 'rejected'}`);
            setRejecting(null);
            await load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not record the review.'));
        } finally {
            setBusy(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && canUpload) startUpload(null, file);
    };

    const actionsFor = (row) => {
        const items = [];
        if (canUpload) items.push({ label: row.latest ? 'Upload new version' : 'Upload', onClick: () => startUpload(row.type) });
        if (row.latest) items.push({ label: 'Download', onClick: () => download(row.latest) });
        if (row.history.length > 1) items.push({ label: `Version history (${row.history.length})`, onClick: () => setHistory(row) });
        if (canReview && isStaff && row.latest?.status === 'PENDING_REVIEW') {
            items.push({ label: 'Approve', onClick: () => review(row, 'APPROVE') });
            items.push({ label: 'Reject', danger: true, onClick: () => setRejecting({ row, note: '' }) });
        }
        return items;
    };

    const rows = (data?.documents ?? []).filter((d) => {
        if (filter === 'needs-action') return NEEDS_ACTION.includes(d.status);
        if (filter === 'review') return d.status === 'PENDING_REVIEW';
        if (filter === 'approved') return d.status === 'APPROVED' || d.status === 'EXPIRING';
        return true;
    });
    const readiness = data?.readiness;
    const pct = readiness ? Math.round((readiness.approved / readiness.required) * 100) : 0;
    const companyName = companies.find((c) => c.id === companyId);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Documents</h1>
                    <p>{isStaff ? "Companies' compliance documents for onboarding and ongoing review." : 'Compliance files your team keeps with Intact ID for onboarding and ongoing review.'}</p>
                </div>
                {canUpload && data && (
                    <div className="head-actions">
                        <button className="btn btn--primary" onClick={() => startUpload()}><Upload size={15} /> Upload document</button>
                    </div>
                )}
            </div>

            {isStaff && (
                <div className="filter-bar">
                    <select className="input filter-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)} aria-label="Company">
                        <option value="">Choose a company</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                    </select>
                </div>
            )}

            {isStaff && !companyId ? (
                <div className="card"><div className="empty-state">Choose a company to see its documents.</div></div>
            ) : error ? (
                <div className="card"><div className="empty-state">{error}</div></div>
            ) : !data ? (
                <div className="loading-state">Loading documents…</div>
            ) : (
                <>
                    <div className="card readiness-card">
                        <div className="readiness-progress">
                            <span className="eyebrow">COMPLIANCE READINESS</span>
                            <div className="readiness-count">{readiness.approved} of {readiness.required} <span>required documents approved</span></div>
                            <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                            <p className="readiness-note">Intact ID reviews new uploads, usually within two business days.</p>
                        </div>
                        <div className="readiness-stats">
                            <div className="readiness-stat"><strong className="tone-accent">{readiness.approved}</strong><span>Approved</span></div>
                            <div className="readiness-stat"><strong>{readiness.awaitingReview}</strong><span>Awaiting review</span></div>
                            <div className="readiness-stat"><strong className="tone-danger">{readiness.actionNeeded}</strong><span>Action needed</span></div>
                        </div>
                    </div>

                    {canUpload && (
                        <div className={`card dropzone${dragging ? ' is-dragging' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                            <span className="dropzone-icon"><UploadCloud size={19} /></span>
                            <div className="dropzone-text">
                                <h3>Drag a file here to upload</h3>
                                <p>PDF, JPG or PNG · up to 10 MB · scanned copies must be legible</p>
                            </div>
                            <button className="btn btn--secondary" onClick={() => fileInput.current?.click()}>Browse files</button>
                            <input ref={fileInput} type="file" accept={ACCEPT} hidden
                                onChange={(e) => { if (e.target.files?.[0]) startUpload(null, e.target.files[0]); e.target.value = ''; }} />
                        </div>
                    )}

                    <div className="table-card">
                        <div className="card-head">
                            <div><h3>Required documents</h3>{isStaff && companyName && <div className="card-caption">· {companyName.tradingName || companyName.legalName}</div>}</div>
                            <div className="segmented">
                                {[['all', 'All'], ['needs-action', 'Needs action'], ['review', 'Awaiting review'], ['approved', 'Approved']].map(([key, label]) => (
                                    <button key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="table-scroll">
                            <table className="data-table">
                                <thead><tr><th>Document</th><th>Category</th><th>Status</th><th>Version</th><th>Expires</th><th>Uploaded by</th><th /></tr></thead>
                                <tbody>
                                    {rows.length === 0 ? <tr><td colSpan={7}><div className="empty-state">Nothing here.</div></td></tr> : rows.map((row) => {
                                        const note = noteFor(row);
                                        const latest = row.latest;
                                        return (
                                            <tr key={row.type}>
                                                <td>
                                                    <div className="name-cell">
                                                        <span className="doc-icon"><FileText size={15} /></span>
                                                        <div>
                                                            <div className="name-primary">{row.label}</div>
                                                            {note && <div className="name-secondary doc-note">{note}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{row.category}</td>
                                                <td><Badge kind={STATUS_BADGE[row.status]}>{STATUS_LABEL[row.status]}</Badge></td>
                                                <td className="mono">{latest ? `v${latest.version}` : '—'}</td>
                                                <td>{latest?.expiresOn ? formatDate(latest.expiresOn) : row.expires ? '—' : 'No expiry'}</td>
                                                <td>{latest ? <>{latest.uploadedBy}<div className="name-secondary">{formatDate(latest.uploadedAt)}</div></> : '—'}</td>
                                                <td><RowMenu items={actionsFor(row)} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <Modal isOpen={!!upload} onClose={() => setUpload(null)} title="Upload document"
                caption="Each upload is a new version. Intact ID reviews it before it counts as approved."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setUpload(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--primary" onClick={submitUpload} disabled={busy || !!uploadError}>{busy ? 'Uploading…' : 'Upload'}</button>
                    </>
                )}>
                {upload && (
                    <div className="form-grid">
                        <div className="field form-grid-full"><label>Document</label>
                            <select className="input" value={upload.type} onChange={(e) => setUpload({ ...upload, type: e.target.value })}>
                                {data?.documents.map((d) => <option key={d.type} value={d.type}>{d.label}{d.latest ? ` (now v${d.latest.version})` : ''}</option>)}
                            </select>
                        </div>
                        <div className="field form-grid-full"><label>File</label>
                            <input className="input" type="file" accept={ACCEPT} onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] || null })} />
                            {upload.file && <span className="name-secondary">{upload.file.name} · {(upload.file.size / 1024 / 1024).toFixed(1)} MB</span>}
                        </div>
                        {uploadType?.expires && (
                            <div className="field"><label>Expiry date</label>
                                <input className="input" type="date" min={today()} value={upload.expiresOn} onChange={(e) => setUpload({ ...upload, expiresOn: e.target.value })} />
                            </div>
                        )}
                        {uploadError && upload.file && <div className="field-error form-grid-full">{uploadError}</div>}
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!history} onClose={() => setHistory(null)} size="lg" title={history?.label} caption="Every version uploaded, newest first."
                footer={<button className="btn btn--secondary" onClick={() => setHistory(null)}>Close</button>}>
                {history && (
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead><tr><th>Version</th><th>File</th><th>Status</th><th>Uploaded</th><th>Reviewed</th><th /></tr></thead>
                            <tbody>
                                {history.history.map((v) => (
                                    <tr key={v.id}>
                                        <td className="mono">v{v.version}</td>
                                        <td>{v.fileName}</td>
                                        <td>
                                            <Badge kind={STATUS_BADGE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                                            {v.reviewNote && <div className="name-secondary">{v.reviewNote}</div>}
                                        </td>
                                        <td>{v.uploadedBy}<div className="name-secondary">{formatDate(v.uploadedAt)}</div></td>
                                        <td>{v.reviewedBy ? <>{v.reviewedBy}<div className="name-secondary">{formatDate(v.reviewedAt)}</div></> : '—'}</td>
                                        <td><button className="btn btn--ghost btn--sm" onClick={() => download(v)}>Download</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!rejecting} onClose={() => setRejecting(null)} title={`Reject ${rejecting?.row.label}?`}
                caption="The company sees this reason and uploads a corrected version."
                footer={(
                    <>
                        <button className="btn btn--secondary" onClick={() => setRejecting(null)} disabled={busy}>Cancel</button>
                        <button className="btn btn--danger-outline" onClick={() => review(rejecting.row, 'REJECT', rejecting.note.trim())}
                            disabled={busy || !rejecting?.note.trim()}>{busy ? 'Rejecting…' : 'Reject'}</button>
                    </>
                )}>
                {rejecting && (
                    <div className="field"><label>Reason</label>
                        <textarea className="input" rows={3} value={rejecting.note} autoFocus placeholder="e.g. The utility bill is older than three months"
                            onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })} />
                    </div>
                )}
            </Modal>
        </div>
    );
}
