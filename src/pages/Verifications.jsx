import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import './Verifications.css';

export default function Verifications() {
    const [verifications, setVerifications] = useState([]);
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchVerifications();
    }, []);

    const fetchVerifications = async () => {
        try {
            const response = await fetch('http://localhost:3001/verifications');
            const data = await response.json();
            setVerifications(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching verifications:', error);
            setLoading(false);
        }
    };

    const filteredVerifications = verifications.filter(v => {
        if (filter === 'all') return true;
        return v.status === filter;
    });

    const getStatusVariant = (status) => {
        const variants = {
            'passed': 'passed',
            'failed': 'failed',
            'pending': 'pending'
        };
        return variants[status] || 'default';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const closeModal = () => {
        setSelectedVerification(null);
    };

    if (loading) {
        return <div className="page-loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="verifications">
            <div className="page-header">
                <div>
                    <h1>Verifications</h1>
                    <p className="page-subtitle">View and manage all identity verification requests</p>
                </div>
            </div>

            <Card className="verifications-card">
                <div className="verifications-toolbar">
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${filter === 'all' ? 'filter-btn--active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All ({verifications.length})
                        </button>
                        <button
                            className={`filter-btn ${filter === 'passed' ? 'filter-btn--active' : ''}`}
                            onClick={() => setFilter('passed')}
                        >
                            Passed ({verifications.filter(v => v.status === 'passed').length})
                        </button>
                        <button
                            className={`filter-btn ${filter === 'failed' ? 'filter-btn--active' : ''}`}
                            onClick={() => setFilter('failed')}
                        >
                            Failed ({verifications.filter(v => v.status === 'failed').length})
                        </button>
                        <button
                            className={`filter-btn ${filter === 'pending' ? 'filter-btn--active' : ''}`}
                            onClick={() => setFilter('pending')}
                        >
                            Pending ({verifications.filter(v => v.status === 'pending').length})
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="verifications-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Country</th>
                                <th>Status</th>
                                <th>Confidence</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVerifications.map((verification) => (
                                <tr key={verification.id} className="table-row">
                                    <td className="verification-id">{verification.id}</td>
                                    <td className="verification-name">{verification.name}</td>
                                    <td className="verification-type">{verification.type}</td>
                                    <td>{verification.country}</td>
                                    <td>
                                        <Badge variant={getStatusVariant(verification.status)}>
                                            {verification.status}
                                        </Badge>
                                    </td>
                                    <td className="confidence-cell">
                                        {verification.confidence ? `${verification.confidence}%` : 'N/A'}
                                    </td>
                                    <td className="date-cell">{formatDate(verification.date)}</td>
                                    <td>
                                        <button
                                            className="view-btn"
                                            onClick={() => setSelectedVerification(verification)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Detail Modal */}
            {selectedVerification && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <Card variant="elevated">
                            <div className="modal-header">
                                <h2>Verification Details</h2>
                                <button className="modal-close" onClick={closeModal}>✕</button>
                            </div>

                            <div className="modal-body">
                                <div className="detail-row">
                                    <span className="detail-label">Verification ID:</span>
                                    <span className="detail-value mono">{selectedVerification.id}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Name:</span>
                                    <span className="detail-value">{selectedVerification.name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Status:</span>
                                    <Badge variant={getStatusVariant(selectedVerification.status)}>
                                        {selectedVerification.status}
                                    </Badge>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Type:</span>
                                    <span className="detail-value">{selectedVerification.type}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Method:</span>
                                    <span className="detail-value">{selectedVerification.method}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Country:</span>
                                    <span className="detail-value">{selectedVerification.country}</span>
                                </div>
                                {selectedVerification.confidence && (
                                    <div className="detail-row">
                                        <span className="detail-label">Confidence:</span>
                                        <span className="detail-value">{selectedVerification.confidence}%</span>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <span className="detail-label">Date:</span>
                                    <span className="detail-value">{formatDate(selectedVerification.date)}</span>
                                </div>

                                <div className="detail-section">
                                    <h3>Additional Details</h3>
                                    {selectedVerification.details && Object.entries(selectedVerification.details).map(([key, value]) => (
                                        <div key={key} className="detail-row">
                                            <span className="detail-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                            <span className="detail-value">{value?.toString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
