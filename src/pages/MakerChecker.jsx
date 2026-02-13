import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import approvalService from '../services/approvalService';
import Badge from '../components/ui/Badge';
import './MakerChecker.css';

const MAKER_QUEUE_STATUSES = ['SUBMITTED', 'PENDING', 'INFO_REQUESTED'];

export default function MakerChecker() {
    const { user } = useAuth();
    const [makerItems, setMakerItems] = useState([]);
    const [checkerItems, setCheckerItems] = useState([]);
    const [makerPage, setMakerPage] = useState(0);
    const [checkerPage, setCheckerPage] = useState(0);
    const [makerTotalPages, setMakerTotalPages] = useState(0);
    const [checkerTotalPages, setCheckerTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('maker');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [selectedItem, setSelectedItem] = useState(null);
    const [note, setNote] = useState('');
    const [endUserMessage, setEndUserMessage] = useState('');
    const [selectedMeta, setSelectedMeta] = useState({ mode: null, key: null });

    const isSuperAdmin = useMemo(
        () => Array.isArray(user?.roles) && user.roles.includes('SUPER_ADMIN'),
        [user?.roles]
    );

    useEffect(() => {
        if (!isSuperAdmin) {
            return;
        }
        fetchData();
    }, [isSuperAdmin, activeTab, makerPage, checkerPage]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'maker') {
                const responses = await Promise.allSettled(
                    MAKER_QUEUE_STATUSES.map(status =>
                        approvalService.getApplications({ status }, { page: makerPage, size: 10 })
                    )
                );

                const successfulResponses = responses
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);

                const allItems = successfulResponses.flatMap(r => r?.data?.content || []);
                const deduped = Array.from(new Map(allItems.map(item => [item.id, item])).values());
                setMakerItems(deduped);
                setMakerTotalPages(Math.max(...successfulResponses.map(r => r?.data?.totalPages || 0), 0));
            } else {
                const response = await approvalService.getPendingCheckerApprovals({ page: checkerPage, size: 10 });
                setCheckerItems(response?.data?.content || []);
                setCheckerTotalPages(response?.data?.totalPages || 0);
            }
        } catch (error) {
            setMessage(error.response?.data?.errorMessage || error.message || 'Failed to load data');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setSelectedItem(null);
        setSelectedMeta({ mode: null, key: null });
        setNote('');
        setEndUserMessage('');
    };

    const formatDateTime = (value) => value ? new Date(value).toLocaleString() : 'N/A';

    const selectItem = (item, mode, key) => {
        setSelectedItem(item);
        setSelectedMeta({ mode, key });
    };

    const handleMakerAction = async (item, performedByAction) => {
        setActionLoading(true);
        try {
            await approvalService.makerAction(item.id, {
                performedByAction,
                approverNote: note || undefined,
                endUserMessage: endUserMessage || undefined
            });
            setMessage(`Maker action ${performedByAction} submitted.`);
            setMessageType('success');
            clearForm();
            await fetchData();
        } catch (error) {
            setMessage(error.response?.data?.errorMessage || error.message || 'Maker action failed');
            setMessageType('error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckerDecision = async (item, finalAction) => {
        setActionLoading(true);
        try {
            await approvalService.checkerDecision(item.approvalId, {
                finalAction,
                approverNote: note || undefined,
                endUserMessage: endUserMessage || undefined
            });
            setMessage(`Checker action ${finalAction} submitted.`);
            setMessageType('success');
            clearForm();
            await fetchData();
        } catch (error) {
            setMessage(error.response?.data?.errorMessage || error.message || 'Checker action failed');
            setMessageType('error');
        } finally {
            setActionLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="maker-checker">
                <div className="page-header">
                    <h1>Maker Checker</h1>
                </div>
                <div className="restricted-card">
                    This page is restricted to `SUPER_ADMIN` users.
                </div>
            </div>
        );
    }

    return (
        <div className="maker-checker">
            <div className="maker-checker-header">
                <div>
                    <h1>Maker Checker</h1>
                    <p className="maker-checker-subtitle">Dual-control workflow for company application approvals</p>
                </div>
            </div>

            <div className="maker-checker-stats">
                <div className="mc-stat-card">
                    <span className="mc-stat-label">Active Queue</span>
                    <strong className="mc-stat-value">{activeTab === 'maker' ? 'Maker' : 'Checker'}</strong>
                </div>
                <div className="mc-stat-card">
                    <span className="mc-stat-label">Records</span>
                    <strong className="mc-stat-value">{activeTab === 'maker' ? makerItems.length : checkerItems.length}</strong>
                </div>
                <div className="mc-stat-card">
                    <span className="mc-stat-label">Page</span>
                    <strong className="mc-stat-value">
                        {activeTab === 'maker' ? makerPage + 1 : checkerPage + 1}
                    </strong>
                </div>
                <div className="mc-stat-card">
                    <span className="mc-stat-label">Selected</span>
                    <strong className="mc-stat-value">{selectedItem ? '1' : '0'}</strong>
                </div>
            </div>

            <div className="maker-checker-tabs">
                <button
                    className={`tab-btn ${activeTab === 'maker' ? 'tab-btn--active' : ''}`}
                    onClick={() => {
                        setActiveTab('maker');
                        clearForm();
                    }}
                >
                    Maker Queue
                </button>
                <button
                    className={`tab-btn ${activeTab === 'checker' ? 'tab-btn--active' : ''}`}
                    onClick={() => {
                        setActiveTab('checker');
                        clearForm();
                    }}
                >
                    Checker Queue
                </button>
            </div>

            {message && <div className={`action-message ${messageType}`}>{message}</div>}

            {loading ? (
                <div className="loading-state">Loading {activeTab} queue...</div>
            ) : (
                <div className="maker-checker-grid">
                    <div className="queue-panel card">
                        <div className="card__header">
                            <h3 className="card__title">{activeTab === 'maker' ? 'Maker Queue' : 'Checker Queue'}</h3>
                        </div>
                        <table className="queue-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Company</th>
                                    {activeTab === 'checker' && <th>Maker</th>}
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === 'maker' ? (
                                    makerItems.length > 0 ? makerItems.map(item => (
                                        <tr key={item.id} className={selectedMeta.mode === 'maker' && selectedMeta.key === item.id ? 'selected-row' : ''}>
                                            <td className="mono">{item.applicationNumber || item.id}</td>
                                            <td>{item.legalName}</td>
                                            <td><Badge variant="warning">{item.applicationStatus}</Badge></td>
                                            <td>{formatDateTime(item.createdAt)}</td>
                                            <td>
                                                <button className="review-btn" onClick={() => selectItem(item, 'maker', item.id)}>Review</button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="5" className="no-data">No maker items found</td></tr>
                                ) : (
                                    checkerItems.length > 0 ? checkerItems.map(item => (
                                        <tr key={item.approvalId} className={selectedMeta.mode === 'checker' && selectedMeta.key === item.approvalId ? 'selected-row' : ''}>
                                            <td className="mono">{item.applicationNumber || item.applicationId}</td>
                                            <td>{item.legalName}</td>
                                            <td>
                                                <div className="maker-cell">
                                                    <strong>{item.makerUsername || 'Unknown Maker'}</strong>
                                                    <span>{item.makerEmail || item.makerId || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td><Badge variant="warning">{item.applicationStatus || 'PENDING_APPROVAL'}</Badge></td>
                                            <td>{formatDateTime(item.submittedForApprovalAt)}</td>
                                            <td>
                                                <button className="review-btn" onClick={() => selectItem(item, 'checker', item.approvalId)}>Review</button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="6" className="no-data">No checker items found</td></tr>
                                )}
                            </tbody>
                        </table>

                        <div className="pagination-row">
                            {activeTab === 'maker' ? (
                                <>
                                    <button disabled={makerPage === 0} onClick={() => setMakerPage(p => Math.max(0, p - 1))}>Previous</button>
                                    <span>Page {makerPage + 1} of {Math.max(makerTotalPages, 1)}</span>
                                    <button disabled={makerPage + 1 >= makerTotalPages} onClick={() => setMakerPage(p => p + 1)}>Next</button>
                                </>
                            ) : (
                                <>
                                    <button disabled={checkerPage === 0} onClick={() => setCheckerPage(p => Math.max(0, p - 1))}>Previous</button>
                                    <span>Page {checkerPage + 1} of {Math.max(checkerTotalPages, 1)}</span>
                                    <button disabled={checkerPage + 1 >= checkerTotalPages} onClick={() => setCheckerPage(p => p + 1)}>Next</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="details-panel card">
                        {selectedItem ? (
                            <>
                                <div className="card__header">
                                    <h3 className="card__title">Application Details</h3>
                                </div>
                                <div className="details-grid">
                                    <div className="detail-line"><span>Company</span><strong>{selectedItem.legalName || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Application #</span><strong>{selectedItem.applicationNumber || selectedItem.id || selectedItem.applicationId}</strong></div>
                                    <div className="detail-line"><span>Application ID</span><strong className="mono">{selectedItem.id || selectedItem.applicationId || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Approval ID</span><strong className="mono">{selectedItem.approvalId || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Status</span><strong>{selectedItem.applicationStatus || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Business Type</span><strong>{selectedItem.businessType || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Registration #</span><strong>{selectedItem.registrationNumber || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Country</span><strong>{selectedItem.country || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Email</span><strong>{selectedItem.email || selectedItem.contactPersonEmail || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Phone</span><strong>{selectedItem.phone || selectedItem.contactPersonPhone || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Website</span><strong>{selectedItem.website || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Submitted</span><strong>{formatDateTime(selectedItem.createdAt || selectedItem.submittedForApprovalAt)}</strong></div>
                                    <div className="detail-line"><span>Contact Person</span><strong>{selectedItem.contactPersonName || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Contact Title</span><strong>{selectedItem.contactPersonTitle || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Maker ID</span><strong className="mono">{selectedItem.makerId || 'N/A'}</strong></div>
                                    <div className="detail-line"><span>Maker Action</span><strong>{selectedItem.makerAction || 'N/A'}</strong></div>
                                </div>
                                {selectedItem.makerNote && (
                                    <div className="note-box">
                                        <span>Maker Note</span>
                                        <p>{selectedItem.makerNote}</p>
                                    </div>
                                )}
                                {activeTab === 'checker' && (
                                    <div className="note-box maker-details-box">
                                        <span>Maker Details</span>
                                        <p>
                                            Username: {selectedItem.makerUsername || 'N/A'}{'\n'}
                                            Email: {selectedItem.makerEmail || 'N/A'}{'\n'}
                                            ID: {selectedItem.makerId || 'N/A'}
                                        </p>
                                    </div>
                                )}

                                <label>Approver Note</label>
                                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />

                                <label>End User Message</label>
                                <textarea value={endUserMessage} onChange={(e) => setEndUserMessage(e.target.value)} rows={3} />

                                <div className="action-buttons">
                                    {activeTab === 'maker' ? (
                                        <>
                                            <button disabled={actionLoading} className="btn approve" onClick={() => handleMakerAction(selectedItem, 'APPROVED')}>Submit For Checker</button>
                                            <button disabled={actionLoading} className="btn reject" onClick={() => handleMakerAction(selectedItem, 'REJECTED')}>Reject</button>
                                            <button disabled={actionLoading} className="btn info" onClick={() => handleMakerAction(selectedItem, 'INFO_REQUESTED')}>Request Info</button>
                                        </>
                                    ) : (
                                        <>
                                            <button disabled={actionLoading} className="btn approve" onClick={() => handleCheckerDecision(selectedItem, 'APPROVED')}>Final Approve</button>
                                            <button disabled={actionLoading} className="btn reject" onClick={() => handleCheckerDecision(selectedItem, 'REJECTED')}>Final Reject</button>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="empty-panel">Select an item to review and action.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
