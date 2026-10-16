/**
 * Admin API Client
 * Centralized fetch HTTP wrapper with Bearer token injection, error normalization, and 401 handling.
 */

import { getAuthToken, clearAllAuth } from '../../utils/authStorage';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

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

async function request(endpoint, {
  method = 'GET',
  headers = {},
  body = null,
  params = null,
  requiresAuth = true,
  timeout = 15000,
} = {}) {
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

  const reqHeaders = {
    'Accept': 'application/json',
    ...headers,
  };

  if (body && !(body instanceof FormData) && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (requiresAuth !== false) {
    try {
      const token = getAuthToken();
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
        reqHeaders['x-access-token'] = token;
      } else if (!reqHeaders['Authorization'] && !reqHeaders['authorization']) {
        console.warn(`[Admin API Client] Protected endpoint called without admin token: ${endpoint}`);
        throw normalizeApiError(new Error('Administrator access not authenticated. Please log in.'), null, 401);
      }
    } catch (e) {
      if (e.status === 401) {
        throw e;
      }
      console.warn('[Admin API Client] Could not read token:', e);
    }
  }

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

    if (response.status === 401) {
      console.warn('[Admin API Client] 401 Unauthorized for:', endpoint);
      const detailMsg = (data && (data.detail || data.message || data.error)) || '';
      const isUpstreamApiError = typeof detailMsg === 'string' && (
        detailMsg.toLowerCase().includes('rapidapi') ||
        detailMsg.toLowerCase().includes('subscription') ||
        detailMsg.toLowerCase().includes('gateway')
      );

      if (!isUpstreamApiError) {
        clearAllAuth();
        try {
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('sj_admin_unauthorized', { detail: { endpoint } }));
          }
        } catch {}
      }
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

export default apiClient;
