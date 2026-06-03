import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { changePassword, isApiEnabled } from '../api/client';
import { MSG } from '../utils/userMessages';

export default function ChangePasswordForm({ userId }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const isLocalAccount = Boolean(userId?.startsWith('local:'));

  if (!isApiEnabled()) {
    return <p className="settings-row-desc">{MSG.changePasswordOffline}</p>;
  }

  if (!isLocalAccount) {
    return <p className="settings-row-desc">{MSG.changePasswordOAuthOnly}</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (next.length < 8) {
      toast(MSG.authPasswordShort, { type: 'error' });
      return;
    }
    if (next !== confirm) {
      toast(MSG.authPasswordMismatch, { type: 'error' });
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      toast(MSG.changePasswordSuccess, { type: 'success' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      toast(err?.message ?? MSG.changePasswordFailed, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="change-password-form" onSubmit={handleSubmit}>
      <h4 className="settings-info-box-title">{MSG.changePasswordTitle}</h4>
      <label className="profile-field">
        <span className="profile-field-label">{MSG.changePasswordCurrent}</span>
        <input
          type="password"
          className="profile-input"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      <label className="profile-field">
        <span className="profile-field-label">{MSG.changePasswordNew}</span>
        <input
          type="password"
          className="profile-input"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="profile-field">
        <span className="profile-field-label">{MSG.changePasswordConfirm}</span>
        <input
          type="password"
          className="profile-input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" className="btn btn-secure btn-sm" disabled={busy}>
        {busy ? MSG.changePasswordSaving : MSG.changePasswordSubmit}
      </button>
    </form>
  );
}
