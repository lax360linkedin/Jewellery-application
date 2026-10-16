import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCustomerHoldings,
  getCustomerMetalHolding,
} from '../services/holdingsService.js';

const router = express.Router();

// GET /api/holdings & GET /api/holdings/me
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const holdings = await getCustomerHoldings(req.user);
    res.json(holdings);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const holdings = await getCustomerHoldings(req.user);
    res.json(holdings);
  } catch (err) {
    next(err);
  }
});

// GET /api/holdings/me/:metal
router.get('/me/:metal', requireAuth, async (req, res, next) => {
  try {
    const holding = await getCustomerMetalHolding(req.user, req.params.metal);
    res.json(holding);
  } catch (err) {
    next(err);
  }
});

export default router;
