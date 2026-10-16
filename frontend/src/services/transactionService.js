/**
 * Unified Transaction History Service
 * Retrieves customer combined purchases and withdrawals timeline from backend.
 */

import apiClient from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const transactionService = {
  /**
   * Fetch paginated unified transaction history (purchases and withdrawals)
   */
  getTransactions: async (params = {}) => {
    return apiClient.get(ENDPOINTS.TRANSACTIONS.LIST, { params });
  },

  /**
   * Fetch single transaction detail by ID
   */
  getTransactionById: async (id) => {
    return apiClient.get(ENDPOINTS.TRANSACTIONS.DETAIL(id));
  },
};

export default transactionService;
