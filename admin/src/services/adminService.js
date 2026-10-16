/**
 * Admin Service
 * Provides all API methods for the Admin Panel.
 */

import apiClient from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const adminService = {
  // --- Dashboard ---
  getDashboardOverview: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.DASHBOARD);
  },

  getSalesByMetal: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.SALES_BY_METAL);
  },

  getSalesByMetalTransactions: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.SALES_BY_METAL_TRANSACTIONS);
  },

  getSalesChart: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.SALES_CHART, { params });
  },

  getRecentTransactions: async (limit = 10) => {
    return apiClient.get(ENDPOINTS.ADMIN.RECENT_TRANSACTIONS, { params: { limit } });
  },

  getRecentMembers: async (limit = 10) => {
    return apiClient.get(ENDPOINTS.ADMIN.RECENT_MEMBERS, { params: { limit } });
  },

  getCustomerGrowth: async (period = '30d') => {
    return apiClient.get(ENDPOINTS.ADMIN.CUSTOMER_GROWTH, { params: { period } });
  },

  getTransactionStats: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.TRANSACTION_STATS);
  },

  getCurrentRates: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.CURRENT_RATES);
  },

  // --- Users / Members ---
  getUsers: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.USERS, { params });
  },

  getUserDetail: async (id) => {
    return apiClient.get(ENDPOINTS.ADMIN.USER_DETAIL(id));
  },

  updateUserStatus: async (id, status) => {
    return apiClient.patch(ENDPOINTS.ADMIN.USER_STATUS(id), { status });
  },

  banUser: async (id) => {
    return apiClient.post(ENDPOINTS.ADMIN.USER_BAN(id));
  },

  unbanUser: async (id) => {
    return apiClient.post(ENDPOINTS.ADMIN.USER_UNBAN(id));
  },

  getUserHoldings: async (id) => {
    return apiClient.get(ENDPOINTS.ADMIN.USER_HOLDINGS(id));
  },

  getAllHoldings: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.ALL_HOLDINGS, { params });
  },

  // --- KYC ---
  getPendingKyc: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.KYC_PENDING);
  },

  getKycDetail: async (id) => {
    return apiClient.get(ENDPOINTS.ADMIN.KYC_DETAIL(id));
  },

  approveKyc: async (id) => {
    return apiClient.post(ENDPOINTS.ADMIN.KYC_APPROVE(id));
  },

  rejectKyc: async (id, reason) => {
    return apiClient.post(ENDPOINTS.ADMIN.KYC_REJECT(id), { reason });
  },

  // --- Rates ---
  getRates: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.RATES);
  },

  setCustomRates: async (data) => {
    return apiClient.post(ENDPOINTS.ADMIN.RATES_CUSTOM, data);
  },

  refreshRates: async () => {
    return apiClient.post(ENDPOINTS.ADMIN.RATES_REFRESH);
  },

  getRateHistory: async (metal = 'gold', limit = 30) => {
    return apiClient.get(ENDPOINTS.ADMIN.RATES_HISTORY, { params: { metal, limit } });
  },

  getSalemReferenceRates: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.RATES_REFERENCE_SALEM, { params });
  },

  // --- Purchases ---
  getPurchases: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.PURCHASES, { params });
  },

  getPurchaseById: async (id) => {
    return apiClient.get(ENDPOINTS.ADMIN.PURCHASE_DETAIL(id));
  },

  // --- Withdrawals ---
  getWithdrawals: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.WITHDRAWALS, { params });
  },

  getWithdrawalById: async (id) => {
    return apiClient.get(ENDPOINTS.ADMIN.WITHDRAWAL_DETAIL(id));
  },

  approveWithdrawal: async (id) => {
    return apiClient.post(ENDPOINTS.ADMIN.WITHDRAWAL_APPROVE(id));
  },

  rejectWithdrawal: async (id, reason) => {
    return apiClient.post(ENDPOINTS.ADMIN.WITHDRAWAL_REJECT(id), { reason });
  },

  // --- Transactions ---
  getTransactions: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.TRANSACTIONS, { params });
  },

  getTransactionById: async (id) => {
    return apiClient.get(ENDPOINTS.ADMIN.TRANSACTION_DETAIL(id));
  },

  // --- Analytics ---
  getAnalytics: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.ANALYTICS, { params });
  },

  // --- Notifications ---
  getNotifications: async (params = {}) => {
    return apiClient.get(ENDPOINTS.ADMIN.NOTIFICATIONS, { params });
  },

  getUnreadNotificationCount: async () => {
    return apiClient.get(ENDPOINTS.ADMIN.NOTIFICATIONS_UNREAD);
  },

  markAllNotificationsRead: async () => {
    return apiClient.patch(ENDPOINTS.ADMIN.NOTIFICATIONS_READ_ALL);
  },

  markNotificationRead: async (id) => {
    return apiClient.patch(ENDPOINTS.ADMIN.NOTIFICATION_READ(id));
  },
};

export default adminService;
