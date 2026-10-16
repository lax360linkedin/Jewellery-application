/**
 * End-to-End Customer App Integration Test
 * Verifies all API endpoints used by the React Native application against Node.js/Express/MySQL.
 */

import { initDatabase, query } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import axios from 'axios';

const TEST_PORT = 8099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runIntegrationTest() {
  console.log('=== STARTING FULL CUSTOMER INTEGRATION TEST ===');
  let server;

  try {
    // 1. Initialize Database
    await initDatabase();
    console.log('✓ Database initialized');

    // 2. Start Express app on test port
    const app = createApp();
    server = app.listen(TEST_PORT, '127.0.0.1');
    console.log(`✓ Test server running on ${BASE_URL}`);

    // Clean any prior test user with mobile 9888877777
    const testMobile = '9888877777';
    await query('DELETE FROM users WHERE mobile = ?', [testMobile]);

    // TEST 1: Health Check
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Test 1: Health check status:', healthRes.data.status);

    // TEST 2: Rates
    const ratesRes = await axios.get(`${BASE_URL}/api/rates`);
    console.log('✓ Test 2: Live rates: Gold =', ratesRes.data.gold.active_rate, ', Silver =', ratesRes.data.silver.active_rate);

    // TEST 3: Send OTP
    const otpRes = await axios.post(`${BASE_URL}/api/auth/send-otp`, { mobile: testMobile });
    console.log('✓ Test 3: OTP dispatched:', otpRes.data.otp);

    // TEST 4: Verify OTP
    const verifyRes = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
      mobile: testMobile,
      otp: otpRes.data.otp,
    });
    console.log('✓ Test 4: OTP verified:', verifyRes.data.valid);

    // TEST 5: Register User
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'Integration Test User',
      mobile: testMobile,
      email: 'testuser_int@example.com',
      password: 'password123',
    });
    const token = regRes.data.access_token;
    const userId = regRes.data.user.id;
    console.log('✓ Test 5: User registered. ID:', userId, 'Token received:', !!token);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // TEST 6: Get Me
    const meRes = await axios.get(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
    console.log('✓ Test 6: GET /api/auth/me name:', meRes.data.name, 'role:', meRes.data.role);

    // TEST 7: Login User
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      mobile: testMobile,
      password: 'password123',
    });
    console.log('✓ Test 7: POST /api/auth/login successful:', !!loginRes.data.access_token);

    // TEST 8: Complete Profile
    const profileRes = await axios.patch(
      `${BASE_URL}/api/profile/me`,
      {
        full_name: 'Integration Test User',
        address: {
          address_line: '123 Test Street',
          city: 'Salem',
          state: 'Tamil Nadu',
          pincode: '636001',
        },
        pan: 'ABCDE1234F',
        aadhar: '123456789012',
        nominee_name: 'Jane Doe',
        nominee_mobile: '9876543210',
        relationship: 'spouse',
      },
      { headers: authHeaders }
    );
    console.log('✓ Test 8: Profile updated. profile_completed:', profileRes.data.profile_completed);

    // TEST 9: Submit KYC
    const kycRes = await axios.post(
      `${BASE_URL}/api/kyc/submit`,
      {
        full_name: 'Integration Test User',
        date_of_birth: '1990-01-01',
        gender: 'female',
        address: {
          address_line: '123 Test Street',
          city: 'Salem',
          state: 'Tamil Nadu',
          pincode: '636001',
        },
        id_type: 'pan',
        id_number: 'ABCDE1234F',
      },
      { headers: authHeaders }
    );
    console.log('✓ Test 9: KYC submitted. Status:', kycRes.data.status);

    // TEST 10: Buy Gold
    const buyGoldRes = await axios.post(
      `${BASE_URL}/api/purchases`,
      {
        metal: 'gold',
        quantity_grams: 0.05,
      },
      { headers: authHeaders }
    );
    console.log('✓ Test 10: Gold purchased. Txn ID:', buyGoldRes.data.transaction_id, 'Total:', buyGoldRes.data.total_amount);

    // TEST 11: Buy Silver
    const buySilverRes = await axios.post(
      `${BASE_URL}/api/purchases`,
      {
        metal: 'silver',
        quantity_grams: 1.5,
      },
      { headers: authHeaders }
    );
    console.log('✓ Test 11: Silver purchased. Txn ID:', buySilverRes.data.transaction_id, 'Total:', buySilverRes.data.total_amount);

    // TEST 12: Get Holdings
    const holdingsRes = await axios.get(`${BASE_URL}/api/holdings/me`, { headers: authHeaders });
    console.log('✓ Test 12: Holdings. Gold grams:', holdingsRes.data.gold.quantity_grams, 'Silver grams:', holdingsRes.data.silver.quantity_grams, 'Total Value: ₹', holdingsRes.data.total_current_value);

    // TEST 13: Get Transactions
    const txnsRes = await axios.get(`${BASE_URL}/api/transactions`, { headers: authHeaders });
    console.log('✓ Test 13: Transactions fetched. Total records:', txnsRes.data.total);

    // Verify KYC directly in DB for testing withdrawal
    await query("UPDATE users SET kyc_status = 'verified' WHERE id = ?", [userId]);
    const updatedUserRes = await axios.get(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
    console.log('✓ Test 14: KYC updated to verified. Status:', updatedUserRes.data.kyc_status);

    // TEST 15: Create Withdrawal via OTP Flow
    const otpReqRes = await axios.post(
      `${BASE_URL}/api/withdrawals/request-otp`,
      {
        metal: 'gold',
        quantity_grams: 0.01,
        withdrawal_mode: 'physical',
      },
      { headers: authHeaders }
    );
    const challengeId = otpReqRes.data.challenge_id;

    const withdrawRes = await axios.post(
      `${BASE_URL}/api/withdrawals/verify-otp`,
      {
        challenge_id: challengeId,
        otp: config.devOtp || '123456',
      },
      { headers: authHeaders }
    );
    console.log('✓ Test 15: Withdrawal submitted via OTP flow. Txn ID:', withdrawRes.data.withdrawal?.transaction_id, 'Status:', withdrawRes.data.withdrawal?.status);

    // Clean up test user
    await query('DELETE FROM users WHERE id = ?', [userId]);
    console.log('✓ Cleaned up test user');

    console.log('\n====================================================');
    console.log('>>> ALL 15 INTEGRATION TESTS PASSED WITH 0 ERRORS <<<');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ INTEGRATION TEST FAILED:', err.response?.data || err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(process.exitCode || 0);
  }
}

runIntegrationTest();
