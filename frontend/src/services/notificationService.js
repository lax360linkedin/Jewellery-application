/**
 * Notification Service
 * Manages customer notification retrieval, unread counts, and read receipts.
 */

import apiClient from './api/client';
import { ENDPOINTS } from './api/endpoints';

export const notificationService = {
  /**
   * Fetch customer notifications
   */
  getNotifications: async (params = {}) => {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST, { params });
  },

  /**
   * Fetch total unread notifications count
   */
  getUnreadCount: async () => {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  },

  /**
   * Fetch single notification details by ID
   */
  getNotificationById: async (id) => {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS.DETAIL(id));
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id) => {
    return apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    return apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  },
};

export default notificationService;
