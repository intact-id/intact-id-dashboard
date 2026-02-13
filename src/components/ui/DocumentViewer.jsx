import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useState } from 'react';
import './DocumentViewer.css';

export default function DocumentViewer({ imageUrl, filename, mimeType = '', onClose }) {
    const [zoom, setZoom] = useState(1);
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType.includes('pdf');

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="document-viewer-overlay" onClick={onClose}>
            <div className="document-viewer-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="document-viewer-header">
                    <h3 className="document-viewer-title">{filename || 'Document'}</h3>
                    <div className="document-viewer-actions">
                        <button
                            className="document-viewer-btn"
                            onClick={handleZoomOut}
                            title="Zoom Out"
                            disabled={!isImage}
                        >
                            <ZoomOut size={20} />
                        </button>
                        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                        <button
                            className="document-viewer-btn"
                            onClick={handleZoomIn}
                            title="Zoom In"
                            disabled={!isImage}
                        >
                            <ZoomIn size={20} />
                        </button>
                        <button
                            className="document-viewer-btn"
                            onClick={handleDownload}
                            title="Download"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            className="document-viewer-btn document-viewer-close"
                            onClick={onClose}
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Image Container */}
                <div className="document-viewer-content">
                    {isImage && (
                        <img
                            src={imageUrl}
                            alt={filename}
                            style={{ transform: `scale(${zoom})` }}
                            className="document-viewer-image"
                        />
                    )}
                    {isPdf && (
                        <iframe
                            src={imageUrl}
                            title={filename || 'document'}
                            className="document-viewer-pdf"
                        />
                    )}
                    {!isImage && !isPdf && (
                        <div className="document-viewer-fallback">
                            <p>Preview not available for this file type.</p>
                            <button className="document-viewer-download-link" onClick={handleDownload}>
                                Download file
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
