import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

export default function AdminAnalytics() {
  const { goldRate, silverRate } = useApp() || {};

  const [period, setPeriod] = useState('Monthly (current month)');
  const [quarter, setQuarter] = useState('Q1 (Jan-Mar)');
  const [year, setYear] = useState('2026');
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-08-20');
  const [hoveredGoldBar, setHoveredGoldBar] = useState(null);

  // Dynamic Date Range calculation
  const dateRangeText = useMemo(() => {
    if (period === 'Monthly (current month)') {
      return 'Showing 2026-08-01 to 2026-08-20';
    }
    if (period === 'Annually (current year)') {
      return 'Showing 2026-01-01 to 2026-08-20';
    }
    if (period === 'Quarterly') {
      if (quarter.startsWith('Q1')) return 'Showing 2026-01-01 to 2026-03-31';
      if (quarter.startsWith('Q2')) return 'Showing 2026-04-01 to 2026-06-30';
      if (quarter.startsWith('Q3')) return 'Showing 2026-07-01 to 2026-09-30';
      return 'Showing 2026-10-01 to 2026-12-31';
    }
    return `Showing ${fromDate} to ${toDate}`;
  }, [period, quarter, year, fromDate, toDate]);

  // Overall holdings calculations
  const totalGoldBought = 1.857;
  const totalSilverBought = 77.055;
  const safeGoldRate = goldRate || 13818.88;
  const safeSilverRate = silverRate || 206.17;
  const totalGoldCurrentValue = totalGoldBought * safeGoldRate;
  const totalSilverCurrentValue = totalSilverBought * safeSilverRate;

  // Period specific metrics
  const isMonthly = period === 'Monthly (current month)';
  const isQuarterly = period === 'Quarterly';
  const isAnnual = period === 'Annually (current year)';

  const goldPeriodGrams = isMonthly ? 0.00 : isQuarterly ? 0.857 : 1.857;
  const goldPeriodAvgRate = isMonthly ? 0 : isQuarterly ? 11809.34 : 11779.70;
  const goldPeriodValue = isMonthly ? 0.00 : isQuarterly ? 7547.64 : 21872.55;

  const silverPeriodGrams = isMonthly ? 0.038 : isQuarterly ? 77.017 : 77.055;
  const silverPeriodAvgRate = isMonthly ? 273.21 : isQuarterly ? 268.01 : 268.01;
  const silverPeriodValue = isMonthly ? 10.30 : isQuarterly ? 20703.00 : 20713.30;

  const periodWithdrawalValue = isMonthly ? 0.00 : 13950.01;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Analytics</h1>
        <p className="admin-page-sub">
          Total gold and silver across all customers, with rate at transaction date. Filter by period below.
        </p>
      </div>

      {/* 2. Filter Bar */}
      <div className="admin-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>Period</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="admin-select"
              >
                <option value="Monthly (current month)">Monthly (current month)</option>
                <option value="Annually (current year)">Annually (current year)</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Custom date range">Custom date range</option>
              </select>
            </div>

            {/* Quarterly Specific Controls */}
            {period === 'Quarterly' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>Quarter</span>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="admin-select"
                  >
                    <option value="Q1 (Jan-Mar)">Q1 (Jan-Mar)</option>
                    <option value="Q2 (Apr-Jun)">Q2 (Apr-Jun)</option>
                    <option value="Q3 (Jul-Sep)">Q3 (Jul-Sep)</option>
                    <option value="Q4 (Oct-Dec)">Q4 (Oct-Dec)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>Year</span>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="admin-select"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </>
            )}

            {/* Custom Date Range Specific Controls */}
            {period === 'Custom date range' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="admin-input"
                    style={{ width: '150px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="admin-input"
                    style={{ width: '150px' }}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-muted)' }}>
            {dateRangeText}
          </div>
        </div>
      </div>

      {/* 3. Top Two Metric Cards (Gold & Silver across all customers) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Gold (all customers) */}
        <div className="admin-holdings-card-gold" style={{ borderLeft: '4px solid #D4A017' }}>
          <h3 className="admin-holdings-title-gold" style={{ margin: '0 0 8px 0', fontSize: '15.5px' }}>
            Gold (all customers)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13.5px' }}>
            <div className="admin-holdings-sub-gold">
              Current API rate: ₹{safeGoldRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
            </div>
            <div className="admin-holdings-sub-gold">
              Total gold bought: {totalGoldBought.toFixed(3)} g
            </div>
            <div style={{ fontWeight: '800', color: 'var(--admin-orange)', marginTop: '4px', fontSize: '15px' }}>
              Current value of all gold: ₹{totalGoldCurrentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Silver (all customers) */}
        <div className="admin-holdings-card-silver" style={{ borderLeft: '4px solid #94a3b8' }}>
          <h3 className="admin-holdings-title-silver" style={{ margin: '0 0 8px 0', fontSize: '15.5px' }}>
            Silver (all customers)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13.5px' }}>
            <div className="admin-holdings-sub-silver">
              Current API rate: ₹{safeSilverRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm
            </div>
            <div className="admin-holdings-sub-silver">
              Total silver bought: {totalSilverBought.toFixed(3)} g
            </div>
            <div style={{ fontWeight: '800', color: 'var(--admin-text-value)', marginTop: '4px', fontSize: '15px' }}>
              Current value of all silver: ₹{totalSilverCurrentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Period Breakdown (Gold & Silver side by side) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Gold Period Breakdown */}
        <div className="admin-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--admin-text-heading)' }}>
            Gold
          </h3>
          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
            {goldPeriodGrams > 0 ? (
              <>Total: {goldPeriodGrams.toFixed(3)} g · Avg rate ₹{goldPeriodAvgRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm<br />Value: ₹{goldPeriodValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
            ) : (
              <>Total: 0.00 g<br />Value: ₹0.00</>
            )}
          </div>

          <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '8px', color: 'var(--admin-text-secondary)' }}>
            Gold (total grams by period)
          </div>

          {goldPeriodGrams === 0 ? (
            /* Empty State */
            <div style={{
              height: '140px',
              border: '1px dashed var(--admin-border)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--admin-text-muted)',
              fontSize: '12.5px'
            }}>
              No gold data in this period
            </div>
          ) : (
            /* Gold Bar Chart */
            <div style={{ position: 'relative' }}>
              <div style={{ height: '140px', position: 'relative', display: 'flex', alignItems: 'flex-end', paddingLeft: '35px', borderBottom: '1px solid var(--admin-border)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--admin-text-muted)' }}>
                  <span>1</span>
                  <span>0.8</span>
                  <span>0.6</span>
                  <span>0.4</span>
                  <span>0.2</span>
                  <span>0</span>
                </div>

                <div style={{ position: 'absolute', left: '35px', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px solid var(--admin-border)', width: '100%' }}></div>
                </div>

                {/* Bars */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', height: '100%', alignItems: 'flex-end', zIndex: 1 }}>
                  <div
                    onMouseEnter={() => setHoveredGoldBar('0.85')}
                    onMouseLeave={() => setHoveredGoldBar(null)}
                    style={{
                      width: isQuarterly ? '25%' : '35%',
                      height: '85%',
                      backgroundColor: 'var(--admin-gold-pie)',
                      borderRadius: '3px 3px 0 0',
                      cursor: 'pointer'
                    }}
                  ></div>

                  {isAnnual && (
                    <div style={{ width: '35%', height: '90%', backgroundColor: 'var(--admin-gold-pie)', borderRadius: '3px 3px 0 0' }}></div>
                  )}
                </div>
              </div>

              {/* Tooltip */}
              {hoveredGoldBar && (
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  zIndex: 10
                }}>
                  <div style={{ color: 'var(--admin-text-secondary)' }}>Mon Mar 16 2026 00:00:00 GMT+0000</div>
                  <div style={{ fontWeight: '700', color: 'var(--admin-gold-pie)' }}>Gold (g): {hoveredGoldBar}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-around', paddingLeft: '35px', marginTop: '6px', fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>
                <span>{isQuarterly ? '160 (Coordinated Universal Time)' : '2026-03'}</span>
                {isAnnual && <span>2026-04</span>}
              </div>
            </div>
          )}
        </div>

        {/* Silver Period Breakdown */}
        <div className="admin-card">
          <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--admin-text-heading)' }}>
            Silver
          </h3>
          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
            Total: {silverPeriodGrams.toFixed(3)} g · Avg rate ₹{silverPeriodAvgRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm<br />
            Value: ₹{silverPeriodValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '8px', color: 'var(--admin-text-secondary)' }}>
            Silver (total grams by period)
          </div>

          {/* Silver Bar Chart */}
          <div style={{ height: '140px', position: 'relative', display: 'flex', alignItems: 'flex-end', paddingLeft: '35px', borderBottom: '1px solid var(--admin-border)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--admin-text-muted)' }}>
              <span>{isMonthly ? '0.04' : '80'}</span>
              <span>{isMonthly ? '0.03' : '60'}</span>
              <span>{isMonthly ? '0.02' : '40'}</span>
              <span>{isMonthly ? '0.01' : '20'}</span>
              <span>0</span>
            </div>

            <div style={{ position: 'absolute', left: '35px', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
              <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
              <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
              <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
              <div style={{ borderTop: '1px solid var(--admin-border)', width: '100%' }}></div>
            </div>

            {/* Bar */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', height: '100%', alignItems: 'flex-end', zIndex: 1 }}>
              <div style={{
                width: isMonthly ? '50%' : '35%',
                height: isMonthly ? '70%' : '80%',
                backgroundColor: 'var(--admin-silver-pie)',
                borderRadius: '3px 3px 0 0'
              }}></div>

              {isAnnual && (
                <div style={{ width: '35%', height: '2%', backgroundColor: 'var(--admin-silver-pie)', borderRadius: '3px 3px 0 0' }}></div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: '35px', marginTop: '6px', fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>
            <span>{isMonthly ? 'Mon Aug 03 2026 00:00:00 GMT+0000 (Coordinated Universal Time)' : isQuarterly ? 'Mon Mar 16 2026 00:00:00 GMT+0000 (Coordinated Universal Time)' : '2026-03'}</span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Total Withdrawal (period) Card */}
      <div className="admin-card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--admin-text-heading)' }}>
          Total withdrawal (period)
        </h3>
        <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.3px', margin: '4px 0 2px 0', color: 'var(--admin-text-value)' }}>
          ₹{periodWithdrawalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
          Sum of all completed withdrawals between {dateRangeText.replace('Showing ', '')}
        </div>
      </div>

    </div>
  );
}
