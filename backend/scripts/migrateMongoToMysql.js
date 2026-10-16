import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import config from '../src/config/env.js';
import { initDatabase, query } from '../src/config/db.js';

dotenv.config();

async function runMigration() {
  console.log('====================================================');
  console.log('Starting MongoDB to MySQL Data Migration...');
  console.log('====================================================');

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || 'gold_silver';

  if (!mongoUri) {
    console.log('[Migration] No MONGODB_URI found in environment. Skipping collection migration.');
    return;
  }

  let mongoClient;
  try {
    console.log('[Migration] Connecting to MySQL...');
    await initDatabase();

    console.log('[Migration] Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 8000 });
    await mongoClient.connect();
    const mongoDb = mongoClient.db(dbName);
    console.log('[Migration] Connected to MongoDB Atlas.');

    // 1. Migrate Users & Profiles
    console.log('\n[1/5] Migrating Users & Profiles...');
    const mongoUsers = await mongoDb.collection('users').find({}).toArray();
    let migratedUsersCount = 0;

    for (const u of mongoUsers) {
      const userId = u._id.toString();
      const mobile = u.mobile ? u.mobile.toString().replace(/\D/g, '').slice(-10) : '';
      if (!mobile) continue;

      const userExists = await query('SELECT id FROM users WHERE id = ? OR mobile = ? LIMIT 1', [userId, mobile]);
      if (userExists.length === 0) {
        await query(
          `INSERT INTO users (id, name, mobile, email, password_hash, role, account_status, kyc_status, profile_completed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            u.name || 'Customer',
            mobile,
            u.email || null,
            u.password_hash || '$2a$10$abcdefghijklmnopqrstuu',
            u.role || 'customer',
            u.account_status || 'active',
            u.kyc_status || 'pending',
            u.profile_completed ? 1 : 0,
            u.created_at || new Date(),
            u.updated_at || new Date(),
          ]
        );
        migratedUsersCount++;
      }

      // Profile
      const prof = u.profile || {};
      const addr = prof.address || {};
      const profileId = uuidv4();
      await query(
        `INSERT INTO profiles 
          (id, user_id, full_name, date_of_birth, gender, relationship, relationship_other, address_line, city, state, pincode, profile_image_url, pan, aadhar, account_number, ifsc, nominee_name, nominee_mobile, nominee_dob, nominee_address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), address_line = VALUES(address_line)`,
        [
          profileId,
          userId,
          prof.full_name || u.name || null,
          prof.date_of_birth || null,
          prof.gender || null,
          prof.relationship || null,
          prof.relationship_other || null,
          addr.address_line || null,
          addr.city || null,
          addr.state || null,
          addr.pincode || null,
          prof.profile_image_url || null,
          prof.pan || null,
          prof.aadhar || null,
          prof.account_number || null,
          prof.ifsc || null,
          prof.nominee_name || null,
          prof.nominee_mobile || null,
          prof.nominee_dob || null,
          prof.nominee_address || null,
        ]
      );
    }
    console.log(`[Migration] Migrated ${migratedUsersCount} new users.`);

    // 2. Migrate KYC
    console.log('\n[2/5] Migrating KYC documents...');
    const mongoKyc = await mongoDb.collection('kyc').find({}).toArray();
    let migratedKycCount = 0;
    for (const k of mongoKyc) {
      const kycId = k._id.toString();
      const userId = k.user_id ? k.user_id.toString() : null;
      if (!userId) continue;

      const userExists = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
      if (userExists.length === 0) continue;

      const kycExists = await query('SELECT id FROM kyc WHERE id = ? OR user_id = ? LIMIT 1', [kycId, userId]);
      if (kycExists.length === 0) {
        const addr = k.address || {};
        await query(
          `INSERT INTO kyc (id, user_id, full_name, date_of_birth, gender, address_line, city, state, pincode, id_type, id_number, status, rejection_reason, submitted_at, reviewed_at, reviewed_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            kycId,
            userId,
            k.full_name || '',
            k.date_of_birth || '',
            k.gender || '',
            addr.address_line || '',
            addr.city || '',
            addr.state || '',
            addr.pincode || '',
            k.id_type || 'Aadhaar',
            k.id_number || '',
            k.status || 'pending',
            k.rejection_reason || null,
            k.submitted_at || new Date(),
            k.reviewed_at || null,
            k.reviewed_by ? k.reviewed_by.toString() : null,
            k.updated_at || new Date(),
          ]
        );
        migratedKycCount++;
      }
    }
    console.log(`[Migration] Migrated ${migratedKycCount} KYC records.`);

    // 3. Migrate Purchases
    console.log('\n[3/5] Migrating Purchases...');
    const mongoPurchases = await mongoDb.collection('purchases').find({}).toArray();
    let migratedPurchasesCount = 0;
    for (const p of mongoPurchases) {
      const purchId = p._id.toString();
      const userId = p.user_id ? p.user_id.toString() : null;
      if (!userId) continue;

      const userExists = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
      if (userExists.length === 0) continue;

      const pExists = await query('SELECT id FROM purchases WHERE id = ? OR transaction_id = ? LIMIT 1', [
        purchId,
        p.transaction_id,
      ]);
      if (pExists.length === 0) {
        await query(
          `INSERT INTO purchases (id, transaction_id, user_id, metal, quantity_grams, rate_per_gram, metal_value, gst_rate_percent, gst_amount, total_amount, currency, status, payment_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchId,
            p.transaction_id || `TXN-${purchId}`,
            userId,
            (p.metal || 'gold').toLowerCase(),
            p.quantity_grams || 0,
            p.rate_per_gram || 0,
            p.metal_value || 0,
            p.gst_rate_percent || 3.0,
            p.gst_amount || 0,
            p.total_amount || 0,
            p.currency || 'INR',
            p.status || 'completed',
            p.payment_status || 'paid',
            p.created_at || new Date(),
            p.updated_at || new Date(),
          ]
        );
        migratedPurchasesCount++;
      }
    }
    console.log(`[Migration] Migrated ${migratedPurchasesCount} purchase records.`);

    // 4. Migrate Withdrawals
    console.log('\n[4/5] Migrating Withdrawals...');
    const mongoWithdrawals = await mongoDb.collection('withdrawals').find({}).toArray();
    let migratedWithdrawalsCount = 0;
    for (const w of mongoWithdrawals) {
      const wdId = w._id.toString();
      const userId = w.user_id ? w.user_id.toString() : null;
      if (!userId) continue;

      const userExists = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
      if (userExists.length === 0) continue;

      const wExists = await query('SELECT id FROM withdrawals WHERE id = ? OR transaction_id = ? LIMIT 1', [
        wdId,
        w.transaction_id,
      ]);
      if (wExists.length === 0) {
        await query(
          `INSERT INTO withdrawals (id, transaction_id, user_id, metal, quantity_grams, rate_per_gram, metal_value, withdrawal_mode, status, rejection_reason, admin_note, created_at, updated_at, approved_at, rejected_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            wdId,
            w.transaction_id || `WD-${wdId}`,
            userId,
            (w.metal || 'gold').toLowerCase(),
            w.quantity_grams || 0,
            w.rate_per_gram || 0,
            w.metal_value || 0,
            w.withdrawal_mode || 'physical',
            w.status || 'pending',
            w.rejection_reason || null,
            w.admin_note || null,
            w.created_at || new Date(),
            w.updated_at || new Date(),
            w.approved_at || null,
            w.rejected_at || null,
          ]
        );
        migratedWithdrawalsCount++;
      }
    }
    console.log(`[Migration] Migrated ${migratedWithdrawalsCount} withdrawal records.`);

    // 5. Recalculate Holdings
    console.log('\n[5/5] Recalculating Customer Holdings from Purchases and Withdrawals...');
    const allCustomers = await query("SELECT id FROM users WHERE role = 'customer'");
    for (const cust of allCustomers) {
      const uId = cust.id;
      // Gold purchases
      const goldPurch = await query(
        "SELECT SUM(quantity_grams) as qty, SUM(metal_value) as val FROM purchases WHERE user_id = ? AND metal = 'gold' AND status = 'completed'",
        [uId]
      );
      const goldWdApproved = await query(
        "SELECT SUM(quantity_grams) as qty FROM withdrawals WHERE user_id = ? AND metal = 'gold' AND status = 'approved'",
        [uId]
      );
      const goldWdPending = await query(
        "SELECT SUM(quantity_grams) as qty FROM withdrawals WHERE user_id = ? AND metal = 'gold' AND status = 'pending'",
        [uId]
      );

      const gPurchQty = parseFloat(goldPurch[0]?.qty || 0);
      const gPurchVal = parseFloat(goldPurch[0]?.val || 0);
      const gWdAppQty = parseFloat(goldWdApproved[0]?.qty || 0);
      const gWdPenQty = parseFloat(goldWdPending[0]?.qty || 0);

      const gQty = Math.max(0, gPurchQty - gWdAppQty);
      const gAvg = gPurchQty > 0 ? gPurchVal / gPurchQty : 0.0;
      const gInv = gQty * gAvg;

      // Silver purchases
      const silverPurch = await query(
        "SELECT SUM(quantity_grams) as qty, SUM(metal_value) as val FROM purchases WHERE user_id = ? AND metal = 'silver' AND status = 'completed'",
        [uId]
      );
      const silverWdApproved = await query(
        "SELECT SUM(quantity_grams) as qty FROM withdrawals WHERE user_id = ? AND metal = 'silver' AND status = 'approved'",
        [uId]
      );
      const silverWdPending = await query(
        "SELECT SUM(quantity_grams) as qty FROM withdrawals WHERE user_id = ? AND metal = 'silver' AND status = 'pending'",
        [uId]
      );

      const sPurchQty = parseFloat(silverPurch[0]?.qty || 0);
      const sPurchVal = parseFloat(silverPurch[0]?.val || 0);
      const sWdAppQty = parseFloat(silverWdApproved[0]?.qty || 0);
      const sWdPenQty = parseFloat(silverWdPending[0]?.qty || 0);

      const sQty = Math.max(0, sPurchQty - sWdAppQty);
      const sAvg = sPurchQty > 0 ? sPurchVal / sPurchQty : 0.0;
      const sInv = sQty * sAvg;

      const holdingId = uuidv4();
      await query(
        `INSERT INTO holdings (id, user_id, gold_quantity, gold_invested, gold_average_rate, gold_reserved, silver_quantity, silver_invested, silver_average_rate, silver_reserved, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           gold_quantity = VALUES(gold_quantity),
           gold_invested = VALUES(gold_invested),
           gold_average_rate = VALUES(gold_average_rate),
           gold_reserved = VALUES(gold_reserved),
           silver_quantity = VALUES(silver_quantity),
           silver_invested = VALUES(silver_invested),
           silver_average_rate = VALUES(silver_average_rate),
           silver_reserved = VALUES(silver_reserved),
           updated_at = NOW()`,
        [holdingId, uId, gQty, gInv, gAvg, gWdPenQty, sQty, sInv, sAvg, sWdPenQty]
      );
    }

    console.log('====================================================');
    console.log('Migration completed successfully!');
    console.log('====================================================');
  } catch (err) {
    console.error('[Migration Error] Migration failed:', err);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
    process.exit(0);
  }
}

runMigration();
