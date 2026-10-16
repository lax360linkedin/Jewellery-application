/**
 * KYC Service
 * Submits and retrieves customer identity documents and verification status.
 */

import { apiClient, api } from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const kycService = {
  /**
   * Submit or re-submit KYC documents
   * @param {Object} kycData - { full_name, date_of_birth, gender, address, id_type, id_number }
   */
  submitKyc: async (kycData) => {
    return apiClient.post(ENDPOINTS.KYC.SUBMIT, kycData);
  },

  /**
   * Fetch customer's current KYC submission status
   */
  getUserKyc: async () => {
    return apiClient.get(ENDPOINTS.KYC.ME);
  },
};

export default kycService;
