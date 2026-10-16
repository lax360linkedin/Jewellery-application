import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import config from '../config/env.js';
import { cleanRate, cleanGrams, generateTransactionId } from '../utils/formatters.js';
import { getRatesPublic } from './metalRatesService.js';
import { processPurchaseForHoldings } from './holdingsService.js';
import { notifyPurchaseCompleted } from './notificationService.js';

export function formatPurchaseResponse(doc) {
  return {
    purchase_id: doc.id,
    transaction_id: doc.transaction_id,
    metal: doc.metal,
    quantity_grams: cleanGrams(doc.quantity_grams),
    rate_per_gram: cleanRate(doc.rate_per_gram),
    metal_value: cleanRate(doc.metal_value),
    gst_rate_percent: cleanRate(doc.gst_rate_percent || 3.0),
    gst_amount: cleanRate(doc.gst_amount),
    total_amount: cleanRate(doc.total_amount),
    currency: doc.currency || 'INR',
    status: doc.status || 'completed',
    payment_status: doc.payment_status || 'paid',
    created_at: doc.created_at,
  };
}

export async function createPurchase(user, data) {
  const metal = (data.metal || '').toLowerCase().trim();
  if (!['gold', 'silver'].includes(metal)) {
    const error = new Error("Metal must be either 'gold' or 'silver'");
    error.status = 400;
    throw error;
  }

  const quantityGrams = cleanGrams(data.quantity_grams);

  if (metal === 'gold' && quantityGrams < config.minGoldPurchaseGrams) {
    const error = new Error(`Minimum gold purchase quantity is ${config.minGoldPurchaseGrams} grams`);
    error.status = 400;
    throw error;
  }
  if (metal === 'silver' && quantityGrams < config.minSilverPurchaseGrams) {
    const error = new Error(`Minimum silver purchase quantity is ${config.minSilverPurchaseGrams} grams`);
    error.status = 400;
    throw error;
  }

  // Fetch active rate
  const rates = await getRatesPublic();
  const activeRate = cleanRate(rates[metal]?.active_rate);

  if (!activeRate || activeRate <= 0) {
    const error = new Error(`Active rate for ${metal} is currently unavailable`);
    error.status = 503;
    throw error;
  }

  // Financial calculations
  const metalValue = cleanRate(quantityGrams * activeRate);
  const gstAmount = cleanRate(metalValue * (config.gstRatePercent / 100));
  const totalAmount = cleanRate(metalValue + gstAmount);
  const transactionId = generateTransactionId(metal);

  const purchaseId = uuidv4();
  await query(
    `INSERT INTO purchases (id, transaction_id, user_id, metal, quantity_grams, rate_per_gram, metal_value, gst_rate_percent, gst_amount, total_amount, currency, status, payment_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'completed', 'paid', NOW(), NOW())`,
    [
      purchaseId,
      transactionId,
      user.id,
      metal,
      quantityGrams,
      activeRate,
      metalValue,
      config.gstRatePercent,
      gstAmount,
      totalAmount,
    ]
  );

  const purchaseDoc = {
    id: purchaseId,
    transaction_id: transactionId,
    user_id: user.id,
    metal,
    quantity_grams: quantityGrams,
    rate_per_gram: activeRate,
    metal_value: metalValue,
    gst_rate_percent: config.gstRatePercent,
    gst_amount: gstAmount,
    total_amount: totalAmount,
    currency: 'INR',
    status: 'completed',
    payment_status: 'paid',
    created_at: new Date().toISOString(),
  };

  // Process holdings update
  try {
    await processPurchaseForHoldings(purchaseDoc);
  } catch (err) {
    console.error('Error processing holdings for purchase:', err);
  }

  // Trigger notification
  try {
    await notifyPurchaseCompleted(purchaseDoc);
  } catch (err) {
    console.error('Error sending purchase notification:', err);
  }

  return formatPurchaseResponse(purchaseDoc);
}

export async function getCustomerPurchases(user, { metal, status_filter, page = 1, limit = 20 }) {
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
  const countRows = await query(`SELECT COUNT(*) as total FROM purchases ${whereSql}`, params);
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT * FROM purchases 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const items = rows.map(formatPurchaseResponse);

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
  };
}

export async function getCustomerPurchaseById(user, purchaseId) {
  const rows = await query(
    'SELECT * FROM purchases WHERE (id = ? OR transaction_id = ?) AND user_id = ? LIMIT 1',
    [purchaseId, purchaseId, user.id]
  );
  if (rows.length === 0) {
    const error = new Error('Purchase not found');
    error.status = 404;
    throw error;
  }
  return formatPurchaseResponse(rows[0]);
}

export async function getAdminPurchases({ page = 1, limit = 20, search, metal, status_filter, payment_status }) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const whereClauses = [];
  const params = [];

  if (metal && ['gold', 'silver'].includes(metal.toLowerCase().trim())) {
    whereClauses.push('p.metal = ?');
    params.push(metal.toLowerCase().trim());
  }

  if (status_filter) {
    whereClauses.push('p.status = ?');
    params.push(status_filter.toLowerCase().trim());
  }

  if (payment_status) {
    whereClauses.push('p.payment_status = ?');
    params.push(payment_status.toLowerCase().trim());
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(p.transaction_id LIKE ? OR u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)');
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRows = await query(
    `SELECT COUNT(*) as total 
     FROM purchases p 
     JOIN users u ON p.user_id = u.id 
     ${whereSql}`,
    params
  );
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT p.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     ${whereSql}
     ORDER BY p.created_at DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const items = rows.map((r) => ({
    purchase_id: r.id,
    transaction_id: r.transaction_id,
    customer: {
      user_id: r.user_id,
      name: r.customer_name || 'Unknown',
      mobile: r.customer_mobile || '',
      email: r.customer_email || null,
    },
    metal: r.metal,
    quantity_grams: cleanGrams(r.quantity_grams),
    rate_per_gram: cleanRate(r.rate_per_gram),
    total_amount: cleanRate(r.total_amount),
    status: r.status,
    payment_status: r.payment_status,
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

export async function getAdminPurchaseById(purchaseId) {
  const rows = await query(
    `SELECT p.*, u.name as customer_name, u.mobile as customer_mobile, u.email as customer_email
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = ? OR p.transaction_id = ?
     LIMIT 1`,
    [purchaseId, purchaseId]
  );

  if (rows.length === 0) {
    const error = new Error('Purchase not found');
    error.status = 404;
    throw error;
  }

  const r = rows[0];
  return {
    purchase_id: r.id,
    transaction_id: r.transaction_id,
    customer: {
      user_id: r.user_id,
      name: r.customer_name || 'Unknown',
      mobile: r.customer_mobile || '',
      email: r.customer_email || null,
    },
    metal: r.metal,
    quantity_grams: cleanGrams(r.quantity_grams),
    rate_per_gram: cleanRate(r.rate_per_gram),
    metal_value: cleanRate(r.metal_value),
    gst_rate_percent: cleanRate(r.gst_rate_percent || 3.0),
    gst_amount: cleanRate(r.gst_amount),
    total_amount: cleanRate(r.total_amount),
    currency: r.currency || 'INR',
    status: r.status,
    payment_status: r.payment_status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export default {
  createPurchase,
  getCustomerPurchases,
  getCustomerPurchaseById,
  getAdminPurchases,
  getAdminPurchaseById,
};
