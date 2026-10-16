import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import config from '../config/env.js';
import { cleanRate, cleanGrams } from '../utils/formatters.js';
import { getRatesPublic } from './metalRatesService.js';

export async function getOrCreateHoldings(userId) {
  const rows = await query('SELECT * FROM holdings WHERE user_id = ? LIMIT 1', [userId]);
  if (rows.length > 0) {
    return rows[0];
  }

  const holdingId = uuidv4();
  await query(
    `INSERT INTO holdings (id, user_id, gold_quantity, gold_invested, gold_average_rate, gold_reserved, silver_quantity, silver_invested, silver_average_rate, silver_reserved, created_at, updated_at)
     VALUES (?, ?, 0.0000, 0.00, 0.00, 0.0000, 0.0000, 0.00, 0.00, 0.0000, NOW(), NOW())
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [holdingId, userId]
  );

  const created = await query('SELECT * FROM holdings WHERE user_id = ? LIMIT 1', [userId]);
  return created[0];
}

export async function processPurchaseForHoldings(purchaseDoc) {
  if (!purchaseDoc || purchaseDoc.status !== 'completed' || purchaseDoc.payment_status !== 'paid') {
    return;
  }

  const purchaseId = purchaseDoc.id;
  // 1. Idempotency check
  const existingTxns = await query('SELECT id FROM holding_transactions WHERE purchase_id = ? LIMIT 1', [purchaseId]);
  if (existingTxns.length > 0) {
    return;
  }

  const metal = (purchaseDoc.metal || '').toLowerCase().trim();
  if (!['gold', 'silver'].includes(metal)) {
    return;
  }

  const purchQty = cleanGrams(purchaseDoc.quantity_grams);
  const purchVal = cleanRate(purchaseDoc.metal_value);
  if (purchQty <= 0) {
    return;
  }

  const userId = purchaseDoc.user_id;
  const holding = await getOrCreateHoldings(userId);

  const oldQty = cleanGrams(holding[`${metal}_quantity`]);
  const oldInv = cleanRate(holding[`${metal}_invested`]);

  const newQty = cleanGrams(oldQty + purchQty);
  const newInv = cleanRate(oldInv + purchVal);
  const newAvgRate = newQty > 0 ? cleanRate(newInv / newQty) : 0.0;

  // 2. Update holdings
  await query(
    `UPDATE holdings 
     SET ${metal}_quantity = ?, ${metal}_invested = ?, ${metal}_average_rate = ?, updated_at = NOW() 
     WHERE user_id = ?`,
    [newQty, newInv, newAvgRate, userId]
  );

  // 3. Record transaction audit
  const htId = uuidv4();
  await query(
    `INSERT INTO holding_transactions (id, purchase_id, user_id, metal, quantity_grams, invested_amount, processed_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [htId, purchaseId, userId, metal, purchQty, purchVal]
  );
}

function buildHoldingsValuation(holding, activeRates) {
  const goldRate = cleanRate(activeRates.gold?.active_rate || config.defaultGoldRate);
  const silverRate = cleanRate(activeRates.silver?.active_rate || config.defaultSilverRate);

  // Gold
  const gQty = cleanGrams(holding.gold_quantity);
  const gReserved = cleanGrams(holding.gold_reserved);
  const gAvail = cleanGrams(Math.max(0, gQty - gReserved));
  const gInv = cleanRate(holding.gold_invested);
  const gAvg = cleanRate(holding.gold_average_rate);
  const gVal = cleanRate(gQty * goldRate);
  const gPL = cleanRate(gVal - gInv);

  // Silver
  const sQty = cleanGrams(holding.silver_quantity);
  const sReserved = cleanGrams(holding.silver_reserved);
  const sAvail = cleanGrams(Math.max(0, sQty - sReserved));
  const sInv = cleanRate(holding.silver_invested);
  const sAvg = cleanRate(holding.silver_average_rate);
  const sVal = cleanRate(sQty * silverRate);
  const sPL = cleanRate(sVal - sInv);

  const totalInv = cleanRate(gInv + sInv);
  const totalVal = cleanRate(gVal + sVal);
  const totalPL = cleanRate(totalVal - totalInv);

  return {
    gold: {
      quantity_grams: gQty,
      reserved_grams: gReserved,
      available_grams: gAvail,
      total_invested: gInv,
      average_buy_rate: gAvg,
      current_rate: goldRate,
      current_value: gVal,
      profit_loss: gPL,
    },
    silver: {
      quantity_grams: sQty,
      reserved_grams: sReserved,
      available_grams: sAvail,
      total_invested: sInv,
      average_buy_rate: sAvg,
      current_rate: silverRate,
      current_value: sVal,
      profit_loss: sPL,
    },
    total_invested: totalInv,
    total_current_value: totalVal,
    total_profit_loss: totalPL,
  };
}

export async function getCustomerHoldings(user) {
  const holding = await getOrCreateHoldings(user.id);
  const activeRates = await getRatesPublic();
  return buildHoldingsValuation(holding, activeRates);
}

export async function getCustomerMetalHolding(user, metal) {
  const cleanMetal = (metal || '').toLowerCase().trim();
  if (!['gold', 'silver'].includes(cleanMetal)) {
    const error = new Error("Metal must be either 'gold' or 'silver'");
    error.status = 400;
    throw error;
  }

  const holdings = await getCustomerHoldings(user);
  const val = holdings[cleanMetal];

  return {
    metal: cleanMetal,
    quantity_grams: val.quantity_grams,
    total_invested: val.total_invested,
    average_buy_rate: val.average_buy_rate,
    current_rate: val.current_rate,
    current_value: val.current_value,
    profit_loss: val.profit_loss,
  };
}

export async function getAdminCustomerHoldings(userId) {
  const users = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  if (users.length === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const user = users[0];
  const holding = await getOrCreateHoldings(user.id);
  const activeRates = await getRatesPublic();
  const valuation = buildHoldingsValuation(holding, activeRates);

  return {
    user_id: user.id,
    customer_name: user.name || 'Unknown',
    customer_mobile: user.mobile || '',
    customer_email: user.email || null,
    gold: valuation.gold,
    silver: valuation.silver,
    total_invested: valuation.total_invested,
    total_current_value: valuation.total_current_value,
    total_profit_loss: valuation.total_profit_loss,
    updated_at: holding.updated_at,
  };
}

export async function getAdminAllHoldings({ page = 1, limit = 20, search, metal }) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const whereClauses = ["u.role = 'customer'"];
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(u.name LIKE ? OR u.mobile LIKE ? OR u.email LIKE ?)');
    params.push(term, term, term);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const countRows = await query(`SELECT COUNT(*) as total FROM users u ${whereSql}`, params);
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT u.id as user_id, u.name, u.mobile, u.email,
            COALESCE(h.gold_quantity, 0) as gold_quantity,
            COALESCE(h.gold_invested, 0) as gold_invested,
            COALESCE(h.silver_quantity, 0) as silver_quantity,
            COALESCE(h.silver_invested, 0) as silver_invested,
            h.updated_at
     FROM users u
     LEFT JOIN holdings h ON u.id = h.user_id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  const activeRates = await getRatesPublic();
  const goldRate = cleanRate(activeRates.gold.active_rate);
  const silverRate = cleanRate(activeRates.silver.active_rate);

  const items = rows.map((r) => {
    const gQty = cleanGrams(r.gold_quantity);
    const gInv = cleanRate(r.gold_invested);
    const gVal = cleanRate(gQty * goldRate);

    const sQty = cleanGrams(r.silver_quantity);
    const sInv = cleanRate(r.silver_invested);
    const sVal = cleanRate(sQty * silverRate);

    const totInv = cleanRate(gInv + sInv);
    const totVal = cleanRate(gVal + sVal);
    const totPL = cleanRate(totVal - totInv);

    return {
      user_id: r.user_id,
      customer_name: r.name || 'Unknown',
      customer_mobile: r.mobile || '',
      customer_email: r.email || null,
      gold_quantity: gQty,
      gold_invested: gInv,
      silver_quantity: sQty,
      silver_invested: sInv,
      total_invested: totInv,
      total_current_value: totVal,
      total_profit_loss: totPL,
      updated_at: r.updated_at || null,
    };
  });

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
  };
}

export default {
  getOrCreateHoldings,
  processPurchaseForHoldings,
  getCustomerHoldings,
  getCustomerMetalHolding,
  getAdminCustomerHoldings,
  getAdminAllHoldings,
};
