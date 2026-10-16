import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  formatUserResponse,
} from '../services/authService.js';

const router = express.Router();

// POST /api/auth/send-otp
router.post('/send-otp', authRateLimiter, async (req, res, next) => {
  try {
    const { mobile } = req.body;
    const result = await sendOtp(mobile);
    res.json({
      message: 'OTP dispatched successfully',
      mobile: result.mobile,
      otp: result.otpCode,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', authRateLimiter, async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    await verifyOtp(mobile, otp);
    res.json({
      message: 'OTP verified successfully',
      valid: true,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { user, accessToken } = await registerUser(req.body);
    res.status(201).json({
      access_token: accessToken,
      token_type: 'bearer',
      user,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { user, accessToken } = await loginUser(req.body);
    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(formatUserResponse(req.user));
  } catch (err) {
    next(err);
  }
});

export default router;
