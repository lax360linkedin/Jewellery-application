/**
 * Test Admin Rates Save & Mode Toggle Flow
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8101;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testAdminRatesSaveFlow() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN RATES SAVE & CUSTOM/API SYNC FLOW <<<');
  console.log('=============================================================\n');

  let server;

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
    console.log('✓ 1. Admin logged in successfully with Admin JWT');

    // 2. Fetch Initial Rates
    const initialRatesRes = await axios.get(`${BASE_URL}/api/admin/rates`, { headers: adminHeaders });
    console.log('✓ 2. Fetched initial rates:');
    console.log(`     - Gold API: ₹${initialRatesRes.data.gold?.api_rate}, Active: ₹${initialRatesRes.data.gold?.active_rate} (${initialRatesRes.data.gold?.mode})`);
    console.log(`     - Silver API: ₹${initialRatesRes.data.silver?.api_rate}, Active: ₹${initialRatesRes.data.silver?.active_rate} (${initialRatesRes.data.silver?.mode})`);

    // 3. Save Custom Rates (Gold: 17000, Silver: 300)
    const customPayload = {
      gold_rate: 17000,
      silver_rate: 300,
      gold: { enabled: true, rate: 17000 },
      silver: { enabled: true, rate: 300 },
    };

    const saveCustomRes = await axios.post(`${BASE_URL}/api/admin/rates/custom`, customPayload, { headers: adminHeaders });
    console.log('✓ 3. Saved Custom Rates (Gold: ₹17000, Silver: ₹300)');

    // 4. Verify Admin Rates endpoint returns custom rates
    const updatedAdminRates = await axios.get(`${BASE_URL}/api/admin/rates`, { headers: adminHeaders });
    if (updatedAdminRates.data.gold?.active_rate !== 17000 || updatedAdminRates.data.silver?.active_rate !== 300) {
      throw new Error(`Expected Gold=17000, Silver=300 in Admin Rates, got: Gold=${updatedAdminRates.data.gold?.active_rate}, Silver=${updatedAdminRates.data.silver?.active_rate}`);
    }
    if (updatedAdminRates.data.gold?.mode !== 'custom' || updatedAdminRates.data.silver?.mode !== 'custom') {
      throw new Error('Expected modes to be custom in Admin Rates');
    }
    console.log('✓ 4. Verified Admin Rates shows Gold=₹17,000/g and Silver=₹300/g in custom mode');

    // 5. Verify Customer App Rates endpoint receives the exact same rates
    const customerRatesRes = await axios.get(`${BASE_URL}/api/rates`);
    if (customerRatesRes.data.gold_rate !== 17000 || customerRatesRes.data.silver_rate !== 300) {
      throw new Error(`Expected Customer App rates to receive Gold=17000, Silver=300, got: Gold=${customerRatesRes.data.gold_rate}, Silver=${customerRatesRes.data.silver_rate}`);
    }
    console.log('✓ 5. Verified Customer App endpoint (/api/rates) receives the exact same custom rates (Gold=₹17000, Silver=₹300)');

    // 6. Verify Unauthenticated request to /api/admin/rates/custom is rejected with 401
    try {
      await axios.post(`${BASE_URL}/api/admin/rates/custom`, customPayload);
      throw new Error('Expected unauthenticated request to fail with 401, but succeeded!');
    } catch (unauthErr) {
      if (unauthErr.response?.status === 401) {
        console.log('✓ 6. Verified unauthenticated request is correctly rejected with 401 Unauthorized');
      } else {
        throw unauthErr;
      }
    }

    // 7. Revert back to API mode (send disabled custom rates and refresh)
    await axios.post(
      `${BASE_URL}/api/admin/rates/custom`,
      {
        gold: { enabled: false },
        silver: { enabled: false },
        gold_rate: null,
        silver_rate: null,
      },
      { headers: adminHeaders }
    );
    await axios.post(`${BASE_URL}/api/admin/rates/refresh`, {}, { headers: adminHeaders });
    console.log('✓ 7. Reverted back to API mode via /api/admin/rates/custom + /refresh');

    const revertedAdminRates = await axios.get(`${BASE_URL}/api/admin/rates`, { headers: adminHeaders });
    if (revertedAdminRates.data.gold?.mode !== 'api' || revertedAdminRates.data.silver?.mode !== 'api') {
      throw new Error(`Expected modes to be api after revert, got gold=${revertedAdminRates.data.gold?.mode}, silver=${revertedAdminRates.data.silver?.mode}`);
    }
    console.log(`✓ 8. Verified rates reverted to Live API (Gold: ₹${revertedAdminRates.data.gold?.active_rate}/g, Silver: ₹${revertedAdminRates.data.silver?.active_rate}/g)`);

    console.log('\n=============================================================');
    console.log('>>> ALL ADMIN RATES SAVE & SYNC TESTS PASSED (0 ERRORS) <<<');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(process.exitCode || 0);
  }
}

testAdminRatesSaveFlow();
