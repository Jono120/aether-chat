import React, { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { MSG } from '../utils/userMessages';
import {
  canUseBiometric,
  getAppSecurity,
  registerBiometric,
  setAppSecurity,
  setPinCode,
} from '../utils/appSecurityStorage';

const UNLOCK_METHODS = [
  { id: 'pin', label: MSG.securityMethodPin, desc: MSG.securityMethodPinDesc },
  { id: 'password', label: MSG.securityMethodPassword, desc: MSG.securityMethodPasswordDesc },
  { id: 'biometric', label: MSG.securityMethodBiometric, desc: MSG.securityMethodBiometricDesc },
];

export default function AppSecuritySettings({ disabled, hasLocalPassword }) {
  const { toast } = useToast();
  const [security, setSecurity] = useState(() => getAppSecurity());
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const refresh = () => setSecurity(getAppSecurity());

  const patch = (updates) => {
    setAppSecurity(updates);
    refresh();
  };

  const handleSavePin = async () => {
    if (newPin !== confirmPin) {
      toast(MSG.securityPinMismatch, { type: 'error' });
      return;
    }
    try {
      await setPinCode(newPin);
      toast(MSG.securityPinSaved, { type: 'success' });
      setNewPin('');
      setConfirmPin('');
      refresh();
    } catch (err) {
      toast(err?.message ?? MSG.securityPinSaveFailed, { type: 'error' });
    }
  };

  const handleBiometricSetup = async () => {
    try {
      await registerBiometric();
      toast(MSG.securityBiometricSaved, { type: 'success' });
      refresh();
    } catch (err) {
      toast(err?.message ?? MSG.securityBiometricFailed, { type: 'error' });
    }
  };

  return (
    <div className="app-security-settings">
      <div className="settings-row settings-row--compact">
        <div>
          <h4 className="settings-row-label">{MSG.settingsSensitiveLock}</h4>
          <p className="settings-row-desc">{MSG.settingsSensitiveLockDesc}</p>
        </div>
        <label className="form-toggle">
          <input
            type="checkbox"
            checked={security.lockEnabled}
            onChange={() => patch({ lockEnabled: !security.lockEnabled })}
            disabled={disabled}
          />
          <span className="form-toggle-slider" />
        </label>
      </div>

      {security.lockEnabled && (
        <>
          <span className="section-label">{MSG.securityUnlockMethodLabel}</span>
          <div className="strategy-list">
            {UNLOCK_METHODS.map((m) => {
              const disabledBio = m.id === 'biometric' && !canUseBiometric();
              const disabledPw = m.id === 'password' && !hasLocalPassword;
              if (disabledBio || disabledPw) return null;
              return (
                <div
                  key={m.id}
                  className={`strategy-option ${security.unlockMethod === m.id ? 'strategy-option-active' : ''}`}
                  onClick={() => !disabled && patch({ unlockMethod: m.id })}
                >
                  <input
                    type="radio"
                    checked={security.unlockMethod === m.id}
                    onChange={() => patch({ unlockMethod: m.id })}
                    className="strategy-radio"
                  />
                  <div>
                    <h5 className="strategy-option-title">{m.label}</h5>
                    <p className="strategy-option-desc">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {security.unlockMethod === 'pin' && (
            <div className="app-security-pin-form">
              <label className="profile-field">
                <span className="profile-field-label">{MSG.securitySetPin}</span>
                <input
                  type="password"
                  inputMode="numeric"
                  className="profile-input"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </label>
              <label className="profile-field">
                <span className="profile-field-label">{MSG.securityConfirmPin}</span>
                <input
                  type="password"
                  inputMode="numeric"
                  className="profile-input"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={disabled || newPin.length < 4}
                onClick={handleSavePin}
              >
                {MSG.securitySavePin}
              </button>
            </div>
          )}

          {security.unlockMethod === 'biometric' && canUseBiometric() && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled}
              onClick={handleBiometricSetup}
            >
              <Fingerprint className="icon-sm" />
              {MSG.securitySetupBiometric}
            </button>
          )}

          {security.unlockMethod === 'password' && !hasLocalPassword && (
            <p className="settings-row-desc">{MSG.securityPasswordOnlyLocal}</p>
          )}
        </>
      )}
    </div>
  );
}
