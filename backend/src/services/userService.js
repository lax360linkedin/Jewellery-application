import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { config } from '../config/env.js';
import { cleanRate, cleanGrams } from '../utils/formatters.js';

export async function getMyProfile(user) {
  const profiles = await query('SELECT * FROM profiles WHERE user_id = ? LIMIT 1', [user.id]);
  const profile = profiles[0] || {};

  return {
    user_id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    kyc_status: user.kyc_status,
    profile_completed: Boolean(user.profile_completed),
    profile: {
      full_name: profile.full_name || null,
      date_of_birth: profile.date_of_birth || null,
      gender: profile.gender || null,
      relationship: profile.relationship || null,
      relationship_other: profile.relationship_other || null,
      address: profile.address_line
        ? {
            address_line: profile.address_line || '',
            city: profile.city || '',
            state: profile.state || '',
            pincode: profile.pincode || '',
          }
        : null,
      profile_image_url: profile.profile_image_url || null,
      pan: profile.pan || null,
      aadhar: profile.aadhar || null,
      account_number: profile.account_number || null,
      ifsc: profile.ifsc || null,
      nominee_name: profile.nominee_name || null,
      nominee_mobile: profile.nominee_mobile || null,
      nominee_dob: profile.nominee_dob || null,
      nominee_address: profile.nominee_address || null,
    },
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function updateMyProfile(user, data) {
  const existingProfiles = await query('SELECT * FROM profiles WHERE user_id = ? LIMIT 1', [user.id]);

  let profile = existingProfiles[0];
  if (!profile) {
    const profileId = uuidv4();
    await query(
      'INSERT INTO profiles (id, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [profileId, user.id]
    );
    const created = await query('SELECT * FROM profiles WHERE id = ?', [profileId]);
    profile = created[0];
  }

  const updates = [];
  const params = [];

  if (data.full_name !== undefined) {
    updates.push('full_name = ?');
    params.push(data.full_name);
    // Also update display name on user
    await query('UPDATE users SET name = ? WHERE id = ?', [data.full_name, user.id]);
  }
  if (data.date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    params.push(data.date_of_birth);
  }
  if (data.gender !== undefined) {
    updates.push('gender = ?');
    params.push(data.gender);
  }
  if (data.relationship !== undefined) {
    updates.push('relationship = ?');
    params.push(data.relationship);
    if (data.relationship === 'other') {
      updates.push('relationship_other = ?');
      params.push(data.relationship_other || null);
    } else {
      updates.push('relationship_other = NULL');
    }
  }
  if (data.profile_image_url !== undefined) {
    updates.push('profile_image_url = ?');
    params.push(data.profile_image_url);
  }
  if (data.pan !== undefined) {
    updates.push('pan = ?');
    params.push(data.pan);
  }
  if (data.aadhar !== undefined) {
    updates.push('aadhar = ?');
    params.push(data.aadhar);
  }
  if (data.account_number !== undefined) {
    updates.push('account_number = ?');
    params.push(data.account_number);
  }
  if (data.ifsc !== undefined) {
    updates.push('ifsc = ?');
    params.push(data.ifsc);
  }
  if (data.nominee_name !== undefined) {
    updates.push('nominee_name = ?');
    params.push(data.nominee_name);
  }
  if (data.nominee_mobile !== undefined) {
    updates.push('nominee_mobile = ?');
    params.push(data.nominee_mobile);
  }
  if (data.nominee_dob !== undefined) {
    updates.push('nominee_dob = ?');
    params.push(data.nominee_dob);
  }
  if (data.nominee_address !== undefined) {
    updates.push('nominee_address = ?');
    params.push(data.nominee_address);
  }

  // Address updates
  if (data.address && typeof data.address === 'object') {
    if (data.address.address_line !== undefined) {
      updates.push('address_line = ?');
      params.push(data.address.address_line);
    }
    if (data.address.city !== undefined) {
      updates.push('city = ?');
      params.push(data.address.city);
    }
    if (data.address.state !== undefined) {
      updates.push('state = ?');
      params.push(data.address.state);
    }
    if (data.address.pincode !== undefined) {
      updates.push('pincode = ?');
      params.push(data.address.pincode);
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    params.push(user.id);
    await query(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`, params);
  }

  // Mark profile completed
  await query('UPDATE users SET profile_completed = 1, updated_at = NOW() WHERE id = ?', [user.id]);
  const freshUsers = await query('SELECT * FROM users WHERE id = ?', [user.id]);

  return getMyProfile(freshUsers[0]);
}

export async function getAdminUsers({ page = 1, limit = 20, search, status_filter, kyc_status_filter }) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const whereClauses = [];
  const params = [];

  if (status_filter) {
    whereClauses.push('account_status = ?');
    params.push(status_filter.toLowerCase().trim());
  }

  if (kyc_status_filter) {
    whereClauses.push('kyc_status = ?');
    params.push(kyc_status_filter.toLowerCase().trim());
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(name LIKE ? OR mobile LIKE ? OR email LIKE ?)');
    params.push(term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRows = await query(`SELECT COUNT(*) as total FROM users ${whereSql}`, params);
  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const rows = await query(
    `SELECT u.id, u.id as user_id, u.name, u.mobile, u.email, u.role, u.account_status, u.kyc_status, u.created_at,
            COALESCE(h.gold_quantity, 0) as gold_grams,
            COALESCE(h.silver_quantity, 0) as silver_grams,
            (SELECT COUNT(*) FROM purchases WHERE user_id = u.id) as total_orders
     FROM users u
     LEFT JOIN holdings h ON u.id = h.user_id
     ${whereSql} 
     ORDER BY u.created_at DESC 
     LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows,
    page: safePage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
  };
}

export async function getAdminUserDetail(userId) {
  const users = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  if (users.length === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  const user = users[0];
  const profiles = await query('SELECT * FROM profiles WHERE user_id = ? LIMIT 1', [userId]);
  const profile = profiles[0] || {};

  // Fetch KYC details
  const kycRows = await query('SELECT * FROM kyc WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1', [userId]);
  const kyc = kycRows[0] || null;

  // Fetch Holdings details
  const holdingsRows = await query('SELECT * FROM holdings WHERE user_id = ? LIMIT 1', [userId]);
  const holdings = holdingsRows[0] || {
    gold_quantity: 0,
    gold_reserved: 0,
    gold_invested: 0,
    gold_average_rate: 0,
    silver_quantity: 0,
    silver_reserved: 0,
    silver_invested: 0,
    silver_average_rate: 0,
  };

  // Fetch Live Rates for Valuation
  const rates = await query('SELECT * FROM rates');
  const goldRateRow = rates.find((r) => r.metal === 'gold');
  const silverRateRow = rates.find((r) => r.metal === 'silver');
  const activeGoldRate = Number(goldRateRow?.active_rate || config.defaultGoldRate);
  const activeSilverRate = Number(silverRateRow?.active_rate || config.defaultSilverRate);

  const goldQty = cleanGrams(holdings.gold_quantity || 0);
  const goldRes = cleanGrams(holdings.gold_reserved || 0);
  const silverQty = cleanGrams(holdings.silver_quantity || 0);
  const silverRes = cleanGrams(holdings.silver_reserved || 0);
  const goldInvested = cleanRate(holdings.gold_invested || holdings.gold_invested_amount || 0);
  const silverInvested = cleanRate(holdings.silver_invested || holdings.silver_invested_amount || 0);
  const goldAvgRate = cleanRate(holdings.gold_average_rate || holdings.gold_avg_buy_rate || (goldQty > 0 ? goldInvested / goldQty : 0));
  const silverAvgRate = cleanRate(holdings.silver_average_rate || holdings.silver_avg_buy_rate || (silverQty > 0 ? silverInvested / silverQty : 0));

  // Fetch Member Purchases & Withdrawals
  const purchaseRows = await query(
    'SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [userId]
  );
  const wdRows = await query(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [userId]
  );

  const formattedPurchases = purchaseRows.map((p) => ({
    id: p.id || p.transaction_id,
    transaction_id: p.transaction_id,
    user_id: p.user_id,
    type: 'purchase',
    metal: (p.metal || '').toLowerCase(),
    quantity_grams: cleanGrams(p.quantity_grams),
    rate_per_gram: cleanRate(p.rate_per_gram),
    metal_value: cleanRate(p.metal_value),
    total_amount: cleanRate(p.total_amount),
    amount: cleanRate(p.total_amount),
    status: p.status || 'completed',
    payment_method: p.payment_method || 'UPI',
    created_at: p.created_at,
  }));

  const formattedWithdrawals = wdRows.map((w) => ({
    id: w.id || w.transaction_id,
    transaction_id: w.transaction_id,
    user_id: w.user_id,
    type: 'withdrawal',
    metal: (w.metal || '').toLowerCase(),
    quantity_grams: cleanGrams(w.quantity_grams),
    rate_per_gram: cleanRate(w.rate_per_gram),
    metal_value: cleanRate(w.metal_value),
    total_amount: cleanRate(w.metal_value),
    amount: cleanRate(w.metal_value),
    status: w.status || 'pending',
    payment_method: w.withdrawal_mode || 'Physical Delivery',
    created_at: w.created_at,
  }));

  const formattedTransactions = [
    ...formattedPurchases,
    ...formattedWithdrawals,
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    user_id: user.id,
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    account_status: user.account_status,
    kyc_status: user.kyc_status,
    mobile_verified: true,
    created_at: user.created_at,
    profile: {
      full_name: profile.full_name || null,
      date_of_birth: profile.date_of_birth || null,
      gender: profile.gender || null,
      relationship: profile.relationship || null,
      relationship_other: profile.relationship_other || null,
      address: profile.address_line
        ? {
            address_line: profile.address_line || '',
            city: profile.city || '',
            state: profile.state || '',
            pincode: profile.pincode || '',
          }
        : null,
      profile_image_url: profile.profile_image_url || null,
      pan: profile.pan || null,
      aadhar: profile.aadhar || null,
      account_number: profile.account_number || null,
      ifsc: profile.ifsc || null,
      nominee_name: profile.nominee_name || null,
      nominee_mobile: profile.nominee_mobile || null,
      nominee_dob: profile.nominee_dob || null,
      nominee_address: profile.nominee_address || null,
    },
    kyc: kyc
      ? {
          id: kyc.id,
          kyc_id: kyc.id,
          user_id: kyc.user_id,
          full_name: kyc.full_name || profile.full_name || user.name,
          date_of_birth: kyc.date_of_birth || profile.date_of_birth,
          gender: kyc.gender || profile.gender,
          address: {
            address_line: kyc.address_line || profile.address_line || '',
            city: kyc.city || profile.city || '',
            state: kyc.state || profile.state || '',
            pincode: kyc.pincode || profile.pincode || '',
          },
          id_type: kyc.id_type,
          id_number: kyc.id_number,
          status: kyc.status,
          rejection_reason: kyc.rejection_reason || null,
          submitted_at: kyc.submitted_at,
          reviewed_at: kyc.reviewed_at,
          reviewed_by: kyc.reviewed_by,
        }
      : null,
    holdings: {
      gold: {
        quantity_grams: goldQty,
        reserved_grams: goldRes,
        invested_amount: goldInvested,
        total_invested: goldInvested,
        avg_buy_rate: goldAvgRate,
        average_buy_rate: goldAvgRate,
        current_rate: activeGoldRate,
        current_value: cleanRate(goldQty * activeGoldRate),
      },
      silver: {
        quantity_grams: silverQty,
        reserved_grams: silverRes,
        invested_amount: silverInvested,
        total_invested: silverInvested,
        avg_buy_rate: silverAvgRate,
        average_buy_rate: silverAvgRate,
        current_rate: activeSilverRate,
        current_value: cleanRate(silverQty * activeSilverRate),
      },
      total_current_value: cleanRate((goldQty * activeGoldRate) + (silverQty * activeSilverRate)),
      total_invested_amount: cleanRate(goldInvested + silverInvested),
      total_invested: cleanRate(goldInvested + silverInvested),
    },
    purchases: formattedPurchases,
    withdrawals: formattedWithdrawals,
    transactions: formattedTransactions,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function updateUserStatusByAdmin(userId, newStatus, adminUser) {
  const validStatuses = ['active', 'suspended', 'banned'];
  const cleanedStatus = (newStatus || '').toLowerCase().trim();

  if (!validStatuses.includes(cleanedStatus)) {
    const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const users = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  if (users.length === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (users[0].role === 'admin') {
    const error = new Error('Cannot modify another administrator account');
    error.status = 403;
    throw error;
  }

  await query('UPDATE users SET account_status = ?, updated_at = NOW() WHERE id = ?', [cleanedStatus, userId]);

  const messages = {
    banned: 'User banned successfully',
    suspended: 'User suspended successfully',
    active: 'User status updated successfully',
  };

  return {
    message: messages[cleanedStatus] || 'User status updated successfully',
    status: cleanedStatus,
  };
}

export default {
  getMyProfile,
  updateMyProfile,
  getAdminUsers,
  getAdminUserDetail,
  updateUserStatusByAdmin,
};
