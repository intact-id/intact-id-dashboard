import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import './FileUpload.css';

export default function FileUpload({
    onFileSelect,
    accept = '*',
    multiple = false,
    maxSize = 10 * 1024 * 1024, // 10MB default
    label = 'Upload Files'
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');

    const validateFile = (file) => {
        if (file.size > maxSize) {
            return `File ${file.name} exceeds maximum size of ${maxSize / 1024 / 1024}MB`;
        }
        return null;
    };

    const handleFiles = (fileList) => {
        const newFiles = Array.from(fileList);
        let errorMsg = '';

        for (const file of newFiles) {
            const validationError = validateFile(file);
            if (validationError) {
                errorMsg = validationError;
                break;
            }
        }

        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        setError('');
        setFiles(prev => multiple ? [...prev, ...newFiles] : newFiles);
        if (onFileSelect) {
            onFileSelect(multiple ? [...files, ...newFiles] : newFiles);
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileInput = (e) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (onFileSelect) {
            onFileSelect(newFiles);
        }
    };

    const getFileIcon = (file) => {
        if (file.type.startsWith('image/')) return ImageIcon;
        return FileText;
    };

    return (
        <div className="file-upload">
            <div
                className={`file-upload-zone ${isDragging ? 'file-upload-zone--dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    type="file"
                    id="file-input"
                    className="file-upload-input"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileInput}
                />
                <label htmlFor="file-input" className="file-upload-label">
                    <Upload size={32} className="file-upload-icon" />
                    <span className="file-upload-text">{label}</span>
                    <span className="file-upload-hint">
                        or drag and drop files here
                    </span>
                </label>
            </div>

            {error && (
                <div className="file-upload-error">{error}</div>
            )}

            {files.length > 0 && (
                <div className="file-upload-list">
                    {files.map((file, index) => {
                        const Icon = getFileIcon(file);
                        return (
                            <div key={index} className="file-upload-item">
                                <Icon size={20} className="file-item-icon" />
                                <div className="file-item-info">
                                    <span className="file-item-name">{file.name}</span>
                                    <span className="file-item-size">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="file-item-remove"
                                    onClick={() => removeFile(index)}
                                    aria-label="Remove file"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
