/**
 * Test Admin Notifications Pending User Verification Flow
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8100;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testAdminNotificationsFlow() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN NOTIFICATIONS PENDING KYC VERIFICATION FLOW <<<');
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
    console.log('✓ 1. Admin logged in successfully');

    // 2. Fetch Pending KYC List (Notifications source)
    const pendingRes = await axios.get(`${BASE_URL}/api/admin/kyc/pending`, { headers: adminHeaders });
    const pendingItems = pendingRes.data.items || [];
    console.log(`✓ 2. Fetched pending KYC list (Total pending: ${pendingItems.length})`);

    const vijayItem = pendingItems.find((k) => k.mobile === '6382426186' || k.name.toLowerCase() === 'vijay');
    if (!vijayItem) {
      throw new Error("Vijay not found in pending KYC list. Please ensure Vijay's KYC is pending.");
    }

    console.log('✓ 3. Verified Vijay in pending notifications list:');
    console.log(`     - Name: "${vijayItem.name}" (NOT blank/Customer)`);
    console.log(`     - Mobile: "${vijayItem.mobile}" (NOT blank)`);
    console.log(`     - Role: "${vijayItem.role}" (NOT blank)`);
    console.log(`     - User ID: "${vijayItem.user_id}"`);
    console.log(`     - KYC ID: "${vijayItem.kyc_id}"`);
    console.log(`     - ID Type: "${vijayItem.id_type}"`);
    console.log(`     - ID Number: "${vijayItem.id_number}"`);
    console.log(`     - Account Created At: "${vijayItem.user_created_at}"`);

    if (!vijayItem.name || !vijayItem.mobile || !vijayItem.role || !vijayItem.user_created_at) {
      throw new Error('Pending notification item has blank/missing fields!');
    }

    // 4. Test "Tap to review" data fetch via GET /api/admin/users/:id
    const userDetailRes = await axios.get(`${BASE_URL}/api/admin/users/${vijayItem.user_id}`, { headers: adminHeaders });
    const userDetail = userDetailRes.data;
    console.log('✓ 4. Fetched real-time user details for modal:');
    console.log(`     - Display Name: ${userDetail.name}`);
    console.log(`     - Mobile: ${userDetail.mobile}`);
    console.log(`     - KYC Status: ${userDetail.kyc_status}`);
    console.log(`     - KYC Document ID: ${userDetail.kyc?.id}`);

    // 5. Test KYC Approval via POST /api/admin/kyc/:kycId/approve
    const kycId = vijayItem.kyc_id;
    const approveRes = await axios.post(`${BASE_URL}/api/admin/kyc/${kycId}/approve`, {}, { headers: adminHeaders });
    console.log(`✓ 5. Approved KYC for Vijay: ${approveRes.data.message || 'Success'}`);

    // 6. Verify Vijay is NO LONGER in pending KYC list
    const updatedPendingRes = await axios.get(`${BASE_URL}/api/admin/kyc/pending`, { headers: adminHeaders });
    const updatedPendingItems = updatedPendingRes.data.items || [];
    const foundAfter = updatedPendingItems.find((k) => k.kyc_id === kycId);
    if (foundAfter) {
      throw new Error('Vijay is still appearing in pending KYC list after approval!');
    }
    console.log('✓ 6. Verified Vijay has been removed from pending notifications list');

    // 7. Verify Vijay in Users table has kyc_status === 'verified'
    const updatedUserDetail = await axios.get(`${BASE_URL}/api/admin/users/${vijayItem.user_id}`, { headers: adminHeaders });
    if (updatedUserDetail.data.kyc_status !== 'verified') {
      throw new Error(`Expected Vijay kyc_status to be 'verified', got: ${updatedUserDetail.data.kyc_status}`);
    }
    console.log("✓ 7. Verified Vijay's status is now 'verified' in backend database");

    // 8. Restore Vijay's status back to 'pending' in MySQL so the user can test the live UI in browser
    await query("UPDATE users SET kyc_status = 'pending' WHERE id = ?", [vijayItem.user_id]);
    await query("UPDATE kyc SET status = 'pending', reviewed_at = NULL, reviewed_by = NULL WHERE id = ?", [kycId]);
    console.log("✓ 8. Restored Vijay's KYC status to 'pending' for live browser testing");

    console.log('\n=============================================================');
    console.log('>>> ALL NOTIFICATIONS PENDING KYC TESTS PASSED (0 ERRORS) <<<');
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

testAdminNotificationsFlow();
