import React, { useState, useMemo } from 'react';
import { TrendingUp, Clock, BarChart2, Calendar, Activity } from 'lucide-react';
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
  silverColor = '#94a3b8'
}) {
  const [hoveredBar, setHoveredBar] = useState(null);

  const total = goldRaw + silverRaw;
  const goldPct = total > 0 ? (goldRaw / total) * 100 : 50;
  const silverPct = total > 0 ? (silverRaw / total) * 100 : 50;

  const maxVal = Math.max(goldRaw, silverRaw, 1);
  const goldBarPct = (goldRaw / maxVal) * 100;
  const silverBarPct = (silverRaw / maxVal) * 100;

  let subtext = '';
  if (type === 'value') {
    if (goldRaw >= silverRaw) {
      subtext = `Gold leads by value with ₹${goldRaw.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${goldPct.toFixed(1)}%)`;
    } else {
      subtext = `Silver leads by value with ₹${silverRaw.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${silverPct.toFixed(1)}%)`;
    }
  } else {
    if (goldRaw >= silverRaw) {
      subtext = `Gold has more volume with ${goldRaw} orders (${goldPct.toFixed(1)}%)`;
    } else {
      subtext = `Silver has more volume with ${silverRaw} orders (${silverPct.toFixed(1)}%)`;
    }
  }

  return (
    <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '260px', boxSizing: 'border-box', position: 'relative' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--admin-text-muted)" />
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--admin-text-heading)' }}>
            {title}
          </span>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--admin-text-muted)' }}>
          Total: {type === 'value' ? `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : `${total} orders`}
        </span>
      </div>

      {/* Bar Chart Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, justifyContent: 'center' }}>
        
        {/* Gold Bar Row */}
        <div 
          onMouseEnter={() => setHoveredBar('gold')}
          onMouseLeave={() => setHoveredBar(null)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: goldColor }}></span>
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--admin-gold-text)' }}>Gold</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--admin-text-value)' }}>
                {type === 'value' ? `₹${goldRaw.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${goldRaw} orders`}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--admin-text-muted)' }}>
                ({goldPct.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Bar track */}
          <div style={{ width: '100%', height: '14px', backgroundColor: 'var(--admin-border-subtle)', borderRadius: '7px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${goldBarPct}%`, 
                height: '100%', 
                backgroundColor: goldColor, 
                borderRadius: '7px',
                transition: 'width 0.4s ease',
                boxShadow: hoveredBar === 'gold' ? '0 0 10px rgba(212, 160, 23, 0.5)' : 'none'
              }} 
            />
          </div>
        </div>

        {/* Silver Bar Row */}
        <div 
          onMouseEnter={() => setHoveredBar('silver')}
          onMouseLeave={() => setHoveredBar(null)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: silverColor }}></span>
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--admin-silver-text)' }}>Silver</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--admin-text-value)' }}>
                {type === 'value' ? `₹${silverRaw.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${silverRaw} orders`}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--admin-text-muted)' }}>
                ({silverPct.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Bar track */}
          <div style={{ width: '100%', height: '14px', backgroundColor: 'var(--admin-border-subtle)', borderRadius: '7px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${silverBarPct}%`, 
                height: '100%', 
                backgroundColor: silverColor, 
                borderRadius: '7px',
                transition: 'width 0.4s ease',
                boxShadow: hoveredBar === 'silver' ? '0 0 10px rgba(148, 163, 184, 0.5)' : 'none'
              }} 
            />
          </div>
        </div>

      </div>

      {/* Subtext */}
      <div style={{ textAlign: 'left', fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--admin-border-subtle)' }}>
        {subtext}
      </div>
    </div>
  );
}

// =========================================================================
// 2. Stock-Market-Style Financial Trend Line Graph Component
// =========================================================================
function StockMarketLineGraph({
  title,
  subtitle,
  icon,
  data = [],
  maxVal = 1000,
  lineColor = '#4f46e5',
  isDaily = false
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const safeData = Array.isArray(data) ? data : [];
  const count = safeData.length;
  const safeMax = typeof maxVal === 'number' && !isNaN(maxVal) && maxVal > 0 ? maxVal : 1000;

  const yTicks = [
    safeMax,
    safeMax * 0.75,
    safeMax * 0.5,
    safeMax * 0.25,
    0
  ];

  // SVG Coordinate calculations with adequate right padding to keep Aug 27 cleanly inside
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 16;
  const paddingRight = 24;
  const paddingTop = 15;
  const paddingBottom = 20;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate (x, y) coordinates for each data point
  const points = safeData.map((item, idx) => {
    const x = count > 1 ? paddingLeft + (idx / (count - 1)) * plotWidth : paddingLeft + plotWidth / 2;
    const normalizedY = safeMax > 0 ? (item.totalValue / safeMax) : 0;
    const y = paddingTop + plotHeight - (normalizedY * plotHeight);
    return { ...item, x, y, idx };
  });

  // Generate smooth cubic bezier spline path
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
        <div style={{ flex: 1, height: '100%', position: 'relative', width: '100%', overflow: 'visible' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}
            preserveAspectRatio="none"
          >
            {/* Horizontal Dashed Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = paddingTop + plotHeight * (1 - pct);
              return (
                <line
                  key={idx}
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--admin-border-subtle)"
                  strokeWidth="1"
                  strokeDasharray={pct === 0 ? 'none' : '4 4'}
                />
              );
            })}

            {/* Financial Trend Continuous Line (No black/shaded area underneath) */}
            {pathString && (
              <path
                d={pathString}
                fill="none"
                stroke={lineColor}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover Vertical Crosshair */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={paddingTop + plotHeight}
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.85"
              />
            )}

            {/* Data Nodes */}
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <g key={idx}>
                  {/* Hit target for hovering */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Visible Data Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? '6' : (isDaily ? '3' : '4.5')}
                    fill={isHovered ? '#ffffff' : lineColor}
                    stroke={lineColor}
                    strokeWidth={isHovered ? '3' : '1.5'}
                    style={{ pointerEvents: 'none', transition: 'all 0.15s ease' }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip Card */}
          {activePoint && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: `${Math.min(Math.max((activePoint.x / svgWidth) * 100, 14), 86)}%`,
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--admin-bg-card)',
              color: 'var(--admin-text-main)',
              border: '1px solid var(--admin-border)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              zIndex: 20,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '800', color: 'var(--admin-text-value)', marginBottom: '2px' }}>
                {activePoint.fullLabel || activePoint.label}
              </div>
              <div style={{ color: '#4f46e5', fontWeight: '800', fontSize: '13px' }}>
                ₹{activePoint.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '4px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <span style={{ color: 'var(--admin-gold-text)', fontWeight: '700' }}>
                  Gold: ₹{(activePoint.goldValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span style={{ color: 'var(--admin-silver-text)', fontWeight: '700' }}>
                  Silver: ₹{(activePoint.silverValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                Total Orders: {activePoint.count || 0}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* X-axis Labels Aligned Directly with Data Point Coordinates */}
      <div style={{
        position: 'relative',
        height: '22px',
        marginLeft: '64px',
        marginRight: '20px',
        marginTop: '8px',
        fontSize: '11.5px',
        color: 'var(--admin-text-muted)',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}>
        {points.map((p, idx) => {
          let isVisible = true;
          if (isDaily) {
            isVisible = idx === 0 || idx === 5 || idx === 10 || idx === 15 || idx === 20 || idx === 25 || idx === points.length - 1;
          }
          if (!isVisible) return null;

          const isFirst = idx === 0;
          const isLast = idx === points.length - 1;

          return (
            <div
              key={p.key || idx}
              className="admin-chart-xaxis-label"
              style={{
                position: 'absolute',
                left: `${(p.x / svgWidth) * 100}%`,
                transform: isFirst ? 'translateX(0%)' : (isLast ? 'translateX(-100%)' : 'translateX(-50%)'),
                textAlign: isFirst ? 'left' : (isLast ? 'right' : 'center'),
                whiteSpace: 'nowrap'
              }}
            >
              {p.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// Main Admin Dashboard
// =========================================================================
export default function AdminDashboard({ onSelectTab }) {
  const appContext = useApp();
  const rawGoldRate = appContext?.goldRate;
  const rawSilverRate = appContext?.silverRate;
  const rawTransactions = appContext?.transactions;

  const goldRate = typeof rawGoldRate === 'number' && !isNaN(rawGoldRate) ? rawGoldRate : (parseFloat(rawGoldRate) || 14190.00);
  const silverRate = typeof rawSilverRate === 'number' && !isNaN(rawSilverRate) ? rawSilverRate : (parseFloat(rawSilverRate) || 267.00);
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

  // Reference date: latest transaction date or current system date
  const referenceDate = useMemo(() => {
    let latest = new Date();
    transactions.forEach((t) => {
      if (!t?.date) return;
      const d = parseTxnDate(t.date);
      if (d && !isNaN(d.getTime()) && d.getTime() > latest.getTime()) {
        latest = d;
      }
    });
    return !isNaN(latest.getTime()) ? latest : new Date();
  }, [transactions]);

  // Dynamic Sales by Metal calculations from actual transactions
  const { 
    goldValue, 
    silverValue, 
    goldTxnCount, 
    silverTxnCount
  } = useMemo(() => {
    let gVal = 0;
    let sVal = 0;
    let gCount = 0;
    let sCount = 0;

    transactions.forEach((t) => {
      const amt = parseTxnAmount(t?.amount);
      const isGold = (t?.asset || t?.assetType || t?.metal || '').toLowerCase().includes('gold');
      if (isGold) {
        gVal += amt;
        gCount += 1;
      } else {
        sVal += amt;
        sCount += 1;
      }
    });

    return {
      goldValue: gVal,
      silverValue: sVal,
      goldTxnCount: gCount,
      silverTxnCount: sCount
    };
  }, [transactions]);

  // 1. Annual Transactions Aggregation (Last 5 Years: 2022 to 2026)
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
        goldCount: 0,
        silverCount: 0
      };
    });

    transactions.forEach((t) => {
      if (!t?.date) return;
      const d = parseTxnDate(t.date);
      if (!d) return;
      const y = d.getFullYear();
      if (map[y]) {
        const amt = parseTxnAmount(t.amount);
        const isGold = (t.asset || t.assetType || t.metal || '').toLowerCase().includes('gold');
        map[y].totalValue += amt;
        map[y].count += 1;
        if (isGold) {
          map[y].goldValue += amt;
          map[y].goldCount += 1;
        } else {
          map[y].silverValue += amt;
          map[y].silverCount += 1;
        }
      }
    });

    const items = years.map((y) => map[y]);
    let max = Math.max(...items.map((i) => i.totalValue), 0);
    if (max === 0 || isNaN(max)) max = 100000;
    else max = Math.ceil(max / 50000) * 50000;

    return { items, maxVal: max };
  }, [transactions, referenceDate]);

  // 2. Monthly Transactions Aggregation (Last 12 Months)
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
        goldCount: 0,
        silverCount: 0
      });
    }

    const map = {};
    months.forEach((m) => { map[m.key] = m; });

    transactions.forEach((t) => {
      if (!t?.date) return;
      const d = parseTxnDate(t.date);
      if (!d) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      if (map[key]) {
        const amt = parseTxnAmount(t.amount);
        const isGold = (t.asset || t.assetType || t.metal || '').toLowerCase().includes('gold');
        map[key].totalValue += amt;
        map[key].count += 1;
        if (isGold) {
          map[key].goldValue += amt;
          map[key].goldCount += 1;
        } else {
          map[key].silverValue += amt;
          map[key].silverCount += 1;
        }
      }
    });

    let max = Math.max(...months.map((i) => i.totalValue), 0);
    if (max === 0 || isNaN(max)) max = 50000;
    else max = Math.ceil(max / 10000) * 10000;

    return { items: months, maxVal: max };
  }, [transactions, referenceDate]);

  // 3. Daily Transactions Aggregation (Last 30 Days)
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
        goldCount: 0,
        silverCount: 0
      });
    }

    const map = {};
    days.forEach((d) => { map[d.key] = d; });

    transactions.forEach((t) => {
      if (!t?.date) return;
      const d = parseTxnDate(t.date);
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
        if (isGold) {
          map[key].goldValue += amt;
          map[key].goldCount += 1;
        } else {
          map[key].silverValue += amt;
          map[key].silverCount += 1;
        }
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
      
      {/* 1. Page Header (Left-aligned, Bold matching Dashboard) */}
      <div className="admin-page-header">
        <h1 className="admin-page-title" style={{ fontWeight: '800' }}>Dashboard</h1>
        <p className="admin-page-sub">
          Live metal rates, transaction analytics, and account verification notifications
        </p>
      </div>

      {/* 2. Top Two Rate Cards (Side by Side, Increased Size & Typography, Single Horizontal Line) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Gold (22K) Card */}
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

        {/* Silver Card */}
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

      {/* 3. Sales By Metal Bar Charts (Separate Value & Transactions Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* Sales by metal (value) */}
        <MetalBarChartCard
          title="Sales by Metal (Value)"
          type="value"
          goldRaw={goldValue}
          silverRaw={silverValue}
          goldColor="#D4A017"
          silverColor="#94a3b8"
        />

        {/* Sales by metal (transactions) */}
        <MetalBarChartCard
          title="Sales by Metal (Transactions)"
          type="transactions"
          goldRaw={goldTxnCount}
          silverRaw={silverTxnCount}
          goldColor="#D4A017"
          silverColor="#94a3b8"
        />
      </div>

      {/* 4. Annual Transactions (Last 5 Years - Stock Market Line Graph) */}
      <StockMarketLineGraph
        title="Annual Transactions (Last 5 Years)"
        subtitle="Annual transaction value trend (INR) across 5 years"
        icon={<Activity size={16} color="var(--admin-text-muted)" />}
        data={annualChartData.items}
        maxVal={annualChartData.maxVal}
        lineColor="#4f46e5"
        areaColor="#6366f1"
        isDaily={false}
      />

      {/* 5. Monthly Transactions (Last 12 Months - Stock Market Line Graph) */}
      <StockMarketLineGraph
        title="Monthly Transactions (Last 12 Months)"
        subtitle="Monthly transaction value trend (INR) across 12 months"
        icon={<Calendar size={16} color="var(--admin-text-muted)" />}
        data={monthlyChartData.items}
        maxVal={monthlyChartData.maxVal}
        lineColor="#2563eb"
        areaColor="#3b82f6"
        isDaily={false}
      />

      {/* 6. Daily Transactions (Last 30 Days - Stock Market Line Graph) */}
      <StockMarketLineGraph
        title="Daily Transactions (Last 30 Days)"
        subtitle="Daily transaction volume & revenue trend (INR) for past 30 days"
        icon={<BarChart2 size={16} color="var(--admin-text-muted)" />}
        data={dailyChartData.items}
        maxVal={dailyChartData.maxVal}
        lineColor="#059669"
        areaColor="#10b981"
        isDaily={true}
      />

      {/* 7. Footer Rates Updated Timestamp */}
      <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px', textAlign: 'left' }}>
        Rates updated: {updatedTimestamp}
      </div>

    </div>
  );
}

