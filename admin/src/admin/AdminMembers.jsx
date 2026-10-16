import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Calendar, X, Trash2, AlertTriangle, CheckCircle, Phone, 
  ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Clock, Mail, 
  User, MapPin, CreditCard, RefreshCw, Check, AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import adminService from '../services/adminService';

export default function AdminMembers() {
  const context = useApp() || {};
  const rawMembers = context.members;
  const rawTransactions = context.transactions;
  const rawWithdrawals = context.withdrawals;
  const rawGoldRate = context.goldRate;
  const rawSilverRate = context.silverRate;
  const deleteMember = context.deleteMember;
  const verifyCustomer = context.verifyCustomer;
  const rejectKyc = context.rejectKyc;
  const refreshAllData = context.refreshAllData;

  useEffect(() => {
    if (typeof refreshAllData === 'function') {
      refreshAllData();
    }
  }, [refreshAllData]);

  const members = Array.isArray(rawMembers) ? rawMembers : [];
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const withdrawals = Array.isArray(rawWithdrawals) ? rawWithdrawals : [];
  const goldRate = typeof rawGoldRate === 'number' && !isNaN(rawGoldRate) ? rawGoldRate : (parseFloat(rawGoldRate) || 13818.88);
  const silverRate = typeof rawSilverRate === 'number' && !isNaN(rawSilverRate) ? rawSilverRate : (parseFloat(rawSilverRate) || 206.17);

  // Selection & Details State
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  
  // KYC Action Modal State
  const [showRejectKycModal, setShowRejectKycModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState('gold'); // 'gold' | 'silver'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'purchases' | 'withdrawals'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minGrams, setMinGrams] = useState('');
  const [maxGrams, setMaxGrams] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Search & Pagination State for Members Table
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Member Details from backend when selectedMemberId changes
  const fetchSelectedMemberDetail = useCallback(async (userId) => {
    if (!userId) return;
    setIsLoadingDetail(true);
    setDetailError('');
    try {
      const data = await adminService.getUserDetail(userId);
      setMemberDetail(data);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      setDetailError(err.message || 'Unable to load member details. Please try again.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchSelectedMemberDetail(selectedMemberId);
    } else {
      setMemberDetail(null);
      setDetailError('');
    }
  }, [selectedMemberId, fetchSelectedMemberDetail]);

  // Selected Member fallback from members list while loading or if detail is ready
  const selectedMemberSummary = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m && (m.id === selectedMemberId || m.id === selectedMemberId.toString()));
  }, [members, selectedMemberId]);

  // Handle Approve KYC
  const handleApproveKycAction = async () => {
    const kycId = memberDetail?.kyc?.id || memberDetail?.kyc?.kyc_id;
    if (!kycId || isSubmittingKyc) return;
    setIsSubmittingKyc(true);
    try {
      if (typeof verifyCustomer === 'function') {
        await verifyCustomer(kycId);
      } else {
        await adminService.approveKyc(kycId);
      }
      setToastMessage(`KYC for ${memberDetail.name || memberDetail.profile?.full_name || 'Customer'} has been verified successfully.`);
      await fetchSelectedMemberDetail(selectedMemberId);
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to approve KYC.');
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // Handle Reject KYC
  const handleRejectKycAction = async () => {
    const kycId = memberDetail?.kyc?.id || memberDetail?.kyc?.kyc_id;
    if (!kycId || isSubmittingKyc) return;
    setIsSubmittingKyc(true);
    try {
      const reason = rejectionReason.trim() || 'Document verification failed';
      if (typeof rejectKyc === 'function') {
        await rejectKyc(kycId, reason);
      } else {
        await adminService.rejectKyc(kycId, reason);
      }
      setToastMessage(`KYC for ${memberDetail.name || 'Customer'} has been rejected.`);
      setShowRejectKycModal(false);
      setRejectionReason('');
      await fetchSelectedMemberDetail(selectedMemberId);
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to reject KYC.');
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // Aggregate and calculate all transactions & withdrawals for selected member
  const memberTransactions = useMemo(() => {
    if (!memberDetail && !selectedMemberSummary) {
      return { goldPurchases: [], silverPurchases: [], goldWithdrawals: [], silverWithdrawals: [], allGold: [], allSilver: [] };
    }

    // Prefer real transactions from memberDetail if available
    if (memberDetail?.transactions || memberDetail?.withdrawals || memberDetail?.purchases) {
      const rawTx = Array.isArray(memberDetail.purchases)
        ? memberDetail.purchases
        : (Array.isArray(memberDetail.transactions)
            ? memberDetail.transactions.filter((t) => (t.type || '').toLowerCase() === 'purchase')
            : []);
      const rawWd = Array.isArray(memberDetail.withdrawals)
        ? memberDetail.withdrawals
        : (Array.isArray(memberDetail.transactions)
            ? memberDetail.transactions.filter((t) => (t.type || '').toLowerCase() === 'withdrawal')
            : []);

      const purchases = rawTx.map((t) => {
        const isGold = (t.metal || '').toLowerCase().includes('gold');
        const gNum = parseFloat(t.quantity_grams || t.quantity || 0) || 0;
        const amtNum = parseFloat(t.total_amount ?? t.metal_value ?? t.amount ?? 0) || 0;
        const rateVal = parseFloat(t.rate_per_gram || t.rate) || (gNum > 0 && amtNum > 0 ? (amtNum / gNum) : (isGold ? goldRate : silverRate));
        const d = new Date(t.created_at || Date.now());
        const dateFormatted = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        return {
          ...t,
          type: 'Purchase',
          metal: isGold ? 'Gold' : 'Silver',
          displayGrams: gNum,
          displayRate: rateVal,
          displayAmount: amtNum,
          displayDate: dateFormatted,
          displayStatus: (t.status === 'completed' || t.status === 'approved') ? 'Success' : (t.status === 'rejected' ? 'Rejected' : 'Pending'),
          displayPayment: t.payment_method || 'UPI',
        };
      });

      const memberWithdrawals = rawWd.map((w) => {
        const isGold = (w.metal || '').toLowerCase().includes('gold');
        const gNum = parseFloat(w.quantity_grams || w.grams || 0) || 0;
        const storedRate = parseFloat(w.rate_per_gram ?? w.rate) || 0;
        const amtNum = parseFloat(w.total_amount ?? w.metal_value ?? w.amount ?? 0) || (gNum > 0 && storedRate > 0 ? (gNum * storedRate) : 0);
        const rateVal = storedRate > 0 ? storedRate : (gNum > 0 && amtNum > 0 ? (amtNum / gNum) : (isGold ? goldRate : silverRate));
        const d = new Date(w.created_at || Date.now());
        const dateFormatted = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        return {
          ...w,
          type: 'Withdrawal',
          metal: isGold ? 'Gold' : 'Silver',
          displayGrams: gNum,
          displayRate: rateVal,
          displayAmount: amtNum,
          displayDate: dateFormatted,
          displayStatus: (w.status === 'completed' || w.status === 'approved') ? 'Success' : (w.status === 'rejected' ? 'Rejected' : 'Pending'),
          displayPayment: w.withdrawal_mode || 'Physical Delivery',
        };
      });

      const goldPurchases = purchases.filter((p) => p.metal === 'Gold');
      const silverPurchases = purchases.filter((p) => p.metal === 'Silver');
      const goldWithdrawals = memberWithdrawals.filter((w) => w.metal === 'Gold');
      const silverWithdrawals = memberWithdrawals.filter((w) => w.metal === 'Silver');

      return {
        goldPurchases,
        silverPurchases,
        goldWithdrawals,
        silverWithdrawals,
        allGold: [...goldPurchases, ...goldWithdrawals].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
        allSilver: [...silverPurchases, ...silverWithdrawals].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
      };
    }

    const username = (selectedMemberSummary?.username || '').toLowerCase().trim();
    const memberId = (selectedMemberSummary?.id || '').toString().trim();
    const mobileDigits = (selectedMemberSummary?.mobile || '').replace(/[^0-9]/g, '');

    // Match purchases from global transactions
    const purchases = transactions.filter((t) => {
      if (!t) return false;
      const cust = (t.customer || t.username || '').toLowerCase().trim();
      const uId = (t.userId || '').toString().trim();
      const tMobile = (t.mobile || '').replace(/[^0-9]/g, '');

      if (cust && cust === username) return true;
      if (uId && uId === memberId) return true;
      if (tMobile && mobileDigits && tMobile.includes(mobileDigits)) return true;
      return false;
    }).map((t) => {
      const isGold = (t.asset || t.assetType || t.metal || '').toLowerCase().includes('gold');
      const gNum = parseFloat(t.quantity ? t.quantity.toString().replace(/[^0-9.]/g, '') : (t.grams || 0)) || 0;
      const amtNum = parseFloat(t.amount ? t.amount.toString().replace(/,/g, '') : 0) || 0;
      const rateVal = parseFloat(t.rate) || (gNum > 0 && amtNum > 0 ? (amtNum / gNum) : (isGold ? goldRate : silverRate));

      return {
        ...t,
        type: 'Purchase',
        metal: isGold ? 'Gold' : 'Silver',
        displayGrams: gNum,
        displayRate: rateVal,
        displayAmount: amtNum,
        displayDate: t.date || 'Recent',
        displayStatus: t.status || 'Success',
        displayPayment: t.paymentMethod || 'UPI'
      };
    });

    // Match withdrawals
    const memberWithdrawals = withdrawals.filter((w) => {
      if (!w) return false;
      const cust = (w.customer || w.username || '').toLowerCase().trim();
      const uId = (w.userId || '').toString().trim();
      const wMobile = (w.mobile || '').replace(/[^0-9]/g, '');

      if (cust && cust === username) return true;
      if (uId && uId === memberId) return true;
      if (wMobile && mobileDigits && wMobile.includes(mobileDigits)) return true;
      return false;
    }).map((w) => {
      const isGold = (w.metal || w.asset || '').toLowerCase().includes('gold');
      const gNum = parseFloat(w.grams || (w.quantity ? w.quantity.toString().replace(/[^0-9.]/g, '') : 0)) || 0;
      const storedRate = parseFloat(w.rate || w.rate_per_gram) || 0;
      const amtNum = parseFloat(w.amount ? w.amount.toString().replace(/,/g, '') : (w.total_amount ?? w.metal_value ?? 0)) || (gNum > 0 && storedRate > 0 ? (gNum * storedRate) : 0);
      const rateVal = storedRate > 0 ? storedRate : (gNum > 0 && amtNum > 0 ? (amtNum / gNum) : (isGold ? goldRate : silverRate));

      return {
        ...w,
        type: 'Withdrawal',
        metal: isGold ? 'Gold' : 'Silver',
        displayGrams: gNum,
        displayRate: rateVal,
        displayAmount: amtNum,
        displayDate: w.date || 'Recent',
        displayStatus: (w.status === 'completed' || w.status === 'approved' || w.status === 'Success') ? 'Success' : (w.status === 'rejected' || w.status === 'Rejected' ? 'Rejected' : 'Pending'),
        displayPayment: w.withdrawalMode || w.withdrawal_mode || 'Physical Delivery'
      };
    });

    const goldPurchases = purchases.filter((p) => p.metal === 'Gold');
    const silverPurchases = purchases.filter((p) => p.metal === 'Silver');
    const goldWithdrawals = memberWithdrawals.filter((w) => w.metal === 'Gold');
    const silverWithdrawals = memberWithdrawals.filter((w) => w.metal === 'Silver');

    return {
      goldPurchases,
      silverPurchases,
      goldWithdrawals,
      silverWithdrawals,
      allGold: [...goldPurchases, ...goldWithdrawals].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
      allSilver: [...silverPurchases, ...silverWithdrawals].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    };
  }, [memberDetail, selectedMemberSummary, transactions, withdrawals, goldRate, silverRate]);

  // Holdings calculations
  const goldHoldingsData = useMemo(() => {
    if (memberDetail?.holdings?.gold) {
      return memberDetail.holdings.gold;
    }
    const boughtGrams = (memberTransactions?.goldPurchases || [])
      .filter((p) => p?.displayStatus === 'Success')
      .reduce((acc, p) => acc + (p?.displayGrams || 0), 0);
    const withdrawnGrams = (memberTransactions?.goldWithdrawals || [])
      .filter((w) => w?.displayStatus === 'Success')
      .reduce((acc, w) => acc + (w?.displayGrams || 0), 0);
    const grams = Math.max(0, boughtGrams - withdrawnGrams);
    return {
      quantity_grams: grams,
      invested_amount: grams * goldRate,
      avg_buy_rate: goldRate,
      current_rate: goldRate,
      current_value: grams * goldRate
    };
  }, [memberDetail, memberTransactions, goldRate]);

  const silverHoldingsData = useMemo(() => {
    if (memberDetail?.holdings?.silver) {
      return memberDetail.holdings.silver;
    }
    const boughtGrams = (memberTransactions?.silverPurchases || [])
      .filter((p) => p?.displayStatus === 'Success')
      .reduce((acc, p) => acc + (p?.displayGrams || 0), 0);
    const withdrawnGrams = (memberTransactions?.silverWithdrawals || [])
      .filter((w) => w?.displayStatus === 'Success')
      .reduce((acc, w) => acc + (w?.displayGrams || 0), 0);
    const grams = Math.max(0, boughtGrams - withdrawnGrams);
    return {
      quantity_grams: grams,
      invested_amount: grams * silverRate,
      avg_buy_rate: silverRate,
      current_rate: silverRate,
      current_value: grams * silverRate
    };
  }, [memberDetail, memberTransactions, silverRate]);

  // Dynamic filter application for history table
  const filteredList = useMemo(() => {
    const list = activeTab === 'gold' ? (memberTransactions?.allGold || []) : (memberTransactions?.allSilver || []);
    
    return list.filter((item) => {
      if (!item) return false;
      if (filterType === 'purchases' && item.type !== 'Purchase') return false;
      if (filterType === 'withdrawals' && item.type !== 'Withdrawal') return false;

      if (fromDate) {
        const itemDate = new Date(item.date || item.displayDate || item.created_at);
        const from = new Date(fromDate);
        if (!isNaN(itemDate.getTime()) && !isNaN(from.getTime()) && itemDate < from) return false;
      }
      if (toDate) {
        const itemDate = new Date(item.date || item.displayDate || item.created_at);
        const to = new Date(toDate);
        if (!isNaN(itemDate.getTime()) && !isNaN(to.getTime()) && itemDate > new Date(to.getTime() + 86400000)) return false;
      }

      const grams = typeof item.displayGrams === 'number' ? item.displayGrams : 0;
      if (minGrams !== '' && !isNaN(parseFloat(minGrams))) {
        if (grams < parseFloat(minGrams)) return false;
      }
      if (maxGrams !== '' && !isNaN(parseFloat(maxGrams))) {
        if (grams > parseFloat(maxGrams)) return false;
      }

      return true;
    });
  }, [activeTab, memberTransactions, filterType, fromDate, toDate, minGrams, maxGrams]);

  const handleResetFilters = () => {
    setFilterType('all');
    setFromDate('');
    setToDate('');
    setMinGrams('');
    setMaxGrams('');
  };

  const handleDeleteMember = () => {
    if (!selectedMemberId) return;
    if (typeof deleteMember === 'function') {
      deleteMember(selectedMemberId);
    }
    setShowDeleteConfirm(false);
    setToastMessage(`Member status has been updated.`);
    setTimeout(() => {
      setSelectedMemberId(null);
      setToastMessage('');
    }, 1500);
  };

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('success') || s.includes('approved') || s.includes('completed') || s.includes('verified')) {
      return <span className="admin-badge-green">Success</span>;
    }
    if (s.includes('pending') || s.includes('processing')) {
      return <span className="admin-badge-yellow">Pending</span>;
    }
    if (s.includes('rejected') || s.includes('failed')) {
      return <span className="admin-badge-red" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>Rejected</span>;
    }
    return <span className="admin-badge-gray">{status || 'Completed'}</span>;
  };

  // =========================================================================
  // VIEW 1: MEMBER DETAILS VIEW (When selectedMemberId is set)
  // =========================================================================
  if (selectedMemberId) {
    const memberName = memberDetail?.name || memberDetail?.profile?.full_name || selectedMemberSummary?.name || selectedMemberSummary?.username || 'Customer';
    const memberMobile = memberDetail?.mobile || selectedMemberSummary?.mobile || '-';
    const memberEmail = memberDetail?.email || selectedMemberSummary?.email || 'Not provided';
    const memberRole = memberDetail?.role || selectedMemberSummary?.role || 'customer';
    const memberStatus = memberDetail?.account_status || selectedMemberSummary?.status || 'active';
    const rawKycStatus = (memberDetail?.kyc_status || memberDetail?.kyc?.status || selectedMemberSummary?.kycStatus || 'pending').toLowerCase();
    const isKycVerified = rawKycStatus === 'verified' || rawKycStatus === 'approved';
    const isKycPending = rawKycStatus === 'pending';
    const isKycRejected = rawKycStatus === 'rejected';
    
    const dJoined = new Date(memberDetail?.created_at || Date.now());
    const joinedFormatted = `${dJoined.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '32px',
            backgroundColor: '#065f46',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
            fontWeight: '600',
            zIndex: 150
          }}>
            <CheckCircle size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Back Navigation Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setSelectedMemberId(null)}
            className="admin-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Members</span>
          </button>

          {isLoadingDetail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-secondary)', fontSize: '13px' }}>
              <RefreshCw size={14} className="admin-spin" />
              <span>Updating member data...</span>
            </div>
          )}
        </div>

        {/* Loading State Skeleton */}
        {isLoadingDetail && !memberDetail && (
          <div className="admin-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#ea580c',
              borderRadius: '50%',
              animation: 'admin-spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--admin-text-heading)', margin: '0 0 4px 0' }}>
              Loading member details...
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: 0 }}>
              Fetching real customer account, KYC, and holdings records from MySQL
            </p>
          </div>
        )}

        {/* Error State */}
        {detailError && (
          <div className="admin-card" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={24} color="#dc2626" />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14.5px', fontWeight: '700', color: '#991b1b' }}>Unable to load member details</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c' }}>{detailError}</p>
              </div>
            </div>
            <button
              onClick={() => fetchSelectedMemberDetail(selectedMemberId)}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Details View Content */}
        {(!isLoadingDetail || memberDetail) && (
          <>
            {/* 2. Member Profile Header Card */}
            <div className="admin-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: '800'
                }}>
                  {(memberName || 'U').charAt(0).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h2 className="admin-member-header-name" style={{ margin: 0, fontSize: '20px' }}>
                      {memberName}
                    </h2>
                    <span className="admin-badge-gray" style={{ fontSize: '11px', fontWeight: '600' }}>
                      ID: #{selectedMemberId}
                    </span>
                    <span className="admin-badge-gray" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                      {memberRole}
                    </span>
                  </div>

                  <div className="admin-member-header-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} /> {memberMobile}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={13} /> {memberEmail}
                    </span>
                    <span>•</span>
                    <span>Joined: {joinedFormatted}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  backgroundColor: isKycVerified ? '#dcfce7' : (isKycPending ? '#fef3c7' : '#fee2e2'),
                  color: isKycVerified ? '#15803d' : (isKycPending ? '#b45309' : '#dc2626'),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {isKycVerified ? <ShieldCheck size={14} /> : (isKycPending ? <Clock size={14} /> : <ShieldAlert size={14} />)}
                  KYC: {isKycVerified ? 'Verified' : (isKycPending ? 'Pending' : (isKycRejected ? 'Rejected' : 'Unverified'))}
                </span>

                <span style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  backgroundColor: '#dcfce7',
                  color: '#15803d'
                }}>
                  Mobile: Verified
                </span>

                <span style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  backgroundColor: memberStatus === 'active' ? '#dcfce7' : '#fee2e2',
                  color: memberStatus === 'active' ? '#15803d' : '#dc2626'
                }}>
                  Status: {memberStatus === 'active' ? 'Active' : 'Banned'}
                </span>
              </div>
            </div>

            {/* 3. KYC ACTION BANNER (When KYC is Pending) */}
            {isKycPending && (
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '800', color: '#92400e' }}>
                      KYC Verification Pending Review
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#b45309' }}>
                      This customer submitted their KYC identification documents and is awaiting administrator verification.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={isSubmittingKyc}
                    onClick={handleApproveKycAction}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 18px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      cursor: isSubmittingKyc ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                    }}
                  >
                    <Check size={16} />
                    <span>{isSubmittingKyc ? 'Approving...' : 'Approve KYC'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingKyc}
                    onClick={() => setShowRejectKycModal(true)}
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 18px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      cursor: isSubmittingKyc ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={16} />
                    <span>Reject KYC</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. KYC Status Banner for Verified / Rejected */}
            {isKycVerified && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#15803d',
                fontSize: '13.5px',
                fontWeight: '600'
              }}>
                <ShieldCheck size={18} />
                <span>Customer identity has been verified and approved in database.</span>
              </div>
            )}

            {isKycRejected && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#b91c1c',
                fontSize: '13.5px',
                fontWeight: '600'
              }}>
                <ShieldAlert size={18} />
                <span>
                  KYC Verification Rejected: {memberDetail?.kyc?.rejection_reason || 'Document verification failed'}.
                </span>
              </div>
            )}

            {/* 5. Two-Column Information Section: Customer Profile & KYC Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              
              {/* Card A: Customer Information */}
              <div className="admin-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>
                  <User size={18} color="#ea580c" />
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: 'var(--admin-text-heading)' }}>
                    Customer Information
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Customer Name</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--admin-text-value)' }}>{memberName}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Mobile Number</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--admin-text-value)' }}>{memberMobile}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Email</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--admin-text-value)' }}>{memberEmail}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>User ID</span>
                    <span style={{ fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--admin-text-secondary)' }}>{selectedMemberId}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Account Status</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize', color: memberStatus === 'active' ? '#10b981' : '#dc2626' }}>
                      {memberStatus}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Gender / DOB</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-value)' }}>
                      {memberDetail?.profile?.gender || memberDetail?.kyc?.gender || '-'} / {memberDetail?.profile?.date_of_birth || memberDetail?.kyc?.date_of_birth || '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Joined Date</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-value)' }}>{joinedFormatted}</span>
                  </div>

                  {memberDetail?.profile?.nominee_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Nominee</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-value)' }}>{memberDetail.profile.nominee_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card B: KYC Information */}
              <div className="admin-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>
                  <ShieldCheck size={18} color="#16a34a" />
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: 'var(--admin-text-heading)' }}>
                    KYC & Identity Details
                  </h3>
                </div>

                {memberDetail?.kyc ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>KYC Status</span>
                      <span style={{
                        fontSize: '12.5px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: isKycVerified ? '#10b981' : (isKycPending ? '#f59e0b' : '#dc2626')
                      }}>
                        {memberDetail.kyc.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Full Name on ID</span>
                      <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--admin-text-value)' }}>
                        {memberDetail.kyc.full_name || memberName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>ID Type</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--admin-text-value)' }}>
                        {memberDetail.kyc.id_type || 'PAN'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>ID Number</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--admin-text-value)' }}>
                        {memberDetail.kyc.id_number || '-'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Submitted At</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-value)' }}>
                        {memberDetail.kyc.submitted_at ? new Date(memberDetail.kyc.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>Address</span>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--admin-text-value)', textAlign: 'right', maxWidth: '60%' }}>
                        {[
                          memberDetail.kyc.address?.address_line,
                          memberDetail.kyc.address?.city,
                          memberDetail.kyc.address?.state,
                          memberDetail.kyc.address?.pincode
                        ].filter(Boolean).join(', ') || 'Not specified'}
                      </span>
                    </div>

                    {memberDetail.kyc.rejection_reason && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2px' }}>
                        <span style={{ fontSize: '13px', color: '#dc2626' }}>Rejection Reason</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                          {memberDetail.kyc.rejection_reason}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--admin-text-secondary)' }}>
                    <ShieldAlert size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '13.5px' }}>Customer has not submitted KYC identification documents yet.</p>
                  </div>
                )}
              </div>

            </div>

            {/* 6. Holdings Summary Cards (Gold & Silver) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {/* Gold Holdings Card */}
              <div className="admin-holdings-card-gold">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="admin-holdings-title-gold">
                    Gold Holdings
                  </span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '15px'
                  }}>
                    Au
                  </div>
                </div>

                <div className="admin-holdings-value-gold">
                  {Number(goldHoldingsData?.quantity_grams || 0).toFixed(4)} gm
                </div>

                <div className="admin-holdings-sub-gold">
                  Valuation: ₹{Number(goldHoldingsData?.current_value || (Number(goldHoldingsData?.quantity_grams || 0) * goldRate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · (₹{goldRate.toLocaleString('en-IN')}/gm)
                </div>

                {Number(goldHoldingsData?.reserved_grams || 0) > 0 && (
                  <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '4px', fontWeight: '600' }}>
                    Reserved for Withdrawal: {Number(goldHoldingsData.reserved_grams).toFixed(4)} gm
                  </div>
                )}
              </div>

              {/* Silver Holdings Card */}
              <div className="admin-holdings-card-silver">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="admin-holdings-title-silver">
                    Silver Holdings
                  </span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '15px'
                  }}>
                    Ag
                  </div>
                </div>

                <div className="admin-holdings-value-silver">
                  {Number(silverHoldingsData?.quantity_grams || 0).toFixed(4)} gm
                </div>

                <div className="admin-holdings-sub-silver">
                  Valuation: ₹{Number(silverHoldingsData?.current_value || (Number(silverHoldingsData?.quantity_grams || 0) * silverRate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · (₹{silverRate.toLocaleString('en-IN')}/gm)
                </div>

                {Number(silverHoldingsData?.reserved_grams || 0) > 0 && (
                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', fontWeight: '600' }}>
                    Reserved for Withdrawal: {Number(silverHoldingsData.reserved_grams).toFixed(4)} gm
                  </div>
                )}
              </div>
            </div>

            {/* 7. Transaction History Section with Tabs & Filters */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              
              {/* Header & Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 2px 0', color: 'var(--admin-text-heading)' }}>
                    Transaction History
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: 0 }}>
                    Gold and silver purchase orders and withdrawal requests for this customer
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActiveTab('gold')}
                    style={{
                      height: '40px',
                      width: '135px',
                      padding: '0 20px',
                      borderRadius: '20px',
                      border: activeTab === 'gold' ? 'none' : '1px solid var(--admin-border)',
                      backgroundColor: activeTab === 'gold' ? '#d97706' : 'var(--admin-bg-card)',
                      color: activeTab === 'gold' ? '#ffffff' : 'var(--admin-text-secondary)',
                      fontSize: '14.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: activeTab === 'gold' ? '0 4px 12px rgba(217, 119, 6, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Gold
                  </button>

                  <button
                    onClick={() => setActiveTab('silver')}
                    style={{
                      height: '40px',
                      width: '135px',
                      padding: '0 20px',
                      borderRadius: '20px',
                      border: activeTab === 'silver' ? 'none' : '1px solid var(--admin-border)',
                      backgroundColor: activeTab === 'silver' ? '#475569' : 'var(--admin-bg-card)',
                      color: activeTab === 'silver' ? '#ffffff' : 'var(--admin-text-secondary)',
                      fontSize: '14.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: activeTab === 'silver' ? '0 4px 12px rgba(71, 85, 105, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Silver
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', backgroundColor: 'var(--admin-bg-page)', padding: '12px 16px', borderRadius: '10px' }}>
                
                {/* Type Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>Type:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-border)',
                      backgroundColor: 'var(--admin-bg-card)',
                      color: 'var(--admin-text-main)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  >
                    <option value="all">All</option>
                    <option value="purchases">Purchases Only</option>
                    <option value="withdrawals">Withdrawals Only</option>
                  </select>
                </div>

                {/* From Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-border)',
                      backgroundColor: 'var(--admin-bg-card)',
                      color: 'var(--admin-text-main)',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* To Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>To:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-border)',
                      backgroundColor: 'var(--admin-bg-card)',
                      color: 'var(--admin-text-main)',
                      fontSize: '12.5px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Reset Filters */}
                {(filterType !== 'all' || fromDate || toDate || minGrams || maxGrams) && (
                  <button
                    onClick={handleResetFilters}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--admin-border)',
                      backgroundColor: 'var(--admin-bg-card)',
                      color: 'var(--admin-text-secondary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <X size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Transactions Table */}
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>TYPE</th>
                      <th>WEIGHT (GM)</th>
                      <th>RATE (₹/GM)</th>
                      <th>TOTAL AMOUNT (₹)</th>
                      <th>PAYMENT / MODE</th>
                      <th>DATE</th>
                      <th style={{ textAlign: 'right' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length > 0 ? (
                      filteredList.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td>
                            <span style={{
                              fontWeight: '700',
                              color: item.type === 'Purchase' ? '#10b981' : '#f59e0b'
                            }}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>
                            {Number(item.displayGrams || 0).toFixed(4)} gm
                          </td>
                          <td style={{ color: 'var(--admin-text-secondary)' }}>
                            ₹{Number(item.displayRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontWeight: '700', color: 'var(--admin-text-heading)' }}>
                            ₹{Number(item.displayAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ color: 'var(--admin-text-secondary)' }}>
                            {item.displayPayment}
                          </td>
                          <td style={{ color: 'var(--admin-text-secondary)' }}>
                            {item.displayDate}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {renderStatusBadge(item.displayStatus)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--admin-text-secondary)' }}>
                          No {activeTab} transactions found for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </>
        )}

        {/* REJECT KYC MODAL */}
        {showRejectKycModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid var(--admin-border)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
                Reject KYC Verification
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
                Please state the reason for rejecting KYC for <strong style={{ color: 'var(--admin-text-value)' }}>{memberName}</strong>.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
                  Reason for rejection:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Document image is blurred, Name does not match identity card..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'var(--admin-bg-page)',
                    color: 'var(--admin-text-main)',
                    fontSize: '13.5px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isSubmittingKyc}
                  onClick={() => setShowRejectKycModal(false)}
                  className="admin-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingKyc}
                  onClick={handleRejectKycAction}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: isSubmittingKyc ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmittingKyc ? 'Rejecting...' : 'Reject KYC'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DEACTIVATE MEMBER MODAL */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'var(--admin-bg-card)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid var(--admin-border)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
                Deactivate Member
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--admin-text-secondary)', margin: '0 0 18px 0' }}>
                Are you sure you want to deactivate member <strong style={{ color: 'var(--admin-text-value)' }}>{memberName}</strong> (ID: #{selectedMemberId})?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="admin-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMember}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Deactivate Member
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ALL MEMBERS TABLE VIEW
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 108px)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13.5px',
          fontWeight: '600',
          zIndex: 150
        }}>
          <CheckCircle size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header with Search Bar */}
      <div className="admin-page-header" style={{ flexShrink: 0, marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="admin-page-title">Members</h1>
          <p className="admin-page-sub">
            All registered users ({members.length})
          </p>
        </div>

        {/* Search Input Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, mobile, email..."
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid var(--admin-border)',
              backgroundColor: 'var(--admin-bg-card)',
              color: 'var(--admin-text-main)',
              fontSize: '13px',
              width: '240px',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--admin-text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. Members Table Container */}
      {(() => {
        const filteredMembers = members.filter((m) => {
          if (!m) return false;
          if (!searchTerm || !searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase().trim();
          const name = (m.name || '').toLowerCase();
          const mobile = (m.mobile || '').toLowerCase();
          const email = (m.email || '').toLowerCase();
          const username = (m.username || '').toLowerCase();
          const id = (m.id || '').toLowerCase();
          return name.includes(term) || mobile.includes(term) || email.includes(term) || username.includes(term) || id.includes(term);
        });

        const totalItems = filteredMembers.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(Math.max(1, currentPage), totalPages);
        const startIndex = (safePage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

        return (
          <div 
            className="admin-table-container" 
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box' 
            }}
          >
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th>ID</th>
                    <th>CUSTOMER NAME</th>
                    <th>MOBILE</th>
                    <th>ROLE</th>
                    <th>KYC VERIFIED</th>
                    <th>MOBILE VERIFIED</th>
                    <th>ACTIVE</th>
                    <th>JOINED</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((m, idx) => {
                    if (!m) return null;
                    const isVerified = (m.kycStatus || '').toLowerCase() === 'verified' || (m.kycStatus || '').toLowerCase() === 'approved' || m.verified === 'Yes';
                    const isMobileVerified = m.mobileVerified === 'Yes';
                    const isActive = m.active === 'Yes' || m.status === 'active';

                    return (
                      <tr key={m.id || idx}>
                        <td style={{ color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
                          #{m.id.length > 8 ? m.id.substring(0, 8) + '...' : m.id}
                        </td>
                        
                        {/* Customer Name & Username */}
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--admin-orange)' }}>
                            {m.name || m.username}
                          </div>
                          {m.name && m.username && m.name !== m.username && (
                            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                              @{m.username}
                            </div>
                          )}
                        </td>

                        <td style={{ fontWeight: '500', color: 'var(--admin-text-secondary)' }}>
                          {m.mobile}
                        </td>

                        <td>
                          <span className="admin-badge-gray" style={{ textTransform: 'capitalize' }}>
                            {m.role || 'customer'}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontWeight: '700', color: isVerified ? '#10b981' : '#f59e0b' }}>
                            {isVerified ? 'Yes' : 'No'}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontWeight: '700', color: isMobileVerified ? '#10b981' : '#f59e0b' }}>
                            {m.mobileVerified || 'Yes'}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontWeight: '700', color: isActive ? '#10b981' : '#ef4444' }}>
                            {isActive ? 'Yes' : 'No'}
                          </span>
                        </td>

                        <td style={{ color: 'var(--admin-text-secondary)' }}>
                          {m.created}
                        </td>

                        {/* View Action Button */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedMemberId(m.id)}
                            style={{
                              backgroundColor: 'var(--admin-border-subtle)',
                              color: 'var(--admin-sidebar-active-text)',
                              border: '1px solid var(--admin-border)',
                              borderRadius: '6px',
                              padding: '5px 14px',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--admin-sidebar-active-text)';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--admin-border-subtle)';
                              e.currentTarget.style.color = 'var(--admin-sidebar-active-text)';
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid var(--admin-border)',
              backgroundColor: 'var(--admin-bg-card)',
              flexShrink: 0,
              gap: '24px'
            }}>
              {/* Rows Per Page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                  Rows per page:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'var(--admin-bg-page)',
                    color: 'var(--admin-text-main)',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Range Counter */}
              <span style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>
                {totalItems === 0 ? '0–0 of 0' : `${startIndex + 1}–${endIndex} of ${totalItems}`}
              </span>

              {/* Prev / Next Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'var(--admin-bg-page)',
                    color: safePage <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-main)',
                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: safePage <= 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'var(--admin-bg-page)',
                    color: safePage >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-main)',
                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: safePage >= totalPages ? 0.5 : 1
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </div>
        );
      })()}

    </div>
  );
}
