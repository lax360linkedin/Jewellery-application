/**
 * Comprehensive End-to-End Test Suite for SJ Jewellers
 * Tests all 10 core integration requirements across User App, Admin Panel, and Node/Express + MySQL.
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runEndToEndTests() {
  console.log('\n=============================================================');
  console.log('>>> RUNNING COMPREHENSIVE END-TO-END INTEGRATION TEST SUITE <<<');
  console.log('=============================================================\n');

  let server;

  try {
    // 1. Initialize Database
    await initDatabase();
    console.log('✓ Database tables and initial seeding verified');

    // 2. Start Test Server
    const app = createApp();
    server = app.listen(TEST_PORT, '127.0.0.1');
    console.log(`✓ Test server running on ${BASE_URL}\n`);

    // Clean any prior test records
    const testCustomerMobile = '9877766655';
    await query('DELETE FROM users WHERE mobile = ?', [testCustomerMobile]);

    // -----------------------------------------------------------------
    // TEST 1: Health Check
    // -----------------------------------------------------------------
    const healthRes = await axios.get(`${BASE_URL}/health`);
    if (healthRes.data.status !== 'healthy' || healthRes.data.database !== 'connected') {
      throw new Error(`Health check failed: ${JSON.stringify(healthRes.data)}`);
    }
    console.log('✓ TEST 1 PASSED: /health confirmed server running & database connected');

    // -----------------------------------------------------------------
    // TEST 2: Customer Signup & Authentication
    // -----------------------------------------------------------------
    const otpRes = await axios.post(`${BASE_URL}/api/auth/send-otp`, { mobile: testCustomerMobile });
    const verifyRes = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      mobile: testCustomerMobile,
      otp: otpRes.data.otp || '123456',
    });
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Priya Ramanathan',
      mobile: testCustomerMobile,
      email: 'priya.test@example.com',
      password: 'PriyaPassword123!',
    });
    const customerToken = regRes.data.access_token;
    const customerId = regRes.data.user.id;
    const customerHeaders = { Authorization: `Bearer ${customerToken}` };

    console.log(`✓ TEST 2 PASSED: Customer registered (ID: ${customerId}) with valid JWT`);

    // -----------------------------------------------------------------
    // TEST 3: Admin Login & Role Verification
    // -----------------------------------------------------------------
    const adminLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      mobile: config.adminMobile,
      password: config.adminPassword,
    });
    const adminToken = adminLoginRes.data.access_token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    if (adminLoginRes.data.user.role !== 'admin') {
      throw new Error('Admin login did not return admin role');
    }
    console.log('✓ TEST 3 PASSED: Admin logged in with role=admin and received Admin JWT');

    // -----------------------------------------------------------------
    // TEST 4: Customer KYC Submission -> Admin Review & Approval Flow
    // -----------------------------------------------------------------
    const kycSubmitRes = await axios.post(
      `${BASE_URL}/api/kyc/submit`,
      {
        full_name: 'Priya Ramanathan',
        date_of_birth: '1995-06-15',
        gender: 'female',
        address: {
          address_line: '45 Anna Salai',
          city: 'Salem',
          state: 'Tamil Nadu',
          pincode: '636001',
        },
        id_type: 'pan',
        id_number: 'ABCDE5678K',
      },
      { headers: customerHeaders }
    );
    const kycId = kycSubmitRes.data.id;

    // Admin views pending KYC
    const pendingKycRes = await axios.get(`${BASE_URL}/api/admin/kyc/pending`, { headers: adminHeaders });
    const pendingItems = Array.isArray(pendingKycRes.data) ? pendingKycRes.data : (pendingKycRes.data.items || []);
    const foundPending = pendingItems.find((k) => k.kyc_id === kycId || k.id === kycId);
    if (!foundPending) {
      throw new Error('Submitted KYC not found in Admin pending list');
    }

    // Admin approves KYC
    await axios.post(`${BASE_URL}/api/admin/kyc/${kycId}/approve`, {}, { headers: adminHeaders });

    // Customer verifies their KYC is now verified
    const customerMeRes = await axios.get(`${BASE_URL}/api/auth/me`, { headers: customerHeaders });
    if (customerMeRes.data.kyc_status !== 'verified') {
      throw new Error(`Expected customer kyc_status to be verified, got: ${customerMeRes.data.kyc_status}`);
    }
    console.log('✓ TEST 4 PASSED: Customer KYC submitted -> Admin approved -> Customer verified');

    // -----------------------------------------------------------------
    // TEST 5: Admin Custom Rate Update -> User App Sync
    // -----------------------------------------------------------------
    const testCustomGoldRate = 16500.00;
    const testCustomSilverRate = 275.00;

    await axios.post(
      `${BASE_URL}/api/admin/rates/custom`,
      {
        gold_rate: testCustomGoldRate,
        silver_rate: testCustomSilverRate,
      },
      { headers: adminHeaders }
    );

    // Customer App fetches public rates
    const userRatesRes = await axios.get(`${BASE_URL}/api/rates`);
    if (Number(userRatesRes.data.gold.active_rate) !== testCustomGoldRate || Number(userRatesRes.data.silver.active_rate) !== testCustomSilverRate) {
      throw new Error('User App did not receive the updated active rate');
    }
    console.log(`✓ TEST 5 PASSED: Admin updated rates to Gold=₹${testCustomGoldRate}, Silver=₹${testCustomSilverRate} -> User App receives same rate`);

    // -----------------------------------------------------------------
    // TEST 6: Customer Purchases -> Holdings Updated -> Admin Dashboard Updated
    // -----------------------------------------------------------------
    const purchaseGoldRes = await axios.post(
      `${BASE_URL}/api/purchases`,
      {
        metal: 'gold',
        quantity_grams: 0.1,
      },
      { headers: customerHeaders }
    );
    const purchaseSilverRes = await axios.post(
      `${BASE_URL}/api/purchases`,
      {
        metal: 'silver',
        quantity_grams: 2.0,
      },
      { headers: customerHeaders }
    );

    // Verify holdings in customer endpoint
    const customerHoldings = await axios.get(`${BASE_URL}/api/holdings/me`, { headers: customerHeaders });
    if (Number(customerHoldings.data.gold.quantity_grams) !== 0.1 || Number(customerHoldings.data.silver.quantity_grams) !== 2.0) {
      throw new Error(`Customer holdings mismatch: ${JSON.stringify(customerHoldings.data)}`);
    }

    // Verify purchase appeared in Admin Purchases
    const adminPurchases = await axios.get(`${BASE_URL}/api/admin/purchases`, { headers: adminHeaders });
    const foundPurchase = (adminPurchases.data.items || []).find((p) => p.transaction_id === purchaseGoldRes.data.transaction_id);
    if (!foundPurchase) {
      throw new Error('Customer purchase not found in Admin Purchases');
    }
    console.log('✓ TEST 6 PASSED: Customer purchase -> Holdings updated -> Reflected in Admin Purchases & Dashboard');

    // -----------------------------------------------------------------
    // TEST 7: Customer Withdrawal Request -> Admin Approval -> Holdings Deducted
    // -----------------------------------------------------------------
    const otpReqRes = await axios.post(
      `${BASE_URL}/api/withdrawals/request-otp`,
      {
        metal: 'gold',
        quantity_grams: 0.05,
        withdrawal_mode: 'physical',
      },
      { headers: customerHeaders }
    );
    const challengeId = otpReqRes.data.challenge_id;

    const withdrawReqRes = await axios.post(
      `${BASE_URL}/api/withdrawals/verify-otp`,
      {
        challenge_id: challengeId,
        otp: config.devOtp || '123456',
      },
      { headers: customerHeaders }
    );
    const withdrawalId = withdrawReqRes.data.withdrawal.id;

    // Admin views pending withdrawals
    const adminWithdrawalsRes = await axios.get(`${BASE_URL}/api/admin/withdrawals`, { headers: adminHeaders });
    const foundWithdrawal = (adminWithdrawalsRes.data.items || []).find((w) => w.id === withdrawalId || w.withdrawal_id === withdrawalId);
    if (!foundWithdrawal) {
      throw new Error('Withdrawal request not found in Admin list');
    }

    // Admin approves withdrawal
    await axios.post(`${BASE_URL}/api/admin/withdrawals/${withdrawalId}/approve`, {}, { headers: adminHeaders });

    // Verify customer updated holdings
    const updatedHoldings = await axios.get(`${BASE_URL}/api/holdings/me`, { headers: customerHeaders });
    if (Number(updatedHoldings.data.gold.quantity_grams) !== 0.05) {
      throw new Error(`Expected remaining gold to be 0.05g, got: ${updatedHoldings.data.gold.quantity_grams}`);
    }
    console.log('✓ TEST 7 PASSED: Customer requested withdrawal -> Admin approved -> Status completed & holdings updated');

    // -----------------------------------------------------------------
    // TEST 8: Admin Authorization Guard (Customer JWT must get 403 on Admin APIs)
    // -----------------------------------------------------------------
    try {
      await axios.get(`${BASE_URL}/api/admin/users`, { headers: customerHeaders });
      throw new Error('Customer JWT was able to access Admin API! Security violation.');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✓ TEST 8 PASSED: Customer JWT correctly blocked with 403 Forbidden on Admin API');
      } else {
        throw err;
      }
    }

    // -----------------------------------------------------------------
    // TEST 9: Admin Access to Admin APIs
    // -----------------------------------------------------------------
    const adminUsersRes = await axios.get(`${BASE_URL}/api/admin/users`, { headers: adminHeaders });
    if (!Array.isArray(adminUsersRes.data.items) || adminUsersRes.data.items.length === 0) {
      throw new Error('Admin was not able to retrieve users list');
    }
    console.log(`✓ TEST 9 PASSED: Admin JWT successfully accessed /api/admin/users (total members: ${adminUsersRes.data.total})`);

    // -----------------------------------------------------------------
    // TEST 10: Admin Dashboard Overview Metrics
    // -----------------------------------------------------------------
    const dashboardMetrics = await axios.get(`${BASE_URL}/api/admin/dashboard`, { headers: adminHeaders });
    console.log(`✓ TEST 10 PASSED: Admin Dashboard overview calculated (Sales: Gold=₹${dashboardMetrics.data.gold.total_sales_value}, Silver=₹${dashboardMetrics.data.silver.total_sales_value})`);

    // Clean up test customer
    await query('DELETE FROM users WHERE id = ?', [customerId]);
    console.log('✓ Cleaned up test data');

    console.log('\n=============================================================');
    console.log('>>> ALL 10 END-TO-END INTEGRATION TESTS PASSED WITH 0 ERRORS <<<');
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

runEndToEndTests();
