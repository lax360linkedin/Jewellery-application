import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import config from './env.js';

let pool = null;

export async function initDatabase() {
  const { host, port, user, password, database } = config.mysql;

  // 1. Create database if not exists using a temporary server connection
  let tempConn;
  try {
    tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } catch (err) {
    console.warn(`[Database Init Warning] Server connection without DB failed: ${err.message}. Retrying directly with target database...`);
  } finally {
    if (tempConn) {
      try {
        await tempConn.end();
      } catch {}
    }
  }

  // 2. Initialize Pool with the target database
  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: config.mysql.waitForConnections,
    connectionLimit: config.mysql.connectionLimit,
    queueLimit: config.mysql.queueLimit,
    dateStrings: true,
  });

  // Test pool connection
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    console.log(`[MySQL] Connected successfully to database: ${database}`);
  } finally {
    conn.release();
  }

  // 3. Create all tables with strict DDL
  await createTables();

  // 4. Seed initial admin and rates
  await seedInitialData();

  return pool;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database connection pool has not been initialized. Call initDatabase() first.');
  }
  return pool;
}

export async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function getTransactionConnection() {
  const p = getPool();
  const connection = await p.getConnection();
  await connection.beginTransaction();
  return connection;
}

async function createTables() {
  const ddlStatements = [
    // 1. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      mobile VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(150) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer',
      account_status VARCHAR(20) NOT NULL DEFAULT 'active',
      kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_mobile (mobile),
      INDEX idx_users_email (email),
      INDEX idx_users_role (role),
      INDEX idx_users_status (account_status),
      INDEX idx_users_kyc (kyc_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 2. Profiles Table
    `CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      full_name VARCHAR(100) NULL,
      date_of_birth VARCHAR(30) NULL,
      gender VARCHAR(20) NULL,
      relationship VARCHAR(50) NULL,
      relationship_other VARCHAR(100) NULL,
      address_line TEXT NULL,
      city VARCHAR(100) NULL,
      state VARCHAR(100) NULL,
      pincode VARCHAR(20) NULL,
      profile_image_url VARCHAR(500) NULL,
      pan VARCHAR(30) NULL,
      aadhar VARCHAR(30) NULL,
      account_number VARCHAR(50) NULL,
      ifsc VARCHAR(30) NULL,
      nominee_name VARCHAR(100) NULL,
      nominee_mobile VARCHAR(20) NULL,
      nominee_dob VARCHAR(30) NULL,
      nominee_address TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 3. KYC Table
    `CREATE TABLE IF NOT EXISTS kyc (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      full_name VARCHAR(100) NOT NULL,
      date_of_birth VARCHAR(30) NOT NULL,
      gender VARCHAR(20) NOT NULL,
      address_line TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      id_type VARCHAR(50) NOT NULL,
      id_number VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      reviewed_by VARCHAR(36) NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_kyc_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 4. Rates Table
    `CREATE TABLE IF NOT EXISTS rates (
      id VARCHAR(36) PRIMARY KEY,
      metal VARCHAR(20) NOT NULL UNIQUE,
      api_rate DECIMAL(12, 2) NOT NULL,
      active_rate DECIMAL(12, 2) NOT NULL,
      mode VARCHAR(20) NOT NULL DEFAULT 'api',
      custom_rate DECIMAL(12, 2) NULL,
      custom_rate_date DATETIME NULL,
      custom_rate_expires_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_rates_metal (metal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 5. Rate History Table
    `CREATE TABLE IF NOT EXISTS rate_history (
      id VARCHAR(36) PRIMARY KEY,
      metal VARCHAR(20) NOT NULL,
      previous_rate DECIMAL(12, 2) NOT NULL,
      new_rate DECIMAL(12, 2) NOT NULL,
      mode VARCHAR(20) NOT NULL,
      changed_by VARCHAR(36) NULL,
      source VARCHAR(30) NOT NULL DEFAULT 'system',
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rate_hist_metal_date (metal, changed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 6. Holdings Table
    `CREATE TABLE IF NOT EXISTS holdings (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL UNIQUE,
      gold_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
      gold_invested DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      gold_average_rate DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      gold_reserved DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
      silver_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
      silver_invested DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      silver_average_rate DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      silver_reserved DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 7. Holding Transactions (Idempotency Audit)
    `CREATE TABLE IF NOT EXISTS holding_transactions (
      id VARCHAR(36) PRIMARY KEY,
      purchase_id VARCHAR(36) NOT NULL UNIQUE,
      user_id VARCHAR(36) NOT NULL,
      metal VARCHAR(20) NOT NULL,
      quantity_grams DECIMAL(12, 4) NOT NULL,
      invested_amount DECIMAL(14, 2) NOT NULL,
      processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ht_user_date (user_id, processed_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 8. Purchases Table
    `CREATE TABLE IF NOT EXISTS purchases (
      id VARCHAR(36) PRIMARY KEY,
      transaction_id VARCHAR(50) NOT NULL UNIQUE,
      user_id VARCHAR(36) NOT NULL,
      metal VARCHAR(20) NOT NULL,
      quantity_grams DECIMAL(12, 4) NOT NULL,
      rate_per_gram DECIMAL(12, 2) NOT NULL,
      metal_value DECIMAL(14, 2) NOT NULL,
      gst_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
      gst_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      total_amount DECIMAL(14, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status VARCHAR(30) NOT NULL DEFAULT 'completed',
      payment_status VARCHAR(30) NOT NULL DEFAULT 'paid',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_purchases_user (user_id),
      INDEX idx_purchases_txn_id (transaction_id),
      INDEX idx_purchases_metal_date (metal, created_at),
      INDEX idx_purchases_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 9. Withdrawals Table
    `CREATE TABLE IF NOT EXISTS withdrawals (
      id VARCHAR(36) PRIMARY KEY,
      transaction_id VARCHAR(50) NOT NULL UNIQUE,
      user_id VARCHAR(36) NOT NULL,
      metal VARCHAR(20) NOT NULL,
      quantity_grams DECIMAL(12, 4) NOT NULL,
      rate_per_gram DECIMAL(12, 2) NOT NULL,
      metal_value DECIMAL(14, 2) NOT NULL,
      withdrawal_mode VARCHAR(30) NOT NULL DEFAULT 'physical',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      rejection_reason TEXT NULL,
      admin_note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      approved_at DATETIME NULL,
      rejected_at DATETIME NULL,
      INDEX idx_withdrawals_user (user_id),
      INDEX idx_withdrawals_txn_id (transaction_id),
      INDEX idx_withdrawals_status (status),
      INDEX idx_withdrawals_metal (metal),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 10. OTPs Table
    `CREATE TABLE IF NOT EXISTS otps (
      id VARCHAR(36) PRIMARY KEY,
      mobile VARCHAR(20) NOT NULL UNIQUE,
      otp VARCHAR(10) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      INDEX idx_otps_mobile (mobile)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 11. Notifications Table
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      recipient_type VARCHAR(20) NOT NULL DEFAULT 'customer',
      recipient_id VARCHAR(36) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSON NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      source_type VARCHAR(50) NULL,
      source_id VARCHAR(50) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME NULL,
      INDEX idx_notifs_recip (recipient_type, recipient_id, created_at),
      INDEX idx_notifs_is_read (is_read),
      UNIQUE KEY uniq_notif_source (source_type, source_id, type, recipient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 12. Audit Logs Table
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(36) PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      performed_by VARCHAR(36) NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(50) NULL,
      details JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_entity (entity_type, entity_id),
      INDEX idx_audit_date (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 13. Withdrawal OTPs Table (Strict Separate Purpose & Pre-Creation Verification)
    `CREATE TABLE IF NOT EXISTS withdrawal_otps (
      id VARCHAR(36) PRIMARY KEY,
      challenge_id VARCHAR(50) NOT NULL UNIQUE,
      user_id VARCHAR(36) NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      purpose VARCHAR(30) NOT NULL DEFAULT 'withdrawal',
      metal VARCHAR(20) NOT NULL,
      quantity_grams DECIMAL(12, 4) NOT NULL,
      withdrawal_mode VARCHAR(30) NOT NULL DEFAULT 'physical',
      otp_hash VARCHAR(64) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      resend_count INT NOT NULL DEFAULT 0,
      last_resend_at DATETIME NULL,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wd_otps_challenge (challenge_id),
      INDEX idx_wd_otps_user (user_id),
      INDEX idx_wd_otps_purpose (purpose),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const statement of ddlStatements) {
    await pool.query(statement);
  }
}

async function seedInitialData() {
  // 1. Seed / Sync Default Admin
  const adminRows = await query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
  if (adminRows.length === 0) {
    const adminId = 'admin-user-00000000000000000001';
    await query(
      `INSERT INTO users (id, name, mobile, email, password_hash, role, account_status, kyc_status, profile_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        adminId,
        'SJ Jewellers Admin',
        config.adminMobile,
        config.adminEmail,
        hashedPassword,
        'admin',
        'active',
        'verified',
        1,
      ]
    );

    await query(
      `INSERT INTO profiles (id, user_id, full_name, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
      ['admin-profile-00000000000000000001', adminId, 'SJ Jewellers Admin']
    );

    console.log('[MySQL Seed] Administrator account initialized');
  } else {
    // Keep admin credentials synced with environment config
    await query(
      `UPDATE users SET password_hash = ?, mobile = ?, email = ? WHERE id = ?`,
      [hashedPassword, config.adminMobile, config.adminEmail, adminRows[0].id]
    );
  }

  // 2. Seed Default Rates
  const goldRateRows = await query(`SELECT id FROM rates WHERE metal = 'gold'`);
  if (goldRateRows.length === 0) {
    await query(
      `INSERT INTO rates (id, metal, api_rate, active_rate, mode, custom_rate, updated_at)
       VALUES (?, 'gold', ?, ?, 'api', NULL, NOW())`,
      ['rate-gold-00000000000000000001', config.defaultGoldRate, config.defaultGoldRate]
    );
  }

  const silverRateRows = await query(`SELECT id FROM rates WHERE metal = 'silver'`);
  if (silverRateRows.length === 0) {
    await query(
      `INSERT INTO rates (id, metal, api_rate, active_rate, mode, custom_rate, updated_at)
       VALUES (?, 'silver', ?, ?, 'api', NULL, NOW())`,
      ['rate-silver-00000000000000000001', config.defaultSilverRate, config.defaultSilverRate]
    );
  }
}

export default {
  initDatabase,
  getPool,
  query,
  getTransactionConnection,
};
