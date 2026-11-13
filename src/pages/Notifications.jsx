import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Trash2, Send, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import notificationService from '../services/notificationService';
import companyService from '../services/companyService';
import { errorMessage } from '../services/api';
import { isSuperAdmin } from '../utils/roles';
import { formatDateTime } from '../utils/format';
import { NOTIFICATION_TYPES, isUnread } from '../components/notifications/types';

const PAGE_SIZE = 20;

// Everyone sees their own inbox: a company's users get their company's notifications, super admins get
// the Intact staff inbox. Super admins also see what they sent to companies, and send new ones.
export default function Notifications() {
    const { user } = useAuth();
    const { toast } = useToast();
    const superAdmin = isSuperAdmin(user);

    const [tab, setTab] = useState('inbox'); // inbox | sent
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const [companies, setCompanies] = useState([]);
    const [draft, setDraft] = useState({ companyId: '', type: 'INFO', title: '', message: '' });
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            const fetchPage = tab === 'sent' ? notificationService.sent : notificationService.inbox;
            setResult(await fetchPage({ page, size: PAGE_SIZE }));
        } catch (e) {
            setError(errorMessage(e, 'Could not load notifications.'));
        }
    }, [tab, page]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!superAdmin) return;
        companyService.list({ size: 100 }).then((p) => {
            setCompanies(p.content);
            setDraft((d) => ({ ...d, companyId: d.companyId || p.content[0]?.id || '' }));
        }).catch(() => {});
    }, [superAdmin]);

    const switchTab = (next) => {
        setTab(next);
        setPage(0);
        setFilter('all');
        setResult(null);
    };

    const markRead = async (n) => {
        try {
            await notificationService.markRead(n.id);
            setResult((r) => ({ ...r, content: r.content.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString(), status: 'READ' } : x)) }));
        } catch (e) {
            toast.error(errorMessage(e, 'Could not mark it as read.'));
        }
    };

    const markAllRead = async () => {
        try {
            const count = await notificationService.markInboxRead();
            toast.success(`${count} marked as read`);
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not mark them as read.'));
        }
    };

    const remove = async (n) => {
        try {
            await notificationService.remove(n.id);
            setResult((r) => ({ ...r, content: r.content.filter((x) => x.id !== n.id), totalElements: r.totalElements - 1 }));
        } catch (e) {
            toast.error(errorMessage(e, 'Could not delete it.'));
        }
    };

    const send = async () => {
        setSending(true);
        try {
            await notificationService.send({ companyId: draft.companyId, type: draft.type, title: draft.title.trim(), message: draft.message.trim() });
            toast.success('Notification sent');
            setDraft((d) => ({ ...d, title: '', message: '' }));
            setPage(0);
            load();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not send the notification.'));
        } finally {
            setSending(false);
        }
    };

    const all = result?.content || [];
    const rows = filter === 'unread' ? all.filter(isUnread) : all;
    const unreadOnPage = all.filter(isUnread).length;
    const totalPages = result?.totalPages ?? 0;
    const inbox = tab === 'inbox';

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Notifications</h1>
                    <p>{superAdmin
                        ? 'Your inbox: new applications, verifications waiting for review and services that went down.'
                        : 'Messages for your company: account changes, suspensions and announcements.'}</p>
                </div>
                {inbox && (
                    <div className="head-actions">
                        <button className="btn btn--secondary btn--sm" onClick={markAllRead} disabled={!unreadOnPage}><CheckCheck size={15} /> Mark all as read</button>
                    </div>
                )}
            </div>

            {superAdmin && (
                <div className="page-tabs" role="tablist">
                    <button role="tab" aria-selected={inbox} className={inbox ? 'is-active' : ''} onClick={() => switchTab('inbox')}>Inbox</button>
                    <button role="tab" aria-selected={!inbox} className={!inbox ? 'is-active' : ''} onClick={() => switchTab('sent')}>Sent to companies</button>
                </div>
            )}

            <div className={inbox ? '' : 'notifications-row'}>
                <div className="card">
                    <div className="card-head">
                        {inbox ? (
                            <div className="view-toggle">
                                <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
                                <button className={filter === 'unread' ? 'is-active' : ''} onClick={() => setFilter('unread')}>Unread{unreadOnPage ? ` (${unreadOnPage})` : ''}</button>
                            </div>
                        ) : <h3>Sent</h3>}
                        <span className="card-caption">{result ? `${result.totalElements.toLocaleString()} in total` : ''}</span>
                    </div>
                    {error ? <div className="empty-state">{error}</div>
                        : !result ? <div className="loading-state">Loading notifications…</div>
                            : rows.length === 0 ? <div className="empty-state">{filter === 'unread' ? 'Nothing unread on this page.' : 'No notifications yet.'}</div>
                                : (
                                    <div className="notification-list">
                                        {rows.map((n) => {
                                            const type = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.INFO;
                                            const Icon = type.icon;
                                            return (
                                                <div key={n.id} className={`notification-row${inbox && isUnread(n) ? ' is-unread' : ''}`}>
                                                    <span className={`notification-icon notification-icon--${type.tone}`}><Icon size={16} /></span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div className="notification-title">{n.title}</div>
                                                        <div className="notification-message">{n.message}</div>
                                                        <div className="notification-meta">
                                                            {formatDateTime(n.createdAt)}
                                                            {!inbox && n.companyName && <> · to {n.companyName}{isUnread(n) ? ' · not read yet' : ' · read'}</>}
                                                            {inbox && isUnread(n) && <> · <button className="link-btn" onClick={() => markRead(n)}>Mark as read</button></>}
                                                            {n.link && <> · <Link className="link-btn" to={n.link} onClick={() => inbox && isUnread(n) && markRead(n)}>Open <ArrowRight size={12} /></Link></>}
                                                        </div>
                                                    </div>
                                                    <button className="btn btn--ghost btn--sm" onClick={() => remove(n)} aria-label="Delete notification"><Trash2 size={14} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <span>Page {page + 1} of {totalPages}</span>
                            <div className="pagination-controls">
                                <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Previous</button>
                                <button className="btn btn--ghost btn--sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {!inbox && (
                    <div className="card">
                        <div className="card-head"><div><h3>Send a notification</h3><div className="card-caption">Shows in that company's bell and is emailed to its main address.</div></div></div>
                        <div className="field">
                            <label>Company</label>
                            <select className="input" value={draft.companyId} onChange={(e) => setDraft({ ...draft, companyId: e.target.value })}>
                                {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
                            </select>
                            <label style={{ marginTop: 10 }}>Type</label>
                            <div className="view-toggle" style={{ alignSelf: 'flex-start' }}>
                                {Object.entries(NOTIFICATION_TYPES).map(([value, t]) => (
                                    <button key={value} className={draft.type === value ? 'is-active' : ''} onClick={() => setDraft({ ...draft, type: value })}>{t.label}</button>
                                ))}
                            </div>
                            <label style={{ marginTop: 10 }} htmlFor="ntf-title">Title</label>
                            <input id="ntf-title" className="input" maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                            <label style={{ marginTop: 10 }} htmlFor="ntf-message">Message</label>
                            <textarea id="ntf-message" className="input" rows={4} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
                            <button className="btn btn--primary" style={{ justifyContent: 'center', marginTop: 12 }} onClick={send}
                                disabled={sending || !draft.title.trim() || !draft.message.trim() || !draft.companyId}>
                                <Send size={15} /> {sending ? 'Sending…' : 'Send notification'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
