/**
 * Test Admin Analytics Backend Flow & Real Data Verification
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8103;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testAdminAnalyticsFlow() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN ANALYTICS REAL DATABASE FLOW <<<');
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

    // 2. Fetch Direct MySQL Database Counts
    const dbPurchases = await query(
      "SELECT metal, SUM(quantity_grams) as total_grams, SUM(total_amount) as total_val, COUNT(*) as cnt FROM purchases WHERE status = 'completed' GROUP BY metal"
    );
    const dbGold = dbPurchases.find((p) => p.metal === 'gold') || { total_grams: 0, total_val: 0, cnt: 0 };
    const dbSilver = dbPurchases.find((p) => p.metal === 'silver') || { total_grams: 0, total_val: 0, cnt: 0 };

    // 3. Test Monthly Period Analytics
    const monthlyRes = await axios.get(`${BASE_URL}/api/admin/analytics`, {
      headers: adminHeaders,
      params: { period: 'Monthly (current month)' },
    });
    const monthlyData = monthlyRes.data;

    console.log('✓ 2. Fetched Monthly Analytics:');
    console.log(`     - Date Range: ${monthlyData.date_range_text}`);
    console.log(`     - Total Gold Bought: ${monthlyData.overall.total_gold_bought} g (Current Value: ₹${monthlyData.overall.total_gold_current_value})`);
    console.log(`     - Total Silver Bought: ${monthlyData.overall.total_silver_bought} g (Current Value: ₹${monthlyData.overall.total_silver_current_value})`);
    console.log(`     - Period Gold Grams: ${monthlyData.gold.grams} g · Value: ₹${monthlyData.gold.value}`);
    console.log(`     - Period Silver Grams: ${monthlyData.silver.grams} g · Value: ₹${monthlyData.silver.value}`);
    console.log(`     - Period Withdrawals: ₹${monthlyData.withdrawals.total_value}`);

    // Verify monthly date range starts with current year and month
    const now = new Date();
    const expectedMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (!monthlyData.date_range_text.includes(expectedMonthPrefix)) {
      throw new Error(`Expected date range to include ${expectedMonthPrefix}, got: ${monthlyData.date_range_text}`);
    }

    // Verify overall totals match MySQL
    if (parseFloat(monthlyData.overall.total_gold_bought) !== parseFloat(dbGold.total_grams)) {
      throw new Error(`Total gold mismatch: API=${monthlyData.overall.total_gold_bought}, DB=${dbGold.total_grams}`);
    }
    if (parseFloat(monthlyData.overall.total_silver_bought) !== parseFloat(dbSilver.total_grams)) {
      throw new Error(`Total silver mismatch: API=${monthlyData.overall.total_silver_bought}, DB=${dbSilver.total_grams}`);
    }

    // 4. Test Annually Period Analytics
    const annualRes = await axios.get(`${BASE_URL}/api/admin/analytics`, {
      headers: adminHeaders,
      params: { period: 'Annually (current year)', year: now.getFullYear().toString() },
    });
    const annualData = annualRes.data;
    console.log(`✓ 3. Fetched Annually Analytics: ${annualData.date_range_text}`);
    if (!annualData.date_range_text.includes(`${now.getFullYear()}-01-01`)) {
      throw new Error(`Expected annual date range to start with ${now.getFullYear()}-01-01`);
    }

    // 5. Test Quarterly Period Analytics
    const quarterlyRes = await axios.get(`${BASE_URL}/api/admin/analytics`, {
      headers: adminHeaders,
      params: { period: 'Quarterly', quarter: 'Q3 (Jul-Sep)', year: '2026' },
    });
    const quarterlyData = quarterlyRes.data;
    console.log(`✓ 4. Fetched Quarterly Analytics (Q3 2026): ${quarterlyData.date_range_text}`);
    if (!quarterlyData.date_range_text.includes('2026-07-01') || !quarterlyData.date_range_text.includes('2026-09-30')) {
      throw new Error(`Expected Q3 date range to be 2026-07-01 to 2026-09-30, got: ${quarterlyData.date_range_text}`);
    }

    // 6. Test Custom Date Range Analytics
    const customRes = await axios.get(`${BASE_URL}/api/admin/analytics`, {
      headers: adminHeaders,
      params: { period: 'Custom date range', from_date: '2026-09-01', to_date: '2026-09-30' },
    });
    const customData = customRes.data;
    console.log(`✓ 5. Fetched Custom Date Range Analytics: ${customData.date_range_text}`);
    if (customData.from_date !== '2026-09-01' || customData.to_date !== '2026-09-30') {
      throw new Error(`Expected custom dates 2026-09-01 to 2026-09-30, got: ${customData.from_date} to ${customData.to_date}`);
    }

    // 7. Verify Unauthenticated Request is rejected with 401
    try {
      await axios.get(`${BASE_URL}/api/admin/analytics`);
      throw new Error('Expected unauthenticated request to fail with 401');
    } catch (unauthErr) {
      if (unauthErr.response?.status === 401) {
        console.log('✓ 6. Verified unauthenticated request is correctly rejected with 401');
      } else {
        throw unauthErr;
      }
    }

    console.log('\n=============================================================');
    console.log('>>> ALL ADMIN ANALYTICS REAL DATA TESTS PASSED (0 ERRORS) <<<');
    console.log('=============================================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

testAdminAnalyticsFlow();
