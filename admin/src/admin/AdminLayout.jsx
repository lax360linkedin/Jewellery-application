import React, { useState } from 'react';
import { 
  Home, Bell, DollarSign, Users, BarChart2, 
  FileText, Settings, LogOut, ChevronDown, 
  Moon, Sun, User, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { clearAllAuth } from '../utils/authStorage';
import '../styles/admin.css';

export default function AdminLayout({ activeTab, onSelectTab, children }) {
  const { 
    adminTheme = 'light', 
    toggleAdminTheme, 
    pendingVerifications = [], 
    withdrawals = [],
    logoutAdmin,
    setAdminAuth,
    adminSettings = { username: 'SJ Jewellers' } 
  } = useApp() || {};

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const pendingWithdrawalsCount = (withdrawals || []).filter((w) => w?.status === 'Pending').length;
  const pendingVerificationsCount = (pendingVerifications || []).length;
  const totalNotifications = pendingWithdrawalsCount + pendingVerificationsCount;

  const handleLogout = () => {
    if (typeof logoutAdmin === 'function') {
      logoutAdmin();
    } else {
      clearAllAuth();
      if (typeof setAdminAuth === 'function') {
        setAdminAuth({ isAuthenticated: false, user: null, token: null });
      }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={15} /> },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={15} />
          {totalNotifications > 0 && (
            <span style={{
              position: 'absolute',
              top: '-1px',
              right: '-1px',
              width: '5px',
              height: '5px',
              backgroundColor: '#ef4444',
              borderRadius: '50%'
            }}></span>
          )}
        </div>
      ), 
      badge: totalNotifications 
    },
    { id: 'rates', label: 'Rates', icon: <DollarSign size={15} /> },
    { id: 'members', label: 'Members', icon: <Users size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
    { id: 'withdrawal', label: 'Withdrawal', icon: <FileText size={15} /> }
  ];

  return (
    <div className={`admin-portal ${adminTheme}`}>
      
      {/* 1. Compact Left Sidebar (185px Fixed Width) */}
      <aside className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* Logo Section */}
        <div className="admin-sidebar-header" onClick={() => onSelectTab('dashboard')}>
          <div className="admin-sidebar-logo-icon">
            $
          </div>
          {!isSidebarCollapsed && (
            <>
              <div className="admin-sidebar-brand">
                <div className="admin-sidebar-brand-title">Gold & Silver</div>
                <div className="admin-sidebar-brand-sub">Admin</div>
              </div>
              <ChevronDown size={13} color="#9ca3af" />
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="admin-nav-list">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <div className="admin-nav-item-left">
                    <span className="admin-nav-icon">{item.icon}</span>
                    {!isSidebarCollapsed && <span className="admin-nav-text">{item.label}</span>}
                  </div>

                  {!isSidebarCollapsed && item.badge > 0 && (
                    <span className="admin-nav-badge">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Account Section Container (Moved downward closer to Hide) */}
          <div style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderTop: '1px solid var(--admin-border-light)',
            paddingTop: '14px'
          }}>
            {/* Account Section Heading */}
            {!isSidebarCollapsed && (
              <div className="admin-section-heading" style={{ padding: '0 14px 6px 14px' }}>
                ACCOUNT
              </div>
            )}

            <button
              onClick={() => onSelectTab('settings')}
              className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              title={isSidebarCollapsed ? 'Settings' : undefined}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon"><Settings size={15} /></span>
                {!isSidebarCollapsed && <span className="admin-nav-text">Settings</span>}
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="admin-nav-item"
              title={isSidebarCollapsed ? 'Log out' : undefined}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon"><LogOut size={15} /></span>
                {!isSidebarCollapsed && <span className="admin-nav-text">Log out</span>}
              </div>
            </button>
          </div>

          {/* Hide Sidebar Button (Remains at bottom with divider) */}
          <div style={{
            borderTop: '1px solid var(--admin-border-light)',
            paddingTop: '6px',
            marginTop: '4px',
            marginBottom: '4px'
          }}>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="admin-nav-item"
              title={isSidebarCollapsed ? 'Show' : 'Hide'}
            >
              <div className="admin-nav-item-left">
                <span className="admin-nav-icon">
                  {isSidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
                </span>
                {!isSidebarCollapsed && <span className="admin-nav-text" style={{ fontSize: '12px' }}>« Hide</span>}
              </div>
            </button>
          </div>
        </nav>
      </aside>

      {/* 2. Main Content View */}
      <div className="admin-main">
        
        {/* Top Header Bar */}
        <header className="admin-header">
          <div className="admin-header-title">
            Gold & Silver Admin
          </div>

          <div className="admin-header-actions">
            {/* Notification Bell */}
            <button 
              className="admin-header-btn" 
              onClick={() => onSelectTab('notifications')}
              title="Notifications"
            >
              <Bell size={15} />
              {totalNotifications > 0 && <span className="admin-header-badge-dot"></span>}
            </button>

            {/* Dark/Light Mode Toggle */}
            <button 
              className="admin-header-btn" 
              onClick={toggleAdminTheme}
              title={adminTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {adminTheme === 'light' ? <Moon size={15} /> : <Sun size={15} color="#f59e0b" />}
            </button>

            {/* User Profile */}
            <button 
              className="admin-header-btn" 
              onClick={() => onSelectTab('settings')}
              title={`Logged in as ${adminSettings?.username || 'Admin'}`}
            >
              <User size={15} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="admin-page-container">
          {children}
        </main>
      </div>

    </div>
  );
}
