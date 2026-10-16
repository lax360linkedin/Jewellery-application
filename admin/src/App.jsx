import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';

// Admin Web Portal Components
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import AdminNotifications from './admin/AdminNotifications';
import AdminRates from './admin/AdminRates';
import AdminMembers from './admin/AdminMembers';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminWithdrawal from './admin/AdminWithdrawal';
import AdminSettings from './admin/AdminSettings';

import './styles/admin.css';

// Helper to extract the active admin tab from URL
function getAdminTabFromUrl() {
  const hash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  const full = `${path} ${hash}`;
  if (full.includes('notifications')) return 'notifications';
  if (full.includes('rates')) return 'rates';
  if (full.includes('members')) return 'members';
  if (full.includes('analytics')) return 'analytics';
  if (full.includes('withdrawal')) return 'withdrawal';
  if (full.includes('settings')) return 'settings';
  return 'dashboard';
}

function AdminMainContent() {
  const { adminAuth = { isAuthenticated: true } } = useApp() || {};
  const [adminTab, setAdminTab] = useState(() => getAdminTabFromUrl());

  useEffect(() => {
    const handleUrlChange = () => {
      setAdminTab(getAdminTabFromUrl());
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleAdminTabSelect = (tab) => {
    setAdminTab(tab);
    window.location.hash = tab;
  };

  // If not authenticated, show Admin Login screen
  if (!adminAuth || !adminAuth.isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={(targetTab = 'dashboard') => {
          setAdminTab(targetTab);
          window.location.hash = targetTab;
        }}
        onSuccess={(targetTab = 'dashboard') => {
          setAdminTab(targetTab);
          window.location.hash = targetTab;
        }}
      />
    );
  }

  return (
    <AdminLayout activeTab={adminTab} onSelectTab={handleAdminTabSelect}>
      {adminTab === 'dashboard' && <AdminDashboard onSelectTab={handleAdminTabSelect} />}
      {adminTab === 'notifications' && <AdminNotifications />}
      {adminTab === 'rates' && <AdminRates />}
      {adminTab === 'members' && <AdminMembers />}
      {adminTab === 'analytics' && <AdminAnalytics />}
      {adminTab === 'withdrawal' && <AdminWithdrawal />}
      {adminTab === 'settings' && <AdminSettings />}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AdminMainContent />
    </AppProvider>
  );
}
