import React, { useState } from 'react';
import { Lock, Fingerprint } from 'lucide-react';
import { MSG } from '../utils/userMessages';
import {
  getAppSecurity,
  grantSensitiveUnlock,
  unlockWithBiometric,
  unlockWithPin,
} from '../utils/appSecurityStorage';
import { verifyAccountPassword, isApiEnabled } from '../api/client';

export default function SensitiveUnlock({ onUnlocked, verifyPasswordApi = true }) {
  const security = getAppSecurity();
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const method = security.unlockMethod ?? 'pin';

  const tryUnlock = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      onUnlocked?.();
    } catch (err) {
      setError(err?.message ?? MSG.securityUnlockFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sensitive-unlock glass-panel">
      <div className="sensitive-unlock-header">
        <Lock className="icon-md text-violet" />
        <div>
          <h4 className="sensitive-unlock-title">{MSG.securityUnlockTitle}</h4>
          <p className="sensitive-unlock-desc">{MSG.securityUnlockDesc}</p>
        </div>
      </div>

      {method === 'pin' && (
        <label className="profile-field">
          <span className="profile-field-label">{MSG.securityPinLabel}</span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            className="profile-input"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            autoComplete="one-time-code"
          />
        </label>
      )}

      {method === 'password' && (
        <label className="profile-field">
          <span className="profile-field-label">{MSG.securityPasswordLabel}</span>
          <input
            type="password"
            className="profile-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
      )}

      {method === 'biometric' && (
        <button
          type="button"
          className="btn btn-secure btn-sm"
          disabled={busy}
          onClick={() => tryUnlock(unlockWithBiometric)}
        >
          <Fingerprint className="icon-sm" />
          {MSG.securityBiometricUnlock}
        </button>
      )}

      {error && <p className="chat-inline-warning">{error}</p>}

      <div className="sensitive-unlock-actions">
        {method === 'pin' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || pin.length < 4}
            onClick={() => tryUnlock(() => unlockWithPin(pin))}
          >
            {MSG.securityUnlockBtn}
          </button>
        )}
        {method === 'password' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || !password}
            onClick={() =>
              tryUnlock(async () => {
                if (verifyPasswordApi && isApiEnabled()) {
                  const { valid } = await verifyAccountPassword(password);
                  if (!valid) throw new Error(MSG.securityPasswordWrong);
                }
                grantSensitiveUnlock();
              })
            }
          >
            {MSG.securityUnlockBtn}
          </button>
        )}
      </div>
    </div>
  );
}
