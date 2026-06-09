import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../i18n/index.js';
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
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (passphrase.length < 8) {
      toast(t('settingsBackupPassphraseShort'), { type: 'error' });
      return;
    }
    if (passphrase !== confirmPassphrase) {
      toast(t('settingsBackupPassphraseMismatch'), { type: 'error' });
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
      toast(t('settingsBackupExportSuccess'), { type: 'success' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err) {
      toast(err?.message ?? t('settingsBackupExportFailed'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (passphrase.length < 8) {
      toast(t('settingsBackupPassphraseShort'), { type: 'error' });
      return;
    }

    const approved = await confirm(t('settingsBackupImportConfirm'), {
      confirmLabel: t('settingsBackupImportConfirmBtn'),
      cancelLabel: t('cancel'),
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
      toast(t('settingsBackupImportSuccess'), { type: 'success' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err) {
      toast(err?.message ?? t('settingsBackupImportFailed'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat-backup-panel">
      <div className="settings-info-box">
        <h4 className="settings-info-box-title">{t('settingsBackupTitle')}</h4>
        <p className="settings-info-box-text">{t('settingsBackupDesc')}</p>
      </div>

      <label className="profile-field">
        <span className="profile-field-label">{t('settingsBackupPassphrase')}</span>
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
        <span className="profile-field-label">{t('settingsBackupPassphraseConfirm')}</span>
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
          {busy ? t('settingsBackupWorking') : t('settingsBackupExport')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy}
        >
          <Upload className="icon-sm" />
          {t('settingsBackupImport')}
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
