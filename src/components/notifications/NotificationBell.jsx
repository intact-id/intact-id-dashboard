import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import notificationService from '../../services/notificationService';
import { formatDateTime } from '../../utils/format';
import { NOTIFICATION_TYPES, isUnread } from './types';
import './NotificationBell.css';

const REFRESH_MS = 60000;
const SHOWN = 8;

// The bell in the top bar: the signed-in person's own notifications, with the unread count kept fresh.
export default function NotificationBell() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(null);
    const panel = useRef(null);

    const refreshCount = useCallback(() => {
        notificationService.inboxUnreadCount().then((n) => setUnread(Number(n) || 0)).catch(() => {});
    }, []);

    // On every page change, and every minute while the console is open
    useEffect(() => {
        refreshCount();
        const timer = setInterval(refreshCount, REFRESH_MS);
        return () => clearInterval(timer);
    }, [refreshCount, pathname]);

    // Close when clicking outside the panel
    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => { if (panel.current && !panel.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const toggle = () => {
        if (!open) {
            setItems(null);
            notificationService.inbox({ size: SHOWN }).then((page) => setItems(page.content || [])).catch(() => setItems([]));
        }
        setOpen(!open);
    };

    const openItem = async (n) => {
        setOpen(false);
        if (isUnread(n)) {
            await notificationService.markRead(n.id).catch(() => null);
            refreshCount();
        }
        navigate(n.link || '/dashboard/notifications');
    };

    const markAll = async () => {
        await notificationService.markInboxRead().catch(() => null);
        setItems((list) => (list || []).map((n) => ({ ...n, status: 'READ', readAt: n.readAt || new Date().toISOString() })));
        setUnread(0);
    };

    return (
        <div className="bell" ref={panel}>
            <button className="topbar-bell" onClick={toggle} aria-expanded={open}
                    aria-label={unread ? `${unread} unread notifications` : 'Notifications'}>
                <Bell size={16} />
                {unread > 0 && <span className="bell-count">{unread > 99 ? '99+' : unread}</span>}
            </button>
            {open && (
                <div className="bell-panel" role="dialog" aria-label="Notifications">
                    <div className="bell-head">
                        <strong>Notifications</strong>
                        <button className="link-btn" onClick={markAll} disabled={!unread}><CheckCheck size={14} /> Mark all read</button>
                    </div>
                    <div className="bell-list">
                        {!items ? <div className="loading-state">Loading…</div>
                            : items.length === 0 ? <div className="empty-state">Nothing here yet.</div>
                                : items.map((n) => {
                                    const type = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.INFO;
                                    const Icon = type.icon;
                                    return (
                                        <button key={n.id} className={`bell-item${isUnread(n) ? ' is-unread' : ''}`} onClick={() => openItem(n)}>
                                            <span className={`notification-icon notification-icon--${type.tone}`}><Icon size={14} /></span>
                                            <span className="bell-item-body">
                                                <span className="bell-item-title">{n.title}</span>
                                                <span className="bell-item-message">{n.message}</span>
                                                <span className="bell-item-when">{formatDateTime(n.createdAt)}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                    </div>
                    <Link className="bell-foot" to="/dashboard/notifications" onClick={() => setOpen(false)}>See all notifications</Link>
                </div>
            )}
        </div>
    );
}
