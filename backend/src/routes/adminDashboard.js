import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
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
} from '../services/adminDashboardService.js';

const router = express.Router();

// Enforce requireAdmin on all /api/admin/dashboard routes
router.use(requireAdmin);

// GET /api/admin/dashboard
router.get('/', async (req, res, next) => {
  try {
    const overview = await getDashboardOverview(req.user);
    res.json(overview);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/sales-by-metal
router.get('/sales-by-metal', async (req, res, next) => {
  try {
    const result = await getSalesByMetal();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/sales-by-metal/transactions
router.get('/sales-by-metal/transactions', async (req, res, next) => {
  try {
    const result = await getSalesByMetalTransactions();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/sales-chart
router.get('/sales-chart', async (req, res, next) => {
  try {
    const { period, metal, from_date, to_date } = req.query;
    const result = await getSalesChart({ period, metal, from_date, to_date });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/pending-kyc
router.get('/pending-kyc', async (req, res, next) => {
  try {
    const result = await getPendingKycCount();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/withdrawals-summary
router.get('/withdrawals-summary', async (req, res, next) => {
  try {
    const result = await getWithdrawalsSummary();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/recent-transactions
router.get('/recent-transactions', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await getDashboardRecentTransactions(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/recent-members
router.get('/recent-members', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await getDashboardRecentMembers(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/customer-growth
router.get('/customer-growth', async (req, res, next) => {
  try {
    const period = req.query.period || '30d';
    const result = await getCustomerGrowth(period);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/transaction-stats
router.get('/transaction-stats', async (req, res, next) => {
  try {
    const result = await getTransactionStats();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/current-rates
router.get('/current-rates', async (req, res, next) => {
  try {
    const result = await getDashboardCurrentRates();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/dashboard/notification-summary
router.get('/notification-summary', async (req, res, next) => {
  try {
    const result = await getDashboardNotificationSummary(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
