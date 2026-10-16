import express from 'express';
import { getRatesPublic } from '../services/metalRatesService.js';
import { fetchSalemReferenceRates } from '../services/rapidApiRateService.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/rates (Public customer endpoint - ONLY returns active custom/store rates)
router.get('/', async (req, res, next) => {
  try {
    const rates = await getRatesPublic();
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

// GET /api/rates/reference/salem (Admin live reference endpoint via RapidAPI)
router.get('/reference/salem', requireAdmin, async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
    const rates = await fetchSalemReferenceRates({ forceRefresh });
    res.json(rates);
  } catch (err) {
    next(err);
  }
});

export default router;
