import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { can } from '../utils/access';

// Shows the page only to people who may use it; anyone else gets a plain notice and the page never loads its data.
export default function Allowed({ to, children }) {
    const { user } = useAuth();
    if (can(user, to)) return children;
    return (
        <div className="page">
            <div className="card bill-empty" style={{ textAlign: 'center' }}>
                <Lock size={22} />
                <strong>This page isn’t part of your access</strong>
                <span>Ask an admin of your company if you need it.</span>
            </div>
        </div>
    );
}
