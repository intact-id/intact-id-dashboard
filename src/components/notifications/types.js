import { Info, TriangleAlert, CircleX, CircleCheck } from 'lucide-react';

export const NOTIFICATION_TYPES = {
    INFO: { label: 'Info', icon: Info, tone: 'info' },
    SUCCESS: { label: 'Success', icon: CircleCheck, tone: 'ok' },
    WARNING: { label: 'Warning', icon: TriangleAlert, tone: 'warn' },
    ERROR: { label: 'Problem', icon: CircleX, tone: 'bad' },
};

export const isUnread = (n) => !n.readAt && n.status !== 'READ';
