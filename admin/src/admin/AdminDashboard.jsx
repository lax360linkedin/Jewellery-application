import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Clock, BarChart2, Calendar, Activity, 
  Users, CheckCircle, AlertCircle, FileText, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// Helper to parse transaction amounts safely
function parseTxnAmount(amt) {
  if (amt === undefined || amt === null) return 0;
  if (typeof amt === 'number') return isNaN(amt) ? 0 : amt;
  const cleaned = amt.toString().replace(/,/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Helper to parse dates in multiple formats safely
function parseTxnDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    const cleaned = dateStr.toString().split(',')[0].trim();
    const d2 = new Date(cleaned);
    if (!isNaN(d2.getTime())) return d2;

    const match = dateStr.toString().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d3 = new Date(y, m, day);
      if (!isNaN(d3.getTime())) return d3;
    }
  } catch (e) {
    return null;
  }

  return null;
}

// Helper for formatting Y-axis INR currency cleanly (e.g. ₹1.2M, ₹50K, ₹10K, ₹500, ₹0)
function formatYAxisINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  if (val >= 1000000) return `₹${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) {
    const kVal = val / 1000;
    return `₹${kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1)}K`;
  }
  if (val <= 0) return '₹0';
  return `₹${Math.round(val)}`;
}

// =========================================================================
// 1. Sales By Metal Bar Chart Component (Value & Transactions)
// =========================================================================
function MetalBarChartCard({
  title,
  type = 'value', // 'value' | 'transactions'
  goldRaw = 0,
  silverRaw = 0,
  goldColor = '#D4A017',
  silverColor = '#94a3b8',
}) {
  const gVal = typeof goldRaw === 'number' ? goldRaw : (parseFloat(goldRaw) || 0);
  const sVal = typeof silverRaw === 'number' ? silverRaw : (parseFloat(silverRaw) || 0);
  const total = gVal + sVal;

  const gPct = total > 0 ? (gVal / total) * 100 : 0;
  const sPct = total > 0 ? (sVal / total) * 100 : 0;

  let gDisplay = '₹0';
  let sDisplay = '₹0';

  if (type === 'value') {
    gDisplay = `₹${gVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    sDisplay = `₹${sVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    gDisplay = `${gVal} txn${gVal === 1 ? '' : 's'}`;
    sDisplay = `${sVal} txn${sVal === 1 ? '' : 's'}`;
  }

  return (
    <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', boxSizing: 'border-box' }}>
      
      {/* Card Header Title */}
      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--admin-text-heading)' }}>
        {title}
      </div>

      {/* 2-Row Vertical Stacked Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Row 1: Gold */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px' }}>
            <span style={{ fontWeight: '700', color: 'var(--admin-gold-text)' }}>Gold</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{gDisplay}</span>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', minWidth: '42px', textAlign: 'right' }}>
                ({total > 0 ? gPct.toFixed(1) : '0.0'}%)
              </span>
            </div>
          </div>
          
          {/* Progress Bar Container */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'var(--admin-bg-progress-track)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min(Math.max(gPct, 0), 100)}%`,
              height: '100%',
              backgroundColor: goldColor,
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Row 2: Silver */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px' }}>
            <span style={{ fontWeight: '700', color: 'var(--admin-silver-text)' }}>Silver</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', color: 'var(--admin-text-value)' }}>{sDisplay}</span>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', minWidth: '42px', textAlign: 'right' }}>
                ({total > 0 ? sPct.toFixed(1) : '0.0'}%)
              </span>
            </div>
          </div>
          
          {/* Progress Bar Container */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'var(--admin-bg-progress-track)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min(Math.max(sPct, 0), 100)}%`,
              height: '100%',
              backgroundColor: silverColor,
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

      </div>

    </div>
  );
}

// =========================================================================
// 2. High-Resolution Stock Market Smooth Line Chart Component
// =========================================================================
function StockMarketLineGraph({
  title,
  subtitle,
  icon,
  data = [],
  maxVal = 100000,
  lineColor = '#252525',
  isDaily = false
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const width = 900;
  const height = 240;
  const paddingLeft = 10;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 45;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const safeMax = maxVal > 0 ? maxVal : 10000;
  const count = data.length;

  const yTicks = [
    safeMax,
    Math.round(safeMax * 0.75),
    Math.round(safeMax * 0.5),
    Math.round(safeMax * 0.25),
    0
  ];

  const points = useMemo(() => {
    if (count === 0) return [];
    if (count === 1) {
      const y = paddingTop + plotHeight - ((data[0].totalValue || 0) / safeMax) * plotHeight;
      return [{ x: paddingLeft + plotWidth / 2, y, ...data[0] }];
    }
    return data.map((d, i) => {
      const x = paddingLeft + (i / (count - 1)) * plotWidth;
      const val = d.totalValue || 0;
      const y = paddingTop + plotHeight - (val / safeMax) * plotHeight;
      return { x, y: isNaN(y) ? paddingTop + plotHeight : y, ...d };
    });
  }, [data, count, plotWidth, plotHeight, safeMax, paddingLeft, paddingTop]);

  let pathString = '';
  if (points.length > 0) {
    pathString = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      pathString += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="admin-card" style={{ textAlign: 'left', overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--admin-text-heading)' }}>
            {title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
          <TrendingUp size={14} />
          <span>Market Trend</span>
        </div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '16px' }}>
        {subtitle}
      </div>

      {/* Chart Drawing Container */}
      <div style={{
        height: '260px',
        position: 'relative',
        display: 'flex',
        paddingLeft: '64px',
        paddingRight: '20px',
        boxSizing: 'border-box'
      }}>
        {/* Y-axis Labels on Left */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: `${paddingTop}px`,
          height: `${plotHeight}px`,
          width: '58px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: '600',
          color: 'var(--admin-text-muted)',
          userSelect: 'none',
          textAlign: 'right',
          paddingRight: '6px',
          boxSizing: 'border-box'
        }}>
          {yTicks.map((t, idx) => (
            <span key={idx} style={{ lineHeight: 1 }}>{formatYAxisINR(t)}</span>
          ))}
        </div>

        {/* SVG Drawing Canvas */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Grid Horizontal Lines */}
            {yTicks.map((t, idx) => {
              const y = paddingTop + (idx / 4) * plotHeight;
              return (
                <line
                  key={idx}
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="var(--admin-chart-grid)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Gradient Fill under Path */}
            <defs>
              <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {points.length > 1 && (
              <path
                d={`${pathString} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`}
                fill={`url(#grad-${title.replace(/\s+/g, '')})`}
              />
            )}

            {/* Main Trend Line */}
            {points.length > 0 && (
              <path
                d={pathString}
                fill="none"
                stroke="var(--admin-chart-line)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6.5 : (count > 20 ? 2.5 : 4)}
                    fill={isHovered ? '#10b981' : 'var(--admin-chart-line)'}
                    stroke="var(--admin-bg-card)"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
                  />
                  {/* Invisible broad hitbox for easy touch/mouse targeting */}
                  <rect
                    x={p.x - (plotWidth / (count * 2 || 1))}
                    y={0}
                    width={Math.max(plotWidth / (count || 1), 16)}
                    height={height}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Hover Tooltip */}
          {activePoint && (
            <div style={{
              position: 'absolute',
              left: `${(activePoint.x / width) * 100}%`,
              top: `${Math.max((activePoint.y / height) * 100 - 32, 0)}%`,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'var(--admin-tooltip-bg)',
              color: 'var(--admin-tooltip-text)',
              padding: '7px 11px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: '600',
              pointerEvents: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
              whiteSpace: 'nowrap',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              border: '1px solid var(--admin-border-subtle)'
            }}>
              <span style={{ fontWeight: '700', color: '#10b981' }}>{activePoint.fullLabel || activePoint.label}</span>
              <span>Total: ₹{Math.round(activePoint.totalValue || 0).toLocaleString('en-IN')}</span>
              {activePoint.count !== undefined && (
                <span style={{ fontSize: '11px', opacity: 0.85 }}>Transactions: {activePoint.count}</span>
              )}
            </div>
          )}

          {/* X-axis Labels at Bottom */}
          <div style={{
            position: 'absolute',
            left: `${paddingLeft}px`,
            right: `${paddingRight}px`,
            bottom: 0,
            height: `${paddingBottom - 10}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--admin-text-muted)',
            userSelect: 'none'
          }}>
            {points.map((p, idx) => {
              let showLabel = true;
              if (isDaily) {
                showLabel = idx % 5 === 0 || idx === points.length - 1;
              }
              if (!showLabel) return <div key={idx} style={{ width: '1px' }} />;
              return (
                <span
                  key={idx}
                  style={{
                    textAlign: 'center',
                    color: hoveredIndex === idx ? 'var(--admin-text-heading)' : 'var(--admin-text-muted)',
                    fontWeight: hoveredIndex === idx ? '800' : '600'
                  }}
                >
                  {p.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. Main Admin Dashboard Component
// =========================================================================
export default function AdminDashboard({ onSelectTab }) {
  const appContext = useApp() || {};
  const {
    goldRate: rawGoldRate,
    silverRate: rawSilverRate,
    transactions: rawTransactions,
    dashboardOverview,
    salesByMetal: rawSalesByMetal,
    pendingVerifications = [],
    withdrawals: rawWithdrawals = [],
    refreshAllData,
  } = appContext;

  // Refresh live backend data on load
  useEffect(() => {
    if (typeof refreshAllData === 'function') {
      refreshAllData();
    }
  }, [refreshAllData]);

  // Real backend metrics resolution
  const goldRate = typeof rawGoldRate === 'number' && !isNaN(rawGoldRate) 
    ? rawGoldRate 
    : (parseFloat(rawGoldRate) || 14190.00);
  const silverRate = typeof rawSilverRate === 'number' && !isNaN(rawSilverRate) 
    ? rawSilverRate 
    : (parseFloat(rawSilverRate) || 267.00);

  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const withdrawalsList = Array.isArray(rawWithdrawals) ? rawWithdrawals : [];

  // 1. Reference date calculation from actual records
  const referenceDate = useMemo(() => {
    let latest = new Date();
    transactions.forEach((t) => {
      if (!t?.date && !t?.createdAt) return;
      const d = parseTxnDate(t.date || t.createdAt);
      if (d && !isNaN(d.getTime()) && d.getTime() > latest.getTime()) {
        latest = d;
      }
    });
    return !isNaN(latest.getTime()) ? latest : new Date();
  }, [transactions]);

  // 2. Completed Sales Aggregation (Excluding withdrawals and cancelled records)
  const salesMetrics = useMemo(() => {
    let gGrams = 0;
    let sGrams = 0;
    let gVal = 0;
    let sVal = 0;
    let gCount = 0;
    let sCount = 0;

    transactions.forEach((t) => {
      // Exclude withdrawals or debit transactions from sales calculations
      if (t?.type === 'withdrawal' || t?.direction === 'debit') return;
      if (t?.rawStatus && t.rawStatus !== 'completed' && t.rawStatus !== 'success') return;
      if (t?.status === 'Rejected' || t?.status === 'Failed' || t?.status === 'Cancelled') return;

      const amt = parseTxnAmount(t?.amount);
      const grams = parseFloat(t?.grams) || parseFloat(t?.quantity_grams) || 0;
      const isGold = (t?.asset || t?.assetType || t?.metal || '').toLowerCase().includes('gold');

      if (isGold) {
        gVal += amt;
        gGrams += grams;
        gCount += 1;
      } else {
        sVal += amt;
        sGrams += grams;
        sCount += 1;
      }
    });

    // Merge with backend overview if available
    const backendGoldGrams = dashboardOverview?.gold?.total_sold_grams;
    const backendSilverGrams = dashboardOverview?.silver?.total_sold_grams;
    const backendGoldVal = dashboardOverview?.gold?.total_sales_value;
    const backendSilverVal = dashboardOverview?.silver?.total_sales_value;
    const backendGoldTxns = dashboardOverview?.gold?.total_transactions;
    const backendSilverTxns = dashboardOverview?.silver?.total_transactions;

    return {
      goldGrams: backendGoldGrams !== undefined ? backendGoldGrams : gGrams,
      silverGrams: backendSilverGrams !== undefined ? backendSilverGrams : sGrams,
      goldValue: backendGoldVal !== undefined ? backendGoldVal : (rawSalesByMetal?.gold?.value ?? gVal),
      silverValue: backendSilverVal !== undefined ? backendSilverVal : (rawSalesByMetal?.silver?.value ?? sVal),
      goldTxnCount: backendGoldTxns !== undefined ? backendGoldTxns : (rawSalesByMetal?.gold?.transactions ?? gCount),
      silverTxnCount: backendSilverTxns !== undefined ? backendSilverTxns : (rawSalesByMetal?.silver?.transactions ?? sCount),
      totalTxns: (backendGoldTxns !== undefined && backendSilverTxns !== undefined) 
        ? (backendGoldTxns + backendSilverTxns) 
        : (gCount + sCount),
    };
  }, [transactions, dashboardOverview, rawSalesByMetal]);

  // 3. Pending counts & withdrawal statistics
  const pendingKycCount = dashboardOverview?.kyc?.pending ?? (pendingVerifications || []).length;
  const pendingWdCount = dashboardOverview?.withdrawals?.pending ?? withdrawalsList.filter((w) => w?.status === 'Pending').length;
  const approvedWdCount = dashboardOverview?.withdrawals?.approved ?? withdrawalsList.filter((w) => w?.status === 'Success' || w?.status === 'Approved').length;
  const totalWdValue = dashboardOverview?.withdrawals?.total_withdrawn_value ?? withdrawalsList.filter((w) => w?.status === 'Success' || w?.status === 'Approved').reduce((sum, w) => sum + (parseFloat(w?.amount) || 0), 0);
  const totalWdGoldGrams = dashboardOverview?.withdrawals?.total_withdrawn_gold_grams ?? withdrawalsList.filter((w) => (w?.metal || '').toLowerCase() === 'gold' && (w?.status === 'Success' || w?.status === 'Approved')).reduce((sum, w) => sum + (parseFloat(w?.grams) || 0), 0);

  // 4. Annual Transactions Aggregation (Last 5 Years)
  const annualChartData = useMemo(() => {
    const currentYear = referenceDate.getFullYear();
    const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

    const map = {};
    years.forEach((y) => {
      map[y] = {
        key: y.toString(),
        label: y.toString(),
        fullLabel: `Year ${y}`,
        totalValue: 0,
        goldValue: 0,
        silverValue: 0,
        count: 0,
      };
    });

    transactions.forEach((t) => {
      if (t?.type === 'withdrawal' || t?.direction === 'debit') return;
      if (t?.rawStatus && t.rawStatus !== 'completed' && t.rawStatus !== 'success') return;
      if (t?.status === 'Rejected' || t?.status === 'Failed' || t?.status === 'Cancelled') return;

      const dateVal = t?.date || t?.createdAt;
      if (!dateVal) return;
      const d = parseTxnDate(dateVal);
      if (!d) return;
      const y = d.getFullYear();
      if (map[y]) {
        const amt = parseTxnAmount(t.amount);
        const isGold = (t.asset || t.assetType || t.metal || '').toLowerCase().includes('gold');
        map[y].totalValue += amt;
        map[y].count += 1;
        if (isGold) map[y].goldValue += amt;
        else map[y].silverValue += amt;
      }
    });

    const items = years.map((y) => map[y]);
    let max = Math.max(...items.map((i) => i.totalValue), 0);
    if (max === 0 || isNaN(max)) max = 100000;
    else max = Math.ceil(max / 50000) * 50000;

    return { items, maxVal: max };
  }, [transactions, referenceDate]);

  // 5. Monthly Transactions Aggregation (Last 12 Months)
  const monthlyChartData = useMemo(() => {
    const months = [];
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(refYear, refMonth - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const fullLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({
        key,
        label: shortLabel,
        fullLabel,
        totalValue: 0,
        goldValue: 0,
        silverValue: 0,
        count: 0,
      });
    }

    const map = {};
    months.forEach((m) => { map[m.key] = m; });

    transactions.forEach((t) => {
      if (t?.type === 'withdrawal' || t?.direction === 'debit') return;
      if (t?.rawStatus && t.rawStatus !== 'completed' && t.rawStatus !== 'success') return;
      if (t?.status === 'Rejected' || t?.status === 'Failed' || t?.status === 'Cancelled') return;

      const dateVal = t?.date || t?.createdAt;
      if (!dateVal) return;
      const d = parseTxnDate(dateVal);
      if (!d) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      if (map[key]) {
        const amt = parseTxnAmount(t.amount);
        const isGold = (t.asset || t.assetType || t.metal || '').toLowerCase().includes('gold');
        map[key].totalValue += amt;
        map[key].count += 1;
        if (isGold) map[key].goldValue += amt;
        else map[key].silverValue += amt;
      }
    });

    let max = Math.max(...months.map((i) => i.totalValue), 0);
    if (max === 0 || isNaN(max)) max = 50000;
    else max = Math.ceil(max / 10000) * 10000;

    return { items: months, maxVal: max };
  }, [transactions, referenceDate]);

  // 6. Daily Transactions Aggregation (Last 30 Days)
  const dailyChartData = useMemo(() => {
    const days = [];
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();
    const refDay = referenceDate.getDate();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(refYear, refMonth, refDay - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const fullLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      days.push({
        key,
        label: shortLabel,
        fullLabel,
        totalValue: 0,
        goldValue: 0,
        silverValue: 0,
        count: 0,
      });
    }

    const map = {};
    days.forEach((d) => { map[d.key] = d; });

    transactions.forEach((t) => {
      if (t?.type === 'withdrawal' || t?.direction === 'debit') return;
      if (t?.rawStatus && t.rawStatus !== 'completed' && t.rawStatus !== 'success') return;
      if (t?.status === 'Rejected' || t?.status === 'Failed' || t?.status === 'Cancelled') return;

      const dateVal = t?.date || t?.createdAt;
      if (!dateVal) return;
      const d = parseTxnDate(dateVal);
      if (!d) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      if (map[key]) {
        const amt = parseTxnAmount(t.amount);
        const isGold = (t.asset || t.assetType || t.metal || '').toLowerCase().includes('gold');
        map[key].totalValue += amt;
        map[key].count += 1;
        if (isGold) map[key].goldValue += amt;
        else map[key].silverValue += amt;
      }
    });

    let max = Math.max(...days.map((i) => i.totalValue), 0);
    if (max === 0 || isNaN(max)) max = 20000;
    else max = Math.ceil(max / 5000) * 5000;

    return { items: days, maxVal: max };
  }, [transactions, referenceDate]);

  const now = new Date();
  const updatedTimestamp = `${now.toLocaleDateString('en-US')}, ${now.toLocaleTimeString('en-US')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title" style={{ fontWeight: '800' }}>Dashboard</h1>
        <p className="admin-page-sub">
          Live metal rates, transaction analytics, and account verification notifications
        </p>
      </div>

      {/* 2. Top Live Rates Cards (Gold & Silver) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Gold (22K) Rate Card */}
        <div className="admin-dashboard-rate-card-gold" style={{
          padding: '16px 22px',
          borderLeft: '5px solid #D4A017',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          borderRadius: '12px',
          boxSizing: 'border-box',
          minHeight: '64px',
          flexWrap: 'nowrap',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#D4A017',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13.5px',
              flexShrink: 0
            }}>
              ₹
            </div>
            <span style={{
              fontSize: '17px',
              fontWeight: '800',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              color: 'var(--admin-gold-text)',
              lineHeight: '1'
            }}>
              Gold (22K)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{
              fontSize: '24px',
              fontWeight: '800',
              margin: 0,
              whiteSpace: 'nowrap',
              lineHeight: '1',
              color: 'var(--admin-text-value)',
              letterSpacing: '-0.4px'
            }}>
              ₹{goldRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <TrendingUp size={17} color="var(--admin-green-trend)" style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Silver Rate Card */}
        <div className="admin-dashboard-rate-card-silver" style={{
          padding: '16px 22px',
          borderLeft: '5px solid #94a3b8',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          borderRadius: '12px',
          boxSizing: 'border-box',
          minHeight: '64px',
          flexWrap: 'nowrap',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13.5px',
              flexShrink: 0
            }}>
              ₹
            </div>
            <span style={{
              fontSize: '17px',
              fontWeight: '800',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              color: 'var(--admin-silver-text)',
              lineHeight: '1'
            }}>
              Silver
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{
              fontSize: '24px',
              fontWeight: '800',
              margin: 0,
              whiteSpace: 'nowrap',
              lineHeight: '1',
              color: 'var(--admin-text-value)',
              letterSpacing: '-0.4px'
            }}>
              ₹{silverRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <TrendingUp size={17} color="var(--admin-green-trend)" style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* 3. Real Business Statistics Cards Grid (Sold Metals, Total Txns, Pending KYC & Withdrawals) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Total Gold Sold */}
        <div className="admin-card" style={{ padding: '16px 18px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>Total Gold Sold</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#D4A017', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
              Au
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--admin-text-heading)', letterSpacing: '-0.3px' }}>
            {salesMetrics.goldGrams.toFixed(4)} <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>grams</span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
            ₹{salesMetrics.goldValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} sales
          </div>
        </div>

        {/* Total Silver Sold */}
        <div className="admin-card" style={{ padding: '16px 18px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>Total Silver Sold</span>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
              Ag
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--admin-text-heading)', letterSpacing: '-0.3px' }}>
            {salesMetrics.silverGrams.toFixed(4)} <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>grams</span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
            ₹{salesMetrics.silverValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} sales
          </div>
        </div>

        {/* Total Transactions */}
        <div className="admin-card" style={{ padding: '16px 18px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>Total Transactions</span>
            <FileText size={16} color="var(--admin-blue-badge)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--admin-text-heading)', letterSpacing: '-0.3px' }}>
            {salesMetrics.totalTxns} <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>purchases</span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
            {salesMetrics.goldTxnCount} Gold · {salesMetrics.silverTxnCount} Silver
          </div>
        </div>

        {/* Pending KYC Count */}
        <div 
          className="admin-card" 
          onClick={() => typeof onSelectTab === 'function' && onSelectTab('notifications')}
          style={{ 
            padding: '16px 18px', 
            textAlign: 'left', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>Pending KYC</span>
            <Users size={16} color={pendingKycCount > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: pendingKycCount > 0 ? '#ef4444' : 'var(--admin-text-heading)', letterSpacing: '-0.3px' }}>
            {pendingKycCount} <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>pending</span>
          </div>
          <div style={{ fontSize: '12px', color: pendingKycCount > 0 ? '#ef4444' : 'var(--admin-text-muted)', fontWeight: '700' }}>
            {pendingKycCount > 0 ? 'Review verifications →' : '✓ All verified'}
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div 
          className="admin-card" 
          onClick={() => typeof onSelectTab === 'function' && onSelectTab('withdrawal')}
          style={{ 
            padding: '16px 18px', 
            textAlign: 'left', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>Pending Withdrawals</span>
            <Clock size={16} color={pendingWdCount > 0 ? '#ea580c' : '#10b981'} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: pendingWdCount > 0 ? '#ea580c' : 'var(--admin-text-heading)', letterSpacing: '-0.3px' }}>
            {pendingWdCount} <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>requests</span>
          </div>
          <div style={{ fontSize: '12px', color: pendingWdCount > 0 ? '#ea580c' : 'var(--admin-text-muted)', fontWeight: '700' }}>
            {pendingWdCount > 0 ? 'Review withdrawals →' : '✓ Up to date'}
          </div>
        </div>

        {/* Withdrawal Statistics Summary */}
        <div 
          className="admin-card" 
          onClick={() => typeof onSelectTab === 'function' && onSelectTab('withdrawal')}
          style={{ 
            padding: '16px 18px', 
            textAlign: 'left', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>Withdrawal Stats</span>
            <CheckCircle size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--admin-text-heading)', letterSpacing: '-0.3px' }}>
            ₹{totalWdValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
            {approvedWdCount} Approved ({totalWdGoldGrams.toFixed(4)}g Au)
          </div>
        </div>
      </div>

      {/* 4. Sales By Metal Bar Charts (Separate Value & Transactions Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* Sales by metal (value) */}
        <MetalBarChartCard
          title="Sales by Metal (Value)"
          type="value"
          goldRaw={salesMetrics.goldValue}
          silverRaw={salesMetrics.silverValue}
          goldColor="#D4A017"
          silverColor="#94a3b8"
        />

        {/* Sales by metal (transactions) */}
        <MetalBarChartCard
          title="Sales by Metal (Transactions)"
          type="transactions"
          goldRaw={salesMetrics.goldTxnCount}
          silverRaw={salesMetrics.silverTxnCount}
          goldColor="#D4A017"
          silverColor="#94a3b8"
        />
      </div>

      {/* 5. Annual Transactions (Last 5 Years - Line Graph) */}
      <StockMarketLineGraph
        title="Annual Transactions (Last 5 Years)"
        subtitle="Annual transaction value trend (INR) across 5 years"
        icon={<Activity size={16} color="var(--admin-text-muted)" />}
        data={annualChartData.items}
        maxVal={annualChartData.maxVal}
        lineColor="#252525"
        isDaily={false}
      />

      {/* 6. Monthly Transactions (Last 12 Months - Line Graph) */}
      <StockMarketLineGraph
        title="Monthly Transactions (Last 12 Months)"
        subtitle="Monthly transaction value trend (INR) across 12 months"
        icon={<Calendar size={16} color="var(--admin-text-muted)" />}
        data={monthlyChartData.items}
        maxVal={monthlyChartData.maxVal}
        lineColor="#252525"
        isDaily={false}
      />

      {/* 7. Daily Transactions (Last 30 Days - Line Graph) */}
      <StockMarketLineGraph
        title="Daily Transactions (Last 30 Days)"
        subtitle="Daily transaction volume & revenue trend (INR) for past 30 days"
        icon={<BarChart2 size={16} color="var(--admin-text-muted)" />}
        data={dailyChartData.items}
        maxVal={dailyChartData.maxVal}
        lineColor="#252525"
        isDaily={true}
      />

      {/* 8. Footer Rates Updated Timestamp */}
      <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px', textAlign: 'left' }}>
        Rates updated: {updatedTimestamp}
      </div>

    </div>
  );
}
