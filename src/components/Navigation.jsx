import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Flame, Menu, X } from 'lucide-react';

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
  onPanicTrigger 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);

  const tabs = [
    { id: 'grid', label: 'Discovery Grid' },
    { id: 'chat', label: 'Messages' },
    { id: 'privacy', label: 'Settings' }
  ];

  const handlePanicClick = () => {
    setShowPanicConfirm(true);
  };

  const executePanic = () => {
    setShowPanicConfirm(false);
    onPanicTrigger();
  };

  return (
    <>
      <header className="aether-header">
        <div className="header-container">
          
          {/* Brand Logo Group */}
          <div className="brand-logo" onClick={() => { setCurrentTab('grid'); setMobileMenuOpen(false); }}>
            <div className="logo-icon">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="logo-title">
              AETHER
            </span>
            <span className="logo-badge">
              E2EE v1.0
            </span>
          </div>

          {/* Desktop Navigation Links */}
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

          {/* Quick Settings & Security Action Indicators */}
          <div className="header-controls">
            
            {/* Presence Broadcast Status */}
            <div className="status-badge-container">
              <span className={`status-indicator ${stealthMode ? 'status-offline' : 'status-online'}`} />
              <span className="status-badge-text">
                {stealthMode ? 'Offline' : 'Online'}
              </span>
            </div>

            {/* Stealth Invisibility Toggle */}
            <button
              onClick={() => setStealthMode(!stealthMode)}
              title={stealthMode ? "Disable Invisible Mode (Show on discovery grid)" : "Enable Invisible Mode (Hide from discovery grid)"}
              className={`icon-btn-ctrl ${
                stealthMode 
                  ? 'icon-btn-ctrl-active'
                  : 'icon-btn-ctrl-online'
              }`}
            >
              {stealthMode ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>

            {/* Red Alert Panic Wipe Button */}
            <button
              onClick={handlePanicClick}
              title="Panic: Trigger Account Erasure & Clear Cache"
              className="icon-btn-ctrl panic-trigger-btn"
            >
              <Flame className="h-4.5 w-4.5" />
            </button>

            {/* Mobile Menu Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="icon-btn-ctrl mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
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
              <span className={`metadata-badge ${
                stealthMode 
                  ? 'badge-warning' 
                  : 'badge-success'
              }`}>
                {stealthMode ? 'Hidden' : 'Active (Fuzzed)'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* --- Panic Action Warning Modal --- */}
      {showPanicConfirm && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div className="logo-icon" style={{ margin: '0 auto 1rem auto', width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                <Flame className="h-6 w-6" />
              </div>
              
              <h3 className="modal-title" style={{ marginBottom: '0.5rem' }}>
                Confirm Safety Wipe?
              </h3>
              
              <p className="modal-subtitle" style={{ fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1.5rem', textTransform: 'none' }}>
                This will instantly clear all local E2EE keys, photo caches, and message logs from this device. 
                Your profile will also be marked for permanent database deletion with a 30-day grace period.
              </p>
              
              <div className="modal-actions" style={{ flexDirection: 'column' }}>
                <button
                  onClick={executePanic}
                  className="btn btn-danger modal-btn"
                  style={{ width: '100%' }}
                >
                  Wipe Device & Hide Profile
                </button>
                <button
                  onClick={() => setShowPanicConfirm(false)}
                  className="btn btn-secondary modal-btn"
                  style={{ width: '100%', marginTop: '0.25rem' }}
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
