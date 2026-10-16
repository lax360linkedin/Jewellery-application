/**
 * Admin Panel API Endpoints
 * Centralized endpoint mapping to Node.js + Express Backend
 */

export const ENDPOINTS = {
  HEALTH: '/health',

  AUTH: {
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
  },

  RATES: {
    LIVE: '/api/rates',
  },

  ADMIN: {
    // Dashboard
    DASHBOARD: '/api/admin/dashboard',
    SALES_BY_METAL: '/api/admin/dashboard/sales-by-metal',
    SALES_BY_METAL_TRANSACTIONS: '/api/admin/dashboard/sales-by-metal/transactions',
    SALES_CHART: '/api/admin/dashboard/sales-chart',
    PENDING_KYC_COUNT: '/api/admin/dashboard/pending-kyc',
    WITHDRAWALS_SUMMARY: '/api/admin/dashboard/withdrawals-summary',
    RECENT_TRANSACTIONS: '/api/admin/dashboard/recent-transactions',
    RECENT_MEMBERS: '/api/admin/dashboard/recent-members',
    CUSTOMER_GROWTH: '/api/admin/dashboard/customer-growth',
    TRANSACTION_STATS: '/api/admin/dashboard/transaction-stats',
    CURRENT_RATES: '/api/admin/dashboard/current-rates',
    NOTIFICATION_SUMMARY: '/api/admin/dashboard/notification-summary',

    // Users / Members
    USERS: '/api/admin/users',
    USER_DETAIL: (id) => `/api/admin/users/${id}`,
    USER_STATUS: (id) => `/api/admin/users/${id}/status`,
    USER_BAN: (id) => `/api/admin/users/${id}/ban`,
    USER_UNBAN: (id) => `/api/admin/users/${id}/unban`,
    USER_HOLDINGS: (id) => `/api/admin/users/${id}/holdings`,
    ALL_HOLDINGS: '/api/admin/holdings',

    // KYC
    KYC_PENDING: '/api/admin/kyc/pending',
    KYC_DETAIL: (id) => `/api/admin/kyc/${id}`,
    KYC_APPROVE: (id) => `/api/admin/kyc/${id}/approve`,
    KYC_REJECT: (id) => `/api/admin/kyc/${id}/reject`,

    // Rates Management
    RATES: '/api/admin/rates',
    RATES_CUSTOM: '/api/admin/rates/custom',
    RATES_REFRESH: '/api/admin/rates/refresh',
    RATES_HISTORY: '/api/admin/rates/history',
    RATES_REFERENCE_SALEM: '/api/admin/rates/reference/salem',

    // Purchases
    PURCHASES: '/api/admin/purchases',
    PURCHASE_DETAIL: (id) => `/api/admin/purchases/${id}`,

    // Withdrawals
    WITHDRAWALS: '/api/admin/withdrawals',
    WITHDRAWAL_DETAIL: (id) => `/api/admin/withdrawals/${id}`,
    WITHDRAWAL_APPROVE: (id) => `/api/admin/withdrawals/${id}/approve`,
    WITHDRAWAL_REJECT: (id) => `/api/admin/withdrawals/${id}/reject`,

    // Transactions
    TRANSACTIONS: '/api/admin/transactions',
    TRANSACTION_DETAIL: (id) => `/api/admin/transactions/${id}`,

    // Analytics
    ANALYTICS: '/api/admin/analytics',

    // Notifications
    NOTIFICATIONS: '/api/admin/notifications',
    NOTIFICATIONS_UNREAD: '/api/admin/notifications/unread-count',
    NOTIFICATIONS_READ_ALL: '/api/admin/notifications/read-all',
    NOTIFICATION_READ: (id) => `/api/admin/notifications/${id}/read`,
  },
};

export default ENDPOINTS;
