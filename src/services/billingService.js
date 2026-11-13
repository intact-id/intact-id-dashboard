import api from './api';

// auth-server wraps responses as { success, responseMessage, data }; return just `data`, or throw.
function unwrap(response) {
    if (!response.data.success) throw new Error(response.data.responseMessage || 'Request failed');
    return response.data.data;
}

// Companies read their own billing; super admins pass the company they are looking at.
const forCompany = (companyId) => (companyId ? { params: { companyId } } : undefined);

const billingService = {
    // { client, billingProfile, wallet, perCallPricing }; 404 when billing isn't set up for the company
    async account(companyId) {
        return unwrap(await api.get('/api/v1/billing/account', forCompany(companyId)));
    },
    async walletHistory(companyId) {
        return unwrap(await api.get('/api/v1/billing/wallet/history', forCompany(companyId)));
    },
    // [{ serviceCode, name, price, currency, source }]
    async prices(companyId) {
        return unwrap(await api.get('/api/v1/billing/prices', forCompany(companyId)));
    },
    async invoices(companyId) {
        return unwrap(await api.get('/api/v1/billing/invoices', forCompany(companyId)));
    },

    // --- Super admin ---
    // { billingModel: PER_CALL|FLAT_PERIODIC|HYBRID, paymentType: PREPAID|POSTPAID, currency, pricePerCall, freeQuota }
    async setUp(companyId, setup) {
        return unwrap(await api.post('/api/v1/billing/admin/setup', setup, { params: { companyId } }));
    },
    async updateProfile(companyId, changes) {
        return unwrap(await api.patch('/api/v1/billing/admin/profile', changes, { params: { companyId } }));
    },
    // { amount, externalRef, description }
    async creditWallet(companyId, credit) {
        return unwrap(await api.post('/api/v1/billing/admin/wallet/credit', credit, { params: { companyId } }));
    },
    // { pricePerCall, freeQuota }
    async updatePerCallPricing(companyId, changes) {
        return unwrap(await api.patch('/api/v1/billing/admin/per-call-pricing', changes, { params: { companyId } }));
    },
    // Standard prices every company pays unless it has its own: [{ id, serviceCode, name, price, currency, isActive }]
    async standardPrices() {
        return unwrap(await api.get('/api/v1/billing/admin/service-charges'));
    },
    // { serviceCode, name, price, currency }
    async createStandardPrice(charge) {
        return unwrap(await api.post('/api/v1/billing/admin/service-charges', charge));
    },
    // { name, price, isActive }
    async updateServiceCharge(chargeId, changes) {
        return unwrap(await api.patch(`/api/v1/billing/admin/service-charges/${chargeId}`, changes));
    },

    async markInvoicePaid(invoiceId) {
        return unwrap(await api.post(`/api/v1/billing/admin/invoices/${invoiceId}/mark-paid`));
    },
    async voidInvoice(invoiceId) {
        return unwrap(await api.post(`/api/v1/billing/admin/invoices/${invoiceId}/void`));
    },
};

export default billingService;
