import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthToken, setAuthToken, getStoredUser, setStoredUser, clearAllAuth } from '../utils/authStorage';
import adminService from '../services/adminService';
import authService from '../services/authService';

const AppContext = createContext();

export function AppProvider({ children }) {
  // 1. Admin Authentication State
  const [adminAuth, setAdminAuth] = useState(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();
    const isAdmin = storedUser && (
      storedUser.role === 'admin' ||
      storedUser.role === 'SUPER_ADMIN' ||
      storedUser.role === 'superadmin'
    );
    if (token && isAdmin) {
      return {
        isAuthenticated: true,
        user: storedUser,
        token,
      };
    }
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  });

  // Keep auth storage and in-memory token synchronized with adminAuth state
  useEffect(() => {
    if (adminAuth?.token) {
      setAuthToken(adminAuth.token, true);
    }
    if (adminAuth?.user) {
      setStoredUser(adminAuth.user, true);
    }
  }, [adminAuth]);

  // Listen for centralized 401 unauthorized events to keep React state in sync
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('[Admin AppContext] Received unauthorized event - resetting admin session');
      setAdminAuth({
        isAuthenticated: false,
        user: null,
        token: null,
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('sj_admin_unauthorized', handleUnauthorized);
      return () => {
        window.removeEventListener('sj_admin_unauthorized', handleUnauthorized);
      };
    }
  }, []);

  // 2. Rates State (with persistent initial state to prevent refresh reset)
  const [goldRate, setGoldRate] = useState(() => {
    try {
      const saved = localStorage.getItem('sj_admin_custom_gold_rate');
      if (saved && !isNaN(parseFloat(saved))) return parseFloat(saved);
    } catch (e) {}
    return 14190.00;
  });
  const [silverRate, setSilverRate] = useState(() => {
    try {
      const saved = localStorage.getItem('sj_admin_custom_silver_rate');
      if (saved && !isNaN(parseFloat(saved))) return parseFloat(saved);
    } catch (e) {}
    return 267.00;
  });
  const [apiGoldRate, setApiGoldRate] = useState(null);
  const [apiSilverRate, setApiSilverRate] = useState(null);
  const [isGoldCustom, setIsGoldCustom] = useState(() => {
    try {
      return localStorage.getItem('sj_admin_gold_mode') === 'custom';
    } catch (e) {
      return false;
    }
  });
  const [isSilverCustom, setIsSilverCustom] = useState(() => {
    try {
      return localStorage.getItem('sj_admin_silver_mode') === 'custom';
    } catch (e) {
      return false;
    }
  });
  const [customGoldInput, setCustomGoldInput] = useState(() => {
    try {
      return localStorage.getItem('sj_admin_custom_gold_rate') || '';
    } catch (e) {
      return '';
    }
  });
  const [customSilverInput, setCustomSilverInput] = useState(() => {
    try {
      return localStorage.getItem('sj_admin_custom_silver_rate') || '';
    } catch (e) {
      return '';
    }
  });
  const [salemReferenceRates, setSalemReferenceRates] = useState(null);
  const [isFetchingSalemRates, setIsFetchingSalemRates] = useState(false);
  const [salemRatesError, setSalemRatesError] = useState(null);

  // 3. Data Collections
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [salesByMetal, setSalesByMetal] = useState({ gold: { amount: 0, grams: 0, count: 0 }, silver: { amount: 0, grams: 0, count: 0 } });
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 4. Admin Settings
  const [adminSettings, setAdminSettings] = useState({
    username: 'SJ Jewellers Admin',
    autoLogout: '30 minutes',
  });

  // 5. Admin Theme State (Light / Dark Mode with localStorage Persistence)
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('sj_admin_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
    } catch (e) {
      console.warn('[Admin AppContext] Failed to read theme from localStorage:', e);
    }
    return 'light';
  });

  const toggleAdminTheme = useCallback(() => {
    setAdminTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('sj_admin_theme', nextTheme);
      } catch (e) {
        console.warn('[Admin AppContext] Failed to save theme to localStorage:', e);
      }
      return nextTheme;
    });
  }, []);

  const updateAdminTheme = useCallback((newTheme) => {
    const theme = newTheme === 'dark' ? 'dark' : 'light';
    setAdminTheme(theme);
    try {
      localStorage.setItem('sj_admin_theme', theme);
    } catch (e) {
      console.warn('[Admin AppContext] Failed to save theme to localStorage:', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (adminTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {
      // In non-browser/test environments
    }
  }, [adminTheme]);

  // Fetch Rates from Backend
  const fetchRates = useCallback(async () => {
    try {
      const data = await adminService.getRates();
      if (data) {
        if (data.gold) {
          const isGoldModeCustom = data.gold.mode === 'custom';
          setGoldRate(Number(data.gold.active_rate) || 14190.00);
          setApiGoldRate(Number(data.gold.api_rate) || 14190.00);
          setIsGoldCustom(isGoldModeCustom);
          try {
            localStorage.setItem('sj_admin_gold_mode', isGoldModeCustom ? 'custom' : 'api');
          } catch (e) {}
          if (data.gold.custom_rate !== null && data.gold.custom_rate !== undefined) {
            const valStr = data.gold.custom_rate.toString();
            setCustomGoldInput(valStr);
            try {
              localStorage.setItem('sj_admin_custom_gold_rate', valStr);
            } catch (e) {}
          }
        }
        if (data.silver) {
          const isSilverModeCustom = data.silver.mode === 'custom';
          setSilverRate(Number(data.silver.active_rate) || 267.00);
          setApiSilverRate(Number(data.silver.api_rate) || 267.00);
          setIsSilverCustom(isSilverModeCustom);
          try {
            localStorage.setItem('sj_admin_silver_mode', isSilverModeCustom ? 'custom' : 'api');
          } catch (e) {}
          if (data.silver.custom_rate !== null && data.silver.custom_rate !== undefined) {
            const valStr = data.silver.custom_rate.toString();
            setCustomSilverInput(valStr);
            try {
              localStorage.setItem('sj_admin_custom_silver_rate', valStr);
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch rates:', err.message);
    }
  }, []);

  // Fetch Salem Live Reference Rates via RapidAPI
  const fetchSalemRates = useCallback(async ({ forceRefresh = false } = {}) => {
    const token = adminAuth?.token || getAuthToken();
    if (!token && !adminAuth?.isAuthenticated) {
      console.warn('[Admin AppContext] Skipping Salem rates fetch - admin not authenticated');
      return null;
    }

    if (token) {
      setAuthToken(token, true);
    }

    setIsFetchingSalemRates(true);
    setSalemRatesError(null);
    try {
      const data = await adminService.getSalemReferenceRates({ refresh: forceRefresh });
      if (data && data.success) {
        const goldVal = Number(data.gold?.per_gram);
        const silverVal = Number(data.silver?.per_gram);
        const refObj = {
          city: data.city || 'Salem',
          gold: goldVal,
          silver: silverVal,
          source: data.source || 'RapidAPI',
          updatedAt: data.updated_at || new Date().toISOString(),
          cached: Boolean(data.cached),
        };
        setSalemReferenceRates(refObj);
        setApiGoldRate(goldVal);
        setApiSilverRate(silverVal);
        return refObj;
      } else {
        throw new Error('Malformed response received for Salem live rates.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Unable to fetch Salem Gold/Silver reference rates. Please try again.';
      setSalemRatesError(msg);
      console.warn('[Admin AppContext] Failed to fetch Salem reference rates:', msg);
      throw err;
    } finally {
      setIsFetchingSalemRates(false);
    }
  }, [adminAuth?.token, adminAuth?.isAuthenticated]);

  // Fetch Dashboard Overview & Sales
  const fetchDashboard = useCallback(async () => {
    try {
      const [overview, sales] = await Promise.allSettled([
        adminService.getDashboardOverview(),
        adminService.getSalesByMetal(),
      ]);

      if (overview.status === 'fulfilled' && overview.value) {
        setDashboardOverview(overview.value);
      }
      if (sales.status === 'fulfilled' && sales.value) {
        setSalesByMetal(sales.value);
      }
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch dashboard metrics:', err.message);
    }
  }, []);

  // Fetch Members
  const fetchMembers = useCallback(async () => {
    try {
      const res = await adminService.getUsers({ limit: 200 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      const mapped = items.map((u) => {
        const d = new Date(u.created_at || Date.now());
        const createdDate = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        return {
          id: u.id,
          name: u.name || u.profile?.full_name || 'Customer',
          username: u.name ? u.name.toLowerCase().replace(/\s+/g, '_') : 'user',
          mobile: u.mobile || '',
          email: u.email || '',
          role: u.role || 'customer',
          verified: u.kyc_status === 'verified' || u.kyc_status === 'approved' ? 'Yes' : 'No',
          kycStatus: u.kyc_status || 'pending',
          mobileVerified: 'Yes',
          active: u.account_status === 'active' ? 'Yes' : 'No',
          status: u.account_status || 'active',
          created: createdDate,
          goldGrams: Number(u.gold_grams || u.holdings?.gold?.quantity_grams) || 0,
          silverGrams: Number(u.silver_grams || u.holdings?.silver?.quantity_grams) || 0,
          transactionCount: Number(u.total_orders || u.transaction_count) || 0,
          profile: u.profile || null,
        };
      });
      setMembers(mapped);
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch members:', err.message);
    }
  }, []);

  // Fetch Withdrawals
  const fetchWithdrawals = useCallback(async () => {
    try {
      const res = await adminService.getWithdrawals({ limit: 200 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      const mapped = items.map((w) => {
        const isGold = (w.metal || '').toLowerCase() === 'gold';
        const gramsNum = Number(w.quantity_grams) || 0;
        const rateNum = Number(w.rate_per_gram) || 0;
        const amountNum = Number(w.metal_value) || (gramsNum * rateNum);
        const d = new Date(w.created_at || Date.now());
        const formattedDate = `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

        return {
          id: w.id || w.withdrawal_id,
          withdrawalId: w.id || w.withdrawal_id,
          transactionId: w.transaction_id,
          userId: w.user_id || w.customer?.user_id,
          customer: w.customer?.name || w.user?.name || w.user_name || 'Customer',
          mobile: w.customer?.mobile || w.user?.mobile || w.user_mobile || '',
          email: w.customer?.email || w.user?.email || '',
          metal: isGold ? 'Gold' : 'Silver',
          grams: gramsNum,
          quantity: `${gramsNum.toFixed(4)} gm`,
          rate: rateNum,
          amount: amountNum.toFixed(2),
          status: (w.status === 'completed' || w.status === 'approved') ? 'Success' : (w.status === 'rejected' ? 'Rejected' : 'Pending'),
          rawStatus: w.status,
          withdrawalMode: w.withdrawal_mode || 'Physical',
          date: formattedDate,
          createdAt: w.created_at,
          rejectionReason: w.rejection_reason || '',
        };
      });
      setWithdrawals(mapped);
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch withdrawals:', err.message);
    }
  }, []);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await adminService.getTransactions({ limit: 200 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      const mapped = items.map((t) => {
        const isGold = (t.metal || '').toLowerCase() === 'gold';
        const gramsNum = Number(t.quantity_grams) || 0;
        const rateNum = Number(t.rate_per_gram) || 0;
        const amountNum = Number(t.total_amount) || Number(t.metal_value) || 0;
        const d = new Date(t.created_at || Date.now());
        const formattedDate = `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        const formattedTime = `${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

        return {
          id: t.transaction_id || t.id,
          transactionId: t.transaction_id || t.id,
          userId: t.user_id,
          customer: t.user?.name || t.user_name || 'Customer',
          mobile: t.user?.mobile || t.user_mobile || '',
          date: formattedDate,
          time: formattedTime,
          type: t.type,
          direction: t.direction,
          paymentMethod: t.payment_method || 'UPI',
          asset: isGold ? 'Gold' : 'Silver',
          assetType: isGold ? 'gold' : 'silver',
          metal: t.metal,
          quantity: `${gramsNum.toFixed(4)} gm`,
          grams: gramsNum,
          rate: rateNum,
          amount: amountNum.toFixed(2),
          status: (t.status === 'completed' || t.status === 'approved') ? 'Success' : (t.status === 'rejected' ? 'Rejected' : 'Pending'),
          rawStatus: t.status,
          createdAt: t.created_at,
        };
      });
      setTransactions(mapped);
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch transactions:', err.message);
    }
  }, []);

  // Fetch Pending KYC
  const fetchPendingKyc = useCallback(async () => {
    try {
      const list = await adminService.getPendingKyc();
      const items = Array.isArray(list) ? list : (list?.items || []);
      const mapped = items.map((k) => {
        const dCreated = new Date(k.user_created_at || k.created_at || Date.now());
        const createdFormatted = `${dCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        const dSubmitted = new Date(k.submitted_at || Date.now());
        const submittedFormatted = `${dSubmitted.getDate()} ${dSubmitted.toLocaleString('en-US', { month: 'short' })} ${dSubmitted.getFullYear()}`;

        return {
          id: k.id || k.kyc_id,
          kycId: k.kyc_id || k.id,
          userId: k.user_id,
          name: k.name || k.user_name || k.full_name || 'Customer',
          mobile: k.mobile || k.user_mobile || '',
          email: k.email || k.user_email || '',
          role: k.role || k.user_role || 'customer',
          accountStatus: k.account_status || k.user_account_status || 'active',
          idType: (k.id_type || 'PAN').toUpperCase(),
          idNumber: k.id_number || '',
          status: k.status || 'pending',
          created: createdFormatted,
          submitted: submittedFormatted,
          createdAt: k.user_created_at || k.created_at,
          submittedAt: k.submitted_at,
          address: k.address || null,
        };
      });
      setPendingVerifications(mapped);
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch pending KYC:', err.message);
    }
  }, []);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await adminService.getNotifications({ limit: 50 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setNotifications(items);
    } catch (err) {
      console.warn('[Admin AppContext] Failed to fetch notifications:', err.message);
    }
  }, []);

  // Refresh All Data from Backend
  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.allSettled([
        fetchRates(),
        fetchDashboard(),
        fetchMembers(),
        fetchWithdrawals(),
        fetchTransactions(),
        fetchPendingKyc(),
        fetchNotifications(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchRates, fetchDashboard, fetchMembers, fetchWithdrawals, fetchTransactions, fetchPendingKyc, fetchNotifications]);

  // Load data whenever admin is authenticated
  useEffect(() => {
    if (adminAuth.isAuthenticated) {
      refreshAllData();
    }
  }, [adminAuth.isAuthenticated, refreshAllData]);

  // Logout Admin
  const logoutAdmin = useCallback(() => {
    clearAllAuth();
    setAdminAuth({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  }, []);

  // Save Rates Action (Real Backend)
  const saveRates = useCallback(async ({ newGoldRate, newSilverRate, goldCustom, silverCustom, goldInputVal, silverInputVal }) => {
    try {
      const parsedGold = goldCustom ? parseFloat(goldInputVal || newGoldRate) : undefined;
      const parsedSilver = silverCustom ? parseFloat(silverInputVal || newSilverRate) : undefined;

      try {
        localStorage.setItem('sj_admin_gold_mode', goldCustom ? 'custom' : 'api');
        localStorage.setItem('sj_admin_silver_mode', silverCustom ? 'custom' : 'api');
        if (goldCustom && parsedGold) {
          localStorage.setItem('sj_admin_custom_gold_rate', parsedGold.toString());
        }
        if (silverCustom && parsedSilver) {
          localStorage.setItem('sj_admin_custom_silver_rate', parsedSilver.toString());
        }
      } catch (e) {}

      setIsGoldCustom(Boolean(goldCustom));
      setIsSilverCustom(Boolean(silverCustom));
      if (goldCustom && parsedGold) {
        setCustomGoldInput(parsedGold.toString());
        setGoldRate(parsedGold);
      }
      if (silverCustom && parsedSilver) {
        setCustomSilverInput(parsedSilver.toString());
        setSilverRate(parsedSilver);
      }

      await adminService.setCustomRates({
        gold: {
          enabled: Boolean(goldCustom),
          rate: parsedGold,
        },
        silver: {
          enabled: Boolean(silverCustom),
          rate: parsedSilver,
        },
        gold_rate: goldCustom ? parsedGold : null,
        silver_rate: silverCustom ? parsedSilver : null,
      });

      if (!goldCustom && !silverCustom) {
        await adminService.refreshRates();
      }

      await fetchRates();
      await fetchDashboard();
    } catch (err) {
      console.error('[Admin AppContext] Error saving rates:', err.message);
      throw err;
    }
  }, [fetchRates, fetchDashboard]);

  // Approve Withdrawal Action (Real Backend)
  const approveWithdrawal = useCallback(async (withdrawalId) => {
    try {
      await adminService.approveWithdrawal(withdrawalId);
      await Promise.allSettled([fetchWithdrawals(), fetchTransactions(), fetchDashboard(), fetchNotifications()]);
    } catch (err) {
      console.error('[Admin AppContext] Error approving withdrawal:', err.message);
      throw err;
    }
  }, [fetchWithdrawals, fetchTransactions, fetchDashboard, fetchNotifications]);

  // Reject Withdrawal Action (Real Backend)
  const rejectWithdrawal = useCallback(async (withdrawalId, reason = 'Administrative decision') => {
    try {
      await adminService.rejectWithdrawal(withdrawalId, reason);
      await Promise.allSettled([fetchWithdrawals(), fetchTransactions(), fetchDashboard(), fetchNotifications()]);
    } catch (err) {
      console.error('[Admin AppContext] Error rejecting withdrawal:', err.message);
      throw err;
    }
  }, [fetchWithdrawals, fetchTransactions, fetchDashboard, fetchNotifications]);

  // Verify Customer KYC Action (Real Backend)
  const verifyCustomer = useCallback(async (kycId) => {
    try {
      await adminService.approveKyc(kycId);
      await Promise.allSettled([fetchPendingKyc(), fetchMembers(), fetchDashboard(), fetchNotifications()]);
    } catch (err) {
      console.error('[Admin AppContext] Error approving KYC:', err.message);
      throw err;
    }
  }, [fetchPendingKyc, fetchMembers, fetchDashboard, fetchNotifications]);

  // Reject Customer KYC Action (Real Backend)
  const rejectKyc = useCallback(async (kycId, reason = 'Document unclear') => {
    try {
      await adminService.rejectKyc(kycId, reason);
      await Promise.allSettled([fetchPendingKyc(), fetchMembers(), fetchDashboard(), fetchNotifications()]);
    } catch (err) {
      console.error('[Admin AppContext] Error rejecting KYC:', err.message);
      throw err;
    }
  }, [fetchPendingKyc, fetchMembers, fetchDashboard, fetchNotifications]);

  // Ban / Unban User Action (Real Backend)
  const deleteMember = useCallback(async (userId) => {
    try {
      await adminService.banUser(userId);
      await fetchMembers();
    } catch (err) {
      console.error('[Admin AppContext] Error banning user:', err.message);
      throw err;
    }
  }, [fetchMembers]);

  const value = {
    adminAuth,
    setAdminAuth,
    logoutAdmin,
    goldRate,
    silverRate,
    apiGoldRate,
    apiSilverRate,
    salemReferenceRates,
    isFetchingSalemRates,
    salemRatesError,
    fetchSalemRates,
    isGoldCustom,
    isSilverCustom,
    customGoldInput,
    customSilverInput,
    saveRates,
    dashboardOverview,
    salesByMetal,
    members,
    transactions,
    withdrawals,
    notifications,
    pendingVerifications,
    isLoading,
    refreshAllData,
    approveWithdrawal,
    rejectWithdrawal,
    verifyCustomer,
    rejectKyc,
    deleteMember,
    adminSettings,
    setAdminSettings,
    adminTheme,
    setAdminTheme: updateAdminTheme,
    toggleAdminTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  return context || {};
}

export default AppContext;
