import { query } from '../config/db.js';
import { cleanRate, cleanGrams } from '../utils/formatters.js';

export function normalizePurchase(p) {
  return {
    transaction_id: p.transaction_id,
    user_id: p.user_id,
    type: 'purchase',
    metal: (p.metal || '').toLowerCase(),
    direction: 'credit',
    quantity_grams: cleanGrams(p.quantity_grams),
    rate_per_gram: cleanRate(p.rate_per_gram),
    metal_value: cleanRate(p.metal_value),
    gst_amount: cleanRate(p.gst_amount),
    total_amount: cleanRate(p.total_amount),
    status: p.status || 'completed',
    created_at: p.created_at,
    payment_status: p.payment_status || 'paid',
    withdrawal_mode: null,
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    admin_note: null,
  };
}

export function normalizeWithdrawal(w) {
  return {
    transaction_id: w.transaction_id,
    user_id: w.user_id,
    type: 'withdrawal',
    metal: (w.metal || '').toLowerCase(),
    direction: 'debit',
    quantity_grams: cleanGrams(w.quantity_grams),
    rate_per_gram: cleanRate(w.rate_per_gram),
    metal_value: cleanRate(w.metal_value),
    gst_amount: 0.0,
    total_amount: cleanRate(w.metal_value),
    status: w.status || 'pending',
    created_at: w.created_at,
    payment_status: null,
    withdrawal_mode: w.withdrawal_mode || 'physical',
    approved_at: w.approved_at || null,
    rejected_at: w.rejected_at || null,
    rejection_reason: w.rejection_reason || null,
    admin_note: w.admin_note || null,
  };
}

export async function getCustomerTransactions(
  user,
  { type: txnType, metal, status_filter, direction, from_date, to_date, search, page = 1, limit = 20 }
) {
  if (metal && !['gold', 'silver'].includes(metal.toLowerCase().trim())) {
    const error = new Error("Metal must be either 'gold' or 'silver'");
    error.status = 400;
    throw error;
  }
  if (txnType && !['purchase', 'withdrawal'].includes(txnType.toLowerCase().trim())) {
    const error = new Error("Transaction type must be 'purchase' or 'withdrawal'");
    error.status = 400;
    throw error;
  }
  if (direction && !['credit', 'debit'].includes(direction.toLowerCase().trim())) {
    const error = new Error("Direction must be 'credit' or 'debit'");
    error.status = 400;
    throw error;
  }

  const allRecords = [];

  // Query purchases
  const includePurchases =
    (!txnType || txnType.toLowerCase() === 'purchase') && (!direction || direction.toLowerCase() === 'credit');

  if (includePurchases) {
    const whereClauses = ['user_id = ?'];
    const params = [user.id];

    if (metal) {
      whereClauses.push('metal = ?');
      params.push(metal.toLowerCase().trim());
    }
    if (status_filter) {
      whereClauses.push('status = ?');
      params.push(status_filter.toLowerCase().trim());
    }
    if (from_date) {
      whereClauses.push('created_at >= ?');
      params.push(`${from_date.trim()} 00:00:00`);
    }
    if (to_date) {
      whereClauses.push('created_at <= ?');
      params.push(`${to_date.trim()} 23:59:59`);
    }
    if (search && search.trim()) {
      whereClauses.push('transaction_id LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    const rows = await query(`SELECT * FROM purchases WHERE ${whereClauses.join(' AND ')}`, params);
    for (const r of rows) {
      allRecords.push(normalizePurchase(r));
    }
  }

  // Query withdrawals
  const includeWithdrawals =
    (!txnType || txnType.toLowerCase() === 'withdrawal') && (!direction || direction.toLowerCase() === 'debit');

  if (includeWithdrawals) {
    const whereClauses = ['user_id = ?'];
    const params = [user.id];

    if (metal) {
      whereClauses.push('metal = ?');
      params.push(metal.toLowerCase().trim());
    }
    if (status_filter) {
      whereClauses.push('status = ?');
      params.push(status_filter.toLowerCase().trim());
    }
    if (from_date) {
      whereClauses.push('created_at >= ?');
      params.push(`${from_date.trim()} 00:00:00`);
    }
    if (to_date) {
      whereClauses.push('created_at <= ?');
      params.push(`${to_date.trim()} 23:59:59`);
    }
    if (search && search.trim()) {
      whereClauses.push('transaction_id LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    const rows = await query(`SELECT * FROM withdrawals WHERE ${whereClauses.join(' AND ')}`, params);
    for (const r of rows) {
      allRecords.push(normalizeWithdrawal(r));
    }
  }

  // Sort unified records newest first
  allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const total = allRecords.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const offset = (safePage - 1) * safeLimit;
  const paginatedItems = allRecords.slice(offset, offset + safeLimit);

  const items = paginatedItems.map((r) => ({
    transaction_id: r.transaction_id,
    type: r.type,
    metal: r.metal,
    direction: r.direction,
    quantity_grams: r.quantity_grams,
    rate_per_gram: r.rate_per_gram,
    metal_value: r.metal_value,
    gst_amount: r.gst_amount,
    total_amount: r.total_amount,
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

export async function getCustomerTransactionById(user, transactionId) {
  // Check purchases
  const pRows = await query('SELECT * FROM purchases WHERE transaction_id = ? AND user_id = ? LIMIT 1', [
    transactionId,
    user.id,
  ]);
  if (pRows.length > 0) {
    const norm = normalizePurchase(pRows[0]);
    return {
      transaction_id: norm.transaction_id,
      type: norm.type,
      metal: norm.metal,
      direction: norm.direction,
      quantity_grams: norm.quantity_grams,
      rate_per_gram: norm.rate_per_gram,
      metal_value: norm.metal_value,
      gst_amount: norm.gst_amount,
      total_amount: norm.total_amount,
      status: norm.status,
      created_at: norm.created_at,
    };
  }

  // Check withdrawals
  const wRows = await query('SELECT * FROM withdrawals WHERE transaction_id = ? AND user_id = ? LIMIT 1', [
    transactionId,
    user.id,
  ]);
  if (wRows.length > 0) {
    const norm = normalizeWithdrawal(wRows[0]);
    return {
      transaction_id: norm.transaction_id,
      type: norm.type,
      metal: norm.metal,
      direction: norm.direction,
      quantity_grams: norm.quantity_grams,
      rate_per_gram: norm.rate_per_gram,
      metal_value: norm.metal_value,
      gst_amount: norm.gst_amount,
      total_amount: norm.total_amount,
      status: norm.status,
      created_at: norm.created_at,
    };
  }

  const error = new Error('Transaction not found');
  error.status = 404;
  throw error;
}

export async function getAdminTransactions({
  type: txnType,
  metal,
  status_filter,
  direction,
  from_date,
  to_date,
  search,
  page = 1,
  limit = 20,
}) {
  if (metal && !['gold', 'silver'].includes(metal.toLowerCase().trim())) {
    const error = new Error("Metal must be either 'gold' or 'silver'");
    error.status = 400;
    throw error;
  }
  if (txnType && !['purchase', 'withdrawal'].includes(txnType.toLowerCase().trim())) {
    const error = new Error("Transaction type must be 'purchase' or 'withdrawal'");
    error.status = 400;
    throw error;
  }
  if (direction && !['credit', 'debit'].includes(direction.toLowerCase().trim())) {
    const error = new Error("Direction must be 'credit' or 'debit'");
    error.status = 400;
    throw error;
  }

  const allRecords = [];

  // Purchases
  const includePurchases =
    (!txnType || txnType.toLowerCase() === 'purchase') && (!direction || direction.toLowerCase() === 'credit');

  if (includePurchases) {
    const whereClauses = [];
    const params = [];

    if (metal) {
      whereClauses.push('p.metal = ?');
      params.push(metal.toLowerCase().trim());
    }
    if (status_filter) {
      whereClauses.push('p.status = ?');
      params.push(status_filter.toLowerCase().trim());
    }
    if (from_date) {
      whereClauses.push('p.created_at >= ?');
      params.push(`${from_date.trim()} 00:00:00`);
    }
    if (to_date) {
      whereClauses.push('p.created_at <= ?');
      params.push(`${to_date.trim()} 23:59:59`);
    }
    if (search && search.trim()) {
      whereClauses.push('(p.transaction_id LIKE ? OR u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const rows = await query(
      `SELECT p.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email
       FROM purchases p
       JOIN users u ON p.user_id = u.id
       ${whereSql}`,
      params
    );

    for (const r of rows) {
      const norm = normalizePurchase(r);
      norm.customer = {
        user_id: r.user_id,
        name: r.customer_name || 'Unknown',
        mobile: r.customer_mobile || '',
        email: r.customer_email || null,
      };
      allRecords.push(norm);
    }
  }

  // Withdrawals
  const includeWithdrawals =
    (!txnType || txnType.toLowerCase() === 'withdrawal') && (!direction || direction.toLowerCase() === 'debit');

  if (includeWithdrawals) {
    const whereClauses = [];
    const params = [];

    if (metal) {
      whereClauses.push('w.metal = ?');
      params.push(metal.toLowerCase().trim());
    }
    if (status_filter) {
      whereClauses.push('w.status = ?');
      params.push(status_filter.toLowerCase().trim());
    }
    if (from_date) {
      whereClauses.push('w.created_at >= ?');
      params.push(`${from_date.trim()} 00:00:00`);
    }
    if (to_date) {
      whereClauses.push('w.created_at <= ?');
      params.push(`${to_date.trim()} 23:59:59`);
    }
    if (search && search.trim()) {
      whereClauses.push('(w.transaction_id LIKE ? OR u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const rows = await query(
      `SELECT w.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       ${whereSql}`,
      params
    );

    for (const r of rows) {
      const norm = normalizeWithdrawal(r);
      norm.customer = {
        user_id: r.user_id,
        name: r.customer_name || 'Unknown',
        mobile: r.customer_mobile || '',
        email: r.customer_email || null,
      };
      allRecords.push(norm);
    }
  }

  allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const total = allRecords.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const offset = (safePage - 1) * safeLimit;
  const paginatedItems = allRecords.slice(offset, offset + safeLimit);

  const items = paginatedItems.map((r) => ({
    transaction_id: r.transaction_id,
    customer: r.customer,
    type: r.type,
    metal: r.metal,
    direction: r.direction,
    quantity_grams: r.quantity_grams,
    rate_per_gram: r.rate_per_gram,
    metal_value: r.metal_value,
    gst_amount: r.gst_amount,
    total_amount: r.total_amount,
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

export async function getAdminTransactionById(transactionId) {
  // Check purchases
  const pRows = await query(
    `SELECT p.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     WHERE p.transaction_id = ? LIMIT 1`,
    [transactionId]
  );
  if (pRows.length > 0) {
    const r = pRows[0];
    const norm = normalizePurchase(r);
    return {
      transaction_id: norm.transaction_id,
      customer: {
        user_id: r.user_id,
        name: r.customer_name || 'Unknown',
        mobile: r.customer_mobile || '',
        email: r.customer_email || null,
      },
      type: norm.type,
      metal: norm.metal,
      direction: norm.direction,
      quantity_grams: norm.quantity_grams,
      rate_per_gram: norm.rate_per_gram,
      metal_value: norm.metal_value,
      gst_amount: norm.gst_amount,
      total_amount: norm.total_amount,
      status: norm.status,
      created_at: norm.created_at,
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      admin_note: null,
      withdrawal_mode: null,
      payment_status: norm.payment_status,
    };
  }

  // Check withdrawals
  const wRows = await query(
    `SELECT w.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email
     FROM withdrawals w
     JOIN users u ON w.user_id = u.id
     WHERE w.transaction_id = ? LIMIT 1`,
    [transactionId]
  );
  if (wRows.length > 0) {
    const r = wRows[0];
    const norm = normalizeWithdrawal(r);
    return {
      transaction_id: norm.transaction_id,
      customer: {
        user_id: r.user_id,
        name: r.customer_name || 'Unknown',
        mobile: r.customer_mobile || '',
        email: r.customer_email || null,
      },
      type: norm.type,
      metal: norm.metal,
      direction: norm.direction,
      quantity_grams: norm.quantity_grams,
      rate_per_gram: norm.rate_per_gram,
      metal_value: norm.metal_value,
      gst_amount: norm.gst_amount,
      total_amount: norm.total_amount,
      status: norm.status,
      created_at: norm.created_at,
      approved_at: norm.approved_at,
      rejected_at: norm.rejected_at,
      rejection_reason: norm.rejection_reason,
      admin_note: norm.admin_note,
      withdrawal_mode: norm.withdrawal_mode,
      payment_status: null,
    };
  }

  const error = new Error('Transaction not found');
  error.status = 404;
  throw error;
}

export default {
  getCustomerTransactions,
  getCustomerTransactionById,
  getAdminTransactions,
  getAdminTransactionById,
};
