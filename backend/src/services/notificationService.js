import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export function formatNotificationResponse(doc) {
  let parsedData = {};
  if (typeof doc.data === 'string') {
    try {
      parsedData = JSON.parse(doc.data);
    } catch {}
  } else if (doc.data && typeof doc.data === 'object') {
    parsedData = doc.data;
  }

  return {
    notification_id: doc.id,
    recipient_type: doc.recipient_type || 'customer',
    recipient_id: doc.recipient_id,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    data: parsedData,
    is_read: Boolean(doc.is_read),
    created_at: doc.created_at,
    read_at: doc.read_at || null,
  };
}

export async function createNotification({
  recipient_type = 'customer',
  recipient_id,
  type,
  title,
  message,
  data = {},
  source_type = null,
  source_id = null,
}) {
  const id = uuidv4();
  const dataJson = JSON.stringify(data || {});

  try {
    await query(
      `INSERT INTO notifications (id, recipient_type, recipient_id, type, title, message, data, is_read, source_type, source_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE is_read = VALUES(is_read)`,
      [id, recipient_type, recipient_id, type, title, message, dataJson, source_type, source_id]
    );
  } catch (err) {
    // Silent fail on unique index violation
  }
}

// -------------------------------------------------------------
// Trigger Helpers
// -------------------------------------------------------------

export async function notifyPurchaseCompleted(purchaseDoc) {
  const metal = (purchaseDoc.metal || '').toLowerCase();
  const capMetal = metal.charAt(0).toUpperCase() + metal.slice(1);
  const qty = purchaseDoc.quantity_grams;

  await createNotification({
    recipient_type: 'customer',
    recipient_id: purchaseDoc.user_id,
    type: 'purchase_completed',
    title: `${capMetal} Purchase Successful`,
    message: `Your ${capMetal} purchase of ${qty} g has been completed successfully.`,
    data: {
      transaction_id: purchaseDoc.transaction_id,
      purchase_id: purchaseDoc.id,
      metal: purchaseDoc.metal,
      quantity_grams: qty,
      total_amount: purchaseDoc.total_amount,
    },
    source_type: 'purchase',
    source_id: purchaseDoc.id,
  });
}

export async function notifyWithdrawalSubmitted(withdrawalDoc) {
  const metal = (withdrawalDoc.metal || '').toLowerCase();
  const capMetal = metal.charAt(0).toUpperCase() + metal.slice(1);
  const qty = withdrawalDoc.quantity_grams;

  // Customer notification
  await createNotification({
    recipient_type: 'customer',
    recipient_id: withdrawalDoc.user_id,
    type: 'withdrawal_submitted',
    title: 'Withdrawal Request Submitted',
    message: `Your ${capMetal} withdrawal request for ${qty} g has been submitted for verification.`,
    data: {
      transaction_id: withdrawalDoc.transaction_id,
      withdrawal_id: withdrawalDoc.id,
      metal: withdrawalDoc.metal,
      quantity_grams: qty,
    },
    source_type: 'withdrawal',
    source_id: withdrawalDoc.id,
  });

  // Admin notification
  const userRows = await query('SELECT id, name, mobile, email FROM users WHERE id = ? LIMIT 1', [withdrawalDoc.user_id]);
  const user = userRows[0] || {};
  const admins = await query("SELECT id FROM users WHERE role = 'admin'");
  for (const adm of admins) {
    await createNotification({
      recipient_type: 'admin',
      recipient_id: adm.id,
      type: 'withdrawal_submitted',
      title: 'New Withdrawal Request',
      message: `${user.name || 'A customer'} (${user.mobile || ''}) has submitted a ${capMetal} withdrawal request for ${qty} g.`,
      data: {
        transaction_id: withdrawalDoc.transaction_id,
        withdrawal_id: withdrawalDoc.id,
        user_id: withdrawalDoc.user_id,
        customer_name: user.name || 'Customer',
        name: user.name || 'Customer',
        mobile: user.mobile || '',
        email: user.email || '',
        metal: withdrawalDoc.metal,
        quantity_grams: qty,
        rate_per_gram: withdrawalDoc.rate_per_gram,
        metal_value: withdrawalDoc.metal_value,
        withdrawal_mode: withdrawalDoc.withdrawal_mode || 'Physical',
        created_at: withdrawalDoc.created_at || new Date().toISOString(),
      },
      source_type: 'withdrawal',
      source_id: withdrawalDoc.id,
    });
  }
}

export async function notifyWithdrawalApproved(withdrawalDoc) {
  const metal = (withdrawalDoc.metal || '').toLowerCase();
  const capMetal = metal.charAt(0).toUpperCase() + metal.slice(1);
  const qty = withdrawalDoc.quantity_grams;

  await createNotification({
    recipient_type: 'customer',
    recipient_id: withdrawalDoc.user_id,
    type: 'withdrawal_approved',
    title: 'Withdrawal Approved',
    message: `Your ${capMetal} withdrawal request for ${qty} g has been approved.`,
    data: {
      transaction_id: withdrawalDoc.transaction_id,
      withdrawal_id: withdrawalDoc.id,
      metal: withdrawalDoc.metal,
      quantity_grams: qty,
    },
    source_type: 'withdrawal',
    source_id: withdrawalDoc.id,
  });
}

export async function notifyWithdrawalRejected(withdrawalDoc, reason) {
  const metal = (withdrawalDoc.metal || '').toLowerCase();
  const capMetal = metal.charAt(0).toUpperCase() + metal.slice(1);
  const qty = withdrawalDoc.quantity_grams;

  await createNotification({
    recipient_type: 'customer',
    recipient_id: withdrawalDoc.user_id,
    type: 'withdrawal_rejected',
    title: 'Withdrawal Rejected',
    message: `Your ${capMetal} withdrawal request for ${qty} g has been rejected.`,
    data: {
      transaction_id: withdrawalDoc.transaction_id,
      withdrawal_id: withdrawalDoc.id,
      metal: withdrawalDoc.metal,
      quantity_grams: qty,
      reason,
    },
    source_type: 'withdrawal',
    source_id: withdrawalDoc.id,
  });
}

export async function notifyWithdrawalCancelled(withdrawalDoc) {
  const metal = (withdrawalDoc.metal || '').toLowerCase();
  const capMetal = metal.charAt(0).toUpperCase() + metal.slice(1);
  const qty = withdrawalDoc.quantity_grams;

  await createNotification({
    recipient_type: 'customer',
    recipient_id: withdrawalDoc.user_id,
    type: 'withdrawal_cancelled',
    title: 'Withdrawal Cancelled',
    message: `Your ${capMetal} withdrawal request for ${qty} g has been cancelled.`,
    data: {
      transaction_id: withdrawalDoc.transaction_id,
      withdrawal_id: withdrawalDoc.id,
      metal: withdrawalDoc.metal,
      quantity_grams: qty,
    },
    source_type: 'withdrawal',
    source_id: withdrawalDoc.id,
  });
}

export async function notifyKycSubmitted(userId, kycId) {
  const userRows = await query('SELECT id, name, mobile, email, role, created_at FROM users WHERE id = ? LIMIT 1', [userId]);
  const user = userRows[0] || {};
  const admins = await query("SELECT id FROM users WHERE role = 'admin'");
  for (const adm of admins) {
    await createNotification({
      recipient_type: 'admin',
      recipient_id: adm.id,
      type: 'kyc_submitted',
      title: 'New KYC Verification',
      message: `${user.name || 'A customer'} (${user.mobile || ''}) has submitted KYC documents for verification.`,
      data: {
        user_id: userId,
        kyc_id: kycId,
        name: user.name || 'Customer',
        mobile: user.mobile || '',
        email: user.email || '',
        role: user.role || 'customer',
        created_at: user.created_at,
      },
      source_type: 'kyc',
      source_id: kycId,
    });
  }
}

export async function notifyKycApproved(userId, kycId) {
  await createNotification({
    recipient_type: 'customer',
    recipient_id: userId,
    type: 'kyc_approved',
    title: 'KYC Verified',
    message: 'Your KYC verification has been approved successfully.',
    data: { kyc_id: kycId },
    source_type: 'kyc',
    source_id: kycId,
  });
}

export async function notifyKycRejected(userId, kycId, reason) {
  await createNotification({
    recipient_type: 'customer',
    recipient_id: userId,
    type: 'kyc_rejected',
    title: 'KYC Verification Rejected',
    message: 'Your KYC verification could not be approved.',
    data: { kyc_id: kycId, reason },
    source_type: 'kyc',
    source_id: kycId,
  });
}

// -------------------------------------------------------------
// Queries & Mutations
// -------------------------------------------------------------

export async function getUserNotifications({
  user_id,
  recipient_type = 'customer',
  type,
  is_read,
  from_date,
  to_date,
  page = 1,
  limit = 20,
}) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const whereClauses = ['recipient_type = ?', 'recipient_id = ?'];
  const params = [recipient_type, user_id];

  if (type) {
    whereClauses.push('type = ?');
    params.push(type.trim());
  }

  if (is_read !== undefined && is_read !== null) {
    whereClauses.push('is_read = ?');
    params.push(is_read === 'true' || is_read === true ? 1 : 0);
  }

  if (from_date) {
    whereClauses.push('created_at >= ?');
    params.push(`${from_date.trim()} 00:00:00`);
  }

  if (to_date) {
    whereClauses.push('created_at <= ?');
    params.push(`${to_date.trim()} 23:59:59`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const countRows = await query(`SELECT COUNT(*) as total FROM notifications ${whereSql}`, params);
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT * FROM notifications 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const items = rows.map(formatNotificationResponse);

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
  };
}

export async function getUnreadNotificationCount(userId, recipientType = 'customer') {
  const rows = await query(
    `SELECT COUNT(*) as unread_count 
     FROM notifications 
     WHERE recipient_type = ? AND recipient_id = ? AND is_read = 0`,
    [recipientType, userId]
  );
  return rows[0]?.unread_count || 0;
}

export async function getSingleNotification(notificationId, userId, recipientType = 'customer') {
  const rows = await query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [notificationId]);
  if (rows.length === 0) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  const n = rows[0];
  if (n.recipient_id !== userId || n.recipient_type !== recipientType) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  return formatNotificationResponse(n);
}

export async function markNotificationAsRead(notificationId, userId, recipientType = 'customer') {
  const rows = await query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [notificationId]);
  if (rows.length === 0) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  const n = rows[0];
  if (n.recipient_id !== userId || n.recipient_type !== recipientType) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  let readAt = n.read_at;
  if (!n.is_read) {
    readAt = new Date().toISOString();
    await query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?', [notificationId]);
  }

  return {
    message: 'Notification marked as read',
    notification_id: notificationId,
    is_read: true,
    read_at: readAt,
  };
}

export async function markAllNotificationsAsRead(userId, recipientType = 'customer') {
  const res = await query(
    `UPDATE notifications 
     SET is_read = 1, read_at = NOW() 
     WHERE recipient_type = ? AND recipient_id = ? AND is_read = 0`,
    [recipientType, userId]
  );
  return res.affectedRows || 0;
}

export default {
  createNotification,
  formatNotificationResponse,
  getUserNotifications,
  getUnreadNotificationCount,
  getSingleNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyPurchaseCompleted,
  notifyWithdrawalSubmitted,
  notifyWithdrawalApproved,
  notifyWithdrawalRejected,
  notifyWithdrawalCancelled,
  notifyKycSubmitted,
  notifyKycApproved,
  notifyKycRejected,
};
