import React, { useState, useCallback, useEffect } from 'react';
import { 
  CheckCircle, AlertCircle, Clock, ShieldCheck, ShieldAlert, 
  X, Check, RefreshCw, User, Phone, Mail, MapPin, CreditCard, DollarSign 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import adminService from '../services/adminService';

export default function AdminNotifications() {
  const { 
    withdrawals = [], 
    pendingVerifications = [], 
    approveWithdrawal, 
    rejectWithdrawal,
    verifyCustomer, 
    rejectKyc, 
    refreshAllData 
  } = useApp() || {};

  useEffect(() => {
    if (typeof refreshAllData === 'function') {
      refreshAllData();
    }
  }, [refreshAllData]);

  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [verificationDetail, setVerificationDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  
  // KYC Rejection State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Withdrawal Rejection State
  const [showRejectWithdrawalModal, setShowRejectWithdrawalModal] = useState(false);
  const [withdrawalRejectionReason, setWithdrawalRejectionReason] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const pendingWithdrawals = withdrawals.filter((w) => w && (w.status === 'Pending' || w.rawStatus === 'pending'));

  // Handle opening verification modal and fetching fresh customer & KYC data
  const handleOpenVerification = useCallback(async (v) => {
    setSelectedVerification(v);
    setVerificationDetail(null);
    setDetailError('');
    setIsLoadingDetail(true);

    try {
      if (v.userId) {
        const detail = await adminService.getUserDetail(v.userId);
        setVerificationDetail(detail);
      }
    } catch (err) {
      console.warn('[AdminNotifications] Could not fetch real-time user detail:', err.message);
      setDetailError('Unable to load latest customer details. Showing available notification information.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Confirm Paid (Withdrawal Approval)
  const handleConfirmPaid = async () => {
    if (!selectedWithdrawal || isProcessing) return;
    setIsProcessing(true);
    try {
      if (typeof approveWithdrawal === 'function') {
        await approveWithdrawal(selectedWithdrawal.id);
      } else {
        await adminService.approveWithdrawal(selectedWithdrawal.id);
      }
      setToastMessage(`Payment of ₹${parseFloat(selectedWithdrawal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} confirmed for ${selectedWithdrawal.customer}.`);
      setSelectedWithdrawal(null);
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to approve withdrawal.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject Withdrawal Action
  const handleRejectWithdrawalAction = async () => {
    if (!selectedWithdrawal || isProcessing) return;
    const reason = withdrawalRejectionReason.trim() || 'Insufficient holdings or unverified details';
    setIsProcessing(true);
    try {
      if (typeof rejectWithdrawal === 'function') {
        await rejectWithdrawal(selectedWithdrawal.id, reason);
      } else {
        await adminService.rejectWithdrawal(selectedWithdrawal.id, reason);
      }
      setToastMessage(`Withdrawal for ${selectedWithdrawal.customer} rejected.`);
      setShowRejectWithdrawalModal(false);
      setWithdrawalRejectionReason('');
      setSelectedWithdrawal(null);
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to reject withdrawal.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve & Verify Customer Account (Real KYC Approval)
  const handleVerifyAccount = async () => {
    const kycId = verificationDetail?.kyc?.id || selectedVerification?.kycId || selectedVerification?.id;
    const custName = verificationDetail?.name || verificationDetail?.profile?.full_name || selectedVerification?.name || 'Customer';

    if (!kycId || isProcessing) return;
    setIsProcessing(true);
    try {
      if (typeof verifyCustomer === 'function') {
        await verifyCustomer(kycId);
      } else {
        await adminService.approveKyc(kycId);
      }
      setToastMessage(`Account & KYC for ${custName} verified successfully.`);
      setSelectedVerification(null);
      setVerificationDetail(null);
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to verify customer account.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject Customer KYC
  const handleRejectAccount = async () => {
    const kycId = verificationDetail?.kyc?.id || selectedVerification?.kycId || selectedVerification?.id;
    const custName = verificationDetail?.name || verificationDetail?.profile?.full_name || selectedVerification?.name || 'Customer';
    const reason = rejectionReason.trim() || 'Document verification failed';

    if (!kycId || isProcessing) return;
    setIsProcessing(true);
    try {
      if (typeof rejectKyc === 'function') {
        await rejectKyc(kycId, reason);
      } else {
        await adminService.rejectKyc(kycId, reason);
      }
      setToastMessage(`KYC verification for ${custName} has been rejected.`);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedVerification(null);
      setVerificationDetail(null);
      if (typeof refreshAllData === 'function') {
        await refreshAllData();
      }
    } catch (err) {
      alert(err.message || 'Failed to reject KYC.');
    } finally {
      setIsProcessing(false);
    }
  };

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

      {/* 1. Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Notifications</h1>
        <p className="admin-page-sub">
          Withdrawal payments to confirm and new customer accounts to verify.
        </p>
      </div>

      {/* 2. Pending Withdrawal Payments Section - Subtle Mint Green Tint */}
      <div className="admin-card" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: '#ECFDF5',
        border: '1px solid #A7F3D0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#065f46' }}>
              Pending withdrawal payments
            </h3>
            <p style={{ fontSize: '12.5px', color: '#047857', margin: '2px 0 0 0' }}>
              Confirm when the amount has been paid to the customer.
            </p>
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12.5px',
            fontWeight: '700',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            border: '1px solid #86efac'
          }}>
            {pendingWithdrawals.length} pending
          </span>
        </div>

        {/* Interactive Withdrawal List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingWithdrawals.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#059669', padding: '8px 0' }}>
              No pending withdrawal payments.
            </div>
          ) : (
            pendingWithdrawals.map((w) => (
              <div
                key={w.id}
                className="admin-notification-item withdrawal"
                onClick={() => setSelectedWithdrawal(w)}
              >
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#059669' }}>
                    {w.customer} · {w.metal}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', marginTop: '2px', color: 'var(--admin-text-main)' }}>
                    {w.grams} gm · ₹{parseFloat(w.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                    Mobile: {w.mobile || 'Not available'} · {w.date}
                  </div>
                </div>

                <button
                  className="admin-btn-outline-green"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWithdrawal(w);
                  }}
                >
                  Review & Confirm
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Pending User Verifications Section - Subtle Warm Gold Tint */}
      <div className="admin-card" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: '#FFF9E6',
        border: '1px solid #F5D76E'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#92400e' }}>
              Pending user verifications
            </h3>
            <p style={{ fontSize: '12.5px', color: '#b45309', margin: '2px 0 0 0' }}>
              Click any customer card to view full details and verify their account.
            </p>
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12.5px',
            fontWeight: '700',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a'
          }}>
            {pendingVerifications.length} pending
          </span>
        </div>

        {/* Interactive Customer Verification List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingVerifications.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#b45309', padding: '8px 0' }}>
              No pending user verifications.
            </div>
          ) : (
            pendingVerifications.map((v) => {
              const customerName = v.name || v.customerName || v.fullName || 'Customer';
              const customerMobile = v.mobile || 'Not available';
              const customerRole = v.role || 'customer';
              const createdDate = v.created || v.createdAt || 'Recent';

              return (
                <div
                  key={v.id || v.kycId}
                  className="admin-notification-item verification"
                  onClick={() => handleOpenVerification(v)}
                >
                  <div>
                    <div className="admin-verification-name">
                      {customerName}
                    </div>
                    <div className="admin-verification-detail">
                      Mobile: {customerMobile} · Role: {customerRole}
                    </div>
                    <div className="admin-verification-meta">
                      Account Created: {createdDate}
                    </div>
                  </div>

                  <button
                    className="admin-verification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenVerification(v);
                    }}
                  >
                    Tap to review
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Modal: Review & Confirm Withdrawal Details */}
      {selectedWithdrawal && (
        <div className="admin-modal-overlay" onClick={() => {
          if (!isProcessing) setSelectedWithdrawal(null);
        }}>
          <div className="admin-modal-box" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--admin-text-heading)' }}>
                Withdrawal Request Details
              </h3>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              backgroundColor: 'var(--admin-bg-card-subtle)',
              border: '1px solid var(--admin-border)',
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '20px',
              color: 'var(--admin-text-secondary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Customer:</span>
                <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.customer}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Mobile:</span>
                <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.mobile || 'Not available'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Metal:</span>
                <span style={{ fontWeight: '700', color: selectedWithdrawal.metal === 'Gold' ? 'var(--admin-gold)' : 'var(--admin-text-main)' }}>
                  {selectedWithdrawal.metal}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Quantity:</span>
                <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>
                  {selectedWithdrawal.quantity || `${selectedWithdrawal.grams} gm`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Rate at Request:</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>
                  ₹{Number(selectedWithdrawal.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Total Amount:</span>
                <span style={{ fontWeight: '800', color: '#059669', fontSize: '14.5px' }}>
                  ₹{parseFloat(selectedWithdrawal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Withdrawal Mode:</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)', textTransform: 'capitalize' }}>
                  {selectedWithdrawal.withdrawalMode || 'Physical'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: '600' }}>Request Date:</span>
                <span style={{ fontWeight: '500', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.date}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600' }}>Status:</span>
                <span style={{
                  fontWeight: '700',
                  color: '#b45309',
                  backgroundColor: '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  textTransform: 'uppercase'
                }}>
                  Pending Payment
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                className="admin-btn-secondary"
                onClick={() => setSelectedWithdrawal(null)}
              >
                Close
              </button>

              <button
                type="button"
                disabled={isProcessing}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
                onClick={() => setShowRejectWithdrawalModal(true)}
              >
                Reject Withdrawal
              </button>

              <button
                type="button"
                disabled={isProcessing}
                className="admin-btn-green"
                onClick={handleConfirmPaid}
              >
                {isProcessing ? 'Confirming...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Reject Withdrawal Reason */}
      {showRejectWithdrawalModal && (
        <div className="admin-modal-overlay" style={{ zIndex: 250 }} onClick={() => setShowRejectWithdrawalModal(false)}>
          <div className="admin-modal-box" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 8px 0', color: '#dc2626' }}>
              Reject Withdrawal Request
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '14px' }}>
              Please enter the reason for rejecting the withdrawal for <strong>{selectedWithdrawal?.customer || 'this customer'}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={withdrawalRejectionReason}
                onChange={(e) => setWithdrawalRejectionReason(e.target.value)}
                placeholder="e.g. Bank account details mismatch, invalid payment information..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-border)',
                  backgroundColor: 'var(--admin-bg-page)',
                  color: 'var(--admin-text-main)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                className="admin-btn-secondary"
                onClick={() => setShowRejectWithdrawalModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
                onClick={handleRejectWithdrawalAction}
              >
                {isProcessing ? 'Rejecting...' : 'Reject Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Review & Verify Customer KYC (Real Backend Data) */}
      {selectedVerification && (
        <div className="admin-modal-overlay" onClick={() => {
          if (!isProcessing) {
            setSelectedVerification(null);
            setVerificationDetail(null);
          }
        }}>
          <div className="admin-modal-box" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--admin-text-heading)' }}>
                Verify customer account
              </h3>
              <button
                onClick={() => {
                  setSelectedVerification(null);
                  setVerificationDetail(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--admin-text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingDetail ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#ea580c',
                  borderRadius: '50%',
                  animation: 'admin-spin 0.8s linear infinite',
                  margin: '0 auto 12px'
                }} />
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
                  Loading customer details...
                </p>
              </div>
            ) : (
              <>
                {detailError && (
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#b45309',
                    marginBottom: '12px'
                  }}>
                    {detailError}
                  </div>
                )}

                {(() => {
                  const detail = verificationDetail || {};
                  const displayName = detail.name || detail.profile?.full_name || selectedVerification.name || 'Customer';
                  const displayMobile = detail.mobile || selectedVerification.mobile || 'Not available';
                  const displayEmail = detail.email || selectedVerification.email || 'Not available';
                  const displayRole = detail.role || selectedVerification.role || 'customer';
                  
                  let displayCreated = selectedVerification.created || 'Recent';
                  if (detail.created_at) {
                    const d = new Date(detail.created_at);
                    displayCreated = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                  }

                  const kycInfo = detail.kyc || selectedVerification;
                  const idType = (kycInfo.id_type || selectedVerification.idType || 'PAN').toUpperCase();
                  const idNumber = kycInfo.id_number || selectedVerification.idNumber || 'Not specified';
                  const addressStr = [
                    kycInfo.address?.address_line,
                    kycInfo.address?.city,
                    kycInfo.address?.state,
                    kycInfo.address?.pincode
                  ].filter(Boolean).join(', ');

                  return (
                    <div style={{
                      backgroundColor: 'var(--admin-bg-card-subtle)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginBottom: '20px',
                      color: 'var(--admin-text-secondary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>Name:</span>
                        <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{displayName}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>Mobile:</span>
                        <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{displayMobile}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>Email:</span>
                        <span style={{ fontWeight: '500', color: 'var(--admin-text-value)' }}>{displayEmail}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>Role:</span>
                        <span style={{ textTransform: 'capitalize', fontWeight: '600', color: 'var(--admin-text-value)' }}>{displayRole}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>Account Created:</span>
                        <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>{displayCreated}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>KYC Status:</span>
                        <span style={{
                          fontWeight: '700',
                          color: '#b45309',
                          backgroundColor: '#fef3c7',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          textTransform: 'uppercase'
                        }}>
                          Pending
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>{idType} Number:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--admin-text-value)' }}>{idNumber}</span>
                      </div>

                      {addressStr && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2px' }}>
                          <span style={{ fontWeight: '600' }}>Address:</span>
                          <span style={{ textAlign: 'right', maxWidth: '65%', color: 'var(--admin-text-value)' }}>{addressStr}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Modal Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="admin-btn-secondary"
                    onClick={() => {
                      setSelectedVerification(null);
                      setVerificationDetail(null);
                    }}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => setShowRejectModal(true)}
                  >
                    Reject KYC
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    className="admin-btn-green"
                    onClick={handleVerifyAccount}
                  >
                    {isProcessing ? 'Verifying...' : 'Approve & Verify'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 7. Modal: Reject KYC Reason */}
      {showRejectModal && (
        <div className="admin-modal-overlay" style={{ zIndex: 250 }} onClick={() => setShowRejectModal(false)}>
          <div className="admin-modal-box" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 8px 0', color: '#dc2626' }}>
              Reject KYC Verification
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '14px' }}>
              Please specify the reason for rejecting KYC for <strong>{verificationDetail?.name || selectedVerification?.name || 'this customer'}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Document image is unclear, invalid ID number..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-border)',
                  backgroundColor: 'var(--admin-bg-page)',
                  color: 'var(--admin-text-main)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isProcessing}
                className="admin-btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
                onClick={handleRejectAccount}
              >
                {isProcessing ? 'Rejecting...' : 'Reject KYC'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
