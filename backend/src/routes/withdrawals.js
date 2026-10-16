import express from 'express';
import config from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createWithdrawalRequest,
  getCustomerWithdrawals,
  getCustomerWithdrawalById,
  cancelCustomerWithdrawal,
  requestWithdrawalOtp,
  resendWithdrawalOtp,
  verifyWithdrawalOtp,
} from '../services/withdrawalService.js';

const router = express.Router();

// GET /api/withdrawals/rules (Expose authoritative minimum withdrawal rules)
router.get('/rules', (req, res) => {
  res.json({
    min_gold_withdrawal_grams: config.minGoldWithdrawalGrams,
    min_silver_withdrawal_grams: config.minSilverWithdrawalGrams,
  });
});

// POST /api/withdrawals/request-otp
router.post('/request-otp', requireAuth, async (req, res, next) => {
  try {
    const result = await requestWithdrawalOtp(req.user, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/withdrawals/resend-otp
router.post('/resend-otp', requireAuth, async (req, res, next) => {
  try {
    const { challenge_id } = req.body;
    const result = await resendWithdrawalOtp(req.user, challenge_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/withdrawals/verify-otp
router.post('/verify-otp', requireAuth, async (req, res, next) => {
  try {
    const { challenge_id, otp } = req.body;
    const result = await verifyWithdrawalOtp(req.user, challenge_id, otp);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/withdrawals (Legacy unverified direct route - blocked)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const withdrawal = await createWithdrawalRequest(req.user, req.body);
    res.status(201).json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// GET /api/withdrawals
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { metal, status: status_filter, page, limit } = req.query;
    const withdrawals = await getCustomerWithdrawals(req.user, {
      metal,
      status_filter,
      page,
      limit,
    });
    res.json(withdrawals);
  } catch (err) {
    next(err);
  }
});

// GET /api/withdrawals/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const withdrawal = await getCustomerWithdrawalById(req.user, req.params.id);
    res.json(withdrawal);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/withdrawals/:id/cancel
router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const result = await cancelCustomerWithdrawal(req.user, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
