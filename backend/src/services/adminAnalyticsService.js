/**
 * Admin Analytics Service
 * Real database aggregations for metal purchases, transactions, holdings, and withdrawals by period.
 */

import { query } from '../config/db.js';
import config from '../config/env.js';
import { cleanRate, cleanGrams } from '../utils/formatters.js';
import { getRatesPublic } from './metalRatesService.js';

function formatLocalDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function computePeriodDateRange({
  period = 'Monthly (current month)',
  quarter = 'Q3 (Jul-Sep)',
  year = '2026',
  from_date = null,
  to_date = null,
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const selectedYear = parseInt(year, 10) || currentYear;

  let startDt;
  let endDt;
  const p = (period || '').toLowerCase().trim();

  if (p.includes('monthly')) {
    // Current month: 1st of current month through today
    startDt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (p.includes('annual')) {
    // Current year: Jan 1 through today
    startDt = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
    if (selectedYear === currentYear) {
      endDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      endDt = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    }
  } else if (p.includes('quarter')) {
    const qStr = (quarter || '').toUpperCase();
    let qMonthStart = 0;
    let qMonthEnd = 2;
    let qLastDay = 31;

    if (qStr.includes('Q1')) {
      qMonthStart = 0; qMonthEnd = 2; qLastDay = 31;
    } else if (qStr.includes('Q2')) {
      qMonthStart = 3; qMonthEnd = 5; qLastDay = 30;
    } else if (qStr.includes('Q3')) {
      qMonthStart = 6; qMonthEnd = 8; qLastDay = 30;
    } else if (qStr.includes('Q4')) {
      qMonthStart = 9; qMonthEnd = 11; qLastDay = 31;
    }

    startDt = new Date(selectedYear, qMonthStart, 1, 0, 0, 0, 0);
    endDt = new Date(selectedYear, qMonthEnd, qLastDay, 23, 59, 59, 999);
  } else if (p.includes('custom') || (from_date && to_date)) {
    if (from_date && to_date) {
      const [fy, fm, fd] = from_date.split('-').map(Number);
      const [ty, tm, td] = to_date.split('-').map(Number);
      startDt = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
      endDt = new Date(ty, tm - 1, td, 23, 59, 59, 999);
    } else {
      startDt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }
  } else {
    startDt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const fromStr = formatLocalDate(startDt);
  const toStr = formatLocalDate(endDt);

  return {
    startDt,
    endDt,
    fromStr,
    toStr,
    dateRangeText: `Showing ${fromStr} to ${toStr}`,
  };
}

export async function getAdminAnalyticsData(params = {}) {
  const { startDt, endDt, fromStr, toStr, dateRangeText } = computePeriodDateRange(params);

  const startSqlStr = `${fromStr} 00:00:00`;
  const endSqlStr = `${toStr} 23:59:59`;

  // 1. Live Active Rates from shared rates service
  const ratesPublic = await getRatesPublic();
  const safeGoldRate = cleanRate(ratesPublic.gold?.active_rate || config.defaultGoldRate);
  const safeSilverRate = cleanRate(ratesPublic.silver?.active_rate || config.defaultSilverRate || 267.00);

  // 2. Overall totals across all customers (all-time completed purchases)
  const overallAgg = await query(
    `SELECT metal, SUM(quantity_grams) as total_grams, SUM(total_amount) as total_val, COUNT(*) as cnt 
     FROM purchases 
     WHERE status = 'completed' 
     GROUP BY metal`
  );

  let totalGoldBought = 0;
  let totalSilverBought = 0;

  for (const row of overallAgg) {
    if (row.metal === 'gold') {
      totalGoldBought = cleanGrams(row.total_grams || 0);
    } else if (row.metal === 'silver') {
      totalSilverBought = cleanGrams(row.total_grams || 0);
    }
  }

  const totalGoldCurrentValue = cleanRate(totalGoldBought * safeGoldRate);
  const totalSilverCurrentValue = cleanRate(totalSilverBought * safeSilverRate);

  // 3. Period-specific sales metrics
  const periodAgg = await query(
    `SELECT metal, SUM(quantity_grams) as total_grams, SUM(total_amount) as total_val, COUNT(*) as cnt 
     FROM purchases 
     WHERE status = 'completed' AND created_at >= ? AND created_at <= ? 
     GROUP BY metal`,
    [startSqlStr, endSqlStr]
  );

  let goldPeriodGrams = 0;
  let goldPeriodValue = 0;
  let goldPeriodTxns = 0;

  let silverPeriodGrams = 0;
  let silverPeriodValue = 0;
  let silverPeriodTxns = 0;

  for (const row of periodAgg) {
    if (row.metal === 'gold') {
      goldPeriodGrams = cleanGrams(row.total_grams || 0);
      goldPeriodValue = cleanRate(row.total_val || 0);
      goldPeriodTxns = parseInt(row.cnt, 10) || 0;
    } else if (row.metal === 'silver') {
      silverPeriodGrams = cleanGrams(row.total_grams || 0);
      silverPeriodValue = cleanRate(row.total_val || 0);
      silverPeriodTxns = parseInt(row.cnt, 10) || 0;
    }
  }

  const goldPeriodAvgRate = goldPeriodGrams > 0 ? cleanRate(goldPeriodValue / goldPeriodGrams) : 0;
  const silverPeriodAvgRate = silverPeriodGrams > 0 ? cleanRate(silverPeriodValue / silverPeriodGrams) : 0;

  // 4. Period daily/monthly bars for Gold and Silver charts
  const periodDailyRows = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date_str, metal, SUM(quantity_grams) as grams, SUM(total_amount) as total_val, COUNT(*) as cnt 
     FROM purchases 
     WHERE status = 'completed' AND created_at >= ? AND created_at <= ? 
     GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), metal 
     ORDER BY date_str ASC`,
    [startSqlStr, endSqlStr]
  );

  const goldBars = [];
  const silverBars = [];

  for (const r of periodDailyRows) {
    const dObj = new Date(`${r.date_str}T00:00:00`);
    const fullDate = !isNaN(dObj.getTime()) ? dObj.toDateString() : r.date_str;
    const barItem = {
      date: r.date_str,
      full_date: fullDate,
      grams: cleanGrams(r.grams || 0),
      value: cleanRate(r.total_val || 0),
      count: parseInt(r.cnt, 10) || 0,
    };

    if (r.metal === 'gold') {
      goldBars.push(barItem);
    } else if (r.metal === 'silver') {
      silverBars.push(barItem);
    }
  }

  // 5. Total completed/approved withdrawals in period
  const wdPeriodAgg = await query(
    `SELECT SUM(metal_value) as total_val, SUM(quantity_grams) as total_grams, COUNT(*) as cnt 
     FROM withdrawals 
     WHERE (status = 'approved' OR status = 'completed') AND created_at >= ? AND created_at <= ?`,
    [startSqlStr, endSqlStr]
  );

  const periodWithdrawalValue = cleanRate(wdPeriodAgg[0]?.total_val || 0);
  const periodWithdrawalGrams = cleanGrams(wdPeriodAgg[0]?.total_grams || 0);
  const periodWithdrawalCount = parseInt(wdPeriodAgg[0]?.cnt, 10) || 0;

  return {
    from_date: fromStr,
    to_date: toStr,
    date_range_text: dateRangeText,
    overall: {
      gold_rate: safeGoldRate,
      silver_rate: safeSilverRate,
      total_gold_bought: totalGoldBought,
      total_silver_bought: totalSilverBought,
      total_gold_current_value: totalGoldCurrentValue,
      total_silver_current_value: totalSilverCurrentValue,
    },
    gold: {
      grams: goldPeriodGrams,
      value: goldPeriodValue,
      avg_rate: goldPeriodAvgRate,
      transactions_count: goldPeriodTxns,
      bars: goldBars,
    },
    silver: {
      grams: silverPeriodGrams,
      value: silverPeriodValue,
      avg_rate: silverPeriodAvgRate,
      transactions_count: silverPeriodTxns,
      bars: silverBars,
    },
    withdrawals: {
      total_value: periodWithdrawalValue,
      total_grams: periodWithdrawalGrams,
      count: periodWithdrawalCount,
    },
  };
}

export default {
  computePeriodDateRange,
  getAdminAnalyticsData,
};
