import api from './api';

const billingService = {
    async getCompanyBillingProfile(companyId) {
        const response = await api.get(`/api/billing/companies/${companyId}/profile`);
        return response.data;
    },

    async updateCompanyBillingProfile(companyId, payload) {
        const response = await api.put(`/api/billing/companies/${companyId}/profile`, payload);
        return response.data;
    },

    async getCompanyBillingSummary(companyId) {
        const response = await api.get(`/api/billing/companies/${companyId}/summary`);
        return response.data;
    },

    async getCompanyInvoices(companyId) {
        const response = await api.get(`/api/billing/companies/${companyId}/invoices`);
        return response.data;
    },

    async getCompanyWalletTransactions(companyId) {
        const response = await api.get(`/api/billing/companies/${companyId}/wallet/transactions`);
        return response.data;
    },

    async topUpWallet(companyId, payload) {
        const response = await api.post(`/api/billing/companies/${companyId}/wallet/topup`, payload);
        return response.data;
    },

    async generateInvoice(companyId, payload) {
        const response = await api.post(`/api/billing/companies/${companyId}/invoices/generate`, payload);
        return response.data;
    },

    async sendInvoice(invoiceId, recipientEmail) {
        const response = await api.post(`/api/billing/invoices/${invoiceId}/send`, recipientEmail ? { recipientEmail } : null);
        return response.data;
    },

    async getMyBillingProfile() {
        const response = await api.get('/api/billing/me/profile');
        return response.data;
    },

    async getMyBillingSummary() {
        const response = await api.get('/api/billing/me/summary');
        return response.data;
    },

    async getMyInvoices() {
        const response = await api.get('/api/billing/me/invoices');
        return response.data;
    },

    async getMyWalletTransactions() {
        const response = await api.get('/api/billing/me/wallet/transactions');
        return response.data;
    },

    async getTierCatalog() {
        const response = await api.get('/api/v1/tiers');
        return response.data;
    }
};

export default billingService;
