import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import craMockApi from '../../services/craMockApi';

const LEVEL_BADGE = { LOW: 'ok', MEDIUM: 'warn', HIGH: 'bad' };
const DECISION_LABEL = { AUTO_CLEARED: 'Auto-cleared', MANUAL_REVIEW: 'Manual review', FORCED_HIGH: 'Forced HIGH (override)' };
const DECISION_BADGE = { AUTO_CLEARED: 'ok', MANUAL_REVIEW: 'warn', FORCED_HIGH: 'bad' };

export default function Assessments() {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        craMockApi.listAssessments().then((res) => setRows(res.data));
    }, []);

    const filtered = rows.filter((r) => r.subject.toLowerCase().includes(search.toLowerCase()) || r.company.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Assessments</h1>
                    <p>Every risk assessment run against an active model, with the score and decision it produced.</p>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-input">
                    <Search size={15} />
                    <input placeholder="Search by subject or company" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="input filter-select"><option>All levels</option></select>
                <select className="input filter-select"><option>All models</option></select>
            </div>

            <div className="table-card">
                <div className="card-head"><div><h3>Assessments</h3><div className="card-caption">· newest first</div></div></div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr><th>Subject</th><th>Company</th><th>Model</th><th>Score</th><th>Level</th><th>Decision</th><th>Created</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div className="name-primary">{r.subject}</div>
                                        <div className="name-secondary">{r.subjectType === 'INDIVIDUAL' ? 'Individual' : 'Business'}</div>
                                    </td>
                                    <td>{r.company}</td>
                                    <td className="mono">{r.modelVersion}</td>
                                    <td className="mono">{r.score}</td>
                                    <td><Badge kind={LEVEL_BADGE[r.level]}>{r.level}</Badge></td>
                                    <td><Badge kind={DECISION_BADGE[r.decision]}>{DECISION_LABEL[r.decision]}</Badge></td>
                                    <td>{r.createdAt}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
