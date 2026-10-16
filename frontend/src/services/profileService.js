/**
 * Profile Service
 * Manages customer personal profile, contact information, nominee, and address details.
 */

import apiClient from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const profileService = {
  /**
   * Fetch authenticated customer's full profile
   */
  getProfile: async () => {
    return apiClient.get(ENDPOINTS.PROFILE.ME);
  },

  /**
   * Create or update customer's profile
   * @param {Object} profileData
   */
  updateProfile: async (profileData) => {
    return apiClient.patch(ENDPOINTS.PROFILE.ME, profileData);
  },
};

export default profileService;
