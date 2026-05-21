import React, { useState, useEffect } from 'react';
import { 
  Shield, Eye, EyeOff, Trash2, ShieldAlert, ShieldCheck, 
  Lock, RotateCcw, Key, HelpCircle, HardDriveDownload 
} from 'lucide-react';

/**
 * PrivacyCenter Component
 * 
 * Uses custom semantic classes defined in index.css:
 * - privacy-grid / privacy-card / privacy-card-header / privacy-card-title
 * - settings-row / settings-row-label / settings-row-desc
 * - strategy-list / strategy-option / strategy-option-active
 * - key-ring-box / key-ring-pre / key-fingerprint-row
 * - countdown-alert / countdown-timer-box / countdown-timer-val
 * - form-toggle / form-toggle-slider
 */
export default function PrivacyCenter({ 
  stealthMode, 
  setStealthMode, 
  onPanicTrigger, 
  currentUser, 
  generateNewKeys,
  albumScreenshotShield,
  setAlbumScreenshotShield,
}) {
  const [fuzzingStrategy, setFuzzingStrategy] = useState('grid_snap');
  const [pinLockEnabled, setPinLockEnabled] = useState(false);

  // Deletion grace states
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionTimer, setDeletionTimer] = useState(null);

  useEffect(() => {
    const deletionTimestamp = localStorage.getItem('aether_deletion_scheduled');
    if (deletionTimestamp) {
      setIsDeleting(true);
      calculateTimeRemaining(deletionTimestamp);
    }
  }, []);

  useEffect(() => {
    let interval = null;
    if (isDeleting) {
      interval = setInterval(() => {
        const scheduledTime = localStorage.getItem('aether_deletion_scheduled');
        if (scheduledTime) {
          calculateTimeRemaining(scheduledTime);
        } else {
          setIsDeleting(false);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDeleting]);

  const calculateTimeRemaining = (targetTimeStr) => {
    const target = new Date(targetTimeStr);
    const diff = target - new Date();
    
    if (diff <= 0) {
      setDeletionTimer("EXPIRED - ACCOUNT PURGED");
      onPanicTrigger();
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setDeletionTimer(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }
  };

  const requestAccountDeletion = () => {
    setStealthMode(true);
    
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);
    
    localStorage.setItem('aether_deletion_scheduled', scheduledDate.toISOString());
    setIsDeleting(true);
    calculateTimeRemaining(scheduledDate.toISOString());
  };

  const cancelAccountDeletion = () => {
    localStorage.removeItem('aether_deletion_scheduled');
    setIsDeleting(false);
    setDeletionTimer(null);
    setStealthMode(false);
  };

  const handleDeviceWipe = () => {
    if (window.confirm("This will erase E2EE key rings, text cache, and media from this browser. Continue?")) {
      onPanicTrigger();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Title Header */}
      <div className="grid-section-header">
        <div>
          <h2 className="grid-section-title">Privacy Control Center</h2>
          <p className="grid-section-desc">
            Manage your cryptographic profiles, server-side visibility, and deletion policies.
          </p>
        </div>
      </div>

      {/* Account Deletion Active Alert Countdown */}
      {isDeleting && (
        <div className="countdown-alert">
          <div className="countdown-header">
            <div className="logo-icon" style={{ flexShrink: 0, width: '2.25rem', height: '2.25rem', borderRadius: '6px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="countdown-title">Account Marked for Deletion</h4>
              <p className="countdown-desc">
                Your profile is completely hidden from other users. All location broadcasting and message handshakes are disabled. All data will be purged permanently from the server databases when the grace period expires.
              </p>
            </div>
          </div>

          <div className="countdown-timer-box">
            <div className="countdown-timer-wrap">
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: '700' }}>Time Before Purge</span>
              <span className="countdown-timer-val">{deletionTimer}</span>
            </div>
            
            <button
              onClick={cancelAccountDeletion}
              className="btn"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.7rem' }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore Account
            </button>
          </div>
        </div>
      )}

      {/* Core Privacy Grid Settings Panel */}
      <div className="privacy-grid">
        
        {/* Card 1: Location & Grid Visibility */}
        <div className="privacy-card">
          <div className="privacy-card-header">
            <Eye className="h-4.5 w-4.5" style={{ color: 'var(--color-violet)' }} />
            <h3 className="privacy-card-title">Discovery & Location</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="settings-row">
              <div>
                <h4 className="settings-row-label">Broadcast on Discovery Grid</h4>
                <p className="settings-row-desc">
                  Toggle grid visibility. Turning off makes you completely invisible to nearby matches.
                </p>
              </div>
              <label className="form-toggle">
                <input 
                  type="checkbox" 
                  checked={!stealthMode} 
                  onChange={() => setStealthMode(!stealthMode)} 
                  disabled={isDeleting}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>

            {/* Fuzzing Policy selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Backend Distance Fuzzing Profile
              </span>
              
              <div className="strategy-list">
                {[
                  { id: 'grid_snap', label: 'Grid Snapping (1km square snap)', desc: 'Aligns coordinates to grid squares to prevent trilateration.' },
                  { id: 'jitter', label: 'Gaussian Jitter (random 500m offset)', desc: 'Adds random offsets server-side to mask precise readings.' },
                  { id: 'distance_only', label: 'Broad Distance Bands Only', desc: 'Hides metrics, displaying broad bands ("Nearby", "Within 5km").' }
                ].map((strategy) => (
                  <div
                    key={strategy.id}
                    onClick={() => !isDeleting && setFuzzingStrategy(strategy.id)}
                    className={`strategy-option ${fuzzingStrategy === strategy.id ? 'strategy-option-active' : ''}`}
                  >
                    <input
                      type="radio"
                      checked={fuzzingStrategy === strategy.id}
                      onChange={() => {}} // Controlled via onClick on div
                      style={{ marginTop: '0.15rem', accentColor: 'var(--color-violet)' }}
                      disabled={isDeleting}
                    />
                    <div>
                      <h5 className="strategy-option-title">{strategy.label}</h5>
                      <p className="strategy-option-desc">{strategy.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: E2EE Cryptographic Keyring */}
        <div className="privacy-card">
          <div className="privacy-card-header">
            <Key className="h-4.5 w-4.5" style={{ color: 'var(--color-cyan)' }} />
            <h3 className="privacy-card-title">Cryptographic Key Ring</h3>
          </div>

          <div className="key-ring-box">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span className="key-ring-label">Active Public Key (DH-X25519)</span>
              <pre className="key-ring-pre">{currentUser.keys.publicKey}</pre>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div className="key-ring-label-row">
                <span className="key-ring-label">Local Private Key</span>
                <span className="metadata-badge badge-warning" style={{ fontSize: '0.55rem' }}>NEVER SHARED</span>
              </div>
              <pre className="key-ring-pre key-ring-pre-private">
                {currentUser.keys.privateKey.substring(0, 24)}**************************
              </pre>
            </div>

            <div className="key-fingerprint-row">
              <div>
                <span className="key-ring-label" style={{ fontSize: '0.6rem' }}>Identity Key Fingerprint</span>
                <span className="key-fingerprint-val">{currentUser.keys.fingerprint}</span>
              </div>
              <button
                onClick={generateNewKeys}
                disabled={isDeleting}
                className="btn btn-secondary"
                style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
              >
                Rotate Keys
              </button>
            </div>

            <div className="warning-banner" style={{ background: 'rgba(6,182,212,0.03)', borderColor: 'rgba(6,182,212,0.1)', padding: '0.5rem', marginBottom: 0 }}>
              <p className="warning-banner-text" style={{ fontSize: '0.6rem' }}>
                Key pairs are generated locally in your browser. The server coordinates handshakes but cannot read message contents.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: App Locks & Screen Protection */}
        <div className="privacy-card">
          <div className="privacy-card-header">
            <Lock className="h-4.5 w-4.5" style={{ color: 'var(--color-emerald)' }} />
            <h3 className="privacy-card-title">App & Screen Security</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="settings-row" style={{ marginBottom: '0.5rem' }}>
              <div>
                <h4 className="settings-row-label">App Access PIN Lock</h4>
                <p className="settings-row-desc">
                  Requires inputting a security PIN whenever Aether wakes from background sleep.
                </p>
              </div>
              <label className="form-toggle">
                <input 
                  type="checkbox" 
                  checked={pinLockEnabled} 
                  onChange={() => setPinLockEnabled(!pinLockEnabled)} 
                  disabled={isDeleting}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>

            <div className="settings-row" style={{ marginBottom: 0 }}>
              <div>
                <h4 className="settings-row-label">Private Album Screen Shield</h4>
                <p className="settings-row-desc">
                  Automatically blur private ephemeral albums when the browser loses active focus.
                </p>
              </div>
              <label className="form-toggle">
                <input 
                  type="checkbox" 
                  checked={albumScreenshotShield} 
                  onChange={() => setAlbumScreenshotShield(!albumScreenshotShield)} 
                  disabled={isDeleting}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Card 4: Destruction Center (Danger Zone) */}
        <div className="privacy-card destructive-panel">
          <div className="privacy-card-header" style={{ borderColor: 'rgba(244,63,94,0.1)' }}>
            <Trash2 className="h-4.5 w-4.5" style={{ color: 'var(--color-rose)' }} />
            <h3 className="privacy-card-title" style={{ color: '#ffffff' }}>Destruction Center</h3>
          </div>

          <p className="destructive-desc">
            Perform safety-clears of local session information or trigger complete profile erasure requests from the server system.
          </p>

          <div className="destructive-actions">
            <button
              onClick={handleDeviceWipe}
              className="btn btn-secondary"
              style={{ borderColor: 'rgba(244,63,94,0.2)', color: 'var(--color-rose)', fontSize: '0.7rem' }}
            >
              Clear Cache & Wipe Device Keys
            </button>
            
            <button
              onClick={requestAccountDeletion}
              disabled={isDeleting}
              className="btn btn-danger"
              style={{ fontSize: '0.7rem' }}
            >
              Delete Account from Database (30-day grace)
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
