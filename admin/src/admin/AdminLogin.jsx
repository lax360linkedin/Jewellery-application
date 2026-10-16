import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { setAuthToken, setStoredUser } from '../utils/authStorage';
import authService from '../services/authService';

export default function AdminLogin({ onLoginSuccess }) {
  const { setAdminAuth } = useApp() || {};
  const [usernameOrMobile, setUsernameOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const u = usernameOrMobile.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('Please enter both Admin Mobile/Username and Password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({
        mobile: u,
        password: p,
      });

      if (!res || !res.access_token || !res.user) {
        throw new Error('Invalid login response from server.');
      }

      if (res.user.role !== 'admin') {
        throw new Error('Access denied. Administrator privileges required.');
      }

      setAuthToken(res.access_token, true);
      setStoredUser(res.user, true);

      if (typeof setAdminAuth === 'function') {
        setAdminAuth({
          isAuthenticated: true,
          user: res.user,
          token: res.access_token,
        });
      }

      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#151c3b',
      backgroundImage: 'radial-gradient(circle at 50% 30%, #1a2347 0%, #131936 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '390px',
        backgroundColor: '#35415f',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.32)',
        padding: '28px 26px 30px 26px',
        boxSizing: 'border-box',
        color: '#ffffff'
      }}>
        
        {/* Card Header Title */}
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.3px',
            textAlign: 'left'
          }}>
            Gold & Silver
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{
          textAlign: 'center',
          fontSize: '15px',
          fontWeight: '500',
          color: '#9aa5be',
          margin: '8px 0 20px 0'
        }}>
          Admin login
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '9px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fca5a5',
            fontSize: '12.5px',
            fontWeight: '600'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Mobile / Username Input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#d1d9e6',
              marginBottom: '6px'
            }}>
              Mobile / Username
            </label>
            <input
              type="text"
              placeholder="Mobile Number"
              value={usernameOrMobile}
              onChange={(e) => setUsernameOrMobile(e.target.value)}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '11px',
                border: '1px solid transparent',
                backgroundColor: '#e9eff8',
                padding: '0 15px',
                fontSize: '15px',
                fontWeight: '500',
                color: '#101828',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#f59e0b';
                e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'transparent';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password Input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#d1d9e6',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '11px',
                  border: '1px solid transparent',
                  backgroundColor: '#e9eff8',
                  padding: '0 42px 0 15px',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#101828',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f59e0b';
                  e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.25)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'transparent';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '11px',
              border: 'none',
              background: 'linear-gradient(180deg, #ffa000 0%, #d95a00 100%)',
              color: '#111827',
              fontSize: '16px',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              boxShadow: '0 4px 12px rgba(217, 90, 0, 0.3)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.filter = 'brightness(1.06)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  );
}
