import config from './config/env.js';
import { initDatabase } from './config/db.js';
import { createApp } from './app.js';

async function startServer() {
  console.log('====================================================');
  console.log(`Starting ${config.appName} v${config.appVersion}...`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log('====================================================');

  try {
    // 1. Initialize MySQL Database and Tables
    console.log('[Bootstrap] Initializing MySQL Database Connection...');
    await initDatabase();

    // 2. Instantiate and start Express app
    const app = createApp();
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`[Server] Server listening on http://127.0.0.1:${config.port}`);
      console.log(`[Server] Health check: http://127.0.0.1:${config.port}/health`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('\n[Server] Shutting down gracefully...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[Fatal Error] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
