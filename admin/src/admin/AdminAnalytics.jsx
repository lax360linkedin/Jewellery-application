import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import adminService from '../services/adminService';

// Helper to determine current quarter
function getCurrentQuarterInfo() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  let q = 'Q1 (Jan-Mar)';
  if (month >= 3 && month <= 5) q = 'Q2 (Apr-Jun)';
  else if (month >= 6 && month <= 8) q = 'Q3 (Jul-Sep)';
  else if (month >= 9 && month <= 11) q = 'Q4 (Oct-Dec)';
  return {
    quarter: q,
    year: now.getFullYear().toString(),
  };
}

// Helper to get default month dates
function getDefaultDateRange() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return {
    fromDate: `${yyyy}-${mm}-01`,
    toDate: `${yyyy}-${mm}-${dd}`,
  };
}

export default function AdminAnalytics() {
  const appContext = useApp() || {};
  const { 
    goldRate: liveGoldRate, 
    silverRate: liveSilverRate, 
    transactions = [], 
    withdrawals = [],
    refreshAllData 
  } = appContext;

  const currentQInfo = useMemo(() => getCurrentQuarterInfo(), []);
  const defaultDates = useMemo(() => getDefaultDateRange(), []);

  const [period, setPeriod] = useState('Monthly (current month)');
  const [quarter, setQuarter] = useState(currentQInfo.quarter);
  const [year, setYear] = useState(currentQInfo.year);
  const [fromDate, setFromDate] = useState(defaultDates.fromDate);
  const [toDate, setToDate] = useState(defaultDates.toDate);
  
  const [hoveredGoldBar, setHoveredGoldBar] = useState(null);
  const [hoveredSilverBar, setHoveredSilverBar] = useState(null);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real backend analytics data whenever filters change
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAnalytics({
        period,
        quarter,
        year,
        from_date: fromDate,
        to_date: toDate,
      });
      if (data && typeof data === 'object') {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.warn('[Admin Analytics] Backend analytics fetch note:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [period, quarter, year, fromDate, toDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Client-side fallback computation for date range text
  const fallbackDateRangeText = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    if (period === 'Monthly (current month)') {
      return `Showing ${yyyy}-${mm}-01 to ${yyyy}-${mm}-${dd}`;
    }
    if (period === 'Annually (current year)') {
      return `Showing ${yyyy}-01-01 to ${yyyy}-${mm}-${dd}`;
    }
    if (period === 'Quarterly') {
      const q = (quarter || '').toUpperCase();
      if (q.includes('Q1')) return `Showing ${year}-01-01 to ${year}-03-31`;
      if (q.includes('Q2')) return `Showing ${year}-04-01 to ${year}-06-30`;
      if (q.includes('Q3')) return `Showing ${year}-07-01 to ${year}-09-30`;
      return `Showing ${year}-10-01 to ${year}-12-31`;
    }
    return `Showing ${fromDate} to ${toDate}`;
  }, [period, quarter, year, fromDate, toDate]);

  const dateRangeText = analyticsData?.date_range_text || fallbackDateRangeText;

  // Safe live rates
  const safeGoldRate = Number(analyticsData?.overall?.gold_rate) || Number(liveGoldRate) || 14190.00;
  const safeSilverRate = Number(analyticsData?.overall?.silver_rate) || Number(liveSilverRate) || 267.00;

  // Overall holdings calculations from database
  const totalGoldBought = analyticsData?.overall?.total_gold_bought !== undefined 
    ? Number(analyticsData.overall.total_gold_bought) || 0
    : transactions
        .filter(t => (t?.metal || t?.asset || '').toLowerCase().includes('gold') && (t?.status === 'Success' || t?.rawStatus === 'completed'))
        .reduce((sum, t) => sum + (parseFloat(t.grams) || 0), 0);

  const totalSilverBought = analyticsData?.overall?.total_silver_bought !== undefined 
    ? Number(analyticsData.overall.total_silver_bought) || 0
    : transactions
        .filter(t => (t?.metal || t?.asset || '').toLowerCase().includes('silver') && (t?.status === 'Success' || t?.rawStatus === 'completed'))
        .reduce((sum, t) => sum + (parseFloat(t.grams) || 0), 0);

  const totalGoldCurrentValue = totalGoldBought * safeGoldRate;
  const totalSilverCurrentValue = totalSilverBought * safeSilverRate;

  // Period specific metrics
  const goldPeriodGrams = analyticsData?.gold?.grams !== undefined ? Number(analyticsData.gold.grams) || 0 : 0;
  const goldPeriodValue = analyticsData?.gold?.value !== undefined ? Number(analyticsData.gold.value) || 0 : 0;
  const goldPeriodAvgRate = analyticsData?.gold?.avg_rate !== undefined 
    ? Number(analyticsData.gold.avg_rate) || 0 
    : (goldPeriodGrams > 0 ? goldPeriodValue / goldPeriodGrams : 0);
  const goldBars = Array.isArray(analyticsData?.gold?.bars) ? analyticsData.gold.bars : [];

  const silverPeriodGrams = analyticsData?.silver?.grams !== undefined ? Number(analyticsData.silver.grams) || 0 : 0;
  const silverPeriodValue = analyticsData?.silver?.value !== undefined ? Number(analyticsData.silver.value) || 0 : 0;
  const silverPeriodAvgRate = analyticsData?.silver?.avg_rate !== undefined 
    ? Number(analyticsData.silver.avg_rate) || 0 
    : (silverPeriodGrams > 0 ? silverPeriodValue / silverPeriodGrams : 0);
  const silverBars = Array.isArray(analyticsData?.silver?.bars) ? analyticsData.silver.bars : [];

  const periodWithdrawalValue = analyticsData?.withdrawals?.total_value !== undefined 
    ? Number(analyticsData.withdrawals.total_value) || 0 
    : 0;

  // Compute maximums for bar chart Y axes
  const maxGoldGrams = useMemo(() => {
    if (!goldBars || goldBars.length === 0) return 1;
    const max = Math.max(...goldBars.map((b) => Number(b.grams) || 0), 0);
    return max > 0 ? (max <= 1 ? 1 : Math.ceil(max)) : 1;
  }, [goldBars]);

  const maxSilverGrams = useMemo(() => {
    if (!silverBars || silverBars.length === 0) return 1;
    const max = Math.max(...silverBars.map((b) => Number(b.grams) || 0), 0);
    return max > 0 ? (max <= 1 ? 1 : Math.ceil(max)) : 1;
  }, [silverBars]);

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
                    <option value="2024">2024</option>
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
              <>Total: 0.000 g<br />Value: ₹0.00</>
            )}
          </div>

          <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '8px', color: 'var(--admin-text-secondary)' }}>
            Gold (total grams by period)
          </div>

          {goldPeriodGrams === 0 || goldBars.length === 0 ? (
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
                  <span>{maxGoldGrams}</span>
                  <span>{(maxGoldGrams * 0.8).toFixed(1)}</span>
                  <span>{(maxGoldGrams * 0.6).toFixed(1)}</span>
                  <span>{(maxGoldGrams * 0.4).toFixed(1)}</span>
                  <span>{(maxGoldGrams * 0.2).toFixed(1)}</span>
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
                  {goldBars.map((bar, idx) => {
                    const barGrams = Number(bar.grams) || 0;
                    const heightPct = maxGoldGrams > 0 ? Math.min((barGrams / maxGoldGrams) * 100, 100) : 0;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredGoldBar(bar)}
                        onMouseLeave={() => setHoveredGoldBar(null)}
                        style={{
                          width: `${Math.min(Math.max(80 / goldBars.length, 12), 45)}%`,
                          height: `${Math.max(heightPct, 6)}%`,
                          backgroundColor: 'var(--admin-gold-pie)',
                          borderRadius: '3px 3px 0 0',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s ease'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Tooltip */}
              {hoveredGoldBar && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  zIndex: 10,
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ color: 'var(--admin-text-secondary)' }}>{hoveredGoldBar.full_date || hoveredGoldBar.date}</div>
                  <div style={{ fontWeight: '700', color: 'var(--admin-gold-pie)' }}>Gold: {hoveredGoldBar.grams} g (₹{(Number(hoveredGoldBar.value) || 0).toLocaleString('en-IN')})</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-around', paddingLeft: '35px', marginTop: '6px', fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>
                {goldBars.map((bar, idx) => (
                  <span key={idx}>{bar.date}</span>
                ))}
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
            {silverPeriodGrams > 0 ? (
              <>Total: {silverPeriodGrams.toFixed(3)} g · Avg rate ₹{silverPeriodAvgRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/gm<br />Value: ₹{silverPeriodValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
            ) : (
              <>Total: 0.000 g<br />Value: ₹0.00</>
            )}
          </div>

          <div style={{ fontSize: '12.5px', fontWeight: '600', marginBottom: '8px', color: 'var(--admin-text-secondary)' }}>
            Silver (total grams by period)
          </div>

          {silverPeriodGrams === 0 || silverBars.length === 0 ? (
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
              No silver data in this period
            </div>
          ) : (
            /* Silver Bar Chart */
            <div style={{ position: 'relative' }}>
              <div style={{ height: '140px', position: 'relative', display: 'flex', alignItems: 'flex-end', paddingLeft: '35px', borderBottom: '1px solid var(--admin-border)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--admin-text-muted)' }}>
                  <span>{maxSilverGrams}</span>
                  <span>{(maxSilverGrams * 0.8).toFixed(1)}</span>
                  <span>{(maxSilverGrams * 0.6).toFixed(1)}</span>
                  <span>{(maxSilverGrams * 0.4).toFixed(1)}</span>
                  <span>{(maxSilverGrams * 0.2).toFixed(1)}</span>
                  <span>0</span>
                </div>

                <div style={{ position: 'absolute', left: '35px', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px dashed var(--admin-border-subtle)', width: '100%' }}></div>
                  <div style={{ borderTop: '1px solid var(--admin-border)', width: '100%' }}></div>
                </div>

                {/* Bars */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', height: '100%', alignItems: 'flex-end', zIndex: 1 }}>
                  {silverBars.map((bar, idx) => {
                    const barGrams = Number(bar.grams) || 0;
                    const heightPct = maxSilverGrams > 0 ? Math.min((barGrams / maxSilverGrams) * 100, 100) : 0;
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredSilverBar(bar)}
                        onMouseLeave={() => setHoveredSilverBar(null)}
                        style={{
                          width: `${Math.min(Math.max(80 / silverBars.length, 12), 45)}%`,
                          height: `${Math.max(heightPct, 6)}%`,
                          backgroundColor: 'var(--admin-silver-pie)',
                          borderRadius: '3px 3px 0 0',
                          cursor: 'pointer',
                          transition: 'opacity 0.15s ease'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Tooltip */}
              {hoveredSilverBar && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'var(--admin-bg-card)',
                  border: '1px solid var(--admin-border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  zIndex: 10,
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ color: 'var(--admin-text-secondary)' }}>{hoveredSilverBar.full_date || hoveredSilverBar.date}</div>
                  <div style={{ fontWeight: '700', color: 'var(--admin-silver-pie)' }}>Silver: {hoveredSilverBar.grams} g (₹{(Number(hoveredSilverBar.value) || 0).toLocaleString('en-IN')})</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-around', paddingLeft: '35px', marginTop: '6px', fontSize: '10.5px', color: 'var(--admin-text-muted)' }}>
                {silverBars.map((bar, idx) => (
                  <span key={idx}>{bar.date}</span>
                ))}
              </div>
            </div>
          )}
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
