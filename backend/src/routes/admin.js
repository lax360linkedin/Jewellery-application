import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAdminUsers,
  getAdminUserDetail,
  updateUserStatusByAdmin,
} from '../services/userService.js';
import {
  getPendingKycList,
  getKycDetails,
  approveKyc,
  rejectKyc,
} from '../services/kycService.js';
import {
  getRatesAdmin,
  setCustomRates,
  refreshApiRates,
  getRateHistory,
} from '../services/metalRatesService.js';
import { fetchSalemReferenceRates } from '../services/rapidApiRateService.js';
import {
  getAdminCustomerHoldings,
  getAdminAllHoldings,
} from '../services/holdingsService.js';
import {
  getAdminPurchases,
  getAdminPurchaseById,
} from '../services/purchaseService.js';
import {
  getAdminWithdrawals,
  getAdminWithdrawalById,
  approveWithdrawal,
  rejectWithdrawal,
} from '../services/withdrawalService.js';
import {
  getAdminTransactions,
  getAdminTransactionById,
} from '../services/transactionService.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService.js';

const router = express.Router();

// Enforce requireAdmin on all /api/admin routes
router.use(requireAdmin);

// ==========================================
// User Management
// ==========================================

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, search, status, kyc_status } = req.query;
    const result = await getAdminUsers({
      page,
      limit,
      search,
      status_filter: status,
      kyc_status_filter: kyc_status,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res, next) => {
  try {
    const detail = await getAdminUserDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await updateUserStatusByAdmin(req.params.id, status, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', async (req, res, next) => {
  try {
    const result = await updateUserStatusByAdmin(req.params.id, 'banned', req.user);
    result.message = 'User banned successfully';
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/unban
router.post('/users/:id/unban', async (req, res, next) => {
  try {
    const result = await updateUserStatusByAdmin(req.params.id, 'active', req.user);
    result.message = 'User unbanned successfully';
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id/holdings
router.get('/users/:id/holdings', async (req, res, next) => {
  try {
    const holdings = await getAdminCustomerHoldings(req.params.id);
    res.json(holdings);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/holdings
router.get('/holdings', async (req, res, next) => {
  try {
    const { page, limit, search, metal } = req.query;
    const result = await getAdminAllHoldings({ page, limit, search, metal });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// KYC Management
// ==========================================

// GET /api/admin/kyc/pending
router.get('/kyc/pending', async (req, res, next) => {
  try {
    const list = await getPendingKycList();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/kyc/:id
router.get('/kyc/:id', async (req, res, next) => {
  try {
    const detail = await getKycDetails(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/kyc/:id/approve
router.post('/kyc/:id/approve', async (req, res, next) => {
  try {
    const result = await approveKyc(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/kyc/:id/reject
router.post('/kyc/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      const error = new Error('Rejection reason is required');
      error.status = 400;
      throw error;
    }
    const result = await rejectKyc(req.params.id, req.user, reason.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Rates Management
// ==========================================

// GET /api/admin/rates
router.get('/rates', async (req, res, next) => {
  try {
    const rates = await getRatesAdmin();
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rates/custom
router.post('/rates/custom', async (req, res, next) => {
  try {
    const rates = await setCustomRates(req.user, req.body);
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rates/refresh
router.post('/rates/refresh', async (req, res, next) => {
  try {
    const result = await refreshApiRates(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rates/history
router.get('/rates/history', async (req, res, next) => {
  try {
    const { metal, limit } = req.query;
    const history = await getRateHistory(metal, limit);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rates/reference/salem (RapidAPI Live Salem Reference Rates)
router.get('/rates/reference/salem', async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
    const rates = await fetchSalemReferenceRates({ forceRefresh });
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Purchases Management
// ==========================================

// GET /api/admin/purchases
router.get('/purchases', async (req, res, next) => {
  try {
    const { page, limit, search, metal, status, payment_status } = req.query;
    const result = await getAdminPurchases({
      page,
      limit,
      search,
      metal,
      status_filter: status,
      payment_status,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/purchases/:id
router.get('/purchases/:id', async (req, res, next) => {
  try {
    const detail = await getAdminPurchaseById(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Withdrawals Management
// ==========================================

// GET /api/admin/withdrawals
router.get('/withdrawals', async (req, res, next) => {
  try {
    const { page, limit, search, metal, status, withdrawal_mode } = req.query;
    const result = await getAdminWithdrawals({
      page,
      limit,
      search,
      metal,
      status_filter: status,
      withdrawal_mode,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/withdrawals/:id
router.get('/withdrawals/:id', async (req, res, next) => {
  try {
    const detail = await getAdminWithdrawalById(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/withdrawals/:id/approve
router.post('/withdrawals/:id/approve', async (req, res, next) => {
  try {
    const result = await approveWithdrawal(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/withdrawals/:id/reject
router.post('/withdrawals/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      const error = new Error('Rejection reason is required');
      error.status = 400;
      throw error;
    }
    const result = await rejectWithdrawal(req.params.id, req.user, reason.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Transactions Management
// ==========================================

// GET /api/admin/transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      type,
      metal,
      status,
      direction,
      from_date,
      to_date,
    } = req.query;

    const result = await getAdminTransactions({
      page,
      limit,
      search,
      type,
      metal,
      status_filter: status,
      direction,
      from_date,
      to_date,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/transactions/:id
router.get('/transactions/:id', async (req, res, next) => {
  try {
    const detail = await getAdminTransactionById(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// Admin Notifications Management
// ==========================================

// GET /api/admin/notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const { type, is_read, from_date, to_date, page, limit } = req.query;
    const result = await getUserNotifications({
      user_id: req.user.id,
      recipient_type: 'admin',
      type,
      is_read,
      from_date,
      to_date,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/notifications/unread-count
router.get('/notifications/unread-count', async (req, res, next) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id, 'admin');
    res.json({ unread_count: count });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/notifications/read-all
router.patch('/notifications/read-all', async (req, res, next) => {
  try {
    const modifiedCount = await markAllNotificationsAsRead(req.user.id, 'admin');
    res.json({
      message: 'All notifications marked as read',
      marked_count: modifiedCount,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/notifications/:id/read
router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const result = await markNotificationAsRead(req.params.id, req.user.id, 'admin');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
