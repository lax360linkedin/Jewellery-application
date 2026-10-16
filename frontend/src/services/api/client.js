/**
 * Centralized API Client for SJ Jewellers User App
 * Provides request handling, automatic Bearer JWT injection, error normalization, and 401 session expiration handling.
 */

import { getAuthToken, clearAllAuth } from '../../utils/authStorage';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

/**
 * Normalizes backend error responses into standard Error instances
 */
export function normalizeApiError(error, responseData, status) {
  let message = 'Network request failed. Please check your connection.';

  if (responseData) {
    if (typeof responseData.detail === 'string') {
      message = responseData.detail;
    } else if (Array.isArray(responseData.detail)) {
      message = responseData.detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ');
    } else if (typeof responseData.message === 'string') {
      message = responseData.message;
    } else if (typeof responseData.error === 'string') {
      message = responseData.error;
    }
  } else if (error && error.message) {
    message = error.message;
  }

  const err = new Error(message);
  err.status = status || (error && error.status) || 0;
  err.data = responseData || null;
  return err;
}

/**
 * Core fetch wrapper
 */
async function request(endpoint, {
  method = 'GET',
  headers = {},
  body = null,
  params = null,
  requiresAuth = true,
  timeout = 15000,
} = {}) {
  // Build query string if params provided
  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Construct request headers
  const reqHeaders = {
    'Accept': 'application/json',
    ...headers,
  };

  if (body && !(body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  // Attach Authorization token if available and required
  if (requiresAuth !== false) {
    try {
      const token = await getAuthToken();
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[API Client] Could not read auth token:', e);
    }
  }

  // Timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? (typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse JSON response if available
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('[API Client] 401 Unauthorized - clearing invalid session');
      await clearAllAuth().catch(() => {});
    }

    if (!response.ok) {
      throw normalizeApiError(null, data, response.status);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw normalizeApiError(new Error('Request timed out. Please try again.'), null, 408);
    }
    if (error.status) {
      throw error;
    }
    throw normalizeApiError(error, null, 0);
  }
}

export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export const api = apiClient;
export default apiClient;
