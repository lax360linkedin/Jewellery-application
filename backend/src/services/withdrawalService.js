import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, getTransactionConnection } from '../config/db.js';
import config from '../config/env.js';
import { cleanRate, cleanGrams, generateTransactionId } from '../utils/formatters.js';
import { getRatesPublic } from './metalRatesService.js';
import { getOrCreateHoldings } from './holdingsService.js';
import smsService from './smsService.js';
import {
  notifyWithdrawalSubmitted,
  notifyWithdrawalApproved,
  notifyWithdrawalRejected,
  notifyWithdrawalCancelled,
} from './notificationService.js';

export function formatWithdrawalResponse(doc) {
  return {
    id: doc.id,
    withdrawal_id: doc.id,
    transaction_id: doc.transaction_id,
    metal: doc.metal,
    quantity_grams: cleanGrams(doc.quantity_grams),
    rate_per_gram: cleanRate(doc.rate_per_gram),
    metal_value: cleanRate(doc.metal_value),
    withdrawal_mode: doc.withdrawal_mode || 'physical',
    status: doc.status || 'pending',
    rejection_reason: doc.rejection_reason || null,
    admin_note: doc.admin_note || null,
    created_at: doc.created_at,
    approved_at: doc.approved_at || null,
    rejected_at: doc.rejected_at || null,
  };
}

/**
 * 1. Request Withdrawal OTP
 * Validates intent, KYC, account status, and available holding balance.
 * Generates an OTP challenge stored in withdrawal_otps.
 * DOES NOT reserve balance. DOES NOT create a withdrawal. DOES NOT notify Admin.
 */
export async function requestWithdrawalOtp(user, data) {
  if (!user || !user.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  // 1. Verify KYC
  if ((user.kyc_status || '').toLowerCase() !== 'verified' && (user.kyc_status || '').toLowerCase() !== 'approved') {
    const error = new Error('KYC verification is required before withdrawal');
    error.status = 403;
    throw error;
  }

  // 2. Verify active account
  if (user.account_status !== 'active') {
    const error = new Error(`Account is ${user.account_status}. Please contact support.`);
    error.status = 403;
    throw error;
  }

  // 3. Validate metal
  const metal = (data?.metal || '').toLowerCase().trim();
  if (!['gold', 'silver'].includes(metal)) {
    const error = new Error("Metal must be either 'gold' or 'silver'");
    error.status = 400;
    throw error;
  }

  // 4. Validate quantity
  const rawQty = data?.quantity_grams !== undefined ? data.quantity_grams : (data?.grams !== undefined ? data.grams : data?.quantity);
  if (rawQty === undefined || rawQty === null || rawQty.toString().trim() === '') {
    const error = new Error('Please enter a withdrawal quantity.');
    error.status = 400;
    throw error;
  }

  const str = rawQty.toString().trim();
  if (!/^\d+(\.\d+)?$/.test(str)) {
    const error = new Error('Please enter a valid gram quantity.');
    error.status = 400;
    throw error;
  }

  const quantityGrams = cleanGrams(str);
  if (quantityGrams <= 0) {
    const error = new Error('Please enter a valid withdrawal quantity.');
    error.status = 400;
    throw error;
  }

  const minGrams = metal === 'gold' ? config.minGoldWithdrawalGrams : config.minSilverWithdrawalGrams;
  if (quantityGrams < minGrams) {
    const error = new Error(`Minimum withdrawal quantity is ${minGrams.toFixed(4)} gm.`);
    error.status = 400;
    throw error;
  }

  // 5. Check holding balance
  const holding = await getOrCreateHoldings(user.id);
  const totalQty = cleanGrams(holding[`${metal}_quantity`]);
  const reservedQty = cleanGrams(holding[`${metal}_reserved`]);
  const availableQty = cleanGrams(Math.max(0, totalQty - reservedQty));

  if (quantityGrams > availableQty) {
    const metalCap = metal.charAt(0).toUpperCase() + metal.slice(1);
    const error = new Error(`Insufficient ${metalCap} balance.`);
    error.status = 400;
    throw error;
  }

  // 6. Invalidate any prior unused withdrawal challenges for this user
  await query(
    `UPDATE withdrawal_otps 
     SET used_at = NOW() 
     WHERE user_id = ? AND purpose = 'withdrawal' AND used_at IS NULL`,
    [user.id]
  );

  // 7. Generate secure 6-digit OTP
  const isDevOrTest = config.nodeEnv === 'development' || process.env.NODE_ENV === 'test';
  const randomBuf = crypto.randomBytes(3);
  const randomNum = (randomBuf.readUIntBE(0, 3) % 900000) + 100000;
  const otpCode = isDevOrTest && config.devOtp ? config.devOtp : randomNum.toString();
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

  const challengeId = 'wd_ch_' + uuidv4().replace(/-/g, '');
  const challengeRecordId = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // 8. Insert challenge into withdrawal_otps
  await query(
    `INSERT INTO withdrawal_otps 
      (id, challenge_id, user_id, mobile_number, purpose, metal, quantity_grams, withdrawal_mode, otp_hash, attempts, max_attempts, resend_count, last_resend_at, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'withdrawal', ?, ?, ?, ?, 0, 5, 0, NOW(), ?, NOW(), NOW())`,
    [
      challengeRecordId,
      challengeId,
      user.id,
      user.mobile,
      metal,
      quantityGrams,
      data.withdrawal_mode || 'physical',
      otpHash,
      expiresAt,
    ]
  );

  // 9. Dispatch SMS to registered mobile
  try {
    await smsService.sendOtpSms(user.mobile, otpCode, 'withdrawal');
  } catch (err) {
    console.warn('[SMS Dispatch Warning]', err.message);
  }

  return {
    success: true,
    message: 'OTP sent to your registered mobile number',
    challenge_id: challengeId,
    expires_in: 300,
    ...(isDevOrTest ? { dev_otp: otpCode } : {}),
  };
}

/**
 * 2. Resend Withdrawal OTP
 * Enforces rate-limiting, invalidates old OTP, generates new OTP, and updates expiry.
 */
export async function resendWithdrawalOtp(user, challengeId) {
  if (!user || !user.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  if (!challengeId) {
    const error = new Error('Challenge ID is required');
    error.status = 400;
    throw error;
  }

  const rows = await query(
    `SELECT * FROM withdrawal_otps 
     WHERE challenge_id = ? AND user_id = ? AND purpose = 'withdrawal' 
     LIMIT 1`,
    [challengeId, user.id]
  );

  if (rows.length === 0) {
    const error = new Error('Withdrawal challenge not found');
    error.status = 404;
    throw error;
  }

  const record = rows[0];

  if (record.used_at) {
    const error = new Error('This withdrawal verification challenge has already been completed or expired');
    error.status = 400;
    throw error;
  }

  // Check rate limit: minimum 20 seconds between resends
  if (record.last_resend_at) {
    const lastResend = new Date(record.last_resend_at).getTime();
    const elapsedSec = (Date.now() - lastResend) / 1000;
    if (elapsedSec < 20) {
      const error = new Error(`Please wait ${Math.ceil(20 - elapsedSec)} seconds before requesting another OTP`);
      error.status = 429;
      throw error;
    }
  }

  // Generate new 6-digit OTP
  const isDevOrTest = config.nodeEnv === 'development' || process.env.NODE_ENV === 'test';
  const randomBuf = crypto.randomBytes(3);
  const randomNum = (randomBuf.readUIntBE(0, 3) % 900000) + 100000;
  const newOtpCode = isDevOrTest && config.devOtp ? config.devOtp : randomNum.toString();
  const newOtpHash = crypto.createHash('sha256').update(newOtpCode).digest('hex');
  const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(
    `UPDATE withdrawal_otps 
     SET otp_hash = ?, attempts = 0, resend_count = resend_count + 1, last_resend_at = NOW(), expires_at = ?, updated_at = NOW()
     WHERE id = ?`,
    [newOtpHash, newExpiresAt, record.id]
  );

  try {
    await smsService.sendOtpSms(user.mobile, newOtpCode, 'withdrawal');
  } catch (err) {
    console.warn('[SMS Resend Warning]', err.message);
  }

  return {
    success: true,
    message: 'New OTP sent to your registered mobile number',
    challenge_id: challengeId,
    expires_in: 300,
    ...(isDevOrTest ? { dev_otp: newOtpCode } : {}),
  };
}

/**
 * 3. Verify Withdrawal OTP & Execute Withdrawal Creation
 * ONLY after successful OTP verification:
 * - Re-validates KYC and active account
 * - Re-validates available balance with row-level locks
 * - Snapshots active rate
 * - Reserves holding quantity
 * - Creates pending withdrawal record
 * - Dispatches Admin notification
 */
export async function verifyWithdrawalOtp(user, challengeId, enteredOtp) {
  if (!user || !user.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  if (!challengeId) {
    const error = new Error('Challenge ID is required');
    error.status = 400;
    throw error;
  }

  const cleanOtp = (enteredOtp || '').toString().trim();
  if (!cleanOtp) {
    const error = new Error('Please enter the 6-digit OTP');
    error.status = 400;
    throw error;
  }

  // Find challenge
  const rows = await query(
    `SELECT * FROM withdrawal_otps 
     WHERE challenge_id = ? AND user_id = ? AND purpose = 'withdrawal' 
     LIMIT 1`,
    [challengeId, user.id]
  );

  if (rows.length === 0) {
    const error = new Error('Withdrawal challenge not found or does not belong to this account');
    error.status = 404;
    throw error;
  }

  const record = rows[0];

  if (record.used_at) {
    const error = new Error('This OTP challenge has already been used or expired. Please initiate a new request.');
    error.status = 400;
    throw error;
  }

  if (new Date(record.expires_at) < new Date()) {
    const error = new Error('OTP expired. Please request a new OTP.');
    error.status = 400;
    throw error;
  }

  if (record.attempts >= record.max_attempts) {
    const error = new Error('Too many attempts. Please request a new OTP.');
    error.status = 400;
    throw error;
  }

  // Verify OTP hash
  const isDevOrTest = config.nodeEnv === 'development' || process.env.NODE_ENV === 'test';
  const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
  const isDevMatch = isDevOrTest && config.devOtp && cleanOtp === config.devOtp;
  const isHashMatch = inputHash === record.otp_hash;

  if (!isHashMatch && !isDevMatch) {
    await query(
      `UPDATE withdrawal_otps SET attempts = attempts + 1, updated_at = NOW() WHERE id = ?`,
      [record.id]
    );
    const updatedAttempts = record.attempts + 1;
    if (updatedAttempts >= record.max_attempts) {
      const error = new Error('Too many attempts. Please request a new OTP.');
      error.status = 400;
      throw error;
    }
    const error = new Error('Invalid OTP. Please try again.');
    error.status = 400;
    throw error;
  }

  // --- OTP IS VALID. PROCEED TO TRANSACTIONAL WITHDRAWAL CREATION ---
  const conn = await getTransactionConnection();
  let withdrawalDoc = null;

  try {
    // 1. Immediately mark challenge as used to prevent replay / double-spend
    const [updateResult] = await conn.execute(
      `UPDATE withdrawal_otps 
       SET verified_at = NOW(), used_at = NOW(), updated_at = NOW() 
       WHERE id = ? AND used_at IS NULL`,
      [record.id]
    );

    if (updateResult.affectedRows === 0) {
      const error = new Error('Withdrawal challenge has already been processed.');
      error.status = 400;
      throw error;
    }

    // 2. Re-check user KYC and status with row-level lock
    const [userRows] = await conn.execute(
      `SELECT id, name, mobile, kyc_status, account_status FROM users WHERE id = ? FOR UPDATE`,
      [user.id]
    );

    if (!userRows || userRows.length === 0) {
      const error = new Error('User account not found');
      error.status = 404;
      throw error;
    }

    const liveUser = userRows[0];
    if ((liveUser.kyc_status || '').toLowerCase() !== 'verified' && (liveUser.kyc_status || '').toLowerCase() !== 'approved') {
      const error = new Error('KYC verification is required before withdrawal');
      error.status = 403;
      throw error;
    }

    if (liveUser.account_status !== 'active') {
      const error = new Error(`Account is ${liveUser.account_status}. Please contact support.`);
      error.status = 403;
      throw error;
    }

    const metal = record.metal;
    const quantityGrams = cleanGrams(record.quantity_grams);

    // 3. Re-check holdings balance with row-level lock
    const [holdingRows] = await conn.execute(
      `SELECT * FROM holdings WHERE user_id = ? FOR UPDATE`,
      [user.id]
    );

    if (!holdingRows || holdingRows.length === 0) {
      const error = new Error('Holdings record not found');
      error.status = 404;
      throw error;
    }

    const h = holdingRows[0];
    const totalQty = cleanGrams(h[`${metal}_quantity`]);
    const curReserved = cleanGrams(h[`${metal}_reserved`]);
    const availableQty = cleanGrams(Math.max(0, totalQty - curReserved));

    if (quantityGrams > availableQty) {
      const metalCap = metal.charAt(0).toUpperCase() + metal.slice(1);
      const error = new Error(`Insufficient ${metalCap} balance.`);
      error.status = 400;
      throw error;
    }

    // 4. Rate Snapshot
    const rates = await getRatesPublic();
    const activeRate = cleanRate(rates[metal]?.active_rate || (metal === 'gold' ? config.defaultGoldRate : config.defaultSilverRate));
    const metalValue = cleanRate(quantityGrams * activeRate);
    const transactionId = generateTransactionId('WD');
    const withdrawalId = uuidv4();

    // 5. Reserve quantity in holdings
    const newReserved = cleanGrams(curReserved + quantityGrams);
    await conn.execute(
      `UPDATE holdings SET ${metal}_reserved = ?, updated_at = NOW() WHERE user_id = ?`,
      [newReserved, user.id]
    );

    // 6. Insert pending withdrawal record
    await conn.execute(
      `INSERT INTO withdrawals 
        (id, transaction_id, user_id, metal, quantity_grams, rate_per_gram, metal_value, withdrawal_mode, status, rejection_reason, admin_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, NOW(), NOW())`,
      [
        withdrawalId,
        transactionId,
        user.id,
        metal,
        quantityGrams,
        activeRate,
        metalValue,
        record.withdrawal_mode || 'physical',
      ]
    );

    await conn.commit();

    withdrawalDoc = {
      id: withdrawalId,
      transaction_id: transactionId,
      user_id: user.id,
      metal,
      quantity_grams: quantityGrams,
      rate_per_gram: activeRate,
      metal_value: metalValue,
      withdrawal_mode: record.withdrawal_mode || 'physical',
      status: 'pending',
      rejection_reason: null,
      admin_note: null,
      created_at: new Date().toISOString(),
      approved_at: null,
      rejected_at: null,
    };
  } catch (txErr) {
    await conn.rollback();
    throw txErr;
  } finally {
    conn.release();
  }

  // 7. Send Admin Notification now that withdrawal is created
  if (withdrawalDoc) {
    try {
      await notifyWithdrawalSubmitted(withdrawalDoc);
    } catch (err) {
      console.error('[Notification Error] Failed to send withdrawal notification to admin:', err);
    }
  }

  return {
    success: true,
    message: 'Withdrawal request submitted successfully',
    withdrawal: formatWithdrawalResponse(withdrawalDoc),
  };
}

/**
 * Legacy direct withdrawal creation route handler:
 * Explicitly disallows unverified withdrawal creation to enforce OTP flow.
 */
export async function createWithdrawalRequest(user, data) {
  if (!user || ((user.kyc_status || '').toLowerCase() !== 'verified' && (user.kyc_status || '').toLowerCase() !== 'approved')) {
    const error = new Error('KYC verification is required before withdrawal');
    error.status = 403;
    throw error;
  }
  const error = new Error('Direct withdrawal creation without OTP verification is not permitted. Please initiate withdrawal with /api/withdrawals/request-otp.');
  error.status = 400;
  throw error;
}

export async function approveWithdrawal(withdrawalId, adminUser) {
  const rows = await query('SELECT * FROM withdrawals WHERE id = ? OR transaction_id = ? LIMIT 1', [
    withdrawalId,
    withdrawalId,
  ]);
  if (rows.length === 0) {
    const error = new Error('Withdrawal request not found');
    error.status = 404;
    throw error;
  }

  const w = rows[0];
  if (w.status !== 'pending') {
    const error = new Error(`Cannot approve withdrawal with status '${w.status}'`);
    error.status = 400;
    throw error;
  }

  const userRows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [w.user_id]);
  if (userRows.length === 0 || userRows[0].kyc_status !== 'verified') {
    const error = new Error('Customer KYC must be verified before approval');
    error.status = 400;
    throw error;
  }

  const metal = w.metal;
  const wQty = cleanGrams(w.quantity_grams);
  const holding = await getOrCreateHoldings(w.user_id);

  const curQty = cleanGrams(holding[`${metal}_quantity`]);
  const curRes = cleanGrams(holding[`${metal}_reserved`]);
  const curAvg = cleanRate(holding[`${metal}_average_rate`]);

  if (wQty > curQty || wQty > curRes) {
    const error = new Error('Holding balance inconsistency detected');
    error.status = 400;
    throw error;
  }

  const newQty = Math.max(0, cleanGrams(curQty - wQty));
  const newRes = Math.max(0, cleanGrams(curRes - wQty));

  const newAvg = newQty > 0 ? curAvg : 0;
  const newInv = newQty > 0 ? cleanRate(newQty * newAvg) : 0;
  // Deduct from holdings
  await query(
    `UPDATE holdings 
     SET ${metal}_quantity = ?, ${metal}_reserved = ?, ${metal}_invested = ?, ${metal}_average_rate = ?, updated_at = NOW() 
     WHERE user_id = ?`,
    [newQty, newRes, newInv, newAvg,w.user_id]
  );

  // Update withdrawal status
  await query(
    `UPDATE withdrawals 
     SET status = 'approved', approved_at = NOW(), updated_at = NOW() 
     WHERE id = ?`,
    [w.id]
  );

  try {
    w.status = 'approved';
    await notifyWithdrawalApproved(w);
  } catch (err) {
    console.error('Error sending withdrawal approved notification:', err);
  }

  return {
    message: 'Withdrawal request approved successfully',
    withdrawal_id: w.id,
    status: 'approved',
  };
}

export async function rejectWithdrawal(withdrawalId, adminUser, reason) {
  const rows = await query('SELECT * FROM withdrawals WHERE id = ? OR transaction_id = ? LIMIT 1', [
    withdrawalId,
    withdrawalId,
  ]);
  if (rows.length === 0) {
    const error = new Error('Withdrawal request not found');
    error.status = 404;
    throw error;
  }

  const w = rows[0];
  if (w.status !== 'pending') {
    const error = new Error(`Cannot reject withdrawal with status '${w.status}'`);
    error.status = 400;
    throw error;
  }

  const metal = w.metal;
  const wQty = cleanGrams(w.quantity_grams);
  const holding = await getOrCreateHoldings(w.user_id);
  const curRes = cleanGrams(holding[`${metal}_reserved`]);
  const newRes = Math.max(0, cleanGrams(curRes - wQty));

  // Release reserved quantity
  await query(
    `UPDATE holdings SET ${metal}_reserved = ?, updated_at = NOW() WHERE user_id = ?`,
    [newRes, w.user_id]
  );

  // Update withdrawal status
  await query(
    `UPDATE withdrawals 
     SET status = 'rejected', rejection_reason = ?, rejected_at = NOW(), updated_at = NOW() 
     WHERE id = ?`,
    [reason, w.id]
  );

  try {
    w.status = 'rejected';
    await notifyWithdrawalRejected(w, reason);
  } catch (err) {
    console.error('Error sending withdrawal rejected notification:', err);
  }

  return {
    message: 'Withdrawal request rejected',
    withdrawal_id: w.id,
    status: 'rejected',
  };
}

export async function cancelCustomerWithdrawal(user, withdrawalId) {
  const rows = await query(
    'SELECT * FROM withdrawals WHERE (id = ? OR transaction_id = ?) AND user_id = ? LIMIT 1',
    [withdrawalId, withdrawalId, user.id]
  );
  if (rows.length === 0) {
    const error = new Error('Withdrawal request not found');
    error.status = 404;
    throw error;
  }

  const w = rows[0];
  if (w.status !== 'pending') {
    const error = new Error('Only pending withdrawal requests can be cancelled');
    error.status = 400;
    throw error;
  }

  const metal = w.metal;
  const wQty = cleanGrams(w.quantity_grams);
  const holding = await getOrCreateHoldings(w.user_id);
  const curRes = cleanGrams(holding[`${metal}_reserved`]);
  const newRes = Math.max(0, cleanGrams(curRes - wQty));

  // Release reserved balance
  await query(
    `UPDATE holdings SET ${metal}_reserved = ?, updated_at = NOW() WHERE user_id = ?`,
    [newRes, w.user_id]
  );

  await query('UPDATE withdrawals SET status = \'cancelled\', updated_at = NOW() WHERE id = ?', [w.id]);

  try {
    w.status = 'cancelled';
    await notifyWithdrawalCancelled(w);
  } catch (err) {
    console.error('Error sending withdrawal cancelled notification:', err);
  }

  return {
    message: 'Withdrawal request cancelled successfully',
    withdrawal_id: w.id,
    status: 'cancelled',
  };
}

export async function getCustomerWithdrawals(user, { metal, status_filter, page = 1, limit = 20 }) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const whereClauses = ['user_id = ?'];
  const params = [user.id];

  if (metal && ['gold', 'silver'].includes(metal.toLowerCase().trim())) {
    whereClauses.push('metal = ?');
    params.push(metal.toLowerCase().trim());
  }

  if (status_filter) {
    whereClauses.push('status = ?');
    params.push(status_filter.toLowerCase().trim());
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const countRows = await query(`SELECT COUNT(*) as total FROM withdrawals ${whereSql}`, params);
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT * FROM withdrawals 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const items = rows.map(formatWithdrawalResponse);

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
  };
}

export async function getCustomerWithdrawalById(user, withdrawalId) {
  const rows = await query(
    'SELECT * FROM withdrawals WHERE (id = ? OR transaction_id = ?) AND user_id = ? LIMIT 1',
    [withdrawalId, withdrawalId, user.id]
  );
  if (rows.length === 0) {
    const error = new Error('Withdrawal request not found');
    error.status = 404;
    throw error;
  }
  return formatWithdrawalResponse(rows[0]);
}

export async function getAdminWithdrawals({ page = 1, limit = 20, search, metal, status_filter, withdrawal_mode }) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const whereClauses = [];
  const params = [];

  if (metal && ['gold', 'silver'].includes(metal.toLowerCase().trim())) {
    whereClauses.push('w.metal = ?');
    params.push(metal.toLowerCase().trim());
  }

  if (status_filter) {
    whereClauses.push('w.status = ?');
    params.push(status_filter.toLowerCase().trim());
  }

  if (withdrawal_mode) {
    whereClauses.push('w.withdrawal_mode = ?');
    params.push(withdrawal_mode.toLowerCase().trim());
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(w.transaction_id LIKE ? OR u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)');
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRows = await query(
    `SELECT COUNT(*) as total 
     FROM withdrawals w 
     JOIN users u ON w.user_id = u.id 
     ${whereSql}`,
    params
  );
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT w.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email, u.kyc_status as customer_kyc
     FROM withdrawals w
     JOIN users u ON w.user_id = u.id
     ${whereSql}
     ORDER BY w.created_at DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const items = rows.map((r) => ({
    withdrawal_id: r.id,
    transaction_id: r.transaction_id,
    customer: {
      user_id: r.user_id,
      name: r.customer_name || 'Unknown',
      mobile: r.customer_mobile || '',
      email: r.customer_email || null,
      kyc_status: r.customer_kyc || 'pending',
    },
    metal: r.metal,
    quantity_grams: cleanGrams(r.quantity_grams),
    rate_per_gram: cleanRate(r.rate_per_gram),
    metal_value: cleanRate(r.metal_value),
    withdrawal_mode: r.withdrawal_mode,
    status: r.status,
    created_at: r.created_at,
  }));

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
  };
}

export async function getAdminWithdrawalById(withdrawalId) {
  const rows = await query(
    `SELECT w.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email, u.kyc_status as customer_kyc
     FROM withdrawals w
     JOIN users u ON w.user_id = u.id
     WHERE w.id = ? OR w.transaction_id = ?
     LIMIT 1`,
    [withdrawalId, withdrawalId]
  );

  if (rows.length === 0) {
    const error = new Error('Withdrawal request not found');
    error.status = 404;
    throw error;
  }

  const r = rows[0];
  return {
    withdrawal_id: r.id,
    transaction_id: r.transaction_id,
    customer: {
      user_id: r.user_id,
      name: r.customer_name || 'Unknown',
      mobile: r.customer_mobile || '',
      email: r.customer_email || null,
      kyc_status: r.customer_kyc || 'pending',
    },
    metal: r.metal,
    quantity_grams: cleanGrams(r.quantity_grams),
    rate_per_gram: cleanRate(r.rate_per_gram),
    metal_value: cleanRate(r.metal_value),
    withdrawal_mode: r.withdrawal_mode,
    status: r.status,
    rejection_reason: r.rejection_reason || null,
    admin_note: r.admin_note || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
    approved_at: r.approved_at || null,
    rejected_at: r.rejected_at || null,
  };
}

export default {
  createWithdrawalRequest,
  approveWithdrawal,
  rejectWithdrawal,
  cancelCustomerWithdrawal,
  getCustomerWithdrawals,
  getCustomerWithdrawalById,
  getAdminWithdrawals,
  getAdminWithdrawalById,
};
