import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCustomerTransactions,
  getCustomerTransactionById,
} from '../services/transactionService.js';

const router = express.Router();

// GET /api/transactions
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const {
      type,
      metal,
      status: status_filter,
      direction,
      from_date,
      to_date,
      search,
      page,
      limit,
    } = req.query;

    const result = await getCustomerTransactions(req.user, {
      type,
      metal,
      status_filter,
      direction,
      from_date,
      to_date,
      search,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const txn = await getCustomerTransactionById(req.user, req.params.id);
    res.json(txn);
  } catch (err) {
    next(err);
  }
});

export default router;
