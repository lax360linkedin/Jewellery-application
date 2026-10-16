/**
 * Centralized Authentication & Token Storage Utility
 * Manages JWT tokens and admin authentication state safely with in-memory caching and multi-key fallback.
 */

const TOKEN_KEYS = [
  'sj_auth_token',
  'sj_admin_token',
  'token',
  'access_token',
  'auth_token',
  'admin_token',
  '@sj_auth_token',
];

const USER_KEYS = [
  'sj_auth_user',
  'sj_admin_user',
  'user',
  'admin_user',
  'sj_admin_session',
  '@sj_auth_user',
];

let inMemoryToken = null;
let inMemoryUser = null;

function sanitizeTokenString(val) {
  if (!val || typeof val !== 'string') return null;
  let clean = val.trim();
  if (!clean || clean === 'null' || clean === 'undefined') return null;
  // If stored as JSON string with quotes
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  // If stored as JSON object string
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      const inner = parsed?.token || parsed?.access_token || parsed?.accessToken || parsed?.jwt;
      if (inner && typeof inner === 'string') return inner.trim();
    } catch {}
    return null;
  }
  return clean || null;
}

export const setAuthTokenInMemory = (token) => {
  inMemoryToken = sanitizeTokenString(token);
};

export const getAuthTokenInMemory = () => {
  return inMemoryToken;
};

export const getAuthToken = () => {
  // 1. Check in-memory token first
  if (inMemoryToken) {
    return inMemoryToken;
  }

  try {
    // 2. Check direct token keys across localStorage and sessionStorage
    for (const key of TOKEN_KEYS) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      const clean = sanitizeTokenString(val);
      if (clean) {
        inMemoryToken = clean;
        return clean;
      }
    }

    // 3. Check session/user objects for embedded token
    for (const key of USER_KEYS) {
      const sessionStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (sessionStr && typeof sessionStr === 'string' && sessionStr.trim()) {
        try {
          const parsed = JSON.parse(sessionStr);
          if (parsed && typeof parsed === 'object') {
            const candidate = parsed.token || parsed.access_token || parsed.accessToken || parsed.jwt;
            const clean = sanitizeTokenString(candidate);
            if (clean) {
              inMemoryToken = clean;
              return clean;
            }
          }
        } catch {}
      }
    }

    return null;
  } catch (e) {
    console.error('Error accessing token storage:', e);
    return inMemoryToken || null;
  }
};

export const setAuthToken = (token, rememberMe = true) => {
  try {
    if (!token) return;
    const cleanToken = sanitizeTokenString(token);
    if (!cleanToken) return;

    inMemoryToken = cleanToken;

    TOKEN_KEYS.forEach((k) => {
      try {
        if (rememberMe) {
          localStorage.setItem(k, cleanToken);
        } else {
          sessionStorage.setItem(k, cleanToken);
        }
      } catch {}
    });

    // Also enrich existing sj_admin_session with the token
    try {
      const existingStr = localStorage.getItem('sj_admin_session') || sessionStorage.getItem('sj_admin_session');
      let sessionObj = {};
      if (existingStr) {
        try { sessionObj = JSON.parse(existingStr) || {}; } catch {}
      }
      sessionObj.token = cleanToken;
      sessionObj.access_token = cleanToken;
      const updatedStr = JSON.stringify(sessionObj);
      if (rememberMe) {
        localStorage.setItem('sj_admin_session', updatedStr);
      } else {
        sessionStorage.setItem('sj_admin_session', updatedStr);
      }
    } catch {}

    try {
      localStorage.removeItem('sj_admin_logged_out');
    } catch {}
  } catch (e) {
    console.error('Error saving auth token:', e);
  }
};

export const clearAuthToken = () => {
  inMemoryToken = null;
  try {
    TOKEN_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {}
    });
  } catch (e) {
    console.error('Error clearing auth token:', e);
  }
};

export const getStoredUser = () => {
  if (inMemoryUser) {
    return inMemoryUser;
  }

  try {
    for (const key of USER_KEYS) {
      const userStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (userStr && typeof userStr === 'string' && userStr !== 'null' && userStr !== 'undefined') {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed && typeof parsed === 'object') {
            const userObj = (parsed.user && typeof parsed.user === 'object') ? parsed.user : parsed;
            inMemoryUser = userObj;
            return userObj;
          }
        } catch {}
      }
    }
    return null;
  } catch (e) {
    console.error('Error reading stored user:', e);
    return inMemoryUser || null;
  }
};

export const setStoredUser = (user, rememberMe = true) => {
  try {
    if (!user) return;
    inMemoryUser = user;

    const existingToken = inMemoryToken || getAuthToken();
    const sessionPayload = {
      ...user,
      user,
      ...(existingToken ? { token: existingToken, access_token: existingToken } : {}),
    };
    const userStr = JSON.stringify(sessionPayload);

    USER_KEYS.forEach((k) => {
      try {
        if (rememberMe) {
          localStorage.setItem(k, userStr);
        } else {
          sessionStorage.setItem(k, userStr);
        }
      } catch {}
    });

    try {
      localStorage.removeItem('sj_admin_logged_out');
    } catch {}
  } catch (e) {
    console.error('Error saving stored user:', e);
  }
};

export const clearStoredUser = () => {
  inMemoryUser = null;
  try {
    USER_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {}
    });
  } catch (e) {
    console.error('Error clearing stored user:', e);
  }
};

export const clearAllAuth = () => {
  clearAuthToken();
  clearStoredUser();
  try {
    localStorage.removeItem('sj_admin_logged_out');
  } catch {}
};

export default {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  setAuthTokenInMemory,
  getAuthTokenInMemory,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  clearAllAuth,
};
