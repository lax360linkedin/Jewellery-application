/**
 * Centralized API Endpoints for SJ Jewellers Backend
 */

export const ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // Authentication
  AUTH: {
    SEND_OTP: '/api/auth/send-otp',
    VERIFY_OTP: '/api/auth/verify-otp',
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
  },

  // Profile
  PROFILE: {
    ME: '/api/profile/me',
  },

  // KYC
  KYC: {
    ME: '/api/kyc/me',
    SUBMIT: '/api/kyc/submit',
  },

  // Rates
  RATES: {
    LIVE: '/api/rates',
  },

  // Holdings
  HOLDINGS: {
    ME: '/api/holdings/me',
    BY_METAL: (metal) => `/api/holdings/me/${metal}`,
  },

  // Purchases
  PURCHASES: {
    CREATE: '/api/purchases',
    LIST: '/api/purchases',
    DETAIL: (id) => `/api/purchases/${id}`,
  },

  // Withdrawals
  WITHDRAWALS: {
    CREATE: '/api/withdrawals',
    REQUEST_OTP: '/api/withdrawals/request-otp',
    RESEND_OTP: '/api/withdrawals/resend-otp',
    VERIFY_OTP: '/api/withdrawals/verify-otp',
    LIST: '/api/withdrawals',
    DETAIL: (id) => `/api/withdrawals/${id}`,
    CANCEL: (id) => `/api/withdrawals/${id}/cancel`,
  },

  // Transactions (Unified)
  TRANSACTIONS: {
    LIST: '/api/transactions',
    DETAIL: (id) => `/api/transactions/${id}`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    DETAIL: (id) => `/api/notifications/${id}`,
    MARK_READ: (id) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all',
  },

  // Backwards-compatible flat aliases
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  SEND_OTP: '/api/auth/send-otp',
  VERIFY_OTP: '/api/auth/verify-otp',
  GET_ME: '/api/auth/me',
  GET_PROFILE: '/api/profile/me',
  UPDATE_PROFILE: '/api/profile/me',
  SUBMIT_KYC: '/api/kyc/submit',
  GET_RATES: '/api/rates',
  GET_HOLDINGS: '/api/holdings/me',
  CREATE_PURCHASE: '/api/purchases',
  GET_TRANSACTIONS: '/api/transactions',
  REQUEST_WITHDRAWAL: '/api/withdrawals',
  GET_WITHDRAWALS: '/api/withdrawals',
};

export default ENDPOINTS;
