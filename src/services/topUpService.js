import api from './api';

function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

const forCompany = (companyId, extra = {}) => ({ params: { ...extra, ...(companyId ? { companyId } : {}) } });

// Wallet top-ups: bank transfers with a receipt, reviewed by Intact. Card, M-Pesa and Airtel come later.
const topUpService = {
    // { currency, prepaid, bankInstructions, methods }
    async instructions(companyId) {
        return unwrap(await api.get('/api/v1/billing/top-ups/instructions', forCompany(companyId)));
    },
    // { amount, reference, paidOn (YYYY-MM-DD), bankName, note, receipt: File }
    async submitBank(companyId, { amount, reference, paidOn, bankName, note, receipt }) {
        const form = new FormData();
        form.append('amount', amount);
        form.append('reference', reference);
        form.append('paidOn', paidOn);
        if (bankName) form.append('bankName', bankName);
        if (note) form.append('note', note);
        form.append('receipt', receipt);
        return unwrap(await api.post('/api/v1/billing/top-ups/bank', form, forCompany(companyId)));
    },
    // { content, totalElements, totalPages, waitingForReview }
    async list({ companyId, status, page = 0, size = 20 } = {}) {
        return unwrap(await api.get('/api/v1/billing/top-ups', forCompany(companyId, { page, size, ...(status ? { status } : {}) })));
    },
    // The receipt needs the auth header, so it is fetched as a blob and opened from an object URL
    async receiptUrl(id) {
        const response = await api.get(`/api/v1/billing/top-ups/${id}/receipt`, { responseType: 'blob' });
        return URL.createObjectURL(response.data);
    },
    async cancel(id) {
        return unwrap(await api.post(`/api/v1/billing/top-ups/${id}/cancel`));
    },
    async approve(id, { amount, note }) {
        return unwrap(await api.post(`/api/v1/billing/admin/top-ups/${id}/approve`, { amount: amount === '' ? null : amount, note }));
    },
    async reject(id, note) {
        return unwrap(await api.post(`/api/v1/billing/admin/top-ups/${id}/reject`, { note }));
    },
};

export const TOP_UP_STATUS = {
    PENDING_REVIEW: { label: 'Waiting for review', badge: 'warn' },
    APPROVED: { label: 'Credited', badge: 'ok' },
    REJECTED: { label: 'Rejected', badge: 'bad' },
    CANCELLED: { label: 'Cancelled', badge: 'neutral' },
    PENDING_PAYMENT: { label: 'Waiting for payment', badge: 'info' },
    PAID: { label: 'Credited', badge: 'ok' },
    FAILED: { label: 'Failed', badge: 'bad' },
};

export const TOP_UP_METHOD = { BANK_RECEIPT: 'Bank transfer', CARD: 'Card', MPESA: 'M-Pesa', AIRTEL_MONEY: 'Airtel Money' };

export async function openReceipt(id) {
    const url = await topUpService.receiptUrl(id);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default topUpService;
