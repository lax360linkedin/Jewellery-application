/**
 * Withdrawal Service
 * Handles metal withdrawal requests, history, and cancellations.
 */

import { apiClient, api } from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const withdrawalService = {
  /**
   * Request withdrawal OTP challenge (does NOT create withdrawal or reserve balance)
   * @param {Object} data - { metal: 'gold' | 'silver', quantity_grams: number, withdrawal_mode?: 'physical' }
   */
  requestWithdrawalOtp: async (data) => {
    return apiClient.post(ENDPOINTS.WITHDRAWALS.REQUEST_OTP, data);
  },

  /**
   * Resend withdrawal OTP
   * @param {string} challenge_id
   */
  resendWithdrawalOtp: async (challenge_id) => {
    return apiClient.post(ENDPOINTS.WITHDRAWALS.RESEND_OTP, { challenge_id });
  },

  /**
   * Verify withdrawal OTP and complete withdrawal creation
   * @param {string} challenge_id
   * @param {string} otp
   */
  verifyWithdrawalOtp: async (challenge_id, otp) => {
    return apiClient.post(ENDPOINTS.WITHDRAWALS.VERIFY_OTP, { challenge_id, otp });
  },

  /**
   * Submit withdrawal request for metal (Legacy/direct)
   * @param {Object} data - { metal: 'gold' | 'silver', quantity_grams: number, withdrawal_mode?: 'physical' | 'bank' }
   */
  requestWithdrawal: async (data) => {
    return apiClient.post(ENDPOINTS.WITHDRAWALS.CREATE, data);
  },

  /**
   * Fetch customer withdrawal requests
   */
  getWithdrawals: async (params = {}) => {
    return apiClient.get(ENDPOINTS.WITHDRAWALS.LIST, { params });
  },

  /**
   * Fetch single withdrawal by ID
   */
  getWithdrawalById: async (id) => {
    return apiClient.get(ENDPOINTS.WITHDRAWALS.DETAIL(id));
  },

  /**
   * Cancel pending withdrawal request
   */
  cancelWithdrawal: async (id) => {
    return apiClient.patch(ENDPOINTS.WITHDRAWALS.CANCEL(id));
  },
};

export default withdrawalService;
