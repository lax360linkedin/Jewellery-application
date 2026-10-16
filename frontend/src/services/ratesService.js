/**
 * Metal Rates Service
 * Fetches current Gold & Silver rates from Node.js + Express backend.
 */

import { apiClient, api } from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const ratesService = {
  /**
   * Fetch active Gold & Silver rates (public endpoint)
   */
  getLiveRates: async () => {
    return apiClient.get(ENDPOINTS.RATES.LIVE, { requiresAuth: false });
  },
};

export default ratesService;
