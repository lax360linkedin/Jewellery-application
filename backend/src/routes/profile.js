import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyProfile, updateMyProfile } from '../services/userService.js';

const router = express.Router();

// GET /api/profile/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await getMyProfile(req.user);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile/me
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const updated = await updateMyProfile(req.user, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
