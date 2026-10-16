import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getAdminAnalyticsData } from '../services/adminAnalyticsService.js';

const router = express.Router();

router.use(requireAdmin);

// GET /api/admin/analytics
router.get('/', async (req, res, next) => {
  try {
    const { period, quarter, year, from_date, to_date } = req.query;
    const data = await getAdminAnalyticsData({
      period,
      quarter,
      year,
      from_date,
      to_date,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
