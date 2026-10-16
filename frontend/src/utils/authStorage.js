/**
 * Centralized Authentication & Token Storage Utility for React Native
 * Manages JWT tokens and customer authentication state via AsyncStorage safely.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@sj_auth_token';
const USER_KEY = '@sj_auth_user';
const SKIPPED_PROFILE_KEY = '@sj_session_skipped_profile';

export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error accessing token storage:', e);
    return null;
  }
};

export const setAuthToken = async (token) => {
  try {
    if (!token) return;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Error saving auth token:', e);
  }
};

export const clearAuthToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error clearing auth token:', e);
  }
};

export const getStoredUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error('Error reading stored user:', e);
    return null;
  }
};

export const setStoredUser = async (user) => {
  try {
    if (!user) return;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving stored user:', e);
  }
};

export const clearStoredUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Error clearing stored user:', e);
  }
};

export const getSkippedProfile = async () => {
  try {
    const val = await AsyncStorage.getItem(SKIPPED_PROFILE_KEY);
    return val === 'true';
  } catch (e) {
    return false;
  }
};

export const setSkippedProfile = async (skipped = true) => {
  try {
    if (skipped) {
      await AsyncStorage.setItem(SKIPPED_PROFILE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(SKIPPED_PROFILE_KEY);
    }
  } catch (e) {
    console.error('Error setting skipped profile:', e);
  }
};

export const clearAllAuth = async () => {
  await clearAuthToken();
  await clearStoredUser();
  await setSkippedProfile(false);
};
