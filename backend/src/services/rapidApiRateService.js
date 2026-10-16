import axios from 'axios';
import config from '../config/env.js';
import { query } from '../config/db.js';
import { cleanRate } from '../utils/formatters.js';

// In-memory cache for RapidAPI Salem rates
let cachedSalemRates = null;
let lastFetchedAt = 0;
let inFlightRequest = null;

/**
 * Get current stored Salem reference rates from in-memory cache or database without calling RapidAPI.
 * RapidAPI request count: 0.
 *
 * @returns {Promise<Object|null>}
 */
export async function getStoredSalemReferenceRates() {
  if (cachedSalemRates) {
    return {
      ...cachedSalemRates,
      cached: true,
    };
  }

  // Check MySQL rates table for existing stored reference rates
  try {
    const rows = await query("SELECT * FROM rates WHERE metal IN ('gold', 'silver')");
    const gold = rows.find((r) => r.metal === 'gold');
    const silver = rows.find((r) => r.metal === 'silver');

    if (gold && silver && gold.api_rate && silver.api_rate) {
      const gRate = cleanRate(gold.api_rate);
      const sRate = cleanRate(silver.api_rate);

      cachedSalemRates = {
        success: true,
        city: 'Salem',
        gold: {
          purity: '22K',
          per_gram: gRate,
        },
        silver: {
          per_gram: sRate,
        },
        source: 'RapidAPI',
        fetched_at: gold.updated_at,
        updated_at: gold.updated_at,
        cached: true,
      };
      lastFetchedAt = Date.now();
      return cachedSalemRates;
    }
  } catch (dbErr) {
    console.warn('[RapidAPI Service] Could not retrieve stored rates from DB:', dbErr.message);
  }

  return null;
}

/**
 * Fetch live Salem Gold (22K 1g) and Silver (1g) reference rates.
 * If forceRefresh is false, returns existing stored reference data without calling RapidAPI.
 * If forceRefresh is true (or no stored data exists), triggers exactly ONE fresh RapidAPI request.
 *
 * @param {Object} options
 * @param {boolean} [options.forceRefresh=false] - If true, triggers fresh fetch from RapidAPI
 * @returns {Promise<Object>} Standardized Salem reference rates object
 */
export async function fetchSalemReferenceRates({ forceRefresh = false } = {}) {
  // 1. If not forcing a refresh, return existing stored reference data (RapidAPI = 0 requests)
  if (!forceRefresh) {
    const stored = await getStoredSalemReferenceRates();
    if (stored) {
      return stored;
    }

    return {
      success: true,
      city: 'Salem',
      gold: {
        purity: '22K',
        per_gram: config.defaultGoldRate,
      },
      silver: {
        per_gram: config.defaultSilverRate,
      },
      source: 'Stored Reference',
      updated_at: new Date().toISOString(),
      cached: true,
    };
  }

  // 2. Reuse in-flight promise to prevent duplicate concurrent external requests
  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const apiKey = config.rapidApiKey ? config.rapidApiKey.trim() : null;
      console.log('[RapidAPI Service] RAPIDAPI_KEY configured:', Boolean(apiKey));

      if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        const error = new Error('RapidAPI key is not configured in backend environment (RAPIDAPI_KEY).');
        error.status = 503;
        error.code = 'RAPIDAPI_KEY_MISSING';
        throw error;
      }

      const host = config.rapidApiHost || 'gold-silver-rates-india.p.rapidapi.com';
      const url = config.rapidApiUrl || `https://${host}/api/Fetch-Gold-Silver/?city=Salem`;
      const urlObj = new URL(url);

      console.log(`[SalemRateAPI]\nRAPIDAPI_KEY configured: ${Boolean(apiKey)}\nHost: ${host}\nPath: ${urlObj.pathname + urlObj.search}`);

      const response = await axios.get(url, {
        headers: {
          'x-rapidapi-key': apiKey.trim(),
          'x-rapidapi-host': host.trim(),
        },
        timeout: 8000, // 8-second timeout
      });

      console.log(`[SalemRateAPI] Response status: ${response.status}`);

      if (!response || response.status !== 200 || !response.data) {
        const error = new Error('RapidAPI returned an unexpected response.');
        error.status = 502;
        throw error;
      }

      const resData = response.data;

      // Validate success response structure
      if (resData.success !== true || !resData.data) {
        const error = new Error(resData.message || 'RapidAPI returned an unexpected response.');
        error.status = 502;
        throw error;
      }

      const data = resData.data;

      // 3. Extract STRICTLY 22K 1gram for Gold
      // Reject 24K, 8grams, 10grams
      const rawGold22k1g = data.gold?.['22k']?.['1gram'];
      const goldRateNum = parseFloat(rawGold22k1g);
      if (isNaN(goldRateNum) || goldRateNum <= 0) {
        const error = new Error('Malformed response from RapidAPI: missing or invalid 22K 1-gram Gold rate.');
        error.status = 502;
        throw error;
      }

      // 4. Extract STRICTLY 1gram for Silver
      // Reject 1kg or historical dates
      const rawSilver1g = data.silver?.['1gram'];
      const silverRateNum = parseFloat(rawSilver1g);
      if (isNaN(silverRateNum) || silverRateNum <= 0) {
        const error = new Error('Malformed response from RapidAPI: missing or invalid 1-gram Silver rate.');
        error.status = 502;
        throw error;
      }

      const cleanedGoldRate = cleanRate(goldRateNum);
      const cleanedSilverRate = cleanRate(silverRateNum);
      const fetchedIso = new Date().toISOString();

      const result = {
        success: true,
        city: 'Salem',
        gold: {
          purity: '22K',
          per_gram: cleanedGoldRate,
        },
        silver: {
          per_gram: cleanedSilverRate,
        },
        source: 'RapidAPI',
        updated_at: fetchedIso,
        cached: false,
      };

      // 5. Update in-memory cache
      cachedSalemRates = result;
      lastFetchedAt = Date.now();

      // 6. Update reference api_rate in MySQL rates table if connected
      // NOTE: This updates api_rate ONLY for tracking and does NOT touch active_rate, custom_rate, or mode.
      try {
        await query(
          "UPDATE rates SET api_rate = ?, updated_at = NOW() WHERE metal = 'gold'",
          [cleanedGoldRate]
        );
        await query(
          "UPDATE rates SET api_rate = ?, updated_at = NOW() WHERE metal = 'silver'",
          [cleanedSilverRate]
        );
      } catch (dbErr) {
        // Non-fatal: DB reference logging failure should not break Admin reference view
        console.warn('[RapidAPI Service] Could not update reference api_rate in DB:', dbErr.message);
      }

      return result;
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const rapidMsg = (typeof err.response.data === 'object' && err.response.data?.message)
          ? err.response.data.message
          : (typeof err.response.data === 'string' ? err.response.data : (err.response.statusText || 'RapidAPI request failed'));

        console.log(`[SalemRateAPI] Response status: ${status} - ${rapidMsg}`);

        if (status === 401) {
          const error = new Error(`RapidAPI authentication failed (401): ${rapidMsg}. Verify RAPIDAPI_KEY.`);
          error.status = 502;
          error.code = 'RAPIDAPI_AUTH_FAILED';
          throw error;
        } else if (status === 403) {
          const error = new Error(`RapidAPI subscription error (403): ${rapidMsg}. Verify RapidAPI account is subscribed to 'Gold Silver Rates India'.`);
          error.status = 502;
          error.code = 'RAPIDAPI_SUBSCRIPTION_ERROR';
          throw error;
        } else if (status === 429) {
          const error = new Error(`RapidAPI rate limit reached (429): ${rapidMsg}.`);
          error.status = 502;
          error.code = 'RAPIDAPI_RATE_LIMIT';
          throw error;
        } else if (status >= 500) {
          const error = new Error(`RapidAPI error (${status}): ${rapidMsg}`);
          error.status = 502;
          error.code = 'RAPIDAPI_SERVER_ERROR';
          throw error;
        } else {
          const error = new Error(`RapidAPI error (${status}): ${rapidMsg}`);
          error.status = 502;
          throw error;
        }
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        console.log('[SalemRateAPI] Connection timed out (504)');
        const error = new Error('RapidAPI request timed out. Please try again.');
        error.status = 504;
        throw error;
      } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        console.log(`[SalemRateAPI] Connection error: ${err.code}`);
        const error = new Error(`RapidAPI network connection error (${err.code}).`);
        error.status = 504;
        throw error;
      } else if (err.status) {
        throw err;
      } else {
        console.log(`[SalemRateAPI] Unexpected error: ${err.message}`);
        const error = new Error(err.message || 'Unable to fetch Salem reference rates right now.');
        error.status = 502;
        throw error;
      }
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}

/**
 * Get current cached Salem reference rates without triggering external network call.
 * Useful for inspection or initial state.
 */
export function getCachedSalemRates() {
  if (cachedSalemRates) {
    return {
      ...cachedSalemRates,
      cached: true,
      cache_age_seconds: Math.round((Date.now() - lastFetchedAt) / 1000),
    };
  }
  return null;
}

/**
 * Clear in-memory cache (primarily for unit testing)
 */
export function clearSalemRatesCache() {
  cachedSalemRates = null;
  lastFetchedAt = 0;
  inFlightRequest = null;
}

export default {
  fetchSalemReferenceRates,
  getStoredSalemReferenceRates,
  getCachedSalemRates,
  clearSalemRatesCache,
};
