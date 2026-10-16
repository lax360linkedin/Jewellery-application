/**
 * Admin Service
 * Provides centralized API client methods for the administrative dashboard,
 * user management, KYC approvals, rate overrides, order monitoring, and transaction reconciliation.
 */

import apiClient from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const adminService = {
  // 1. Dashboard Analytics & Statistics
  getDashboardStats: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.DASHBOARD);
  },

  getSalesByMetal: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.SALES_BY_METAL);
  },

  getSalesChart: async (period = 'month') => {
    return apiClient.get(ENDPOINTS.ADMIN.SALES_CHART, { params: { period } });
  },

  getWithdrawalsSummary: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.WITHDRAWALS_SUMMARY);
  },

  getRecentTransactions: async (limit = 5) => {
    return apiClient.get(ENDPOINTS.ADMIN.RECENT_TRANSACTIONS, { params: { limit } });
  },

  getRecentMembers: async (limit = 5) => {
    return apiClient.get(ENDPOINTS.ADMIN.RECENT_MEMBERS, { params: { limit } });
  },

  getNotificationSummary: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.NOTIFICATION_SUMMARY);
  },

  // 2. User & Customer Management
  getUsers: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.USERS, { params });
  },

  getUserDetail: async (userId) => {
    return apiClient.get(ENDPOINTS.ADMIN.USER_DETAIL(userId));
  },

  // 3. KYC Verification Operations
  getPendingKycList: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.KYC_PENDING, { params });
  },

  getKycDetail: async (kycId) => {
    return apiClient.get(ENDPOINTS.ADMIN.KYC_DETAIL(kycId));
  },

  approveKyc: async (kycId) => {
    return apiClient.put(ENDPOINTS.ADMIN.KYC_APPROVE(kycId));
  },

  rejectKyc: async (kycId, reason) => {
    return apiClient.put(ENDPOINTS.ADMIN.KYC_REJECT(kycId), { reason });
  },

  // 4. Rate Management
  getRates: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.RATES);
  },

  updateCustomRate: async ({ metal, customRate, customRateEnabled = true }) => {
    const cleanMetal = metal?.trim().toLowerCase();
    const payload = {
      metal: cleanMetal,
      custom_rate: Number(customRate),
      custom_rate_enabled: Boolean(customRateEnabled),
    };
    return apiClient.put(`${ENDPOINTS.ADMIN.RATES_CUSTOM}/${cleanMetal}`, payload);
  },

  refreshRates: async () => {
    return apiClient.post(ENDPOINTS.ADMIN.RATES_REFRESH);
  },

  // 5. Purchases & Orders
  getPurchases: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.PURCHASES, { params });
  },

  // 6. Withdrawals
  getWithdrawals: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.WITHDRAWALS, { params });
  },

  approveWithdrawal: async (withdrawalId) => {
    return apiClient.put(ENDPOINTS.ADMIN.WITHDRAWAL_APPROVE(withdrawalId));
  },

  rejectWithdrawal: async (withdrawalId, reason) => {
    return apiClient.put(ENDPOINTS.ADMIN.WITHDRAWAL_REJECT(withdrawalId), { reason });
  },

  // 7. Transactions
  getTransactions: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.TRANSACTIONS, { params });
  },

  // 8. Notifications
  getNotifications: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.NOTIFICATIONS, { params });
  },
};

export default adminService;
