import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AdminWithdrawal() {
  const { withdrawals = [], approveWithdrawal, refreshAllData } = useApp() || {};

  React.useEffect(() => {
    if (typeof refreshAllData === 'function') {
      refreshAllData();
    }
  }, [refreshAllData]);

  const [filterMetal, setFilterMetal] = useState('All');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination State for Withdrawal Table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (!w) return false;
    if (filterMetal === 'All') return true;
    return (w.metal || '').toLowerCase() === filterMetal.toLowerCase();
  });

  const totalAmount = filteredWithdrawals.reduce((sum, w) => sum + (parseFloat(w?.amount) || 0), 0);

  const handleConfirmApproval = async () => {
    if (!selectedWithdrawal || isProcessing) return;
    setIsProcessing(true);
    try {
      if (typeof approveWithdrawal === 'function') {
        await approveWithdrawal(selectedWithdrawal.id);
      }
      setSelectedWithdrawal(null);
    } catch (err) {
      alert(err.message || 'Failed to approve withdrawal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilterChange = (opt) => {
    setFilterMetal(opt);
    setCurrentPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Withdrawal</h1>
        <p className="admin-page-sub">
          All customer withdrawals. Filter by metal and see status, rate on withdrawal day, and total amount.
        </p>
      </div>

      {/* 2. Filter Pills - Enlarged & Comfortable */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>Show:</span>
        {['All', 'Gold', 'Silver'].map((opt) => {
          const isActive = filterMetal === opt;
          return (
            <button
              key={opt}
              onClick={() => handleFilterChange(opt)}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '20px',
                border: isActive ? 'none' : '1px solid var(--admin-border)',
                backgroundColor: isActive 
                  ? (opt === 'All' ? 'var(--admin-orange)' : opt === 'Gold' ? '#d97706' : '#475569') 
                  : 'var(--admin-bg-card)',
                color: isActive ? '#ffffff' : 'var(--admin-text-secondary)',
                fontSize: '14.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--admin-border-subtle)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--admin-bg-card)';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* 3. Summary Box Card */}
      <div className="admin-card" style={{
        padding: '18px 24px',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxSizing: 'border-box'
      }}>
        {/* Top Row: Label on Left, Bold Red Amount on Right on Same Horizontal Line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'nowrap',
          width: '100%'
        }}>
          <span style={{
            fontSize: '16px',
            color: 'var(--admin-text-heading)',
            fontWeight: '700',
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap',
            lineHeight: '1.2'
          }}>
            Total Withdrawal Amount
          </span>
          <span style={{
            fontSize: '24px',
            fontWeight: '900',
            letterSpacing: '-0.5px',
            color: '#ef4444',
            whiteSpace: 'nowrap',
            lineHeight: '1',
            flexShrink: 0
          }}>
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Supporting Subtext Below */}
        <div style={{
          fontSize: '13px',
          color: 'var(--admin-text-secondary)',
          fontWeight: '600',
          lineHeight: '1.2',
          whiteSpace: 'nowrap'
        }}>
          {filterMetal === 'All' ? 'All metals' : `${filterMetal} only`} · {filteredWithdrawals.length} withdrawal(s)
        </div>
      </div>

      {/* 4. Withdrawals Data Table */}
      {(() => {
        const totalItems = filteredWithdrawals.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(Math.max(1, currentPage), totalPages);
        const startIndex = (safePage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const paginatedWithdrawals = filteredWithdrawals.slice(startIndex, endIndex);

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
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>CUSTOMER</th>
                    <th>METAL</th>
                    <th>GRAMS</th>
                    <th>RATE (₹/GM)</th>
                    <th>AMOUNT (₹)</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWithdrawals.map((w) => {
                    const isApproved = w.status === 'Approved';

                    return (
                      <tr key={w.id}>
                        <td style={{ color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', fontWeight: '600' }}>
                          {w.date}
                        </td>

                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{w.customer}</div>
                          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{w.mobile}</div>
                        </td>

                        <td style={{ fontWeight: '600', color: w.metal === 'Gold' ? 'var(--admin-gold-text)' : 'var(--admin-silver-text)' }}>
                          {w.metal}
                        </td>

                        <td style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>
                          {w.grams}
                        </td>

                        <td style={{ fontWeight: '600', color: 'var(--admin-text-secondary)' }}>
                          ₹{parseFloat(w.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td style={{ fontWeight: '800', color: 'var(--admin-text-value)' }}>
                          ₹{parseFloat(w.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className={isApproved ? 'admin-badge-green' : 'admin-badge-yellow'} style={{ width: 'fit-content' }}>
                              {w.status}
                            </span>
                            {w.paidDate && (
                              <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                                Amount paid · {w.paidDate}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {!isApproved ? (
                            <button
                              className="admin-btn-green"
                              onClick={() => setSelectedWithdrawal(w)}
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              Approve & mark paid
                            </button>
                          ) : (
                            <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                          )}
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
              flexWrap: 'wrap',
              gap: '24px',
              padding: '14px 20px',
              borderTop: '1px solid var(--admin-border)',
              backgroundColor: 'var(--admin-bg-card)',
              fontSize: '13.5px',
              color: 'var(--admin-text-secondary)',
              boxSizing: 'border-box'
            }}>
              {/* 1. Rows per page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="admin-select"
                  style={{
                    height: '32px',
                    padding: '0 24px 0 10px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* 2. Visible Range (e.g. 1–10 of 28) */}
              <div style={{ fontWeight: '500' }}>
                <span style={{ color: 'var(--admin-text-main)' }}>{totalItems === 0 ? 0 : startIndex + 1}–{endIndex}</span> of <span style={{ color: 'var(--admin-text-main)' }}>{totalItems}</span>
              </div>

              {/* 3. Navigation Controls (< >) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'var(--admin-bg-card)',
                    color: safePage === 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-main)',
                    cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: safePage === 1 ? 0.45 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages || totalPages === 0}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                    backgroundColor: 'var(--admin-bg-card)',
                    color: safePage === totalPages || totalPages === 0 ? 'var(--admin-text-muted)' : 'var(--admin-text-main)',
                    cursor: safePage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: safePage === totalPages || totalPages === 0 ? 0.45 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  aria-label="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. Modal: Confirm Approval */}
      {selectedWithdrawal && (
        <div className="admin-modal-overlay" onClick={() => setSelectedWithdrawal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--admin-text-heading)' }}>
              Confirm approval
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Please confirm the details below. This will mark the withdrawal as approved and amount paid.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Date</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Customer</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.customer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Mobile</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.mobile}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Metal</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.metal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Grams</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>{selectedWithdrawal.grams} g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Rate (₹/gm)</span>
                <span style={{ fontWeight: '600', color: 'var(--admin-text-value)' }}>₹{parseFloat(selectedWithdrawal.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--admin-text-secondary)' }}>Amount (₹)</span>
                <span style={{ fontWeight: '800', color: 'var(--admin-orange)' }}>
                  ₹{parseFloat(selectedWithdrawal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

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
                onClick={handleConfirmApproval}
              >
                Confirm Approval & Paid
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
