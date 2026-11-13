import { CircleCheck, CircleX, TriangleAlert, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './Toast.css';

const ICONS = { success: CircleCheck, error: CircleX, warning: TriangleAlert, info: Info };

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();
    if (!toasts.length) return null;
    return (
        <div className="toast-stack">
            {toasts.map((t) => {
                const Icon = ICONS[t.type] || Info;
                return (
                    <div key={t.id} className={`toast toast--${t.type}`}>
                        <Icon size={16} />
                        <span>{t.message}</span>
                        <button onClick={() => removeToast(t.id)} aria-label="Dismiss">
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
