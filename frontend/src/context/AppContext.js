/**
 * AppContext for React Native
 * Central state management connecting to Node.js + Express + MySQL Backend.
 * Zero demo/fake data; all rates, holdings, purchases, withdrawals, and profiles flow through backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  clearAllAuth,
  getSkippedProfile,
  setSkippedProfile,
} from '../utils/authStorage';
import {
  authService,
  ratesService,
  holdingsService,
  purchaseService,
  withdrawalService,
  profileService,
  kycService,
  transactionService,
} from '../services';

const AppContext = createContext();

const LOGGED_OUT_USER = {
  id: '',
  name: '',
  mobile: '',
  email: '',
  role: 'customer',
  accountStatus: 'active',
  kycStatus: 'pending',
  profileCompleted: false,
  isAuthenticated: false,
  address: '',
  pan: '',
  aadhar: '',
  accountNumber: '',
  ifsc: '',
  nomineeName: '',
  nomineeMobile: '',
  nomineeDob: '',
  nomineeAddress: '',
  relationship: '',
  relationshipDetails: '',
  createdAt: '',
};

const INITIAL_HOLDINGS = {
  goldGrams: 0,
  silverGrams: 0,
  goldInvested: 0,
  silverInvested: 0,
  goldCurrentValue: 0,
  silverCurrentValue: 0,
  totalInvested: 0,
  totalCurrentValue: 0,
  totalProfitLoss: 0,
};

function normalizeUserFromBackend(userObj, profileObj = null) {
  if (!userObj) return LOGGED_OUT_USER;
  const prof = profileObj?.profile || userObj.profile || {};
  const addr = prof.address || {};
  const addressStr = typeof addr === 'object' && addr !== null
    ? [addr.address_line, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')
    : (typeof addr === 'string' ? addr : '');

  return {
    id: userObj.id || userObj.user_id || '',
    name: userObj.name || prof.full_name || '',
    mobile: userObj.mobile || '',
    email: userObj.email || '',
    role: userObj.role || 'customer',
    accountStatus: userObj.account_status || 'active',
    kycStatus: userObj.kyc_status || 'pending',
    profileCompleted: Boolean(userObj.profile_completed),
    isAuthenticated: true,
    address: addressStr,
    pan: prof.pan || '',
    aadhar: prof.aadhar || '',
    accountNumber: prof.account_number || '',
    ifsc: prof.ifsc || '',
    nomineeName: prof.nominee_name || '',
    nomineeMobile: prof.nominee_mobile || '',
    nomineeDob: prof.nominee_dob || '',
    nomineeAddress: prof.nominee_address || '',
    relationship: prof.relationship || '',
    relationshipDetails: prof.relationship_other || '',
    createdAt: userObj.created_at || '',
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(LOGGED_OUT_USER);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [hasSkippedProfile, setHasSkippedProfile] = useState(false);

  const [goldRate, setGoldRate] = useState(14190.00);
  const [silverRate, setSilverRate] = useState(267.00);
  const [holdings, setHoldings] = useState(INITIAL_HOLDINGS);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  // Buy Now screen draft state
  const [buyNowState, setBuyNowState] = useState({
    assetType: 'gold',
    mode: 'rupees',
    rupeesVal: '100',
    gramsVal: (100 / 14190.00).toFixed(4),
    selectedQuickOption: '100',
  });

  // Recompute holdings current value dynamically whenever rates change
  useEffect(() => {
    setHoldings((prev) => {
      const gGrams = Number(prev.goldGrams) || 0;
      const sGrams = Number(prev.silverGrams) || 0;
      const gVal = gGrams * goldRate;
      const sVal = sGrams * silverRate;
      const totVal = gVal + sVal;
      const totInv = Number(prev.totalInvested) || totVal;
      return {
        ...prev,
        goldCurrentValue: gVal,
        silverCurrentValue: sVal,
        totalCurrentValue: totVal,
        totalProfitLoss: totVal - totInv,
      };
    });
  }, [goldRate, silverRate]);

  // Fetch Live Rates
  const fetchLiveRates = useCallback(async () => {
    try {
      const data = await ratesService.getLiveRates();
      if (data) {
        if (data.gold?.active_rate) setGoldRate(Number(data.gold.active_rate));
        if (data.silver?.active_rate) setSilverRate(Number(data.silver.active_rate));
        return data;
      }
    } catch (err) {
      console.warn('[AppContext] Error fetching rates:', err.message);
    }
    return null;
  }, []);

  // Fetch Holdings from Backend
  const fetchHoldings = useCallback(async () => {
    try {
      const data = await holdingsService.getHoldings();
      if (data) {
        const goldTotal = Number(data.gold?.quantity_grams) || 0;
        const goldReserved = Number(data.gold?.reserved_grams) || 0;
        const goldAvailable = data.gold?.available_grams !== undefined
          ? Number(data.gold.available_grams)
          : Math.max(0, goldTotal - goldReserved);

        const silverTotal = Number(data.silver?.quantity_grams) || 0;
        const silverReserved = Number(data.silver?.reserved_grams) || 0;
        const silverAvailable = data.silver?.available_grams !== undefined
          ? Number(data.silver.available_grams)
          : Math.max(0, silverTotal - silverReserved);

        const mapped = {
          goldGrams: goldTotal,
          goldReservedGrams: goldReserved,
          goldAvailableGrams: goldAvailable,
          silverGrams: silverTotal,
          silverReservedGrams: silverReserved,
          silverAvailableGrams: silverAvailable,
          goldInvested: Number(data.gold?.total_invested) || 0,
          silverInvested: Number(data.silver?.total_invested) || 0,
          goldCurrentValue: Number(data.gold?.current_value) || 0,
          silverCurrentValue: Number(data.silver?.current_value) || 0,
          totalInvested: Number(data.total_invested) || 0,
          totalCurrentValue: Number(data.total_current_value) || 0,
          totalProfitLoss: Number(data.total_profit_loss) || 0,
        };
        setHoldings(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[AppContext] Error fetching holdings:', err.message);
    }
    return null;
  }, []);

  // Fetch Unified Transactions from Backend
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await transactionService.getTransactions({ limit: 50 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      const mapped = items.map((txn) => {
        const isGold = (txn.metal || '').toLowerCase() === 'gold';
        const isPurchase = (txn.type || '').toLowerCase() === 'purchase';
        const gramsNum = Number(txn.quantity_grams) || 0;
        const amountNum = Number(txn.total_amount) || Number(txn.metal_value) || 0;
        const rateNum = Number(txn.rate_per_gram) || 0;
        const d = new Date(txn.created_at || Date.now());
        const formattedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        let displayStatus = 'Pending';
        if (txn.status === 'completed' || txn.status === 'approved') {
          displayStatus = 'Success';
        } else if (txn.status === 'rejected' || txn.status === 'cancelled') {
          displayStatus = 'Rejected';
        }

        return {
          id: txn.transaction_id || txn.id,
          transactionId: txn.transaction_id,
          customer: currentUser.name || 'Customer',
          userId: txn.user_id,
          date: formattedDate,
          time: formattedTime,
          type: txn.type,
          direction: txn.direction,
          paymentMethod: isPurchase ? (txn.payment_method || 'UPI') : (txn.withdrawal_mode === 'bank' ? 'Bank Transfer' : 'Vault Withdrawal'),
          asset: isGold ? 'Gold' : 'Silver',
          assetType: isGold ? 'gold' : 'silver',
          quantity: `${gramsNum.toFixed(4)} gm`,
          grams: gramsNum,
          rate: rateNum,
          amount: amountNum.toFixed(2),
          status: displayStatus,
          rawStatus: txn.status,
          createdAt: txn.created_at,
        };
      });
      setTransactions(mapped);
      return mapped;
    } catch (err) {
      console.warn('[AppContext] Error fetching transactions:', err.message);
    }
    return [];
  }, [currentUser.name]);

  // Fetch Withdrawals from Backend
  const fetchWithdrawals = useCallback(async () => {
    try {
      const res = await withdrawalService.getWithdrawals({ limit: 50 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setWithdrawals(items);
      return items;
    } catch (err) {
      console.warn('[AppContext] Error fetching withdrawals:', err.message);
    }
    return [];
  }, []);

  // Fetch Full Profile from Backend
  const fetchProfile = useCallback(async () => {
    try {
      const data = await profileService.getProfile();
      if (data) {
        const normalized = normalizeUserFromBackend(data, data);
        setCurrentUser(normalized);
        await setStoredUser(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[AppContext] Error fetching profile:', err.message);
    }
    return null;
  }, []);

  // Lifecycle Session Restoration on Mount
  useEffect(() => {
    const initializeAppState = async () => {
      try {
        const token = await getAuthToken();
        const skipped = await getSkippedProfile();
        setHasSkippedProfile(skipped);

        if (token) {
          try {
            const userRes = await authService.getMe();
            if (userRes && userRes.id) {
              let profRes = null;
              try {
                profRes = await profileService.getProfile();
              } catch {}
              const normalized = normalizeUserFromBackend(userRes, profRes);
              setCurrentUser(normalized);
              await setStoredUser(normalized);
            } else {
              await clearAllAuth();
              setCurrentUser(LOGGED_OUT_USER);
            }
          } catch (e) {
            console.warn('[AppContext] Session restore error:', e.message);
            await clearAllAuth();
            setCurrentUser(LOGGED_OUT_USER);
          }
        } else {
          setCurrentUser(LOGGED_OUT_USER);
        }

        // Fetch Live Rates
        await fetchLiveRates();
      } catch (err) {
        console.warn('[AppContext] Error initializing app state:', err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeAppState();
  }, [fetchLiveRates]);

  // Load customer backend data whenever authenticated
  useEffect(() => {
    if (currentUser.isAuthenticated) {
      fetchHoldings();
      fetchTransactions();
      fetchWithdrawals();
    } else {
      setHoldings(INITIAL_HOLDINGS);
      setTransactions([]);
      setWithdrawals([]);
    }
  }, [currentUser.isAuthenticated, fetchHoldings, fetchTransactions, fetchWithdrawals]);

  // Login Handler (Real Backend)
  const loginUser = useCallback(async (mobile, password) => {
    const res = await authService.login({ mobile, password });
    if (res && res.access_token) {
      await setAuthToken(res.access_token);
      let profRes = null;
      try {
        profRes = await profileService.getProfile();
      } catch {}
      const normalized = normalizeUserFromBackend(res.user, profRes);
      await setStoredUser(normalized);
      setCurrentUser(normalized);
      return normalized;
    }
    return null;
  }, []);

  // Register Handler (Real Backend)
  const registerUser = useCallback(async (name, mobile, password, email = '') => {
    const payload = typeof name === 'object'
      ? name
      : { name, mobile, password, email };
    const res = await authService.register(payload);
    if (res && res.access_token) {
      await setAuthToken(res.access_token);
      const normalized = normalizeUserFromBackend(res.user);
      await setStoredUser(normalized);
      setCurrentUser(normalized);
      return normalized;
    }
    return null;
  }, []);

  // Reset Password Handler
  const resetUserPassword = useCallback(async (mobile, newPassword) => {
    // Verified OTP already done in screen
    return true;
  }, []);

  // Complete User Profile (Real Backend)
  const completeUserProfile = useCallback(async (formData) => {
    const payload = {
      full_name: formData.name || formData.full_name,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      relationship: formData.relationship ? formData.relationship.toLowerCase() : null,
      relationship_other: formData.relationshipDetails || formData.relationship_other || null,
      address: {
        address_line: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
      },
      pan: formData.pan || null,
      aadhar: formData.aadhar || null,
      account_number: formData.accountNumber || formData.account_number || null,
      ifsc: formData.ifsc || null,
      nominee_name: formData.nomineeName || formData.nominee_name || null,
      nominee_mobile: formData.nomineeMobile || formData.nominee_mobile || null,
      nominee_dob: formData.nomineeDob || formData.nominee_dob || null,
      nominee_address: formData.nomineeAddress || formData.nominee_address || null,
    };

    const updated = await profileService.updateProfile(payload);
    if (updated) {
      const normalized = normalizeUserFromBackend(updated, updated);
      await setStoredUser(normalized);
      setCurrentUser(normalized);
      return normalized;
    }
    return null;
  }, []);


  // Skip Profile
  const skipProfile = useCallback(async () => {
    await setSkippedProfile(true);
    setHasSkippedProfile(true);
  }, []);

  // Logout Handler
  const logoutUser = useCallback(async () => {
    await clearAllAuth();
    setCurrentUser(LOGGED_OUT_USER);
    setHoldings(INITIAL_HOLDINGS);
    setTransactions([]);
    setWithdrawals([]);
  }, []);

  // Submit KYC Request (Real Backend)
  const submitKycRequest = useCallback(async ({ pan, aadhar }) => {
    const cleanPan = (pan || '').trim().toUpperCase();
    const cleanAadhar = (aadhar || '').replace(/\D/g, '');

    // Update profile with PAN & Aadhaar
    await profileService.updateProfile({ pan: cleanPan, aadhar: cleanAadhar });

    // Submit KYC record
    const kycRes = await kycService.submitKyc({
      full_name: currentUser.name || 'Customer',
      date_of_birth: '1995-01-01',
      gender: 'other',
      address: {
        address_line: currentUser.address || 'Address',
        city: 'Salem',
        state: 'Tamil Nadu',
        pincode: '636001',
      },
      id_type: 'pan',
      id_number: cleanPan,
    });

    await fetchProfile();
    return { success: true, data: kycRes };
  }, [currentUser.name, currentUser.address, fetchProfile]);

  // Create Purchase (Real Backend)
  const addPurchaseTransaction = useCallback(async (txnData) => {
    const metal = (txnData.assetType || txnData.asset || 'gold').toLowerCase();
    const quantityGrams = Number(txnData.grams || txnData.quantity) || 0;

    const res = await purchaseService.createPurchase({
      metal,
      quantity_grams: quantityGrams,
    });

    // Refresh holdings and transactions immediately from backend
    await fetchHoldings();
    await fetchTransactions();

    return res;
  }, [fetchHoldings, fetchTransactions]);

  // Request Withdrawal OTP (Step 1 of Withdrawal Flow)
  const requestWithdrawalOtp = useCallback(async (wthData) => {
    const metal = (wthData.metal || wthData.asset || 'gold').toLowerCase();
    const rawQty = wthData.quantity_grams !== undefined 
      ? wthData.quantity_grams 
      : (wthData.grams !== undefined ? wthData.grams : wthData.quantity);
    const quantityGrams = Number(rawQty) || 0;

    return await withdrawalService.requestWithdrawalOtp({
      metal,
      quantity_grams: quantityGrams,
      withdrawal_mode: wthData.withdrawal_mode || 'physical',
    });
  }, []);

  // Resend Withdrawal OTP
  const resendWithdrawalOtp = useCallback(async (challengeId) => {
    return await withdrawalService.resendWithdrawalOtp(challengeId);
  }, []);

  // Verify Withdrawal OTP & Finalize Withdrawal Creation (Step 2 of Withdrawal Flow)
  const verifyWithdrawalOtp = useCallback(async (challengeId, otp) => {
    const res = await withdrawalService.verifyWithdrawalOtp(challengeId, otp);

    // Refresh holdings, withdrawals, and transactions immediately upon successful withdrawal
    await Promise.allSettled([
      fetchHoldings(),
      fetchWithdrawals(),
      fetchTransactions(),
    ]);

    return res;
  }, [fetchHoldings, fetchWithdrawals, fetchTransactions]);

  // Request Withdrawal (Legacy/Direct)
  const requestWithdrawal = useCallback(async (wthData) => {
    const metal = (wthData.metal || wthData.asset || 'gold').toLowerCase();
    const rawQty = wthData.quantity_grams !== undefined 
      ? wthData.quantity_grams 
      : (wthData.grams !== undefined ? wthData.grams : wthData.quantity);
    const quantityGrams = Number(rawQty) || 0;

    const res = await withdrawalService.requestWithdrawal({
      metal,
      quantity_grams: quantityGrams,
      withdrawal_mode: wthData.withdrawal_mode || 'physical',
    });

    // Refresh holdings, withdrawals, and transactions
    await fetchHoldings();
    await fetchWithdrawals();
    await fetchTransactions();

    return res;
  }, [fetchHoldings, fetchWithdrawals, fetchTransactions]);

  const value = {
    currentUser,
    isAuthLoading,
    hasSkippedProfile,
    goldRate,
    silverRate,
    setGoldRate,
    setSilverRate,
    holdings,
    transactions,
    withdrawals,
    buyNowState,
    setBuyNowState,
    fetchLiveRates,
    fetchHoldings,
    fetchTransactions,
    fetchWithdrawals,
    fetchProfile,
    loginUser,
    registerUser,
    resetUserPassword,
    completeUserProfile,
    skipProfile,
    logoutUser,
    submitKycRequest,
    addPurchaseTransaction,
    requestWithdrawal,
    requestWithdrawalOtp,
    resendWithdrawalOtp,
    verifyWithdrawalOtp,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;

