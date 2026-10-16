import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { submitKyc, getUserKyc } from '../services/kycService.js';

const router = express.Router();

// POST /api/kyc/submit
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const kyc = await submitKyc(req.user, req.body);
    res.status(201).json(kyc);
  } catch (err) {
    next(err);
  }
});

// GET /api/kyc/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const kyc = await getUserKyc(req.user);
    res.json(kyc);
  } catch (err) {
    next(err);
  }
});

export default router;
