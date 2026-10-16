import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route modules
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import usersRouter from './routes/users.js';
import kycRouter from './routes/kyc.js';
import ratesRouter from './routes/rates.js';
import purchasesRouter from './routes/purchases.js';
import holdingsRouter from './routes/holdings.js';
import withdrawalsRouter from './routes/withdrawals.js';
import transactionsRouter from './routes/transactions.js';
import notificationsRouter from './routes/notifications.js';
import adminDashboardRouter from './routes/adminDashboard.js';
import adminAnalyticsRouter from './routes/adminAnalytics.js';
import adminRouter from './routes/admin.js';

export function createApp() {
  const app = express();

  // Trust proxy for secure cookies/IP tracking behind reverse proxies
  app.set('trust proxy', 1);

  // Security headers & CORS
  app.use(securityHeaders);
  app.use(
    cors({
      origin: true, // Allow all origins for dev/production or configure strict origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root & Health check endpoints
  app.get('/', (req, res) => {
    res.json({
      message: 'Gold & Silver API is running',
      version: config.appVersion,
      docs: '/api/docs',
      status: 'healthy',
    });
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/kyc', kycRouter);
  app.use('/api/rates', ratesRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/holdings', holdingsRouter);
  app.use('/api/withdrawals', withdrawalsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin/dashboard', adminDashboardRouter);
  app.use('/api/admin/analytics', adminAnalyticsRouter);
  app.use('/api/admin', adminRouter);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      detail: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
