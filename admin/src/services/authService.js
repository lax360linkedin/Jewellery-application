/**
 * Admin Authentication Service
 */

import apiClient from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const authService = {
  /**
   * Authenticate admin account
   */
  login: async ({ mobile, password }) => {
    return apiClient.post(
      ENDPOINTS.AUTH.LOGIN,
      { mobile, password },
      { requiresAuth: false }
    );
  },

  /**
   * Fetch current authenticated user
   */
  getMe: async () => {
    return apiClient.get(ENDPOINTS.AUTH.ME);
  },
};

export default authService;
