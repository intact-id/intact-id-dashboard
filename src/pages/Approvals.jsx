import { useState, useEffect } from 'react';
import {
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    Filter,
    Plus,
    User,
    Calendar,
    Search,
    RefreshCw,
    MoreVertical,
    ChevronDown,
    FileText,
    CreditCard,
    Building2,
    Smartphone
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import './Approvals.css';

export default function Approvals() {
    const [activeTab, setActiveTab] = useState('kyc');
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChecklist, setSelectedChecklist] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [comment, setComment] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        fetchChecklists();
    }, []);

    const fetchChecklists = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/complianceChecklists');
            const data = await response.json();
            setChecklists(data);
        } catch (error) {
            toast.error('Failed to load compliance checklists');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckItem = (checklistId, itemId) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id === checklistId) {
                return {
                    ...checklist,
                    items: checklist.items.map(item => {
                        if (item.id === itemId) {
                            const isChecked = !item.checked;
                            return {
                                ...item,
                                checked: isChecked,
                                checkedBy: isChecked ? 'demo@intactid.com' : null,
                                checkedAt: isChecked ? new Date().toISOString() : null
                            };
                        }
                        return item;
                    })
                };
            }
            return checklist;
        }));
        toast.success('Item updated');
    };

    const handleApproveItem = (checklist, item) => {
        setSelectedChecklist(checklist);
        setSelectedItem(item);
        setIsApproveModalOpen(true);
    };

    const submitApproval = (approved) => {
        if (!comment.trim()) {
            toast.error('Please add a comment');
            return;
        }

        setChecklists(prev => prev.map(checklist => {
            if (checklist.id === selectedChecklist.id) {
                return {
                    ...checklist,
                    items: checklist.items.map(item => {
                        if (item.id === selectedItem.id) {
                            return {
                                ...item,
                                approved: approved,
                                approvedBy: approved ? 'demo@intactid.com' : null,
                                approvedAt: approved ? new Date().toISOString() : null
                            };
                        }
                        return item;
                    })
                };
            }
            return checklist;
        }));

        toast.success(approved ? 'Item approved' : 'Item rejected');
        setIsApproveModalOpen(false);
        setComment('');
        setSelectedItem(null);
    };

    const stats = {
        total: checklists.length,
        pending: checklists.filter(c => c.status === 'pending_review').length,
        approved: checklists.filter(c => c.status === 'approved').length,
        rejected: checklists.filter(c => c.status === 'rejected').length
    };

    const renderChecklistDetail = () => {
        if (!selectedChecklist) return null;

        return (
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title={selectedChecklist.title}
                size="lg"
            >
                <div className="checklist-detail">
                    <div className="detail-header-row">
                        <div className="detail-badges">
                            <span className={`status-badge ${selectedChecklist.status}`}>
                                {selectedChecklist.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <div className="meta-item">
                            <Calendar size={16} />
                            <span>Due {new Date(selectedChecklist.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4>Description</h4>
                        <p className="detail-description">{selectedChecklist.description}</p>
                    </div>

                    <div className="detail-section">
                        <h4>Checklist Items</h4>
                        <div className="checklist-items">
                            {selectedChecklist.items.map((item) => (
                                <div key={item.id} className={`checklist-item ${item.checked ? 'checked' : ''} ${item.approved ? 'approved' : ''}`}>
                                    <div className="item-main-row" onClick={(e) => {
                                        e.stopPropagation();
                                        if (!item.checked) handleCheckItem(selectedChecklist.id, item.id);
                                    }}>
                                        <div className="checkbox-wrapper">
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={() => { }}
                                                className="custom-checkbox"
                                            />
                                            <CheckCircle2 className="checkbox-icon" size={14} />
                                        </div>
                                        <div className="item-content">
                                            <div className="item-header">
                                                <h5 className="item-title">
                                                    {item.title}
                                                </h5>
                                                {item.required && <span className="required-badge">Required</span>}
                                            </div>
                                            <p className="item-description">{item.description}</p>
                                        </div>
                                    </div>

                                    {item.checked && (
                                        <div className="item-status-bar">
                                            <div className={`status-step ${item.checked ? 'completed' : ''}`}>
                                                <div className="step-icon">
                                                    <CheckCircle2 size={12} />
                                                </div>
                                                <div className="status-info">
                                                    <span className="status-label">Maker Check</span>
                                                    <span className="status-meta">
                                                        {item.checkedBy.split('@')[0]} • {new Date(item.checkedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`status-step ${item.approved ? 'completed' : 'active'}`}>
                                                <div className="step-icon">
                                                    {item.approved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                </div>
                                                <div className="status-info">
                                                    <span className="status-label">Checker Approval</span>
                                                    {item.approved ? (
                                                        <span className="status-meta">
                                                            {item.approvedBy.split('@')[0]} • {new Date(item.approvedAt).toLocaleDateString()}
                                                        </span>
                                                    ) : (
                                                        <span className="status-meta">Pending Review</span>
                                                    )}
                                                </div>
                                            </div>

                                            {!item.approved && (
                                                <button
                                                    className="approve-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApproveItem(selectedChecklist, item);
                                                    }}
                                                >
                                                    <ClipboardCheck size={16} />
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedChecklist.comments.length > 0 && (
                        <div className="detail-section">
                            <h4>Activity Log</h4>
                            <div className="comments-list">
                                {selectedChecklist.comments.map((cmt, idx) => (
                                    <div key={idx} className="comment-item">
                                        <div className="comment-avatar">
                                            {cmt.user.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="comment-content">
                                            <div className="comment-header">
                                                <span className="comment-author">{cmt.user.split('@')[0]}</span>
                                                <span className="comment-time">
                                                    {new Date(cmt.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="comment-text">{cmt.comment}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        );
    };

    const renderKYCTable = () => (
        <>
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Applications</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="stat-icon-wrapper total">
                        <User size={20} />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">{stats.pending}</span>
                    </div>
                    <div className="stat-icon-wrapper pending">
                        <Clock size={20} />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Approved</span>
                        <span className="stat-value">{stats.approved}</span>
                    </div>
                    <div className="stat-icon-wrapper approved">
                        <CheckCircle2 size={20} />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Rejected</span>
                        <span className="stat-value">{stats.rejected}</span>
                    </div>
                    <div className="stat-icon-wrapper rejected">
                        <XCircle size={20} />
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="filter-section">
                <h3 className="filter-title">KYC Filters</h3>
                <div className="filter-actions">
                    <button className="filter-btn">
                        <Filter size={16} />
                        Filters
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="table-container">
                <div className="table-header-controls">
                    <h3 className="table-title">KYC Approvals</h3>
                    <div className="table-search">
                        <input
                            type="text"
                            placeholder="Search KYC applications..."
                            className="search-input"
                        />
                        <button className="refresh-btn" onClick={fetchChecklists}>
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User Details</th>
                            <th>Contact Info</th>
                            <th>Location</th>
                            <th>Registration Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                            </tr>
                        ) : (
                            checklists.map((checklist) => (
                                <tr key={checklist.id} onClick={() => {
                                    setSelectedChecklist(checklist);
                                    setIsDetailOpen(true);
                                }} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div className="user-cell">
                                            <span className="user-name">{checklist.title}</span>
                                            <span className="user-sub">ID: {checklist.id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="user-cell">
                                            <span className="user-name">{checklist.assignedTo.split('@')[0]}</span>
                                            <span className="user-sub">{checklist.assignedTo}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="user-cell">
                                            <span className="user-name">{checklist.category.toUpperCase()}</span>
                                            <span className="user-sub">Region: Global</span>
                                        </div>
                                    </td>
                                    <td>{new Date(checklist.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`status-badge ${checklist.status}`}>
                                            {checklist.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="action-btn">
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );

    const renderPlaceholder = (title) => (
        <div className="placeholder-state">
            <div className="placeholder-content">
                <AlertTriangle size={48} className="placeholder-icon" />
                <h3>{title}</h3>
                <p>This module is currently under development.</p>
            </div>
        </div>
    );

    const [kybRequests, setKybRequests] = useState([]);

    useEffect(() => {
        fetchChecklists();
        fetchKybRequests();
    }, []);

    const fetchKybRequests = async () => {
        try {
            const response = await fetch('http://localhost:3001/pendingApprovals');
            const data = await response.json();
            const companyRequests = data
                .filter(item => item.type === 'company')
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    companyName: item.data?.companyName || item.title,
                    regNumber: item.data?.registrationNumber || 'N/A',
                    industry: item.data?.industry || 'N/A',
                    region: item.data?.country || 'N/A',
                    requestedBy: item.requestedBy,
                    createdAt: item.requestedAt,
                    status: item.status,
                    description: item.description,
                    items: [], // Ensure items array exists for detail view compatibility
                    comments: item.comments || []
                }));
            setKybRequests(companyRequests);
        } catch (error) {
            console.error('Error fetching KYB requests:', error);
            toast.error('Failed to load KYB requests');
        }
    };

    const handleKybAction = async (id, status) => {
        try {
            const response = await fetch(`http://localhost:3001/pendingApprovals/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (response.ok) {
                toast.success(`Request ${status} successfully`);
                fetchKybRequests(); // Refresh list
            } else {
                toast.error('Failed to update request status');
            }
        } catch (error) {
            console.error('Error updating request:', error);
            toast.error('An error occurred');
        }
    };

    const renderKYBTable = () => (
        <>
            <div className="table-container">
                <div className="table-header-controls">
                    <h3 className="table-title">KYB Approvals</h3>
                    <div className="table-search">
                        <input
                            type="text"
                            placeholder="Search company requests..."
                            className="search-input"
                        />
                        <button className="refresh-btn">
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Company Details</th>
                            <th>Registration Info</th>
                            <th>Industry/Region</th>
                            <th>Requested Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kybRequests.map((request) => (
                            <tr key={request.id} onClick={() => {
                                setSelectedChecklist(request); // Reusing selectedChecklist for modal
                                setIsDetailOpen(true);
                            }} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div className="user-cell">
                                        <span className="user-name">{request.companyName}</span>
                                        <span className="user-sub">ID: {request.id}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="user-cell">
                                        <span className="user-name">{request.regNumber}</span>
                                        <span className="user-sub">Req: {request.requestedBy.split('@')[0]}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="user-cell">
                                        <span className="user-name">{request.industry}</span>
                                        <span className="user-sub">{request.region}</span>
                                    </div>
                                </td>
                                <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <span className={`status-badge ${request.status}`}>
                                        {request.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <div className="approval-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleKybAction(request.id, 'approved');
                                            }}
                                            title="Approve"
                                            style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.1)' }}
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <button
                                            className="action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleKybAction(request.id, 'rejected');
                                            }}
                                            title="Reject"
                                            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.1)' }}
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    return (
        <div className="compliance-checklists-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        <CheckCircle2 size={28} />
                        Approvals
                    </h1>
                    <p className="page-subtitle">
                        Review and process KYC verifications, topup requests, and till number applications across your platform
                    </p>
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="approval-tabs">
                <button
                    className={`approval-tab ${activeTab === 'kyc' ? 'active' : ''}`}
                    onClick={() => setActiveTab('kyc')}
                >
                    <FileText size={18} />
                    KYC Approvals
                </button>
                <button
                    className={`approval-tab ${activeTab === 'kyb' ? 'active' : ''}`}
                    onClick={() => setActiveTab('kyb')}
                >
                    <Building2 size={18} />
                    KYB Approvals
                </button>
                <button
                    className={`approval-tab ${activeTab === 'topup' ? 'active' : ''}`}
                    onClick={() => setActiveTab('topup')}
                >
                    <CreditCard size={18} />
                    Topup Requests
                </button>
                <button
                    className={`approval-tab ${activeTab === 'till' ? 'active' : ''}`}
                    onClick={() => setActiveTab('till')}
                >
                    <Smartphone size={18} />
                    Till Number Requests
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'kyc' && renderKYCTable()}
                {activeTab === 'kyb' && renderKYBTable()}
                {activeTab === 'topup' && renderPlaceholder('Topup Requests')}
                {activeTab === 'till' && renderPlaceholder('Till Number Requests')}
            </div>

            {/* Detail Modal */}
            {renderChecklistDetail()}

            {/* Approve/Reject Modal */}
            <Modal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                title="Approve Checklist Item"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsApproveModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => submitApproval(true)}
                        >
                            <CheckCircle2 size={16} />
                            Approve
                        </Button>
                    </>
                }
            >
                <div className="approve-content">
                    {selectedItem && (
                        <>
                            <div className="approve-item-info">
                                <h4>{selectedItem.title}</h4>
                                <p>{selectedItem.description}</p>
                            </div>
                            <div className="approve-form">
                                <label>Approval Comment (Required)</label>
                                <textarea
                                    className="approve-textarea"
                                    rows="4"
                                    placeholder="Add your approval notes..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
