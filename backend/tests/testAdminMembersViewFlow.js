/**
 * Test Admin Members View & KYC Flow with real database user (Vijay)
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testAdminMembersViewFlow() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN MEMBERS VIEW & KYC APPROVAL FLOW <<<');
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

    // 2. Fetch Members List
    const usersRes = await axios.get(`${BASE_URL}/api/admin/users`, { headers: adminHeaders });
    const items = usersRes.data.items || [];
    console.log(`✓ 2. Fetched members list (Total: ${items.length})`);

    const vijaySummary = items.find((u) => u.mobile === '6382426186' || u.name.toLowerCase() === 'vijay');
    if (!vijaySummary) {
      throw new Error('Vijay record not found in users list');
    }
    console.log(`✓ Found Vijay: ID=${vijaySummary.id}, Name=${vijaySummary.name}, Mobile=${vijaySummary.mobile}`);

    // 3. View Vijay's Member Details via GET /api/admin/users/:id
    const vijayDetailRes = await axios.get(`${BASE_URL}/api/admin/users/${vijaySummary.id}`, { headers: adminHeaders });
    const vijayDetail = vijayDetailRes.data;

    console.log('✓ 3. Fetched Vijay details successfully:');
    console.log(`     - Customer Name: ${vijayDetail.name}`);
    console.log(`     - Mobile Number: ${vijayDetail.mobile}`);
    console.log(`     - User ID: ${vijayDetail.user_id}`);
    console.log(`     - Role: ${vijayDetail.role}`);
    console.log(`     - Account Status: ${vijayDetail.account_status}`);
    console.log(`     - KYC Status: ${vijayDetail.kyc_status}`);
    console.log(`     - KYC Record ID: ${vijayDetail.kyc?.id || 'None'}`);
    console.log(`     - KYC ID Type: ${vijayDetail.kyc?.id_type || 'None'}`);
    console.log(`     - KYC ID Number: ${vijayDetail.kyc?.id_number || 'None'}`);
    console.log(`     - Gold Holdings: ${vijayDetail.holdings?.gold?.quantity_grams} gm (₹${vijayDetail.holdings?.gold?.current_value})`);
    console.log(`     - Silver Holdings: ${vijayDetail.holdings?.silver?.quantity_grams} gm (₹${vijayDetail.holdings?.silver?.current_value})`);

    if (!vijayDetail.kyc || !vijayDetail.kyc.id) {
      throw new Error('Vijay has no KYC record to approve');
    }

    const kycId = vijayDetail.kyc.id;

    // Reset status to pending so approval flow can run reliably
    await query("UPDATE users SET kyc_status = 'pending' WHERE id = ?", [vijaySummary.id]);
    await query("UPDATE kyc SET status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE id = ?", [kycId]);

    // 4. Admin Approves Vijay's KYC via POST /api/admin/kyc/:kycId/approve
    const approveRes = await axios.post(`${BASE_URL}/api/admin/kyc/${kycId}/approve`, {}, { headers: adminHeaders });
    console.log(`✓ 4. Admin approved Vijay's KYC (Response: ${approveRes.data.message || 'Approved'})`);

    // 5. Verify Vijay's Details now shows Verified in Backend
    const updatedDetailRes = await axios.get(`${BASE_URL}/api/admin/users/${vijaySummary.id}`, { headers: adminHeaders });
    if (updatedDetailRes.data.kyc_status !== 'verified') {
      throw new Error(`Expected Vijay kyc_status to be 'verified', got '${updatedDetailRes.data.kyc_status}'`);
    }
    console.log("✓ 5. Verified Vijay's KYC status updated to 'verified' in backend");

    // 6. Verify Members Table returns KYC Verified = 'verified'
    const updatedUsersRes = await axios.get(`${BASE_URL}/api/admin/users`, { headers: adminHeaders });
    const updatedVijay = (updatedUsersRes.data.items || []).find((u) => u.id === vijaySummary.id);
    if (updatedVijay.kyc_status !== 'verified') {
      throw new Error(`Expected Vijay in members table to have kyc_status 'verified', got '${updatedVijay.kyc_status}'`);
    }
    console.log("✓ 6. Verified Members table shows Vijay KYC status as 'verified'");

    // 7. Reset Vijay's KYC back to 'pending' in MySQL so the user can test the live UI interactively in their browser
    await query("UPDATE users SET kyc_status = 'pending' WHERE id = ?", [vijaySummary.id]);
    await query("UPDATE kyc SET status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE id = ?", [kycId]);
    console.log("✓ 7. Restored Vijay's KYC status to 'pending' for live browser testing");

    console.log('\n=============================================================');
    console.log('>>> ALL ADMIN MEMBERS VIEW & KYC TESTS PASSED (0 ERRORS) <<<');
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

testAdminMembersViewFlow();
