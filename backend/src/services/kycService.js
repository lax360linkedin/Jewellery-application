import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { notifyKycSubmitted, notifyKycApproved, notifyKycRejected } from './notificationService.js';

export function formatKycResponse(doc) {
  return {
    id: doc.id,
    user_id: doc.user_id,
    full_name: doc.full_name,
    date_of_birth: doc.date_of_birth,
    gender: doc.gender,
    address: {
      address_line: doc.address_line || '',
      city: doc.city || '',
      state: doc.state || '',
      pincode: doc.pincode || '',
    },
    id_type: doc.id_type,
    id_number: doc.id_number,
    status: doc.status,
    rejection_reason: doc.rejection_reason || null,
    submitted_at: doc.submitted_at,
    reviewed_at: doc.reviewed_at || null,
    reviewed_by: doc.reviewed_by || null,
    updated_at: doc.updated_at,
  };
}

export async function submitKyc(user, data) {
  const existingRows = await query('SELECT * FROM kyc WHERE user_id = ? LIMIT 1', [user.id]);

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    if (existing.status === 'pending') {
      const error = new Error('KYC verification is already pending');
      error.status = 400;
      throw error;
    }
    if (existing.status === 'verified') {
      const error = new Error('KYC is already verified');
      error.status = 400;
      throw error;
    }

    // Re-submission after rejection
    await query(
      `UPDATE kyc SET 
        full_name = ?,
        date_of_birth = ?,
        gender = ?,
        address_line = ?,
        city = ?,
        state = ?,
        pincode = ?,
        id_type = ?,
        id_number = ?,
        status = 'pending',
        rejection_reason = NULL,
        submitted_at = NOW(),
        reviewed_at = NULL,
        reviewed_by = NULL,
        updated_at = NOW()
       WHERE id = ?`,
      [
        data.full_name,
        data.date_of_birth,
        data.gender,
        data.address?.address_line || '',
        data.address?.city || '',
        data.address?.state || '',
        data.address?.pincode || '',
        data.id_type,
        data.id_number,
        existing.id,
      ]
    );

    await query('UPDATE users SET kyc_status = \'pending\', updated_at = NOW() WHERE id = ?', [user.id]);
    const updated = await query('SELECT * FROM kyc WHERE id = ?', [existing.id]);
    return formatKycResponse(updated[0]);
  }

  // New KYC Submission
  const kycId = uuidv4();
  await query(
    `INSERT INTO kyc 
      (id, user_id, full_name, date_of_birth, gender, address_line, city, state, pincode, id_type, id_number, status, rejection_reason, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NOW(), NOW())`,
    [
      kycId,
      user.id,
      data.full_name,
      data.date_of_birth,
      data.gender,
      data.address?.address_line || '',
      data.address?.city || '',
      data.address?.state || '',
      data.address?.pincode || '',
      data.id_type,
      data.id_number,
    ]
  );

  await query('UPDATE users SET kyc_status = \'pending\', updated_at = NOW() WHERE id = ?', [user.id]);

  try {
    await notifyKycSubmitted(user.id, kycId);
  } catch (err) {}

  const created = await query('SELECT * FROM kyc WHERE id = ?', [kycId]);
  return formatKycResponse(created[0]);
}

export async function getUserKyc(user) {
  const rows = await query('SELECT * FROM kyc WHERE user_id = ? LIMIT 1', [user.id]);
  if (rows.length === 0) {
    const error = new Error('KYC record not found');
    error.status = 404;
    throw error;
  }
  return formatKycResponse(rows[0]);
}

export async function getPendingKycList() {
  const rows = await query(
    `SELECT 
        k.id as kyc_id, 
        k.id as id,
        k.user_id, 
        k.full_name, 
        k.id_type, 
        k.id_number, 
        k.status, 
        k.submitted_at, 
        k.address_line, 
        k.city, 
        k.state, 
        k.pincode,
        u.name as user_name, 
        u.mobile as user_mobile, 
        u.email as user_email, 
        u.role as user_role, 
        u.created_at as user_created_at, 
        u.account_status as user_account_status
     FROM kyc k
     JOIN users u ON k.user_id = u.id
     WHERE k.status = 'pending'
     ORDER BY k.submitted_at DESC`
  );

  const items = rows.map((r) => ({
    id: r.kyc_id,
    kyc_id: r.kyc_id,
    user_id: r.user_id,
    name: r.user_name || r.full_name || 'Customer',
    customer_name: r.user_name || r.full_name || 'Customer',
    full_name: r.full_name || r.user_name || 'Customer',
    mobile: r.user_mobile || '',
    email: r.user_email || '',
    role: r.user_role || 'customer',
    account_status: r.user_account_status || 'active',
    id_type: (r.id_type || 'PAN').toUpperCase(),
    id_number: r.id_number || '',
    status: r.status || 'pending',
    address: {
      address_line: r.address_line || '',
      city: r.city || '',
      state: r.state || '',
      pincode: r.pincode || '',
    },
    submitted_at: r.submitted_at,
    user_created_at: r.user_created_at,
    created_at: r.user_created_at || r.submitted_at,
  }));

  return {
    items,
    total: items.length,
  };
}

export async function getKycDetails(kycId) {
  const rows = await query('SELECT * FROM kyc WHERE id = ? LIMIT 1', [kycId]);
  if (rows.length === 0) {
    const error = new Error('KYC record not found');
    error.status = 404;
    throw error;
  }
  const kyc = rows[0];

  const userRows = await query('SELECT id, name, mobile, email, account_status, kyc_status FROM users WHERE id = ? LIMIT 1', [kyc.user_id]);
  if (userRows.length === 0) {
    const error = new Error('Associated user not found');
    error.status = 404;
    throw error;
  }

  return {
    kyc: formatKycResponse(kyc),
    user: userRows[0],
  };
}

export async function approveKyc(kycId, adminUser) {
  const rows = await query('SELECT * FROM kyc WHERE id = ? LIMIT 1', [kycId]);
  if (rows.length === 0) {
    const error = new Error('KYC record not found');
    error.status = 404;
    throw error;
  }

  const kyc = rows[0];
  if (kyc.status === 'verified') {
    const error = new Error('KYC is already verified');
    error.status = 400;
    throw error;
  }

  await query(
    `UPDATE kyc SET status = 'verified', rejection_reason = NULL, reviewed_at = NOW(), reviewed_by = ?, updated_at = NOW() WHERE id = ?`,
    [adminUser.id, kycId]
  );
  await query('UPDATE users SET kyc_status = \'verified\', updated_at = NOW() WHERE id = ?', [kyc.user_id]);

  try {
    await notifyKycApproved(kyc.user_id, kycId);
  } catch (err) {}

  return {
    message: 'KYC verified successfully',
    status: 'verified',
  };
}

export async function rejectKyc(kycId, adminUser, reason) {
  const rows = await query('SELECT * FROM kyc WHERE id = ? LIMIT 1', [kycId]);
  if (rows.length === 0) {
    const error = new Error('KYC record not found');
    error.status = 404;
    throw error;
  }

  const kyc = rows[0];
  if (kyc.status === 'verified') {
    const error = new Error('Cannot reject an already verified KYC');
    error.status = 400;
    throw error;
  }

  await query(
    `UPDATE kyc SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?, updated_at = NOW() WHERE id = ?`,
    [reason, adminUser.id, kycId]
  );
  await query('UPDATE users SET kyc_status = \'rejected\', updated_at = NOW() WHERE id = ?', [kyc.user_id]);

  try {
    await notifyKycRejected(kyc.user_id, kycId, reason);
  } catch (err) {}

  return {
    message: 'KYC rejected',
    status: 'rejected',
  };
}

export default {
  submitKyc,
  getUserKyc,
  getPendingKycList,
  getKycDetails,
  approveKyc,
  rejectKyc,
};
