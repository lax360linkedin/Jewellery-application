/**
 * End-to-End Test for Admin Notifications & KYC / Withdrawal Reviews & Actions
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8104;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function testNotificationsEndToEnd() {
  console.log('\n=============================================================');
  console.log('>>> TESTING ADMIN NOTIFICATIONS MODULE END-TO-END <<<');
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

    // 2. Customer Setup (Register/Login test customer)
    const testCustMobile = '9876543210';
    const testCustPass = 'Customer@123';
    let custToken;
    let custUser;

    try {
      const custRegRes = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Vijay Kumar',
        mobile: testCustMobile,
        email: 'vijay.notifications@example.com',
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
    console.log(`✓ 2. Customer logged in (ID: ${custUser.id}, Name: ${custUser.name || 'Vijay Kumar'})`);

    // Clean up any old KYC record for fresh testing
    await query('DELETE FROM kyc WHERE user_id = ?', [custUser.id]);
    await query("UPDATE users SET kyc_status = 'pending' WHERE id = ?", [custUser.id]);

    // 3. KYC Submission
    const kycSubmitRes = await axios.post(
      `${BASE_URL}/api/kyc/submit`,
      {
        full_name: 'Vijay Kumar',
        date_of_birth: '1995-05-15',
        gender: 'male',
        address: {
          address_line: '123 Anna Nagar',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600040',
        },
        id_type: 'pan',
        id_number: 'ABCDE1234F',
      },
      { headers: custHeaders }
    );
    const kycDoc = kycSubmitRes.data;
    console.log(`✓ 3. Customer submitted KYC (KYC ID: ${kycDoc.id}, Status: ${kycDoc.status})`);

    // 4. Admin Pending KYC List & Notifications
    const pendingKycRes = await axios.get(`${BASE_URL}/api/admin/kyc/pending`, { headers: adminHeaders });
    const pendingItem = (pendingKycRes.data.items || []).find((k) => k.user_id === custUser.id);
    if (!pendingItem) {
      throw new Error('Submitted KYC not found in pending KYC list');
    }
    console.log('✓ 4. Admin retrieved pending KYC with real customer data:');
    console.log(`     - Name: ${pendingItem.name}`);
    console.log(`     - Mobile: ${pendingItem.mobile}`);
    console.log(`     - Role: ${pendingItem.role}`);
    console.log(`     - ID Type/Number: ${pendingItem.id_type} ${pendingItem.id_number}`);

    // 5. Admin Reviews KYC Details
    const kycDetailRes = await axios.get(`${BASE_URL}/api/admin/kyc/${kycDoc.id}`, { headers: adminHeaders });
    if (!kycDetailRes.data?.kyc || !kycDetailRes.data?.user) {
      throw new Error('KYC details API did not return kyc or user object');
    }
    console.log('✓ 5. Admin reviewed detailed KYC record with address and profile');

    // 6. Admin Rejection with Reason
    const rejectReason = 'PAN photo is blurry. Please re-upload a clear copy.';
    const kycRejectRes = await axios.post(
      `${BASE_URL}/api/admin/kyc/${kycDoc.id}/reject`,
      { reason: rejectReason },
      { headers: adminHeaders }
    );
    if (kycRejectRes.data.status !== 'rejected') {
      throw new Error(`Expected status 'rejected', got: ${kycRejectRes.data.status}`);
    }

    const checkKycRejected = await query('SELECT status, rejection_reason FROM kyc WHERE id = ?', [kycDoc.id]);
    if (checkKycRejected[0]?.status !== 'rejected' || checkKycRejected[0]?.rejection_reason !== rejectReason) {
      throw new Error('Database KYC status or rejection reason did not match');
    }
    console.log(`✓ 6. Admin successfully rejected KYC with reason: "${rejectReason}"`);

    // 7. Customer Re-submits and Admin Approves KYC
    await axios.post(
      `${BASE_URL}/api/kyc/submit`,
      {
        full_name: 'Vijay Kumar',
        date_of_birth: '1995-05-15',
        gender: 'male',
        address: {
          address_line: '123 Anna Nagar',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600040',
        },
        id_type: 'pan',
        id_number: 'ABCDE1234F',
      },
      { headers: custHeaders }
    );

    const kycApproveRes = await axios.post(
      `${BASE_URL}/api/admin/kyc/${kycDoc.id}/approve`,
      {},
      { headers: adminHeaders }
    );
    if (kycApproveRes.data.status !== 'verified') {
      throw new Error(`Expected status 'verified', got: ${kycApproveRes.data.status}`);
    }

    const checkKycVerified = await query('SELECT status FROM kyc WHERE id = ?', [kycDoc.id]);
    const checkUserVerified = await query('SELECT kyc_status FROM users WHERE id = ?', [custUser.id]);
    if (checkKycVerified[0]?.status !== 'verified' || checkUserVerified[0]?.kyc_status !== 'verified') {
      throw new Error('Database KYC or User kyc_status is not verified');
    }
    console.log('✓ 7. Admin successfully approved KYC -> MySQL KYC status and User kyc_status both = verified');

    // 8. Withdrawal Flow: Customer has holding and requests withdrawal
    // Ensure customer has enough gold holding
    await query(
      `INSERT INTO holdings (id, user_id, gold_quantity, gold_reserved, gold_invested, gold_average_rate, silver_quantity, silver_reserved, silver_invested, silver_average_rate, created_at, updated_at)
       VALUES (UUID(), ?, 5.0000, 0.0000, 85000.00, 17000.00, 50.0000, 0.0000, 15000.00, 300.00, NOW(), NOW())
       ON DUPLICATE KEY UPDATE gold_quantity = 5.0000, gold_reserved = 0.0000, updated_at = NOW()`,
      [custUser.id]
    );

    // Refresh customer user in session
    custUser.kyc_status = 'verified';

    const wdRes = await axios.post(
      `${BASE_URL}/api/withdrawals`,
      {
        metal: 'gold',
        quantity_grams: 1.0,
        withdrawal_mode: 'physical',
      },
      { headers: custHeaders }
    );
    const wdDoc = wdRes.data;
    console.log(`✓ 8. Customer created Gold withdrawal (ID: ${wdDoc.withdrawal_id}, Amount: ₹${wdDoc.metal_value})`);

    // 9. Admin Retrieves Withdrawal Details
    const adminWdDetailRes = await axios.get(`${BASE_URL}/api/admin/withdrawals/${wdDoc.withdrawal_id}`, { headers: adminHeaders });
    const wdDetail = adminWdDetailRes.data;
    if (!wdDetail || wdDetail.status !== 'pending') {
      throw new Error('Admin withdrawal detail not returned or not pending');
    }
    console.log('✓ 9. Admin retrieved withdrawal detail:');
    console.log(`     - Customer: ${wdDetail.customer?.name} (${wdDetail.customer?.mobile})`);
    console.log(`     - Metal: ${wdDetail.metal} · ${wdDetail.quantity_grams} g`);
    console.log(`     - Value: ₹${wdDetail.metal_value} (Rate: ₹${wdDetail.rate_per_gram}/g)`);
    console.log(`     - Mode: ${wdDetail.withdrawal_mode}`);

    // 10. Admin Rejects Withdrawal with Reason
    const wdRejectReason = 'Address unreachable for physical delivery.';
    await axios.post(
      `${BASE_URL}/api/admin/withdrawals/${wdDoc.withdrawal_id}/reject`,
      { reason: wdRejectReason },
      { headers: adminHeaders }
    );
    const checkWdRejected = await query('SELECT status, rejection_reason FROM withdrawals WHERE id = ?', [wdDoc.withdrawal_id]);
    if (checkWdRejected[0]?.status !== 'rejected' || checkWdRejected[0]?.rejection_reason !== wdRejectReason) {
      throw new Error('Database withdrawal status or rejection reason did not match');
    }
    console.log(`✓ 10. Admin successfully rejected withdrawal with reason: "${wdRejectReason}"`);

    // 11. Customer Creates New Withdrawal and Admin Approves (Confirms Payment)
    const wdRes2 = await axios.post(
      `${BASE_URL}/api/withdrawals`,
      {
        metal: 'gold',
        quantity_grams: 1.0,
        withdrawal_mode: 'physical',
      },
      { headers: custHeaders }
    );
    const wdDoc2 = wdRes2.data;

    const wdApproveRes = await axios.post(
      `${BASE_URL}/api/admin/withdrawals/${wdDoc2.withdrawal_id}/approve`,
      {},
      { headers: adminHeaders }
    );
    if (wdApproveRes.data.status !== 'approved') {
      throw new Error(`Expected status 'approved', got: ${wdApproveRes.data.status}`);
    }

    const checkWdApproved = await query('SELECT status FROM withdrawals WHERE id = ?', [wdDoc2.withdrawal_id]);
    const checkHoldings = await query('SELECT gold_quantity, gold_reserved FROM holdings WHERE user_id = ?', [custUser.id]);
    if (checkWdApproved[0]?.status !== 'approved' || parseFloat(checkHoldings[0]?.gold_quantity) !== 4.0) {
      throw new Error(`Holdings or withdrawal status invalid after approval. Holdings: ${JSON.stringify(checkHoldings[0])}`);
    }
    console.log('✓ 11. Admin approved withdrawal -> MySQL withdrawal status = approved, gold_quantity deducted to 4.0000 g');

    // 12. Admin Notifications List & Read/Unread State
    const adminNotifsRes = await axios.get(`${BASE_URL}/api/admin/notifications`, { headers: adminHeaders });
    const notifsList = adminNotifsRes.data.items || [];
    console.log(`✓ 12. Admin retrieved ${notifsList.length} notifications from MySQL`);

    const unreadCountRes = await axios.get(`${BASE_URL}/api/admin/notifications/unread-count`, { headers: adminHeaders });
    console.log(`     - Unread Count: ${unreadCountRes.data.unread_count}`);

    if (notifsList.length > 0) {
      const firstNotifId = notifsList[0].notification_id;
      await axios.patch(`${BASE_URL}/api/admin/notifications/${firstNotifId}/read`, {}, { headers: adminHeaders });
      console.log(`✓ 13. Marked notification ${firstNotifId} as read`);
    }

    await axios.patch(`${BASE_URL}/api/admin/notifications/read-all`, {}, { headers: adminHeaders });
    console.log('✓ 14. Marked all admin notifications as read');

    console.log('\n=============================================================');
    console.log('>>> ALL ADMIN NOTIFICATIONS END-TO-END TESTS PASSED (0 ERRORS) <<<');
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

testNotificationsEndToEnd();
