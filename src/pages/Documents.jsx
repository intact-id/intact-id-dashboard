import { useEffect, useState } from 'react';
import { Download, Upload, UploadCloud, FileText } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { fetchDocuments } from '../services/mockApi';

const STATUS_BADGE = { approved: 'ok', expiring: 'warn', rejected: 'bad', missing: 'bad' };
const STATUS_LABEL = { approved: 'Approved', expiring: 'Expiring soon', rejected: 'Rejected', missing: 'Missing' };

export default function Documents() {
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchDocuments().then((res) => setData(res.data));
    }, []);

    if (!data) return <div className="page"><div className="loading-state">Loading documents…</div></div>;

    const rows = data.documents.filter((d) => {
        if (filter === 'all') return true;
        if (filter === 'needs-action') return d.status === 'rejected' || d.status === 'missing' || d.status === 'expiring';
        return d.status === 'approved';
    });
    const pct = Math.round((data.readiness.approved / data.readiness.of) * 100);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Documents</h1>
                    <p>Compliance files your team maintains for Intact ID onboarding and ongoing review.</p>
                </div>
                <div className="head-actions">
                    <button className="btn btn--secondary"><Download size={15} /> Bulk download</button>
                    <button className="btn btn--primary"><Upload size={15} /> Upload document</button>
                </div>
            </div>

            <div className="card readiness-card">
                <div className="readiness-progress">
                    <span className="eyebrow">COMPLIANCE READINESS</span>
                    <div className="readiness-count">{data.readiness.approved} of {data.readiness.of} <span>required documents approved</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                    <p className="readiness-note">New uploads are reviewed by your compliance team within two business days.</p>
                </div>
                <div className="readiness-stats">
                    <div className="readiness-stat"><strong className="tone-accent">{data.readiness.approved}</strong><span>Approved</span></div>
                    <div className="readiness-stat"><strong>{data.readiness.awaiting}</strong><span>Awaiting review</span></div>
                    <div className="readiness-stat"><strong className="tone-danger">{data.readiness.actionNeeded}</strong><span>Action needed</span></div>
                </div>
            </div>

            <div className="card dropzone">
                <span className="dropzone-icon"><UploadCloud size={19} /></span>
                <div className="dropzone-text">
                    <h3>Drag files here to upload</h3>
                    <p>PDF, JPG or PNG · up to 25 MB per file · scanned copies must be legible</p>
                </div>
                <button className="btn btn--secondary">Browse files</button>
            </div>

            <div className="table-card">
                <div className="card-head">
                    <div><h3>Required documents</h3><div className="card-caption">· Kestrel Capital</div></div>
                    <div className="segmented">
                        <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
                        <button className={filter === 'needs-action' ? 'is-active' : ''} onClick={() => setFilter('needs-action')}>Needs action</button>
                        <button className={filter === 'approved' ? 'is-active' : ''} onClick={() => setFilter('approved')}>Approved</button>
                    </div>
                </div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr><th>Document</th><th>Category</th><th>Status</th><th>Version</th><th>Expires</th><th>Updated by</th></tr>
                        </thead>
                        <tbody>
                            {rows.map((d) => (
                                <tr key={d.id}>
                                    <td>
                                        <div className="name-cell">
                                            <span className="doc-icon"><FileText size={15} /></span>
                                            <div>
                                                <div className="name-primary">{d.name}</div>
                                                {d.note && <div className="name-secondary doc-note">{d.note}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>{d.category}</td>
                                    <td><Badge kind={STATUS_BADGE[d.status]}>{STATUS_LABEL[d.status]}</Badge></td>
                                    <td className="mono">{d.version}</td>
                                    <td>{d.expires}</td>
                                    <td>{d.updatedBy}<div className="name-secondary">{d.updatedOn}</div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
