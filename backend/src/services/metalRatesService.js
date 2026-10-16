import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { query } from '../config/db.js';
import config from '../config/env.js';
import { cleanRate, getEndOfDayExpiryUTC } from '../utils/formatters.js';

export async function checkAndExpireRates() {
  const now = new Date();
  const customRates = await query("SELECT * FROM rates WHERE mode = 'custom'");

  for (const rate of customRates) {
    if (rate.custom_rate_expires_at) {
      let expiry = null;
      if (rate.custom_rate_expires_at instanceof Date) {
        expiry = rate.custom_rate_expires_at;
      } else if (typeof rate.custom_rate_expires_at === 'string') {
        const str = rate.custom_rate_expires_at.trim();
        if (str.includes('T') || str.includes('Z')) {
          expiry = new Date(str);
        } else {
          // Stored as "YYYY-MM-DD HH:mm:ss" in IST
          expiry = new Date(`${str.replace(' ', 'T')}+05:30`);
        }
      }

      if (expiry && !isNaN(expiry.getTime()) && expiry <= now) {
        // Auto reset to API mode
        const prevActive = cleanRate(rate.active_rate || rate.api_rate);
        const apiRate = cleanRate(rate.api_rate || (rate.metal === 'gold' ? config.defaultGoldRate : config.defaultSilverRate));

        await query(
          `UPDATE rates 
           SET mode = 'api', active_rate = ?, custom_rate = NULL, custom_rate_expires_at = NULL, updated_at = NOW() 
           WHERE id = ?`,
          [apiRate, rate.id]
        );

        const histId = uuidv4();
        await query(
          `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
           VALUES (?, ?, ?, ?, 'api', NULL, 'system', NOW())`,
          [histId, rate.metal, prevActive, apiRate]
        );
      }
    }
  }
}

export async function getRatesPublic() {
  await checkAndExpireRates();

  const rates = await query('SELECT * FROM rates');
  const gold = rates.find((r) => r.metal === 'gold') || {
    api_rate: config.defaultGoldRate,
    active_rate: config.defaultGoldRate,
    mode: 'api',
    updated_at: new Date().toISOString(),
  };
  const silver = rates.find((r) => r.metal === 'silver') || {
    api_rate: config.defaultSilverRate,
    active_rate: config.defaultSilverRate,
    mode: 'api',
    updated_at: new Date().toISOString(),
  };

  return {
    gold_rate: cleanRate(gold.active_rate),
    silver_rate: cleanRate(silver.active_rate),
    rules: {
      min_gold_withdrawal_grams: config.minGoldWithdrawalGrams,
      min_silver_withdrawal_grams: config.minSilverWithdrawalGrams,
      min_gold_purchase_grams: config.minGoldPurchaseGrams,
      min_silver_purchase_grams: config.minSilverPurchaseGrams,
    },
    gold: {
      api_rate: cleanRate(gold.api_rate),
      active_rate: cleanRate(gold.active_rate),
      mode: gold.mode || 'api',
      updated_at: gold.updated_at,
    },
    silver: {
      api_rate: cleanRate(silver.api_rate),
      active_rate: cleanRate(silver.active_rate),
      mode: silver.mode || 'api',
      updated_at: silver.updated_at,
    },
  };
}

export async function getRatesAdmin() {
  await checkAndExpireRates();

  const rates = await query('SELECT * FROM rates');
  const gold = rates.find((r) => r.metal === 'gold') || {};
  const silver = rates.find((r) => r.metal === 'silver') || {};

  return {
    gold: {
      api_rate: cleanRate(gold.api_rate || config.defaultGoldRate),
      active_rate: cleanRate(gold.active_rate || config.defaultGoldRate),
      custom_rate: gold.custom_rate !== null && gold.custom_rate !== undefined ? cleanRate(gold.custom_rate) : null,
      mode: gold.mode || 'api',
      custom_rate_expires_at: gold.custom_rate_expires_at || null,
      updated_at: gold.updated_at,
    },
    silver: {
      api_rate: cleanRate(silver.api_rate || config.defaultSilverRate),
      active_rate: cleanRate(silver.active_rate || config.defaultSilverRate),
      custom_rate: silver.custom_rate !== null && silver.custom_rate !== undefined ? cleanRate(silver.custom_rate) : null,
      mode: silver.mode || 'api',
      custom_rate_expires_at: silver.custom_rate_expires_at || null,
      updated_at: silver.updated_at,
    },
  };
}

export async function setCustomRates(adminUser, rawData = {}) {
  await checkAndExpireRates();
  const expiryUtc = getEndOfDayExpiryUTC();

  // Normalize payload to handle { gold: { enabled, rate } } or { gold_rate, silver_rate } or { gold: number }
  const data = { ...rawData };
  if (data.gold_rate !== undefined && data.gold === undefined) {
    data.gold = data.gold_rate !== null ? { enabled: true, rate: data.gold_rate } : { enabled: false };
  }
  if (data.silver_rate !== undefined && data.silver === undefined) {
    data.silver = data.silver_rate !== null ? { enabled: true, rate: data.silver_rate } : { enabled: false };
  }
  if (typeof data.gold === 'number') {
    data.gold = { enabled: true, rate: data.gold };
  }
  if (typeof data.silver === 'number') {
    data.silver = { enabled: true, rate: data.silver };
  }

  // Handle Gold
  if (data.gold) {
    const goldRows = await query("SELECT * FROM rates WHERE metal = 'gold' LIMIT 1");
    const gold = goldRows[0] || { api_rate: config.defaultGoldRate, active_rate: config.defaultGoldRate };
    const currentApi = cleanRate(gold.api_rate);
    const prevActive = cleanRate(gold.active_rate);

    if (data.gold.enabled) {
      const customVal = cleanRate(data.gold.rate);
      if (customVal < currentApi) {
        const error = new Error('Gold custom rate must be greater than or equal to the current API rate');
        error.status = 400;
        throw error;
      }

      await query(
        `UPDATE rates 
         SET mode = 'custom', custom_rate = ?, active_rate = ?, custom_rate_date = NOW(), custom_rate_expires_at = ?, updated_at = NOW() 
         WHERE metal = 'gold'`,
        [customVal, customVal, expiryUtc]
      );

      const histId = uuidv4();
      await query(
        `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
         VALUES (?, 'gold', ?, ?, 'custom', ?, 'admin', NOW())`,
        [histId, prevActive, customVal, adminUser.id]
      );
    } else {
      // Disable custom rate
      await query(
        `UPDATE rates 
         SET mode = 'api', custom_rate = NULL, active_rate = ?, custom_rate_date = NULL, custom_rate_expires_at = NULL, updated_at = NOW() 
         WHERE metal = 'gold'`,
        [currentApi]
      );

      if (gold.mode === 'custom') {
        const histId = uuidv4();
        await query(
          `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
           VALUES (?, 'gold', ?, ?, 'api', ?, 'admin', NOW())`,
          [histId, prevActive, currentApi, adminUser.id]
        );
      }
    }
  }

  // Handle Silver
  if (data.silver) {
    const silverRows = await query("SELECT * FROM rates WHERE metal = 'silver' LIMIT 1");
    const silver = silverRows[0] || { api_rate: config.defaultSilverRate, active_rate: config.defaultSilverRate };
    const currentApi = cleanRate(silver.api_rate);
    const prevActive = cleanRate(silver.active_rate);

    if (data.silver.enabled) {
      const customVal = cleanRate(data.silver.rate);
      if (customVal < currentApi) {
        const error = new Error('Silver custom rate must be greater than or equal to the current API rate');
        error.status = 400;
        throw error;
      }

      await query(
        `UPDATE rates 
         SET mode = 'custom', custom_rate = ?, active_rate = ?, custom_rate_date = NOW(), custom_rate_expires_at = ?, updated_at = NOW() 
         WHERE metal = 'silver'`,
        [customVal, customVal, expiryUtc]
      );

      const histId = uuidv4();
      await query(
        `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
         VALUES (?, 'silver', ?, ?, 'custom', ?, 'admin', NOW())`,
        [histId, prevActive, customVal, adminUser.id]
      );
    } else {
      // Disable custom rate
      await query(
        `UPDATE rates 
         SET mode = 'api', custom_rate = NULL, active_rate = ?, custom_rate_date = NULL, custom_rate_expires_at = NULL, updated_at = NOW() 
         WHERE metal = 'silver'`,
        [currentApi]
      );

      if (silver.mode === 'custom') {
        const histId = uuidv4();
        await query(
          `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
           VALUES (?, 'silver', ?, ?, 'api', ?, 'admin', NOW())`,
          [histId, prevActive, currentApi, adminUser.id]
        );
      }
    }
  }

  return getRatesAdmin();
}

export async function fetchExternalApiRates() {
  if (!config.metalRatesApiUrl) {
    return { gold: null, silver: null };
  }

  try {
    const headers = {};
    if (config.metalRatesApiKey) {
      headers['x-access-token'] = config.metalRatesApiKey;
      headers['Authorization'] = `Bearer ${config.metalRatesApiKey}`;
    }

    const response = await axios.get(config.metalRatesApiUrl, { headers, timeout: 6000 });
    if (response.status === 200 && response.data) {
      const data = response.data;
      let goldRate = null;
      let silverRate = null;

      if (data.gold && typeof data.gold === 'number') {
        goldRate = cleanRate(data.gold);
      } else if (data.rates && data.rates.XAU) {
        goldRate = cleanRate(data.rates.XAU);
      }

      if (data.silver && typeof data.silver === 'number') {
        silverRate = cleanRate(data.silver);
      } else if (data.rates && data.rates.XAG) {
        silverRate = cleanRate(data.rates.XAG);
      }

      return { gold: goldRate, silver: silverRate };
    }
  } catch (err) {
    console.warn('[Rates API Warning] Failed to fetch external metal rates:', err.message);
  }

  return { gold: null, silver: null };
}

export async function refreshApiRates(adminUser = null) {
  await checkAndExpireRates();

  const { gold: fetchedGold, silver: fetchedSilver } = await fetchExternalApiRates();

  // Process Gold
  const goldRows = await query("SELECT * FROM rates WHERE metal = 'gold' LIMIT 1");
  const gold = goldRows[0] || { api_rate: config.defaultGoldRate, active_rate: config.defaultGoldRate, mode: 'api' };
  const currentGoldApi = cleanRate(gold.api_rate);
  const newGoldApi = fetchedGold !== null && fetchedGold > 0 ? fetchedGold : currentGoldApi;
  const prevGoldActive = cleanRate(gold.active_rate);
  const newGoldActive = gold.mode === 'api' ? newGoldApi : prevGoldActive;

  await query('UPDATE rates SET api_rate = ?, active_rate = ?, updated_at = NOW() WHERE metal = \'gold\'', [
    newGoldApi,
    newGoldActive,
  ]);

  if (gold.mode === 'api' && newGoldApi !== prevGoldActive) {
    const histId = uuidv4();
    await query(
      `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
       VALUES (?, 'gold', ?, ?, 'api', ?, ?, NOW())`,
      [histId, prevGoldActive, newGoldActive, adminUser ? adminUser.id : null, adminUser ? 'admin' : 'api']
    );
  }

  // Process Silver
  const silverRows = await query("SELECT * FROM rates WHERE metal = 'silver' LIMIT 1");
  const silver = silverRows[0] || { api_rate: config.defaultSilverRate, active_rate: config.defaultSilverRate, mode: 'api' };
  const currentSilverApi = cleanRate(silver.api_rate);
  const newSilverApi = fetchedSilver !== null && fetchedSilver > 0 ? fetchedSilver : currentSilverApi;
  const prevSilverActive = cleanRate(silver.active_rate);
  const newSilverActive = silver.mode === 'api' ? newSilverApi : prevSilverActive;

  await query('UPDATE rates SET api_rate = ?, active_rate = ?, updated_at = NOW() WHERE metal = \'silver\'', [
    newSilverApi,
    newSilverActive,
  ]);

  if (silver.mode === 'api' && newSilverApi !== prevSilverActive) {
    const histId = uuidv4();
    await query(
      `INSERT INTO rate_history (id, metal, previous_rate, new_rate, mode, changed_by, source, changed_at)
       VALUES (?, 'silver', ?, ?, 'api', ?, ?, NOW())`,
      [histId, prevSilverActive, newSilverActive, adminUser ? adminUser.id : null, adminUser ? 'admin' : 'api']
    );
  }

  return {
    message: 'Rates refreshed successfully',
    gold: {
      api_rate: newGoldApi,
      active_rate: newGoldActive,
    },
    silver: {
      api_rate: newSilverApi,
      active_rate: newSilverActive,
    },
  };
}

export async function getRateHistory(metal = null, limit = 50) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
  let sql = 'SELECT * FROM rate_history';
  const params = [];

  if (metal && ['gold', 'silver'].includes(metal.toLowerCase().trim())) {
    sql += ' WHERE metal = ?';
    params.push(metal.toLowerCase().trim());
  }

  sql += ` ORDER BY changed_at DESC LIMIT ${safeLimit}`;
  const rows = await query(sql, params);

  const items = rows.map((r) => ({
    id: r.id,
    metal: r.metal,
    previous_rate: cleanRate(r.previous_rate),
    new_rate: cleanRate(r.new_rate),
    mode: r.mode,
    changed_by: r.changed_by,
    source: r.source,
    changed_at: r.changed_at,
  }));

  return {
    items,
    total: items.length,
  };
}

export default {
  getRatesPublic,
  getRatesAdmin,
  setCustomRates,
  refreshApiRates,
  getRateHistory,
  checkAndExpireRates,
};
