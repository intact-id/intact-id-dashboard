import api from './api';
import kycService from './kycService';

const analyticsService = {
    /**
     * Get overview statistics for dashboard
     * @returns {Promise<object>}
     */
    async getOverviewStats() {
        try {
            // Fetch recent verifications to calculate stats
            const verificationsResponse = await kycService.listVerifications(
                {},
                { page: 0, size: 100 }
            );

            if (!verificationsResponse.success) {
                throw new Error('Failed to fetch verifications');
            }

            const verifications = verificationsResponse.data.content || [];
            const totalElements = verificationsResponse.data.totalElements || 0;

            // Calculate statistics
            const totalVerifications = totalElements;
            const pendingCount = verifications.filter(v => ['PENDING', 'PROCESSING'].includes(v.status)).length;
            const approvedCount = verifications.filter(v => ['APPROVED', 'COMPLETED', 'PASSED'].includes(v.status)).length;
            const rejectedCount = verifications.filter(v => ['REJECTED', 'FAILED'].includes(v.status)).length;

            // Calculate success rate
            const completedCount = approvedCount + rejectedCount;
            const successRate = completedCount > 0
                ? ((approvedCount / completedCount) * 100).toFixed(1)
                : 0;

            return {
                success: true,
                data: {
                    totalVerifications,
                    pendingVerifications: pendingCount,
                    approvedVerifications: approvedCount,
                    rejectedVerifications: rejectedCount,
                    successRate,
                    // Mock data for now - these would come from actual endpoints
                    apiCallsThisMonth: 1250, // Mock non-zero value
                    activeApiKeys: 3
                }
            };
        } catch (error) {
            console.error('Get overview stats error:', error);
            throw error;
        }
    },

    /**
     * Get verification trends over time
     * @param {object} dateRange - Date range {fromDate, toDate}
     * @returns {Promise<object>}
     */
    async getVerificationTrends(dateRange = {}) {
        try {
            const response = await kycService.listVerifications(
                dateRange,
                { page: 0, size: 1000 }
            );

            if (!response.success) {
                throw new Error('Failed to fetch verification trends');
            }

            const verifications = response.data.content || [];

            // Group by date
            const trendsByDate = {};
            verifications.forEach(verification => {
                const date = new Date(verification.createdAt).toISOString().split('T')[0];
                if (!trendsByDate[date]) {
                    trendsByDate[date] = {
                        date,
                        total: 0,
                        approved: 0,
                        rejected: 0,
                        pending: 0
                    };
                }
                trendsByDate[date].total++;
                if (verification.status === 'APPROVED') trendsByDate[date].approved++;
                if (verification.status === 'REJECTED') trendsByDate[date].rejected++;
                if (verification.status === 'PENDING') trendsByDate[date].pending++;
            });

            return {
                success: true,
                data: Object.values(trendsByDate).sort((a, b) =>
                    new Date(a.date) - new Date(b.date)
                )
            };
        } catch (error) {
            console.error('Get verification trends error:', error);
            throw error;
        }
    },

    /**
     * Get API usage data
     * @param {object} dateRange - Date range {fromDate, toDate}
     * @returns {Promise<object>}
     */
    async getUsageData(dateRange = {}) {
        try {
            // For now, return mock data as there's no dedicated usage endpoint
            // This would be replaced with actual API usage tracking endpoint
            const mockUsageData = [];
            const days = 7;
            const today = new Date();

            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                mockUsageData.push({
                    date: date.toISOString(),
                    apiCalls: Math.floor(Math.random() * 1000) + 100
                });
            }

            return {
                success: true,
                data: mockUsageData
            };
        } catch (error) {
            console.error('Get usage data error:', error);
            throw error;
        }
    }
};

export default analyticsService;
