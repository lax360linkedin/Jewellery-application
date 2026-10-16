import assert from 'node:assert';
import http from 'node:http';
import axios from 'axios';
import { createApp } from '../src/app.js';
import { initDatabase, query } from '../src/config/db.js';
import { hashPassword, verifyPassword, createAccessToken, verifyAccessToken } from '../src/utils/security.js';

async function runTests() {
  console.log('====================================================');
  console.log('Running Production Security & API Validation Tests...');
  console.log('====================================================');

  await initDatabase();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const client = axios.create({ baseURL: baseUrl, validateStatus: () => true });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Security Headers
  await test('test_01_security_headers: OWASP headers present', async () => {
    const res = await client.get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
  });

  // 2. Health check safe response
  await test('test_02_health_check_safe_response: does not expose credentials', async () => {
    const res = await client.get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
    const raw = JSON.stringify(res.data).toLowerCase();
    assert.strictEqual(raw.includes('password'), false);
    assert.strictEqual(raw.includes('jwt_secret'), false);
    assert.strictEqual(raw.includes('mysql://'), false);
  });

  // 3. Password Hashing
  await test('test_03_password_hashing: secure bcrypt hashing and verification', async () => {
    const plain = 'SecureTestPassword123!';
    const hashed = await hashPassword(plain);
    assert.notStrictEqual(hashed, plain);
    assert.strictEqual(await verifyPassword(plain, hashed), true);
    assert.strictEqual(await verifyPassword('WrongPassword', hashed), false);
  });

  // 4. JWT Token Creation and Expiration
  await test('test_04_jwt_token_creation_and_expiration: sign and verify JWT', async () => {
    const payload = { sub: 'test_user_id_123', role: 'customer', mobile: '9876543210' };
    const token = createAccessToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyAccessToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.sub, 'test_user_id_123');
    assert.strictEqual(decoded.role, 'customer');
    assert.ok(decoded.exp);
  });

  // 5. Unauthenticated requests rejected (401)
  await test('test_05_unauthenticated_request_rejected: 401 on protected routes', async () => {
    const endpoints = [
      '/api/profile/me',
      '/api/kyc/me',
      '/api/holdings/me',
      '/api/withdrawals',
      '/api/transactions',
      '/api/notifications',
      '/api/admin/dashboard',
      '/api/admin/users',
      '/api/admin/rates',
    ];
    for (const ep of endpoints) {
      const res = await client.get(ep);
      assert.strictEqual(res.status, 401, `Expected 401 for ${ep}, got ${res.status}`);
    }
  });

  // Create a customer user in DB for customer role tests
  const testCustomerMobile = '9845000001';
  await query('DELETE FROM users WHERE mobile = ?', [testCustomerMobile]);
  const regRes = await client.post('/api/auth/register', {
    name: 'Test Customer',
    mobile: testCustomerMobile,
    email: 'testcustomer@example.com',
    password: 'TestPassword123!',
  });
  const customerToken = regRes.data.access_token;
  const customerAuth = { headers: { Authorization: `Bearer ${customerToken}` } };

  // 6. Customer cannot access Admin endpoints (403)
  await test('test_06_customer_cannot_access_admin_endpoints: 403 Forbidden for customer', async () => {
    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/users',
      '/api/admin/kyc/pending',
      '/api/admin/rates',
      '/api/admin/purchases',
      '/api/admin/withdrawals',
      '/api/admin/transactions',
      '/api/admin/notifications',
    ];
    for (const ep of adminEndpoints) {
      const res = await client.get(ep, customerAuth);
      assert.strictEqual(res.status, 403, `Expected 403 for customer on ${ep}, got ${res.status}`);
    }
  });

  // 7. Rate and Purchase Validation
  await test('test_07_rate_and_purchase_validation: rejects invalid metals and quantities', async () => {
    // Negative quantity
    const negRes = await client.post('/api/purchases', { metal: 'gold', quantity_grams: -1.5 }, customerAuth);
    assert.strictEqual(negRes.status, 400);

    // Invalid metal
    const metalRes = await client.post('/api/purchases', { metal: 'platinum', quantity_grams: 1.0 }, customerAuth);
    assert.strictEqual(metalRes.status, 400);
  });

  // 8. Withdrawal Validation
  await test('test_08_withdrawal_validation_rejects_invalid_inputs: rejects invalid inputs', async () => {
    // KYC not verified yet -> 403
    const res = await client.post('/api/withdrawals', { metal: 'gold', quantity_grams: 1.0 }, customerAuth);
    assert.strictEqual(res.status, 403);
  });

  // 9. KYC Submission
  await test('test_09_kyc_submission: submits KYC documents successfully', async () => {
    const kycPayload = {
      full_name: 'Test Customer Full',
      date_of_birth: '1995-05-15',
      gender: 'Male',
      address: {
        address_line: '123 Test Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
      },
      id_type: 'Aadhaar',
      id_number: '123456789012',
    };
    const res = await client.post('/api/kyc/submit', kycPayload, customerAuth);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.status, 'pending');
  });

  // 10. Direct Registration
  await test('test_10_direct_registration_creates_account_and_jwt_token: registration', async () => {
    const mobile = '9845000002';
    await query('DELETE FROM users WHERE mobile = ?', [mobile]);
    const res = await client.post('/api/auth/register', {
      name: 'Karthik Raja',
      mobile,
      email: 'karthik@example.com',
      password: 'StrongPassword123!',
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.access_token);
    assert.strictEqual(res.data.user.name, 'Karthik Raja');
    assert.strictEqual(res.data.user.profile_completed, false);
  });

  // 11. Duplicate Registration Rejected
  await test('test_11_duplicate_registration_rejected: rejects duplicate mobile', async () => {
    const res = await client.post('/api/auth/register', {
      name: 'Karthik Raja Duplicate',
      mobile: '9845000002',
      email: 'karthik2@example.com',
      password: 'StrongPassword123!',
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.detail.includes('already registered'));
  });

  // 12. Login with valid credentials
  await test('test_12_login_with_valid_credentials: login success', async () => {
    const res = await client.post('/api/auth/login', {
      mobile: '9845000002',
      password: 'StrongPassword123!',
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.access_token);
    assert.strictEqual(res.data.user.mobile, '9845000002');
  });

  // 13. Login with invalid password rejected
  await test('test_13_login_with_invalid_password_rejected: rejects wrong password', async () => {
    const res = await client.post('/api/auth/login', {
      mobile: '9845000002',
      password: 'WrongPassword123!',
    });
    assert.strictEqual(res.status, 401);
    assert.ok(res.data.detail.includes('Invalid'));
  });

  // 14. Send OTP and verify OTP
  await test('test_14_send_otp_and_verify_otp: OTP dispatch and dev verify', async () => {
    const sendRes = await client.post('/api/auth/send-otp', { mobile: '+919876543210' });
    assert.strictEqual(sendRes.status, 200);
    assert.strictEqual(sendRes.data.mobile, '9876543210');

    const verifyRes = await client.post('/api/auth/verify-otp', { mobile: '9876543210', otp: '123456' });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.valid, true);
  });

  // 15. Verify OTP invalid rejected
  await test('test_15_verify_otp_invalid_rejected: rejects invalid OTP', async () => {
    const res = await client.post('/api/auth/verify-otp', { mobile: '9876543210', otp: '000000' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.detail.includes('Invalid or expired OTP'));
  });

  server.close();

  console.log('====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
