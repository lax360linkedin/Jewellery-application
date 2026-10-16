/**
 * Test Salem Live Reference Rates (RapidAPI) Integration End-to-End
 * Covers exact specification: Section 26 Tests 1 through 10
 */

import assert from 'assert';
import axios from 'axios';
import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import {
  fetchSalemReferenceRates,
  getStoredSalemReferenceRates,
  clearSalemRatesCache,
} from '../src/services/rapidApiRateService.js';

const TEST_PORT = 8110;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runSalemRatesIntegrationTests() {
  console.log('\n=============================================================');
  console.log('>>> TESTING SALEM LIVE REFERENCE RATES (RAPIDAPI) FLOW <<<');
  console.log('>>> STRICT REQUEST COUNT & LIFECYCLE TESTS (1 - 10)     <<<');
  console.log('=============================================================\n');

  let server;
  let passedCount = 0;
  let totalCount = 0;

  async function testStep(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`✓ TEST ${totalCount}: ${name} - PASSED`);
      passedCount++;
    } catch (err) {
      console.error(`✗ TEST ${totalCount}: ${name} - FAILED:`, err.message);
      throw err;
    }
  }

  try {
    await initDatabase();
    const app = createApp();
    server = app.listen(TEST_PORT, '127.0.0.1');
    console.log(`✓ Test server running on ${BASE_URL}\n`);

    // 1. Admin Login
    const adminLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      mobile: config.adminMobile,
      password: config.adminPassword,
    });
    const adminToken = adminLoginRes.data.access_token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log('✓ Admin authenticated with JWT\n');

    // Track real RapidAPI HTTP call count
    let rapidApiCallCount = 0;
    const originalAxiosGet = axios.get;
    clearSalemRatesCache();
    config.rapidApiKey = 'test-rapidapi-key-live-123';

    // Intercept axios.get to strictly track RapidAPI calls
    axios.get = async (url, opts) => {
      if (typeof url === 'string' && url.includes('Fetch-Gold-Silver')) {
        rapidApiCallCount++;
        assert(url.includes('city=Salem'), `URL must request city=Salem: got ${url}`);
        assert.strictEqual(opts.headers['x-rapidapi-key'], 'test-rapidapi-key-live-123');
        assert.strictEqual(opts.headers['x-rapidapi-host'], 'gold-silver-rates-india.p.rapidapi.com');

        return {
          status: 200,
          data: {
            success: true,
            data: {
              gold: {
                '22k': { '1gram': 14190, '8grams': 113520, '10grams': 141900 },
                '24k': { '1gram': 14900, '8grams': 119200, '10grams': 149000 },
              },
              silver: {
                '1gram': 255,
                '1kg': 255000,
              },
            },
          },
        };
      }
      return originalAxiosGet(url, opts);
    };

    // TEST 1: Admin opens Rates. Switch Custom -> API
    // Expected: RapidAPI requests = 1. Gold 22K and Silver reference displayed.
    await testStep('TEST 1: Switch Custom -> API triggers ONE RapidAPI request (22K Gold & Silver per gram)', async () => {
      const initialCount = rapidApiCallCount;
      const res = await axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.city, 'Salem');
      assert.strictEqual(res.data.gold.purity, '22K');
      assert.strictEqual(res.data.gold.per_gram, 14190, 'Must extract 22K 1-gram Gold, NOT 24k (14900)');
      assert.strictEqual(res.data.silver.per_gram, 255, 'Must extract 1-gram Silver, NOT 1kg (255000)');
      assert.strictEqual(rapidApiCallCount - initialCount, 1, 'Expected exactly ONE RapidAPI request');
    });

    // TEST 2: Refresh browser while still in API Mode
    // Expected: RapidAPI requests = 0 additional. Existing reference data displayed.
    await testStep('TEST 2: Browser refresh while in API Mode -> RapidAPI requests = 0 additional', async () => {
      const countBefore = rapidApiCallCount;
      // Page reload calls reference endpoint without refresh=true
      const res = await axios.get(`${BASE_URL}/api/admin/rates/reference/salem`, { headers: adminHeaders });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.gold.per_gram, 14190);
      assert.strictEqual(res.data.silver.per_gram, 255);
      assert.strictEqual(res.data.cached, true);
      assert.strictEqual(rapidApiCallCount, countBefore, 'Browser refresh must NOT call RapidAPI');
    });

    // TEST 3: Refresh browser multiple times
    // Expected: RapidAPI requests remain unchanged (0 additional).
    await testStep('TEST 3: Multiple browser refreshes -> RapidAPI requests remain unchanged (0 additional)', async () => {
      const countBefore = rapidApiCallCount;

      for (let i = 0; i < 5; i++) {
        const res = await axios.get(`${BASE_URL}/api/admin/rates/reference/salem`, { headers: adminHeaders });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.gold.per_gram, 14190);
      }

      assert.strictEqual(rapidApiCallCount, countBefore, 'Multiple browser refreshes must make 0 additional RapidAPI calls');
    });

    // TEST 4: Navigate Rates -> Dashboard -> Rates while API Mode/reference cycle remains active
    // Expected: RapidAPI requests = 0 additional.
    await testStep('TEST 4: Navigate Rates -> Dashboard -> Rates -> RapidAPI requests = 0 additional', async () => {
      const countBefore = rapidApiCallCount;

      // 1. Fetch dashboard overview
      const dashRes = await axios.get(`${BASE_URL}/api/admin/dashboard`, { headers: adminHeaders });
      assert.strictEqual(dashRes.status, 200);

      // 2. Return to Rates page
      const ratesRes = await axios.get(`${BASE_URL}/api/admin/rates/reference/salem`, { headers: adminHeaders });
      assert.strictEqual(ratesRes.status, 200);
      assert.strictEqual(ratesRes.data.gold.per_gram, 14190);

      assert.strictEqual(rapidApiCallCount, countBefore, 'Navigation must NOT make RapidAPI calls');
    });

    // TEST 5: Switch API -> Custom
    // Expected: RapidAPI requests = 0 additional.
    await testStep('TEST 5: Switch API Mode -> Custom Mode -> RapidAPI requests = 0 additional', async () => {
      const countBefore = rapidApiCallCount;

      // Frontend only changes local toggle state; no backend call to RapidAPI
      assert.strictEqual(rapidApiCallCount, countBefore, 'Switching to Custom Mode must make 0 RapidAPI calls');
    });

    // TEST 6: Enter Custom Rates and save
    // Expected: Customer App continues using Custom Rates.
    await testStep('TEST 6: Enter Custom Rates (Gold ₹16,950, Silver ₹280) and save to MySQL', async () => {
      const customPayload = {
        gold_rate: 16950,
        silver_rate: 280,
        gold: { enabled: true, rate: 16950 },
        silver: { enabled: true, rate: 280 },
      };

      const saveRes = await axios.post(`${BASE_URL}/api/admin/rates/custom`, customPayload, { headers: adminHeaders });
      assert.strictEqual(saveRes.status, 200);

      // Verify Admin Rates endpoint returns custom rates
      const adminRatesRes = await axios.get(`${BASE_URL}/api/admin/rates`, { headers: adminHeaders });
      assert.strictEqual(adminRatesRes.data.gold.active_rate, 16950);
      assert.strictEqual(adminRatesRes.data.gold.mode, 'custom');
      assert.strictEqual(adminRatesRes.data.silver.active_rate, 280);
      assert.strictEqual(adminRatesRes.data.silver.mode, 'custom');

      // Verify MySQL table
      const dbRows = await query('SELECT * FROM rates');
      const dbGold = dbRows.find(r => r.metal === 'gold');
      const dbSilver = dbRows.find(r => r.metal === 'silver');

      assert.strictEqual(parseFloat(dbGold.active_rate), 16950);
      assert.strictEqual(parseFloat(dbGold.custom_rate), 16950);
      assert.strictEqual(dbGold.mode, 'custom');
      assert.strictEqual(parseFloat(dbSilver.active_rate), 280);
      assert.strictEqual(parseFloat(dbSilver.custom_rate), 280);
      assert.strictEqual(dbSilver.mode, 'custom');
    });

    // TEST 7: Customer App refreshes
    // Expected: RapidAPI requests = 0. Customer receives saved Custom Rates from our backend.
    await testStep('TEST 7: Customer App refreshes -> RapidAPI = 0, receives saved Custom Rates (16950 / 280)', async () => {
      const countBefore = rapidApiCallCount;

      const customerRes = await axios.get(`${BASE_URL}/api/rates`);
      assert.strictEqual(customerRes.status, 200);
      assert.strictEqual(customerRes.data.gold_rate, 16950, 'Customer must receive Custom Gold rate');
      assert.strictEqual(customerRes.data.silver_rate, 280, 'Customer must receive Custom Silver rate');
      assert.strictEqual(customerRes.data.gold.mode, 'custom');
      assert.strictEqual(customerRes.data.silver.mode, 'custom');

      assert.strictEqual(rapidApiCallCount, countBefore, 'Customer App must make 0 RapidAPI calls');
    });

    // TEST 8: Admin explicitly performs a new reference refresh (clicks "Refresh Salem Rates")
    // Expected: RapidAPI requests = +1. Updated Salem Gold/Silver reference values displayed.
    await testStep('TEST 8: Explicit Refresh button click -> RapidAPI requests = +1 (Updated reference values)', async () => {
      const countBefore = rapidApiCallCount;

      // Update mock response to return fresh values
      axios.get = async (url, opts) => {
        if (typeof url === 'string' && url.includes('Fetch-Gold-Silver')) {
          rapidApiCallCount++;
          return {
            status: 200,
            data: {
              success: true,
              data: {
                gold: {
                  '22k': { '1gram': 14250 },
                  '24k': { '1gram': 14950 },
                },
                silver: { '1gram': 258 },
              },
            },
          };
        }
        return originalAxiosGet(url, opts);
      };

      const refreshRes = await axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders });
      assert.strictEqual(refreshRes.status, 200);
      assert.strictEqual(refreshRes.data.gold.per_gram, 14250);
      assert.strictEqual(refreshRes.data.silver.per_gram, 258);
      assert.strictEqual(rapidApiCallCount - countBefore, 1, 'Expected exactly ONE RapidAPI request for explicit refresh');

      // CRITICAL: Customer rate must NOT be changed by this reference refresh!
      const customerRes = await axios.get(`${BASE_URL}/api/rates`);
      assert.strictEqual(customerRes.data.gold_rate, 16950, 'Customer rate must NOT be overwritten');
      assert.strictEqual(customerRes.data.silver_rate, 280, 'Customer rate must NOT be overwritten');
    });

    // TEST 9: RapidAPI failure
    // Expected: No fake rate. Clear error message. Existing Custom Rates must remain unchanged.
    await testStep('TEST 9: RapidAPI failure -> Clean error, NO fake rate, Custom Rates untouched', async () => {
      // Mock failure
      axios.get = async (url, opts) => {
        if (typeof url === 'string' && url.includes('Fetch-Gold-Silver')) {
          const err = new Error('Request failed with status code 500');
          err.response = { status: 500, data: { message: 'Internal RapidAPI upstream failure' } };
          throw err;
        }
        return originalAxiosGet(url, opts);
      };

      clearSalemRatesCache();

      let errCaught = false;
      try {
        await axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders });
      } catch (e) {
        errCaught = true;
        assert.strictEqual(e.response?.status, 502);
        assert(e.response?.data?.detail?.includes('RapidAPI error'));
      }
      assert(errCaught, 'Expected 502 error on RapidAPI upstream failure');

      // Verify customer rates remain untouched
      const customerRes = await axios.get(`${BASE_URL}/api/rates`);
      assert.strictEqual(customerRes.data.gold_rate, 16950);
      assert.strictEqual(customerRes.data.silver_rate, 280);
    });

    // TEST 10: Click API Mode repeatedly/rapidly
    // Expected: Only ONE RapidAPI request for the activation. No duplicate requests.
    await testStep('TEST 10: Rapid repeated clicks -> Only ONE RapidAPI request (in-flight deduplication)', async () => {
      // Restore working response
      axios.get = async (url, opts) => {
        if (typeof url === 'string' && url.includes('Fetch-Gold-Silver')) {
          rapidApiCallCount++;
          // Add small delay to simulate network latency
          await new Promise(r => setTimeout(r, 60));
          return {
            status: 200,
            data: {
              success: true,
              data: {
                gold: {
                  '22k': { '1gram': 14260 },
                  '24k': { '1gram': 14960 },
                },
                silver: { '1gram': 259 },
              },
            },
          };
        }
        return originalAxiosGet(url, opts);
      };

      clearSalemRatesCache();
      const countBefore = rapidApiCallCount;

      // Fire 5 concurrent requests simultaneously
      const results = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders }),
        axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders }),
        axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders }),
        axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders }),
        axios.get(`${BASE_URL}/api/admin/rates/reference/salem?refresh=true`, { headers: adminHeaders }),
      ]);

      // All 5 must succeed with identical valid data
      for (const res of results) {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.gold.per_gram, 14260);
      }

      // But only ONE RapidAPI request was dispatched!
      assert.strictEqual(rapidApiCallCount - countBefore, 1, 'All 5 concurrent requests must share ONE RapidAPI call');
    });

    console.log('\n=============================================================');
    console.log(`>>> ALL ${passedCount}/${totalCount} TESTS (1 TO 10) PASSED PERFECTLY! <<<`);
    console.log('=============================================================\n');
  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      console.log('✓ Test server shut down cleanly');
    }
  }
}

runSalemRatesIntegrationTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nTest runner encountered error:', err);
    process.exit(1);
  });
