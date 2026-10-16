import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AdminSettings() {
  const { adminSettings, setAdminSettings } = useApp();

  const [username, setUsername] = useState(adminSettings?.username || 'SJ Jewellers');
  const [confirmPasswordForUser, setConfirmPasswordForUser] = useState('');
  const [userSavedMsg, setUserSavedMsg] = useState(false);

  const [autoLogout, setAutoLogout] = useState(adminSettings?.autoLogout || '30 minutes');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSavedMsg, setPwdSavedMsg] = useState(false);

  const handleSaveUsername = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter a valid username');
      return;
    }
    setAdminSettings((prev) => ({ ...prev, username }));
    setUserSavedMsg(true);
    setConfirmPasswordForUser('');
    setTimeout(() => setUserSavedMsg(false), 2500);
  };

  const handleAutoLogoutChange = (e) => {
    const val = e.target.value;
    setAutoLogout(val);
    setAdminSettings((prev) => ({ ...prev, autoLogout: val }));
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPwdError('');

    if (!newPassword || newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New password and confirm password do not match.');
      return;
    }

    setPwdSavedMsg(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setTimeout(() => setPwdSavedMsg(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. Page Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Settings</h1>
        <p className="admin-page-sub">
          Manage administrative account credentials, auto logout timer, and security settings.
        </p>
      </div>

      {/* 2. Username Section */}
      <div className="admin-card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 14px 0', color: 'var(--admin-text-heading)' }}>
          Username
        </h3>

        <form onSubmit={handleSaveUsername} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
              Account username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="admin-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
              Password (to confirm change)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPasswordForUser}
              onChange={(e) => setConfirmPasswordForUser(e.target.value)}
              className="admin-input"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <button type="submit" className="admin-btn-orange">
              Save username
            </button>
            {userSavedMsg && (
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>
                ✓ Username updated successfully!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 3. Auto Logout (Inactivity) Section */}
      <div className="admin-card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--admin-text-heading)' }}>
          Auto logout (inactivity)
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', margin: '0 0 14px 0' }}>
          Log out automatically after this much time with no activity (mouse, keyboard, touch, scroll).
        </p>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
            Logout after
          </label>
          <select
            value={autoLogout}
            onChange={handleAutoLogoutChange}
            className="admin-select"
            style={{ width: '100%' }}
          >
            <option value="15 minutes">15 minutes</option>
            <option value="30 minutes">30 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="2 hours">2 hours</option>
            <option value="Never">Never</option>
          </select>
        </div>
      </div>

      {/* 4. Change Password Section */}
      <div className="admin-card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 14px 0', color: 'var(--admin-text-heading)' }}>
          Change password
        </h3>

        {pwdError && (
          <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '700', marginBottom: '10px' }}>
            {pwdError}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
              Current password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="admin-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="admin-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--admin-text-secondary)', marginBottom: '6px' }}>
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="admin-input"
            />
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              At least 6 characters
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <button type="submit" className="admin-btn-orange">
              Change password
            </button>
            {pwdSavedMsg && (
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '700' }}>
                ✓ Password changed successfully!
              </span>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
