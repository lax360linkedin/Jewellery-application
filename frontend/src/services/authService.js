/**
 * Authentication Service
 * Communicates with Node.js + Express backend for OTP, registration, login, and session checks.
 */

import { apiClient } from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const authService = {
  /**
   * Dispatch OTP to mobile number
   */
  sendOtp: async (mobile) => {
    return apiClient.post(ENDPOINTS.AUTH.SEND_OTP, { mobile }, { requiresAuth: false });
  },

  /**
   * Verify entered OTP for mobile number
   */
  verifyOtp: async (mobile, otp) => {
    return apiClient.post(ENDPOINTS.AUTH.VERIFY_OTP, { mobile, otp }, { requiresAuth: false });
  },

  /**
   * Register new user account
   */
  register: async ({ name, mobile, email, password }) => {
    return apiClient.post(
      ENDPOINTS.AUTH.REGISTER,
      { name, mobile, email, password },
      { requiresAuth: false }
    );
  },

  /**
   * Authenticate user with mobile and password
   */
  login: async ({ mobile, password }) => {
    return apiClient.post(
      ENDPOINTS.AUTH.LOGIN,
      { mobile, password },
      { requiresAuth: false }
    );
  },

  /**
   * Fetch current authenticated user record
   */
  getMe: async () => {
    return apiClient.get(ENDPOINTS.AUTH.ME);
  },

  /**
   * Request password reset OTP
   */
  forgotPassword: async (mobile) => {
    return apiClient.post(ENDPOINTS.AUTH.SEND_OTP, { mobile }, { requiresAuth: false });
  },

  /**
   * Verify password reset OTP
   */
  resetPassword: async (data) => {
    return apiClient.post(ENDPOINTS.AUTH.VERIFY_OTP, data, { requiresAuth: false });
  },

  /**
   * Logout session (client-side clearance handled in authStorage)
   */
  logout: async () => {
    return { success: true };
  },
};

export default authService;
