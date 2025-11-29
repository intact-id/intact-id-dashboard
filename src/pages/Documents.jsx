import { useState, useEffect } from 'react';
import { FileText, Eye, Download, Upload, Filter, Search } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import FileUpload from '../components/ui/FileUpload';
import Dropdown from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../contexts/ToastContext';
import './Documents.css';

export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await fetch('http://localhost:3001/documents');
            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = (document) => {
        setSelectedDocument(document);
        setIsViewerOpen(true);
    };

    const handleUploadComplete = (files) => {
        toast.success(`${files.length} document(s) uploaded successfully`);
        setIsUploadOpen(false);
        // In production, this would upload to server and refresh list
        fetchDocuments();
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            verified: 'success',
            pending: 'warning',
            rejected: 'error'
        };
        return statusMap[status] || 'info';
    };

    const getDocumentTypeLabel = (type) => {
        const labels = {
            passport: 'Passport',
            id_card: 'ID Card',
            drivers_license: 'Driver\'s License',
            utility_bill: 'Utility Bill',
            bank_statement: 'Bank Statement'
        };
        return labels[type] || type;
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
        const matchesType = typeFilter === 'all' || doc.type === typeFilter;
        const matchesSearch = doc.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesType && matchesSearch;
    });

    const columns = [
        {
            key: 'userName',
            label: 'User Name',
            render: (value) => <strong>{value}</strong>
        },
        {
            key: 'type',
            label: 'Document Type',
            render: (value) => getDocumentTypeLabel(value)
        },
        {
            key: 'documentNumber',
            label: 'Document Number',
            render: (value) => <code className="doc-number">{value}</code>
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => (
                <Badge variant={getStatusBadge(value)}>
                    {value.toUpperCase()}
                </Badge>
            )
        },
        {
            key: 'country',
            label: 'Country'
        },
        {
            key: 'uploadedAt',
            label: 'Uploaded',
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            key: 'actions',
            label: 'Actions',
            sortable: false,
            render: (_, doc) => (
                <div className="doc-actions">
                    <button
                        className="action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(doc);
                        }}
                        title="View document"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className="action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            toast.info('Download started');
                        }}
                        title="Download document"
                    >
                        <Download size={16} />
                    </button>
                </div>
            )
        }
    ];

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'verified', label: 'Verified' },
        { value: 'pending', label: 'Pending' },
        { value: 'rejected', label: 'Rejected' }
    ];

    const typeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'passport', label: 'Passport' },
        { value: 'id_card', label: 'ID Card' },
        { value: 'drivers_license', label: 'Driver\'s License' }
    ];

    return (
        <div className="documents-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        <FileText size={28} />
                        Document Management
                    </h1>
                    <p className="page-subtitle">
                        View and manage all KYC documents
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setIsUploadOpen(true)}
                >
                    <Upload size={18} />
                    Upload Document
                </Button>
            </div>

            <Card>
                <div className="documents-filters">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name or document number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-controls">
                        <Dropdown
                            options={statusOptions}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            placeholder="Filter by status"
                        />
                        <Dropdown
                            options={typeOptions}
                            value={typeFilter}
                            onChange={setTypeFilter}
                            placeholder="Filter by type"
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredDocuments}
                    loading={loading}
                    onRowClick={handleViewDocument}
                    emptyState={
                        <EmptyState
                            icon={FileText}
                            title="No documents found"
                            description="Upload your first document to get started"
                            action={
                                <Button variant="primary" onClick={() => setIsUploadOpen(true)}>
                                    <Upload size={18} />
                                    Upload Document
                                </Button>
                            }
                        />
                    }
                />
            </Card>

            {/* Document Viewer Modal */}
            {selectedDocument && (
                <Modal
                    isOpen={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                    title="Document Details"
                    size="lg"
                >
                    <div className="document-viewer">
                        <div className="document-info-grid">
                            <div className="info-item">
                                <span className="info-label">User Name</span>
                                <span className="info-value">{selectedDocument.userName}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Document Type</span>
                                <span className="info-value">{getDocumentTypeLabel(selectedDocument.type)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Document Number</span>
                                <span className="info-value">
                                    <code>{selectedDocument.documentNumber}</code>
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Status</span>
                                <Badge variant={getStatusBadge(selectedDocument.status)}>
                                    {selectedDocument.status.toUpperCase()}
                                </Badge>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Country</span>
                                <span className="info-value">{selectedDocument.country}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Expiry Date</span>
                                <span className="info-value">
                                    {new Date(selectedDocument.expiryDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Uploaded</span>
                                <span className="info-value">
                                    {new Date(selectedDocument.uploadedAt).toLocaleString()}
                                </span>
                            </div>
                            {selectedDocument.verifiedAt && (
                                <div className="info-item">
                                    <span className="info-label">Verified By</span>
                                    <span className="info-value">{selectedDocument.verifiedBy}</span>
                                </div>
                            )}
                        </div>

                        {selectedDocument.notes && (
                            <div className="document-notes">
                                <h4>Notes</h4>
                                <p>{selectedDocument.notes}</p>
                            </div>
                        )}

                        <div className="document-preview">
                            <div className="preview-placeholder">
                                <FileText size={64} />
                                <p>Document Preview</p>
                                <span className="preview-filename">{selectedDocument.fileUrl}</span>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                title="Upload Document"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsUploadOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => handleUploadComplete([])}>
                            Upload
                        </Button>
                    </>
                }
            >
                <div className="upload-modal-content">
                    <FileUpload
                        onFileSelect={handleUploadComplete}
                        accept="image/*,application/pdf"
                        multiple={true}
                        label="Select documents to upload"
                    />
                    <p className="upload-hint">
                        Accepted formats: PDF, JPG, PNG. Maximum size: 10MB per file.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
