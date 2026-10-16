import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  getSingleNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService.js';

const router = express.Router();

// GET /api/notifications
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { type, is_read, from_date, to_date, page, limit } = req.query;
    const result = await getUserNotifications({
      user_id: req.user.id,
      recipient_type: 'customer',
      type,
      is_read,
      from_date,
      to_date,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id, 'customer');
    res.json({ unread_count: count });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const notif = await getSingleNotification(req.params.id, req.user.id, 'customer');
    res.json(notif);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    const modifiedCount = await markAllNotificationsAsRead(req.user.id, 'customer');
    res.json({
      message: 'All notifications marked as read',
      marked_count: modifiedCount,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const result = await markNotificationAsRead(req.params.id, req.user.id, 'customer');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
