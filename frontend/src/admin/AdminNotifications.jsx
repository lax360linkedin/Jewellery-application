import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AdminNotifications() {
  const { withdrawals = [], pendingVerifications = [], approveWithdrawal, verifyCustomer } = useApp() || {};

  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);

  const pendingWithdrawals = withdrawals.filter((w) => w && w.status === 'Pending');

  const handleConfirmPaid = () => {
    if (selectedWithdrawal && typeof approveWithdrawal === 'function') {
      approveWithdrawal(selectedWithdrawal.id);
      setSelectedWithdrawal(null);
    }
  };

  const handleVerifyAccount = () => {
    if (selectedVerification && typeof verifyCustomer === 'function') {
      verifyCustomer(selectedVerification.id, selectedVerification.name);
      setSelectedVerification(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
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
                    {w.grams} · ₹{parseFloat(w.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                    Mobile: {w.mobile} · {w.date}
                  </div>
                </div>

                <button
                  className="admin-btn-outline-green"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWithdrawal(w);
                  }}
                >
                  Confirm paid
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
            pendingVerifications.map((v) => (
              <div
                key={v.id}
                className="admin-notification-item verification"
                onClick={() => setSelectedVerification(v)}
              >
                <div>
                  <div className="admin-verification-name">
                    {v.name}
                  </div>
                  <div className="admin-verification-detail">
                    Mobile: {v.mobile} · Role: {v.role}
                  </div>
                  <div className="admin-verification-meta">
                    Created: {v.created}
                  </div>
                </div>

                <button
                  className="admin-verification-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVerification(v);
                  }}
                >
                  Tap to review
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Modal: Confirm Amount Paid */}
      {selectedWithdrawal && (
        <div className="admin-modal-overlay" onClick={() => setSelectedWithdrawal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px 0', color: 'var(--admin-text-heading)' }}>
              Confirm payment
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--admin-text-secondary)', marginBottom: '18px' }}>
              Confirm that ₹{parseFloat(selectedWithdrawal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been transferred to {selectedWithdrawal.customer}.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedWithdrawal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-green"
                onClick={handleConfirmPaid}
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Review & Verify Customer */}
      {selectedVerification && (
        <div className="admin-modal-overlay" onClick={() => setSelectedVerification(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 12px 0', color: 'var(--admin-text-heading)' }}>
              Verify customer account
            </h3>

            <div style={{
              backgroundColor: 'var(--admin-bg-card-subtle)',
              border: '1px solid var(--admin-border)',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '18px',
              color: 'var(--admin-text-secondary)'
            }}>
              <div><strong>Name:</strong> {selectedVerification.name}</div>
              <div><strong>Mobile:</strong> {selectedVerification.mobile}</div>
              <div><strong>Role:</strong> {selectedVerification.role}</div>
              <div><strong>Account Created:</strong> {selectedVerification.created}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedVerification(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="admin-btn-green"
                onClick={handleVerifyAccount}
              >
                Approve & Verify
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
