import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import config from '../config/env.js';
import { hashPassword, verifyPassword, createAccessToken } from '../utils/security.js';
import { normalizeMobile } from '../utils/formatters.js';

export async function sendOtp(rawMobile) {
  const { mobile } = normalizeMobile(rawMobile);
  if (!mobile || mobile.length !== 10) {
    const error = new Error('Please provide a valid 10-digit mobile number');
    error.status = 400;
    throw error;
  }

  const otpCode = config.devOtp;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  const id = uuidv4();
  await query(
    `INSERT INTO otps (id, mobile, otp, created_at, expires_at)
     VALUES (?, ?, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
    [id, mobile, otpCode, expiresAt]
  );

  return { mobile, otpCode };
}

export async function verifyOtp(rawMobile, enteredOtp) {
  const { mobile } = normalizeMobile(rawMobile);
  const cleanOtp = (enteredOtp || '').toString().trim();

  if (!cleanOtp) {
    const error = new Error('OTP is required');
    error.status = 400;
    throw error;
  }

  if (cleanOtp === config.devOtp) {
    return true;
  }

  const rows = await query('SELECT * FROM otps WHERE mobile = ? LIMIT 1', [mobile]);
  if (rows.length > 0) {
    const record = rows[0];
    if (record.otp === cleanOtp) {
      const expiresAt = new Date(record.expires_at);
      if (expiresAt > new Date()) {
        return true;
      }
    }
  }

  const error = new Error('Invalid or expired OTP');
  error.status = 400;
  throw error;
}

export async function registerUser({ name, mobile: rawMobile, email, password }) {
  const { mobile, variants } = normalizeMobile(rawMobile);

  if (!mobile || mobile.length !== 10) {
    const error = new Error('Please provide a valid 10-digit mobile number');
    error.status = 400;
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.status = 400;
    throw error;
  }

  // Check mobile existence
  const placeholders = variants.map(() => '?').join(',');
  const existingMobile = await query(`SELECT id FROM users WHERE mobile IN (${placeholders}) LIMIT 1`, variants);
  if (existingMobile.length > 0) {
    const error = new Error('Mobile number already registered');
    error.status = 400;
    throw error;
  }

  // Check email existence if provided
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  if (cleanEmail) {
    const existingEmail = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (existingEmail.length > 0) {
      const error = new Error('Email already registered');
      error.status = 400;
      throw error;
    }
  }

  const hashedPassword = await hashPassword(password);
  const userId = uuidv4();
  const cleanName = (name || '').trim() || 'Customer';

  await query(
    `INSERT INTO users (id, name, mobile, email, password_hash, role, account_status, kyc_status, profile_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'customer', 'active', 'pending', 0, NOW(), NOW())`,
    [userId, cleanName, mobile, cleanEmail, hashedPassword]
  );

  // Initialize empty profile
  const profileId = uuidv4();
  await query(
    `INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [profileId, userId, cleanName]
  );

  const tokenPayload = { sub: userId, role: 'customer', mobile };
  const accessToken = createAccessToken(tokenPayload);

  return {
    user: {
      id: userId,
      name: cleanName,
      mobile,
      email: cleanEmail,
      role: 'customer',
      account_status: 'active',
      kyc_status: 'pending',
      profile_completed: false,
      created_at: new Date().toISOString(),
    },
    accessToken,
  };
}

export async function loginUser(dataOrIdent, maybePassword) {
  let rawIdent = '';
  let password = '';

  if (typeof dataOrIdent === 'object' && dataOrIdent !== null) {
    rawIdent = dataOrIdent.mobile || dataOrIdent.identifier || dataOrIdent.email || dataOrIdent.username || '';
    password = dataOrIdent.password || '';
  } else {
    rawIdent = dataOrIdent;
    password = maybePassword;
  }

  const ident = (rawIdent || '').toString().trim();
  const { mobile, variants } = normalizeMobile(ident);
  const allIdents = Array.from(new Set([ident, mobile, ...variants]));

  let user = null;

  // Search by mobile or email or username
  const placeholders = allIdents.map(() => '?').join(',');
  const querySql = `
    SELECT * FROM users 
    WHERE mobile IN (${placeholders}) 
       OR email = ? 
       OR name = ?
       ${ident.toLowerCase() === 'admin' ? "OR role = 'admin'" : ''}
    LIMIT 1
  `;
  const users = await query(querySql, [...allIdents, ident.toLowerCase(), ident]);

  if (users.length > 0) {
    user = users[0];
  }

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const error = new Error('Invalid mobile number or password');
    error.status = 401;
    throw error;
  }

  if (user.account_status === 'banned') {
    const error = new Error('Your account has been banned');
    error.status = 403;
    throw error;
  }

  if (user.account_status === 'suspended') {
    const error = new Error('Your account is currently suspended');
    error.status = 403;
    throw error;
  }

  if (user.account_status !== 'active') {
    const error = new Error(`Account is ${user.account_status}. Please contact support.`);
    error.status = 403;
    throw error;
  }

  const tokenPayload = {
    sub: user.id,
    role: user.role,
    mobile: user.mobile,
  };
  const accessToken = createAccessToken(tokenPayload);

  return {
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      kyc_status: user.kyc_status,
      profile_completed: Boolean(user.profile_completed),
      created_at: user.created_at,
    },
    accessToken,
  };
}

export function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    kyc_status: user.kyc_status,
    profile_completed: Boolean(user.profile_completed),
    created_at: user.created_at,
  };
}

export default {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  formatUserResponse,
};
