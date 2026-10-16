/**
 * End-to-End Test for Admin Members Module & Customer Data Consistency
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testAdminMembersEndToEnd() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN MEMBERS MODULE END-TO-END <<<');
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

    // 2. Setup / Fetch Real Test Customer
    const testCustMobile = '9876543210';
    const testCustPass = 'Customer@123';
    let custToken;
    let custUser;

    try {
      const custRegRes = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Vijay Kumar',
        mobile: testCustMobile,
        email: 'vijay.members@example.com',
        password: testCustPass,
      });
      custToken = custRegRes.data.access_token;
      custUser = custRegRes.data.user;
    } catch (e) {
      const custLogRes = await axios.post(`${BASE_URL}/api/auth/login`, {
        mobile: testCustMobile,
        password: testCustPass,
      });
      custToken = custLogRes.data.access_token;
      custUser = custLogRes.data.user;
    }
    const custHeaders = { Authorization: `Bearer ${custToken}` };
    console.log(`✓ 2. Test Customer ready (ID: ${custUser.id}, Name: ${custUser.name})`);

    // 3. Test Members List API (GET /api/admin/users)
    const membersRes = await axios.get(`${BASE_URL}/api/admin/users?limit=20`, { headers: adminHeaders });
    const membersList = membersRes.data.items || [];
    if (membersList.length === 0) {
      throw new Error('No members returned by /api/admin/users');
    }
    console.log(`✓ 3. Fetched ${membersList.length} members from MySQL`);
    const foundCust = membersList.find((m) => m.id === custUser.id);
    if (!foundCust) {
      throw new Error(`Customer ${custUser.id} not found in members list`);
    }
    console.log(`     - Found Customer: ${foundCust.name} (${foundCust.mobile}), Role: ${foundCust.role}, Status: ${foundCust.account_status}`);

    // 4. Test Search by Name / Mobile
    const searchRes = await axios.get(`${BASE_URL}/api/admin/users?search=${encodeURIComponent(testCustMobile)}`, { headers: adminHeaders });
    const searchItems = searchRes.data.items || [];
    if (searchItems.length === 0 || !searchItems.some((m) => m.id === custUser.id)) {
      throw new Error('Search by customer mobile failed');
    }
    console.log(`✓ 4. Search by mobile "${testCustMobile}" successfully returned customer record`);

    // 5. Test Member Detail API (GET /api/admin/users/:id)
    const detailRes = await axios.get(`${BASE_URL}/api/admin/users/${custUser.id}`, { headers: adminHeaders });
    const memberDetail = detailRes.data;
    if (!memberDetail || memberDetail.id !== custUser.id) {
      throw new Error('Invalid member details returned');
    }
    console.log('✓ 5. Fetched real member details:');
    console.log(`     - Name: ${memberDetail.name}`);
    console.log(`     - Mobile: ${memberDetail.mobile}`);
    console.log(`     - KYC Status: ${memberDetail.kyc_status}`);
    console.log(`     - Gold Holdings: ${memberDetail.holdings?.gold?.quantity_grams} g (Valuation: ₹${memberDetail.holdings?.gold?.current_value})`);
    console.log(`     - Silver Holdings: ${memberDetail.holdings?.silver?.quantity_grams} g (Valuation: ₹${memberDetail.holdings?.silver?.current_value})`);
    console.log(`     - Transactions Count: ${(memberDetail.transactions || []).length}`);
    console.log(`     - Withdrawals Count: ${(memberDetail.withdrawals || []).length}`);

    // 6. Test Data Consistency between Customer App & Admin Members
    const custHoldingsRes = await axios.get(`${BASE_URL}/api/holdings`, { headers: custHeaders });
    const custHoldings = custHoldingsRes.data;

    if (parseFloat(memberDetail.holdings?.gold?.quantity_grams) !== parseFloat(custHoldings.gold?.quantity_grams)) {
      throw new Error(`Gold quantity mismatch: Admin=${memberDetail.holdings?.gold?.quantity_grams}, CustomerApp=${custHoldings.gold?.quantity_grams}`);
    }
    if (parseFloat(memberDetail.holdings?.silver?.quantity_grams) !== parseFloat(custHoldings.silver?.quantity_grams)) {
      throw new Error(`Silver quantity mismatch: Admin=${memberDetail.holdings?.silver?.quantity_grams}, CustomerApp=${custHoldings.silver?.quantity_grams}`);
    }
    console.log('✓ 6. Verified 100% strict data consistency between Customer App holdings & Admin Member Details');

    // 7. Test User Status Management (Ban / Unban)
    await axios.post(`${BASE_URL}/api/admin/users/${custUser.id}/ban`, {}, { headers: adminHeaders });
    const checkBanned = await query('SELECT account_status FROM users WHERE id = ?', [custUser.id]);
    if (checkBanned[0]?.account_status !== 'banned') {
      throw new Error('User status was not updated to banned in MySQL');
    }
    console.log('✓ 7. Banned user via Admin API -> MySQL account_status = banned');

    await axios.post(`${BASE_URL}/api/admin/users/${custUser.id}/unban`, {}, { headers: adminHeaders });
    const checkActive = await query('SELECT account_status FROM users WHERE id = ?', [custUser.id]);
    if (checkActive[0]?.account_status !== 'active') {
      throw new Error('User status was not updated to active in MySQL');
    }
    console.log('✓ 8. Unbanned user via Admin API -> MySQL account_status = active');

    // 8. Test Unauthorized Access (Non-admin token rejected)
    try {
      await axios.get(`${BASE_URL}/api/admin/users`, { headers: custHeaders });
      throw new Error('Customer token should have been rejected with 403 for admin users API');
    } catch (unauthErr) {
      if (unauthErr.response?.status === 403 || unauthErr.response?.status === 401) {
        console.log('✓ 9. Verified Customer token is rejected with 403/401 when accessing Admin Members API');
      } else {
        throw unauthErr;
      }
    }

    console.log('\n=============================================================');
    console.log('>>> ALL ADMIN MEMBERS END-TO-END TESTS PASSED (0 ERRORS) <<<');
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

testAdminMembersEndToEnd();
