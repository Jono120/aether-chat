import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { MSG } from '../utils/userMessages';
import {
  loadStoredConversations,
  saveStoredConversations,
  SEED_CONVERSATIONS,
} from '../utils/chatConversationsStorage';
import {
  createEncryptedBackup,
  decryptEncryptedBackup,
  downloadBackupFile,
} from '../utils/chatBackup';
import {
  getReadReceiptsSnapshot,
  replaceReadReceipts,
} from '../utils/readReceiptStorage';

export default function ChatBackupPanel({ disabled = false, onRestore }) {
  const { toast, confirm } = useToast();
  const fileRef = useRef(null);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (passphrase.length < 8) {
      toast(MSG.settingsBackupPassphraseShort, { type: 'error' });
      return;
    }
    if (passphrase !== confirmPassphrase) {
      toast(MSG.settingsBackupPassphraseMismatch, { type: 'error' });
      return;
    }

    setBusy(true);
    try {
      const conversations = loadStoredConversations(SEED_CONVERSATIONS);
      const backup = await createEncryptedBackup(
        { conversations, readReceipts: getReadReceiptsSnapshot() },
        passphrase,
      );
      downloadBackupFile(backup);
      toast(MSG.settingsBackupExportSuccess, { type: 'success' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err) {
      toast(err?.message ?? MSG.settingsBackupExportFailed, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (passphrase.length < 8) {
      toast(MSG.settingsBackupPassphraseShort, { type: 'error' });
      return;
    }

    const approved = await confirm(MSG.settingsBackupImportConfirm, {
      confirmLabel: MSG.settingsBackupImportConfirmBtn,
      cancelLabel: MSG.cancel,
    });
    if (!approved) return;

    setBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const envelope = await decryptEncryptedBackup(json, passphrase);

      saveStoredConversations(envelope.conversations ?? SEED_CONVERSATIONS);
      replaceReadReceipts(envelope.readReceipts);

      if (envelope.keys) {
        localStorage.setItem('aether_user_keys', JSON.stringify(envelope.keys));
      }

      onRestore?.(envelope);
      toast(MSG.settingsBackupImportSuccess, { type: 'success' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err) {
      toast(err?.message ?? MSG.settingsBackupImportFailed, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-backup-panel">
      <div className="settings-info-box">
        <h4 className="settings-info-box-title">{MSG.settingsBackupTitle}</h4>
        <p className="settings-info-box-text">{MSG.settingsBackupDesc}</p>
      </div>

      <label className="profile-field">
        <span className="profile-field-label">{MSG.settingsBackupPassphrase}</span>
        <input
          type="password"
          className="profile-input"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="new-password"
          disabled={disabled || busy}
          minLength={8}
        />
      </label>

      <label className="profile-field">
        <span className="profile-field-label">{MSG.settingsBackupPassphraseConfirm}</span>
        <input
          type="password"
          className="profile-input"
          value={confirmPassphrase}
          onChange={(e) => setConfirmPassphrase(e.target.value)}
          autoComplete="new-password"
          disabled={disabled || busy}
          minLength={8}
        />
      </label>

      <div className="chat-backup-actions">
        <button
          type="button"
          className="btn btn-secure btn-sm"
          onClick={handleExport}
          disabled={disabled || busy}
        >
          <Download className="icon-sm" />
          {busy ? MSG.settingsBackupWorking : MSG.settingsBackupExport}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy}
        >
          <Upload className="icon-sm" />
          {MSG.settingsBackupImport}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={handleImportFile}
          disabled={disabled || busy}
        />
      </div>
    </div>
  );
}
