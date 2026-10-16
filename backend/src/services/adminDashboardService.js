import { query } from '../config/db.js';
import config from '../config/env.js';
import { cleanRate, cleanGrams } from '../utils/formatters.js';
import { getRatesPublic } from './metalRatesService.js';
import { getUnreadNotificationCount } from './notificationService.js';

function getPeriodDates(period = '30d', fromDateStr = null, toDateStr = null) {
  const now = new Date();
  let startDt;
  let endDt;

  if (fromDateStr || toDateStr) {
    if (!fromDateStr || !toDateStr) {
      const error = new Error('Both from_date and to_date must be provided for custom date ranges');
      error.status = 400;
      throw error;
    }
    startDt = new Date(`${fromDateStr.trim()}T00:00:00.000Z`);
    endDt = new Date(`${toDateStr.trim()}T23:59:59.999Z`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      const error = new Error('Dates must follow YYYY-MM-DD format');
      error.status = 400;
      throw error;
    }
    if (startDt > endDt) {
      const error = new Error('from_date cannot be after to_date');
      error.status = 400;
      throw error;
    }
  } else {
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = periodMap[(period || '30d').toLowerCase().trim()] || 30;
    startDt = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDt.setUTCHours(0, 0, 0, 0);
    endDt = new Date(now.getTime());
    endDt.setUTCHours(23, 59, 59, 999);
  }

  // Generate continuous date strings (YYYY-MM-DD)
  const dateKeys = [];
  const curr = new Date(startDt.getTime());
  while (curr <= endDt) {
    dateKeys.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return { startDt, endDt, dateKeys };
}

export async function getDashboardOverview(adminUser) {
  // 1. Customer metrics
  const totalCustRows = await query("SELECT COUNT(*) as cnt FROM users WHERE role = 'customer'");
  const activeCustRows = await query(
    "SELECT COUNT(*) as cnt FROM users WHERE role = 'customer' AND account_status = 'active'"
  );
  const blockedCustRows = await query(
    "SELECT COUNT(*) as cnt FROM users WHERE role = 'customer' AND account_status IN ('suspended', 'banned')"
  );

  // 2. Holdings metrics
  const holdingsAgg = await query(
    'SELECT SUM(gold_quantity) as total_gold, SUM(silver_quantity) as total_silver FROM holdings'
  );
  const goldHoldingsGrams = cleanGrams(holdingsAgg[0]?.total_gold || 0);
  const silverHoldingsGrams = cleanGrams(holdingsAgg[0]?.total_silver || 0);

  // 3. Sales metrics (completed purchases)
  const salesAgg = await query(
    `SELECT metal, SUM(quantity_grams) as total_grams, SUM(total_amount) as total_val, COUNT(*) as txns_count 
     FROM purchases 
     WHERE status = 'completed' 
     GROUP BY metal`
  );
  const salesMap = {};
  for (const s of salesAgg) {
    salesMap[s.metal] = s;
  }

  // 4. KYC metrics
  const kycPendingRows = await query("SELECT COUNT(*) as cnt FROM kyc WHERE status = 'pending'");
  const kycApprovedRows = await query("SELECT COUNT(*) as cnt FROM kyc WHERE status = 'verified'");
  const kycRejectedRows = await query("SELECT COUNT(*) as cnt FROM kyc WHERE status = 'rejected'");

  // 5. Withdrawals metrics
  const wdRows = await query(
    `SELECT status, metal, COUNT(*) as cnt, SUM(quantity_grams) as total_grams, SUM(metal_value) as total_val 
     FROM withdrawals 
     GROUP BY status, metal`
  );

  let wdPendingCount = 0;
  let wdApprovedCount = 0;
  let wdRejectedCount = 0;
  let wdGoldGrams = 0;
  let wdSilverGrams = 0;
  let wdTotalValue = 0;

  const wdByMetal = {
    gold: { pending: 0, approved: 0, rejected: 0 },
    silver: { pending: 0, approved: 0, rejected: 0 },
  };

  for (const r of wdRows) {
    const st = r.status;
    const mt = r.metal;
    const cnt = parseInt(r.cnt, 10) || 0;
    const grams = parseFloat(r.total_grams) || 0;
    const val = parseFloat(r.total_val) || 0;

    if (st === 'pending') wdPendingCount += cnt;
    if (st === 'approved') {
      wdApprovedCount += cnt;
      if (mt === 'gold') wdGoldGrams += grams;
      if (mt === 'silver') wdSilverGrams += grams;
      wdTotalValue += val;
    }
    if (st === 'rejected') wdRejectedCount += cnt;

    if (wdByMetal[mt] && wdByMetal[mt][st] !== undefined) {
      wdByMetal[mt][st] += cnt;
    }
  }

  // 6. Rates
  const ratesPublic = await getRatesPublic();

  // 7. Notifications
  const unreadNotifs = await getUnreadNotificationCount(adminUser.id, 'admin');

  const totalPurchases = (salesMap.gold?.txns_count || 0) + (salesMap.silver?.txns_count || 0);
  const totalWithdrawals = wdPendingCount + wdApprovedCount + wdRejectedCount;

  return {
    rates: {
      gold_rate: cleanRate(ratesPublic.gold?.active_rate || config.defaultGoldRate),
      silver_rate: cleanRate(ratesPublic.silver?.active_rate || config.defaultSilverRate || 267.00),
      gold_api_rate: cleanRate(ratesPublic.gold?.api_rate || config.defaultGoldRate),
      silver_api_rate: cleanRate(ratesPublic.silver?.api_rate || config.defaultSilverRate || 267.00),
      gold_mode: ratesPublic.gold?.mode || 'api',
      silver_mode: ratesPublic.silver?.mode || 'api',
    },
    customers: {
      total: totalCustRows[0]?.cnt || 0,
      active: activeCustRows[0]?.cnt || 0,
      blocked: blockedCustRows[0]?.cnt || 0,
    },
    gold: {
      total_sold_grams: cleanGrams(salesMap.gold?.total_grams || 0),
      total_holdings_grams: goldHoldingsGrams,
      total_sales_value: cleanRate(salesMap.gold?.total_val || 0),
      total_transactions: salesMap.gold?.txns_count || 0,
    },
    silver: {
      total_sold_grams: cleanGrams(salesMap.silver?.total_grams || 0),
      total_holdings_grams: silverHoldingsGrams,
      total_sales_value: cleanRate(salesMap.silver?.total_val || 0),
      total_transactions: salesMap.silver?.txns_count || 0,
    },
    transactions: {
      total_count: totalPurchases,
      total_all_count: totalPurchases + totalWithdrawals,
      total_sales_value: cleanRate((salesMap.gold?.total_val || 0) + (salesMap.silver?.total_val || 0)),
      gold_count: salesMap.gold?.txns_count || 0,
      silver_count: salesMap.silver?.txns_count || 0,
    },
    kyc: {
      pending: kycPendingRows[0]?.cnt || 0,
      approved: kycApprovedRows[0]?.cnt || 0,
      rejected: kycRejectedRows[0]?.cnt || 0,
    },
    withdrawals: {
      pending: wdPendingCount,
      approved: wdApprovedCount,
      rejected: wdRejectedCount,
      total: totalWithdrawals,
      total_withdrawn_gold_grams: cleanGrams(wdGoldGrams),
      total_withdrawn_silver_grams: cleanGrams(wdSilverGrams),
      total_withdrawn_value: cleanRate(wdTotalValue),
      gold: wdByMetal.gold,
      silver: wdByMetal.silver,
    },
    notifications: {
      unread: unreadNotifs,
    },
  };
}

export async function getSalesByMetal() {
  const salesAgg = await query(
    `SELECT metal, SUM(quantity_grams) as total_grams, SUM(total_amount) as total_val, COUNT(*) as txns_count 
     FROM purchases 
     WHERE status = 'completed' 
     GROUP BY metal`
  );
  const salesMap = {};
  for (const s of salesAgg) {
    salesMap[s.metal] = s;
  }

  return {
    gold: {
      value: cleanRate(salesMap.gold?.total_val || 0),
      grams: cleanGrams(salesMap.gold?.total_grams || 0),
      transactions: salesMap.gold?.txns_count || 0,
    },
    silver: {
      value: cleanRate(salesMap.silver?.total_val || 0),
      grams: cleanGrams(salesMap.silver?.total_grams || 0),
      transactions: salesMap.silver?.txns_count || 0,
    },
  };
}

export async function getSalesByMetalTransactions() {
  const goldCountRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE status = 'completed' AND metal = 'gold'");
  const silverCountRows = await query(
    "SELECT COUNT(*) as cnt FROM purchases WHERE status = 'completed' AND metal = 'silver'"
  );

  return {
    gold: { transactions: goldCountRows[0]?.cnt || 0 },
    silver: { transactions: silverCountRows[0]?.cnt || 0 },
  };
}

export async function getSalesChart({ period = '30d', metal = 'all', from_date, to_date }) {
  const metalFilter = (metal || 'all').toLowerCase().trim();
  if (!['gold', 'silver', 'all'].includes(metalFilter)) {
    const error = new Error("metal must be 'gold', 'silver', or 'all'");
    error.status = 400;
    throw error;
  }

  const { startDt, endDt, dateKeys } = getPeriodDates(period, from_date, to_date);

  const startStr = startDt.toISOString().slice(0, 19).replace('T', ' ');
  const endStr = endDt.toISOString().slice(0, 19).replace('T', ' ');

  const whereClauses = ["status = 'completed'", 'created_at >= ?', 'created_at <= ?'];
  const params = [startStr, endStr];

  if (metalFilter === 'gold' || metalFilter === 'silver') {
    whereClauses.push('metal = ?');
    params.push(metalFilter);
  }

  const aggRows = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date_str, metal, SUM(total_amount) as daily_sales 
     FROM purchases 
     WHERE ${whereClauses.join(' AND ')}
     GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), metal`,
    params
  );

  const dataMap = {};
  for (const dk of dateKeys) {
    dataMap[dk] = { gold: 0.0, silver: 0.0 };
  }

  for (const r of aggRows) {
    if (dataMap[r.date_str]) {
      const amt = cleanRate(r.daily_sales);
      if (r.metal === 'gold') {
        dataMap[r.date_str].gold = amt;
      } else if (r.metal === 'silver') {
        dataMap[r.date_str].silver = amt;
      }
    }
  }

  const points = dateKeys.map((dk) => {
    const gVal = cleanRate(dataMap[dk].gold);
    const sVal = cleanRate(dataMap[dk].silver);

    if (metalFilter === 'gold') {
      return { date: dk, gold: gVal, silver: 0.0, total: gVal };
    }
    if (metalFilter === 'silver') {
      return { date: dk, gold: 0.0, silver: sVal, total: sVal };
    }
    return { date: dk, gold: gVal, silver: sVal, total: cleanRate(gVal + sVal) };
  });

  return {
    period,
    data: points,
  };
}

export async function getPendingKycCount() {
  const rows = await query("SELECT COUNT(*) as count FROM kyc WHERE status = 'pending'");
  return { count: rows[0]?.count || 0 };
}

export async function getWithdrawalsSummary() {
  const rows = await query(
    `SELECT status, metal, COUNT(*) as cnt 
     FROM withdrawals 
     GROUP BY status, metal`
  );

  const counts = {
    gold: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
    silver: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
  };

  for (const r of rows) {
    const st = r.status;
    const mt = r.metal;
    const cnt = parseInt(r.cnt, 10) || 0;
    if (counts[mt] && counts[mt][st] !== undefined) {
      counts[mt][st] = cnt;
    }
  }

  return {
    pending: counts.gold.pending + counts.silver.pending,
    approved: counts.gold.approved + counts.silver.approved,
    rejected: counts.gold.rejected + counts.silver.rejected,
    cancelled: counts.gold.cancelled + counts.silver.cancelled,
    gold: {
      pending: counts.gold.pending,
      approved: counts.gold.approved,
      rejected: counts.gold.rejected,
    },
    silver: {
      pending: counts.silver.pending,
      approved: counts.silver.approved,
      rejected: counts.silver.rejected,
    },
  };
}

export async function getDashboardRecentTransactions(limit = 10) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 10, 50));

  const pRows = await query(
    `SELECT p.transaction_id, p.user_id, p.metal, p.quantity_grams, p.total_amount, p.status, p.created_at, u.name as customer_name
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC
     LIMIT ${safeLimit}`
  );

  const wRows = await query(
    `SELECT w.transaction_id, w.user_id, w.metal, w.quantity_grams, w.metal_value as total_amount, w.status, w.created_at, u.name as customer_name
     FROM withdrawals w
     JOIN users u ON w.user_id = u.id
     ORDER BY w.created_at DESC
     LIMIT ${safeLimit}`
  );

  const combined = [];
  for (const p of pRows) {
    combined.push({
      transaction_id: p.transaction_id,
      customer_name: p.customer_name || 'Unknown Customer',
      type: 'purchase',
      metal: p.metal,
      direction: 'credit',
      quantity_grams: cleanGrams(p.quantity_grams),
      total_amount: cleanRate(p.total_amount),
      status: p.status,
      created_at: p.created_at,
    });
  }

  for (const w of wRows) {
    combined.push({
      transaction_id: w.transaction_id,
      customer_name: w.customer_name || 'Unknown Customer',
      type: 'withdrawal',
      metal: w.metal,
      direction: 'debit',
      quantity_grams: cleanGrams(w.quantity_grams),
      total_amount: cleanRate(w.total_amount),
      status: w.status,
      created_at: w.created_at,
    });
  }

  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { items: combined.slice(0, safeLimit) };
}

export async function getDashboardRecentMembers(limit = 10) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 10, 50));
  const rows = await query(
    `SELECT id as user_id, name, email, mobile, account_status as status, created_at 
     FROM users 
     WHERE role = 'customer' 
     ORDER BY created_at DESC 
     LIMIT ${safeLimit}`
  );

  return { items: rows };
}

export async function getCustomerGrowth(period = '30d') {
  const { startDt, endDt, dateKeys } = getPeriodDates(period);
  const startStr = startDt.toISOString().slice(0, 19).replace('T', ' ');
  const endStr = endDt.toISOString().slice(0, 19).replace('T', ' ');

  const baseCountRows = await query(
    "SELECT COUNT(*) as cnt FROM users WHERE role = 'customer' AND created_at < ?",
    [startStr]
  );
  const baseCount = baseCountRows[0]?.cnt || 0;

  const dailyRows = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date_str, COUNT(*) as new_users 
     FROM users 
     WHERE role = 'customer' AND created_at >= ? AND created_at <= ? 
     GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
    [startStr, endStr]
  );

  const dailyMap = {};
  for (const r of dailyRows) {
    dailyMap[r.date_str] = r.new_users;
  }

  let runningTotal = baseCount;
  const points = dateKeys.map((dk) => {
    const newUsers = dailyMap[dk] || 0;
    runningTotal += newUsers;
    return {
      date: dk,
      new_customers: newUsers,
      total_customers: runningTotal,
    };
  });

  return {
    period,
    data: points,
  };
}

export async function getTransactionStats() {
  const pTotalRows = await query('SELECT COUNT(*) as cnt FROM purchases');
  const pCompRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE status = 'completed'");
  const pPendRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE status = 'pending'");
  const pFailRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE status = 'failed'");
  const pCancRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE status = 'cancelled'");

  const wTotalRows = await query('SELECT COUNT(*) as cnt FROM withdrawals');
  const wPendRows = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'pending'");
  const wApprRows = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'approved'");
  const wRejeRows = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'rejected'");
  const wCancRows = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'cancelled'");

  const gPurchRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE metal = 'gold' AND status = 'completed'");
  const gWithdRows = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE metal = 'gold' AND status = 'approved'");
  const sPurchRows = await query("SELECT COUNT(*) as cnt FROM purchases WHERE metal = 'silver' AND status = 'completed'");
  const sWithdRows = await query("SELECT COUNT(*) as cnt FROM withdrawals WHERE metal = 'silver' AND status = 'approved'");

  return {
    purchases: {
      total: pTotalRows[0]?.cnt || 0,
      completed: pCompRows[0]?.cnt || 0,
      pending: pPendRows[0]?.cnt || 0,
      failed: pFailRows[0]?.cnt || 0,
      cancelled: pCancRows[0]?.cnt || 0,
    },
    withdrawals: {
      total: wTotalRows[0]?.cnt || 0,
      pending: wPendRows[0]?.cnt || 0,
      approved: wApprRows[0]?.cnt || 0,
      rejected: wRejeRows[0]?.cnt || 0,
      cancelled: wCancRows[0]?.cnt || 0,
    },
    gold: {
      purchases: gPurchRows[0]?.cnt || 0,
      withdrawals: gWithdRows[0]?.cnt || 0,
    },
    silver: {
      purchases: sPurchRows[0]?.cnt || 0,
      withdrawals: sWithdRows[0]?.cnt || 0,
    },
  };
}

export async function getDashboardCurrentRates() {
  const ratesPublic = await getRatesPublic();
  const g = ratesPublic.gold;
  const s = ratesPublic.silver;

  return {
    gold: {
      buy_rate: g.active_rate,
      sell_rate: g.active_rate,
      updated_at: g.updated_at || new Date().toISOString(),
    },
    silver: {
      buy_rate: s.active_rate,
      sell_rate: s.active_rate,
      updated_at: s.updated_at || new Date().toISOString(),
    },
  };
}

export async function getDashboardNotificationSummary(adminUser) {
  const count = await getUnreadNotificationCount(adminUser.id, 'admin');
  return { unread: count };
}

export default {
  getDashboardOverview,
  getSalesByMetal,
  getSalesByMetalTransactions,
  getSalesChart,
  getPendingKycCount,
  getWithdrawalsSummary,
  getDashboardRecentTransactions,
  getDashboardRecentMembers,
  getCustomerGrowth,
  getTransactionStats,
  getDashboardCurrentRates,
  getDashboardNotificationSummary,
};
