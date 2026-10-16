/**
 * Customer Holdings Service
 * Fetches authenticated customer's Gold and Silver quantities, investments, and valuations.
 */

import { apiClient, api } from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const holdingsService = {
  /**
   * Fetch authenticated customer's combined Gold and Silver holdings valuation
   */
  getHoldings: async () => {
    return apiClient.get(ENDPOINTS.HOLDINGS.ME);
  },

  /**
   * Fetch holding for specific metal ('gold' | 'silver')
   */
  getMetalHolding: async (metal) => {
    return apiClient.get(ENDPOINTS.HOLDINGS.BY_METAL(metal));
  },
};

export default holdingsService;
