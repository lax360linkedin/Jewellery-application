import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatUserResponse } from '../services/authService.js';

const router = express.Router();

// GET /api/users
router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(formatUserResponse(req.user));
  } catch (err) {
    next(err);
  }
});

export default router;
