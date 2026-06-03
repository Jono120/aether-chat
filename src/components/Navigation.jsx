import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Flame, Menu, X, LogOut } from 'lucide-react';
import { MSG } from '../utils/userMessages';
import useFocusTrap from '../hooks/useFocusTrap';

/**
 * Navigation Component
 *
 * Uses semantic CSS classes mapped directly to index.css:
 * - aether-header / header-container
 * - brand-logo / logo-icon / logo-title
 * - nav-tabs / nav-tab-btn / nav-tab-btn-active
 * - header-controls / status-badge-container
 * - panic-trigger-btn
 * - mobile-drawer
 * - modal-backdrop / modal-content
 */
export default function Navigation({
  currentTab,
  setCurrentTab,
  stealthMode,
  setStealthMode,
  onPanicTrigger,
  onLogout,
  userLabel,
  sessionIsAdmin = false,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const panicModalRef = useFocusTrap(showPanicConfirm);

  const tabs = [
    { id: 'grid', label: 'Discovery Grid' },
    { id: 'chat', label: 'Messages' },
    { id: 'profile', label: 'Profile' },
    { id: 'privacy', label: 'Settings' },
  ];

  useEffect(() => {
    if (!showPanicConfirm) return undefined;

    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowPanicConfirm(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showPanicConfirm]);

  const executePanic = () => {
    setShowPanicConfirm(false);
    onPanicTrigger();
  };

  return (
    <>
      <header className="aether-header">
        <div className="header-container">
          <div className="brand-logo" onClick={() => { setCurrentTab('grid'); setMobileMenuOpen(false); }}>
            <div className="logo-icon">
              <Shield className="icon-md icon-white" />
            </div>
            <span className="logo-title">AETHER</span>
            <span className="logo-badge"></span>
          </div>

          {/* Navigation Tabs */}
          <nav className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`nav-tab-btn ${currentTab === tab.id ? 'nav-tab-btn-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="header-controls">
            {userLabel && (
              <span className="header-user-label" title={userLabel}>
                {userLabel}
                {sessionIsAdmin && (
                  <span className="metadata-badge badge-warning badge-sm header-admin-badge">
                    {MSG.authAdminBadge}
                  </span>
                )}
              </span>
            )}

            <div className="status-badge-container">
              <span className={`status-indicator ${stealthMode ? 'status-offline' : 'status-online'}`} />
              <span className="status-badge-text">
                {stealthMode ? 'Offline' : 'Online'}
              </span>
            </div>

            {/* Stealth Mode Button */}
            <button
              onClick={() => setStealthMode(!stealthMode)}
              title={stealthMode ? 'Offline Mode' : 'Online Mode'}
              className={`icon-btn-ctrl ${
                stealthMode ? 'icon-btn-ctrl-active' : 'icon-btn-ctrl-online'
              }`}
            >
              {stealthMode ? <EyeOff className="icon-md" /> : <Eye className="icon-md" />}
            </button>

            {/* Panic Mode Button */}
            <button
              onClick={() => setShowPanicConfirm(true)}
              title="Panic Mode: Account Deletion"
              className="icon-btn-ctrl panic-trigger-btn"
            >
              <Flame className="icon-md" />
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title={MSG.authLogout}
                className="icon-btn-ctrl"
              >
                <LogOut className="icon-md" />
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="icon-btn-ctrl mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`mobile-drawer-btn ${currentTab === tab.id ? 'mobile-drawer-btn-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
            <div className="mobile-drawer-status">
              <span className="status-badge-text">Grid Presence:</span>
              <span className={`metadata-badge ${stealthMode ? 'badge-warning' : 'badge-success'}`}>
                {stealthMode ? MSG.navHidden : MSG.navVisibleNearby}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Panic Mode Modal */}
      {showPanicConfirm && (
        <div className="modal-backdrop" onClick={() => setShowPanicConfirm(false)}>
          <div
            ref={panicModalRef}
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panic-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body modal-body--centered">
              <div className="modal-icon-wrap">
                <Flame className="icon-lg" />
              </div>

              <h3 id="panic-modal-title" className="modal-title modal-title--spaced">
                Confirm Panic Mode?
              </h3>

              <p className="modal-subtitle modal-subtitle--body">
                This will instantly clear all local app information from this device.
                Your account will also be marked for permanent deletion.
              </p>

              <div className="modal-actions modal-actions--stacked">
                <button
                  onClick={executePanic}
                  className="btn btn-danger modal-btn"
                >
                  Confirm Panic Mode
                </button>
                <button
                  onClick={() => setShowPanicConfirm(false)}
                  className="btn btn-secondary modal-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
