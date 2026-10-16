import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createPurchase,
  getCustomerPurchases,
  getCustomerPurchaseById,
} from '../services/purchaseService.js';

const router = express.Router();

// POST /api/purchases
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const purchase = await createPurchase(req.user, req.body);
    res.status(201).json(purchase);
  } catch (err) {
    next(err);
  }
});

// GET /api/purchases
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { metal, status: status_filter, page, limit } = req.query;
    const purchases = await getCustomerPurchases(req.user, {
      metal,
      status_filter,
      page,
      limit,
    });
    res.json(purchases);
  } catch (err) {
    next(err);
  }
});

// GET /api/purchases/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const purchase = await getCustomerPurchaseById(req.user, req.params.id);
    res.json(purchase);
  } catch (err) {
    next(err);
  }
});

export default router;
