// Mock data for the CRA Assessments page, the last CRA screen not yet on the real API.
// Shaped like sactions-service's response envelope so the swap is a drop-in.
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

const ok = (data, message = 'OK') => ({ data, status: 'SUCCESS', message, isTechnical: false, errors: null });

const ASSESSMENTS = [
  { id: 'asm-1', subject: 'Amina Wanjiku', subjectType: 'INDIVIDUAL', company: 'Kestrel Capital', modelVersion: 'Individual v4', score: 12, level: 'LOW', decision: 'AUTO_CLEARED', createdAt: '20 Aug 2026 · 14:33' },
  { id: 'asm-2', subject: 'Joseph Mutua', subjectType: 'INDIVIDUAL', company: 'Kestrel Capital', modelVersion: 'Individual v4', score: 58, level: 'MEDIUM', decision: 'MANUAL_REVIEW', createdAt: '20 Aug 2026 · 12:45' },
  { id: 'asm-3', subject: 'Tuvuke Holdings Ltd', subjectType: 'BUSINESS', company: 'Tuvuke Holdings', modelVersion: 'Business v2', score: 34, level: 'LOW', decision: 'AUTO_CLEARED', createdAt: '20 Aug 2026 · 13:11' },
  { id: 'asm-4', subject: 'Collins Barasa', subjectType: 'INDIVIDUAL', company: 'Zamara Group', modelVersion: 'Individual v4', score: 82, level: 'HIGH', decision: 'MANUAL_REVIEW', createdAt: '20 Aug 2026 · 09:40' },
  { id: 'asm-5', subject: 'Baobab Payments Ltd', subjectType: 'BUSINESS', company: 'Baobab Payments', modelVersion: 'Business v2', score: 21, level: 'LOW', decision: 'AUTO_CLEARED', createdAt: '19 Aug 2026 · 16:20' },
  { id: 'asm-6', subject: 'Nancy Wairimu', subjectType: 'INDIVIDUAL', company: 'Tuvuke Holdings', modelVersion: 'Individual v4', score: 91, level: 'HIGH', decision: 'FORCED_HIGH', createdAt: '19 Aug 2026 · 11:05' },
  { id: 'asm-7', subject: 'Sokoni Retail Ltd', subjectType: 'BUSINESS', company: 'Sokoni Retail', modelVersion: 'Business v2', score: 45, level: 'MEDIUM', decision: 'MANUAL_REVIEW', createdAt: '18 Aug 2026 · 15:52' },
];

const craMockApi = {
  async listAssessments() {
    await delay();
    return ok(ASSESSMENTS);
  },
};

export default craMockApi;
