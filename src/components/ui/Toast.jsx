import { useToast } from '../../contexts/ToastContext';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="toast-container">
            {toasts.map(toast => {
                const Icon = iconMap[toast.type];
                return (
                    <div key={toast.id} className={`toast toast--${toast.type}`}>
                        <Icon className="toast-icon" size={20} />
                        <span className="toast-message">{toast.message}</span>
                        <button
                            className="toast-close"
                            onClick={() => removeToast(toast.id)}
                            aria-label="Close notification"
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
