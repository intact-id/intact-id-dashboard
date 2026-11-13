import { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { fetchAuditLogs } from '../services/mockApi';

export default function RequestLogs() {
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAuditLogs().then((res) => setData(res.data));
    }, []);

    if (!data) return <div className="page"><div className="loading-state">Loading audit logs…</div></div>;

    const rows = data.logs.filter((l) => l.path.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Audit logs</h1>
                    <p>Every API request and console action, retained for seven years.</p>
                </div>
                <div className="head-actions">
                    <button className="btn btn--secondary btn--sm"><Download size={15} /> Export</button>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-input">
                    <Search size={15} />
                    <input placeholder="Search endpoint path" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="input filter-select"><option>All users</option></select>
                <select className="input filter-select"><option>All companies</option></select>
                <select className="input filter-select"><option>All methods</option></select>
                <select className="input filter-select"><option>Status code</option></select>
                <select className="input filter-select"><option>Last 24 hours</option></select>
            </div>

            <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-card">
                    <div className="stat-card-head"><span>ACTIVITY</span></div>
                    <div className="stat-value">{data.totalActivity.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-head"><span>SESSIONS</span></div>
                    <div className="stat-value">{data.totalSessions}</div>
                </div>
            </div>

            <div className="table-card">
                <div className="card-head"><div><h3>Activity</h3><div className="card-caption">· newest first</div></div></div>
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr><th>User</th><th>Method</th><th>Path</th><th>Status</th><th>Duration</th><th>IP address</th><th>Time</th></tr>
                        </thead>
                        <tbody>
                            {rows.map((l, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="name-cell">
                                            <span className="avatar avatar--light">{l.initials}</span>
                                            <span className="name-primary">{l.user}</span>
                                        </div>
                                    </td>
                                    <td><span className={`method-tag method-tag--${l.method.toLowerCase()}`}>{l.method}</span></td>
                                    <td className="mono">{l.path}</td>
                                    <td><span className={`method-tag ${l.status < 300 ? 'method-tag--get' : l.status < 400 ? 'method-tag--post' : 'method-tag--delete'}`}>{l.status}</span></td>
                                    <td>{l.duration}</td>
                                    <td className="mono">{l.ip}</td>
                                    <td>{l.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
