import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from process.cwd() and backend root directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Gold & Silver API',
  appVersion: process.env.APP_VERSION || '1.0.0',
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',

  // MySQL Settings
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : 'root',
    database: process.env.MYSQL_DATABASE || 'gold_silver',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    timezone: '+05:30',
  },

  // Security Settings
  jwtSecret: process.env.JWT_SECRET || '1cc918a36c68d479e94635f8f4628af44eef55fe1a267b4fd0cbf013c141e5b7',
  jwtExpiresInMinutes: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES || '60', 10),
  devOtp: process.env.DEV_OTP || '123456',

  // Initial Administrator Configuration
  adminMobile: process.env.ADMIN_MOBILE || '9790400432',
  adminEmail: process.env.ADMIN_EMAIL || 'sjjewellery174@gmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Sjj@2026',

  // External Rates API
  metalRatesApiUrl: process.env.METAL_RATES_API_URL || null,
  metalRatesApiKey: process.env.METAL_RATES_API_KEY || null,

  // RapidAPI Live Metal Rates (Salem Reference)
  rapidApiKey: (process.env.RAPIDAPI_KEY || process.env.METAL_RATES_API_KEY || '').replace(/^["']|["']$/g, '').trim() || null,
  rapidApiHost: (process.env.RAPIDAPI_HOST || 'gold-silver-rates-india.p.rapidapi.com').replace(/^["']|["']$/g, '').trim(),
  rapidApiUrl: (process.env.RAPIDAPI_URL || 'https://gold-silver-rates-india.p.rapidapi.com/api/Fetch-Gold-Silver/?city=Salem').replace(/^["']|["']$/g, '').trim(),

  // Financial Rules
  minGoldPurchaseGrams: 0.001,
  minSilverPurchaseGrams: 0.001,
  minGoldWithdrawalGrams: 0.001,
  minSilverWithdrawalGrams: 0.001,
  gstRatePercent: 3.0,

  // Default Baseline Rates
  defaultGoldRate: 14190.00,
  defaultSilverRate: 267.00,
};

export default config;
