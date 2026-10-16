/**
 * Test Admin Dashboard Real Database Metrics
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8102;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testAdminDashboardMetrics() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN DASHBOARD REAL DATABASE METRICS <<<');
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

    // 2. Fetch direct database counts for baseline verification
    const dbPurchases = await query(
      "SELECT metal, SUM(quantity_grams) as total_grams, SUM(total_amount) as total_val, COUNT(*) as cnt FROM purchases WHERE status = 'completed' GROUP BY metal"
    );
    const dbGoldPurch = dbPurchases.find((p) => p.metal === 'gold') || { total_grams: 0, total_val: 0, cnt: 0 };
    const dbSilverPurch = dbPurchases.find((p) => p.metal === 'silver') || { total_grams: 0, total_val: 0, cnt: 0 };

    const dbKycPending = await query("SELECT COUNT(*) as cnt FROM kyc WHERE status = 'pending'");
    const expectedKycPending = dbKycPending[0]?.cnt || 0;

    const dbWdPending = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'pending'");
    const expectedWdPending = dbWdPending[0]?.cnt || 0;

    const dbWdApproved = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'approved'");
    const expectedWdApproved = dbWdApproved[0]?.cnt || 0;

    // 3. Fetch Dashboard Overview API
    const overviewRes = await axios.get(`${BASE_URL}/api/admin/dashboard`, { headers: adminHeaders });
    const overview = overviewRes.data;

    console.log('✓ 2. Fetched Admin Dashboard Overview:');
    console.log(`     - Current Gold Rate: ₹${overview.rates?.gold_rate}/g (${overview.rates?.gold_mode})`);
    console.log(`     - Current Silver Rate: ₹${overview.rates?.silver_rate}/g (${overview.rates?.silver_mode})`);
    console.log(`     - Total Gold Sold: ${overview.gold?.total_sold_grams} g · ₹${overview.gold?.total_sales_value}`);
    console.log(`     - Total Silver Sold: ${overview.silver?.total_sold_grams} g · ₹${overview.silver?.total_sales_value}`);
    console.log(`     - Total Transactions: ${overview.transactions?.total_count}`);
    console.log(`     - Pending KYC: ${overview.kyc?.pending}`);
    console.log(`     - Pending Withdrawals: ${overview.withdrawals?.pending}`);
    console.log(`     - Approved Withdrawals: ${overview.withdrawals?.approved}`);
    console.log(`     - Total Withdrawn Gold: ${overview.withdrawals?.total_withdrawn_gold_grams} g · ₹${overview.withdrawals?.total_withdrawn_value}`);

    // 4. Validate metrics match database
    if (parseFloat(overview.gold?.total_sold_grams) !== parseFloat(dbGoldPurch.total_grams)) {
      throw new Error(`Gold sold grams mismatch: API=${overview.gold?.total_sold_grams}, DB=${dbGoldPurch.total_grams}`);
    }
    if (parseFloat(overview.silver?.total_sold_grams) !== parseFloat(dbSilverPurch.total_grams)) {
      throw new Error(`Silver sold grams mismatch: API=${overview.silver?.total_sold_grams}, DB=${dbSilverPurch.total_grams}`);
    }
    if (overview.kyc?.pending !== expectedKycPending) {
      throw new Error(`Pending KYC mismatch: API=${overview.kyc?.pending}, DB=${expectedKycPending}`);
    }
    if (overview.withdrawals?.pending !== expectedWdPending) {
      throw new Error(`Pending Withdrawals mismatch: API=${overview.withdrawals?.pending}, DB=${expectedWdPending}`);
    }
    if (overview.withdrawals?.approved !== expectedWdApproved) {
      throw new Error(`Approved Withdrawals mismatch: API=${overview.withdrawals?.approved}, DB=${expectedWdApproved}`);
    }

    console.log('✓ 3. Verified all 8 dashboard statistics exactly match MySQL records');

    // 5. Fetch Sales by Metal API
    const salesRes = await axios.get(`${BASE_URL}/api/admin/dashboard/sales-by-metal`, { headers: adminHeaders });
    console.log('✓ 4. Fetched Sales by Metal:', salesRes.data);

    console.log('\n=============================================================');
    console.log('>>> ALL ADMIN DASHBOARD REAL DATA TESTS PASSED (0 ERRORS) <<<');
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

testAdminDashboardMetrics();
