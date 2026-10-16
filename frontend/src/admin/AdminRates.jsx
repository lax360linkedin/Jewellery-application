import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AdminRates() {
  const { 
    goldRate, 
    silverRate, 
    apiGoldRate = 14190.00,
    apiSilverRate = 267.00,
    isGoldCustom, 
    isSilverCustom, 
    customGoldInput, 
    customSilverInput, 
    saveRates 
  } = useApp() || {};

  const [goldCustom, setGoldCustom] = useState(Boolean(isGoldCustom));
  const [silverCustom, setSilverCustom] = useState(Boolean(isSilverCustom));
  const [goldInput, setGoldInput] = useState(customGoldInput || (goldRate ? goldRate.toString() : '14190.00'));
  const [silverInput, setSilverInput] = useState(customSilverInput || (silverRate ? silverRate.toString() : '267.00'));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const liveGoldRate = apiGoldRate || 14190.00;
  const liveSilverRate = apiSilverRate || 267.00;

  const handleToggleGold = () => {
    const nextCustom = !goldCustom;
    setGoldCustom(nextCustom);
    if (nextCustom && !goldInput) {
      setGoldInput(liveGoldRate.toString());
    }
  };

  const handleToggleSilver = () => {
    const nextCustom = !silverCustom;
    setSilverCustom(nextCustom);
    if (nextCustom && !silverInput) {
      setSilverInput(liveSilverRate.toString());
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const gVal = goldCustom ? (parseFloat(goldInput) || liveGoldRate) : liveGoldRate;
    const sVal = silverCustom ? (parseFloat(silverInput) || liveSilverRate) : liveSilverRate;

    if (typeof saveRates === 'function') {
      saveRates({
        newGoldRate: gVal,
        newSilverRate: sVal,
        goldCustom,
        silverCustom,
        goldInputVal: goldInput,
        silverInputVal: silverInput
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Rates</h1>
        <p className="admin-page-sub">
          Toggle between live API rates and custom overrides (₹/gram). In API mode, rates automatically update and are read-only.
        </p>
      </div>

      {/* 2. Rates Configuration Card */}
      <div className="admin-card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {/* Gold Rate Input Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                
                {/* Gold Indicator & Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    color: '#D4A017',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '16px',
                    boxShadow: '0 1px 3px rgba(212, 160, 23, 0.2)',
                    flexShrink: 0
                  }}>
                    $
                  </div>
                  <div>
                    <label className="admin-rate-gold-label" style={{ margin: 0, display: 'block' }}>
                      Gold (22K)
                    </label>
                    <span className="admin-rate-subtext">
                      Live API (Salem 22K): ₹{liveGoldRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/g
                    </span>
                  </div>
                </div>
                
                {/* API / Custom Toggle Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{
                    fontWeight: !goldCustom ? '700' : '500',
                    color: !goldCustom ? 'var(--admin-text-value)' : 'var(--admin-text-muted)'
                  }}>
                    API
                  </span>

                  <div
                    onClick={handleToggleGold}
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle custom gold rate"
                    style={{
                      width: '46px',
                      height: '26px',
                      backgroundColor: goldCustom ? '#10b981' : '#94a3b8',
                      borderRadius: '14px',
                      padding: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transform: goldCustom ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}></div>
                  </div>

                  <span style={{
                    fontWeight: goldCustom ? '700' : '500',
                    color: goldCustom ? 'var(--admin-text-value)' : 'var(--admin-text-muted)'
                  }}>
                    Custom
                  </span>
                </div>
              </div>

              {/* Gold Rate Input - ReadOnly in API Mode, Editable in Custom Mode */}
              <input
                type={goldCustom ? "number" : "text"}
                step={goldCustom ? "0.01" : undefined}
                disabled={!goldCustom}
                readOnly={!goldCustom}
                placeholder="e.g. 13850.00"
                value={goldCustom ? goldInput : `₹${liveGoldRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/g`}
                onChange={(e) => setGoldInput(e.target.value)}
                className="admin-input"
                style={{
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: !goldCustom ? 'not-allowed' : 'text',
                  opacity: !goldCustom ? 0.75 : 1,
                  backgroundColor: !goldCustom ? 'var(--admin-bg-card-subtle)' : undefined,
                  borderColor: !goldCustom ? 'var(--admin-border)' : undefined
                }}
              />
            </div>

            {/* Silver Rate Input Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                
                {/* Silver Indicator & Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '16px',
                    boxShadow: '0 1px 3px rgba(100, 116, 139, 0.2)',
                    flexShrink: 0
                  }}>
                    $
                  </div>
                  <div>
                    <label className="admin-rate-silver-label" style={{ margin: 0, display: 'block' }}>
                      Silver
                    </label>
                    <span className="admin-rate-subtext">
                      Live API: ₹{liveSilverRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/g
                    </span>
                  </div>
                </div>
                
                {/* API / Custom Toggle Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{
                    fontWeight: !silverCustom ? '700' : '500',
                    color: !silverCustom ? 'var(--admin-text-value)' : 'var(--admin-text-muted)'
                  }}>
                    API
                  </span>

                  <div
                    onClick={handleToggleSilver}
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle custom silver rate"
                    style={{
                      width: '46px',
                      height: '26px',
                      backgroundColor: silverCustom ? '#10b981' : '#94a3b8',
                      borderRadius: '14px',
                      padding: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transform: silverCustom ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}></div>
                  </div>

                  <span style={{
                    fontWeight: silverCustom ? '700' : '500',
                    color: silverCustom ? 'var(--admin-text-value)' : 'var(--admin-text-muted)'
                  }}>
                    Custom
                  </span>
                </div>
              </div>

              {/* Silver Rate Input - ReadOnly in API Mode, Editable in Custom Mode */}
              <input
                type={silverCustom ? "number" : "text"}
                step={silverCustom ? "0.01" : undefined}
                disabled={!silverCustom}
                readOnly={!silverCustom}
                placeholder="e.g. 210.00"
                value={silverCustom ? silverInput : `₹${liveSilverRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/g`}
                onChange={(e) => setSilverInput(e.target.value)}
                className="admin-input"
                style={{
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: !silverCustom ? 'not-allowed' : 'text',
                  opacity: !silverCustom ? 0.75 : 1,
                  backgroundColor: !silverCustom ? 'var(--admin-bg-card-subtle)' : undefined,
                  borderColor: !silverCustom ? 'var(--admin-border)' : undefined
                }}
              />
            </div>
          </div>

          {/* Save Button & Note */}
          <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button type="submit" className="admin-btn-orange" style={{ padding: '10px 24px', fontSize: '14.5px' }}>
                Save Rates
              </button>
              {savedSuccess && (
                <span style={{ fontSize: '13.5px', color: '#10b981', fontWeight: '700' }}>
                  ✓ Rates configuration saved & updated!
                </span>
              )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Custom rates remain active until today 11:59 PM, after which they will automatically revert to live API rates.
            </div>
          </div>

        </form>
      </div>

    </div>
  );
}
