import React, { useState, useEffect } from 'react';
import {
  Eye, Trash2, ShieldAlert,
  Lock, RotateCcw, Key,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { cancelAccountDeletion, isApiEnabled, scheduleAccountDeletion } from '../api/client';

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
  const { toast, confirm } = useToast();
  const [fuzzingStrategy, setFuzzingStrategy] = useState('grid_snap');
  const [pinLockEnabled, setPinLockEnabled] = useState(false);
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
      setDeletionTimer('EXPIRED - ACCOUNT PURGED');
      onPanicTrigger();
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDeletionTimer(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }
  };

  const requestAccountDeletion = async () => {
    const approved = await confirm(
      'Your profile will be hidden immediately and permanently deleted after a 30-day grace period. Continue?',
      { confirmLabel: 'Schedule Deletion', cancelLabel: 'Keep Account' },
    );
    if (!approved) return;

    setStealthMode(true);

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    if (isApiEnabled()) {
      try {
        const result = await scheduleAccountDeletion();
        if (result?.scheduledPurgeAt) {
          localStorage.setItem('aether_deletion_scheduled', result.scheduledPurgeAt);
          setIsDeleting(true);
          calculateTimeRemaining(result.scheduledPurgeAt);
        }
      } catch (err) {
        console.warn('Server deletion schedule failed', err);
        localStorage.setItem('aether_deletion_scheduled', scheduledDate.toISOString());
        setIsDeleting(true);
        calculateTimeRemaining(scheduledDate.toISOString());
      }
    } else {
      localStorage.setItem('aether_deletion_scheduled', scheduledDate.toISOString());
      setIsDeleting(true);
      calculateTimeRemaining(scheduledDate.toISOString());
    }

    toast('Account marked for deletion. You are now hidden from discovery.', { type: 'info' });
  };

  const cancelAccountDeletionLocal = async () => {
    if (isApiEnabled()) {
      try {
        await cancelAccountDeletion();
      } catch (err) {
        console.warn('Server deletion cancel failed', err);
      }
    }
    localStorage.removeItem('aether_deletion_scheduled');
    setIsDeleting(false);
    setDeletionTimer(null);
    setStealthMode(false);
    toast('Account deletion cancelled. Discovery visibility restored.', { type: 'success' });
  };

  const handleDeviceWipe = async () => {
    const approved = await confirm(
      'This will erase key rings, messages, and images from this application. Continue?',
      { confirmLabel: 'Wipe Account', cancelLabel: 'Cancel' },
    );
    if (approved) onPanicTrigger();
  };

  return (
    <div className="page-stack">
      <div className="grid-section-header">
        <div>
          <h2 className="grid-section-title">Privacy Control Center</h2>
          <p className="grid-section-desc">
            Manage your cryptographic profiles, server-side visibility, and deletion policies.
          </p>
        </div>
      </div>

      {isDeleting && (
        <div className="countdown-alert">
          <div className="countdown-header">
            <div className="banner-icon-wrap banner-icon-wrap--sm">
              <ShieldAlert className="icon-md" />
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
              <span className="countdown-label">Time Before Purge</span>
              <span className="countdown-timer-val">{deletionTimer}</span>
            </div>

            <button
              onClick={cancelAccountDeletionLocal}
              className="btn btn-restore"
            >
              <RotateCcw className="icon-sm" /> Restore Account
            </button>
          </div>
        </div>
      )}

      <div className="privacy-grid">
        <div className="privacy-card">
          <div className="privacy-card-header">
            <Eye className="icon-md text-violet" />
            <h3 className="privacy-card-title">Discovery & Location</h3>
          </div>

          <div className="settings-stack">
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

            <div className="u-flex-col u-gap-sm">
              <span className="section-label">Backend Distance Fuzzing Profile</span>

              <div className="strategy-list">
                {[
                  { id: 'grid_snap', label: 'Grid Snapping (1km square snap)', desc: 'Aligns coordinates to grid squares to prevent trilateration.' },
                  { id: 'jitter', label: 'Gaussian Jitter (random 500m offset)', desc: 'Adds random offsets server-side to mask precise readings.' },
                  { id: 'distance_only', label: 'Broad Distance Bands Only', desc: 'Hides metrics, displaying broad bands ("Nearby", "Within 5km").' },
                ].map((strategy) => (
                  <div
                    key={strategy.id}
                    onClick={() => !isDeleting && setFuzzingStrategy(strategy.id)}
                    className={`strategy-option ${fuzzingStrategy === strategy.id ? 'strategy-option-active' : ''}`}
                  >
                    <input
                      type="radio"
                      checked={fuzzingStrategy === strategy.id}
                      onChange={() => {}}
                      className="strategy-radio"
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

        <div className="privacy-card">
          <div className="privacy-card-header">
            <Key className="icon-md text-cyan" />
            <h3 className="privacy-card-title">Key Ring</h3>
          </div>

          <div className="key-ring-box">
            <div className="u-flex-col u-gap-sm">
              <span className="key-ring-label">Active Public Key (DH-X25519)</span>
              <pre className="key-ring-pre">{currentUser.keys.publicKey}</pre>
            </div>

            <div className="u-flex-col u-gap-sm">
              <div className="key-ring-label-row">
                <span className="key-ring-label">Local Private Key</span>
                <span className="metadata-badge badge-warning badge-sm">NEVER SHARED</span>
              </div>
              <pre className="key-ring-pre key-ring-pre-private">
                {currentUser.keys.privateKey.substring(0, 24)}**************************
              </pre>
            </div>

            <div className="key-fingerprint-row">
              <div>
                <span className="key-ring-label key-fingerprint-text">Identity Key Fingerprint</span>
                <span className="key-fingerprint-val">{currentUser.keys.fingerprint}</span>
              </div>
              <button
                onClick={generateNewKeys}
                disabled={isDeleting}
                className="btn btn-secondary btn-sm"
              >
                Rotate Keys
              </button>
            </div>

            <div className="warning-banner warning-banner--cyan">
              <p className="warning-banner-text">
                Key pairs are generated locally in your browser. The server coordinates handshakes but cannot read message contents.
              </p>
            </div>
          </div>
        </div>

        <div className="privacy-card">
          <div className="privacy-card-header">
            <Lock className="icon-md text-emerald" />
            <h3 className="privacy-card-title">App & Screen Security</h3>
          </div>

          <div className="settings-stack settings-stack--tight">
            <div className="settings-row settings-row--compact">
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

            <div className="settings-row settings-row--flush">
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

        <div className="privacy-card destructive-panel">
          <div className="privacy-card-header privacy-card-header--danger">
            <Trash2 className="icon-md text-rose" />
            <h3 className="privacy-card-title">Destruction Center</h3>
          </div>

          <p className="destructive-desc">
            Perform safety-clears of local session information or trigger complete profile erasure requests from the server system.
          </p>

          <div className="destructive-actions">
            <button
              onClick={handleDeviceWipe}
              className="btn btn-secondary btn-wipe-outline"
            >
              Clear Cache & Wipe Device Keys
            </button>

            <button
              onClick={requestAccountDeletion}
              disabled={isDeleting}
              className="btn btn-danger btn-sm"
            >
              Delete Account from Database (30-day grace)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
