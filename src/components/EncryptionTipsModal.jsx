import { useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import { useTranslation } from '../i18n/index.js';

export default function EncryptionTipsModal({ open, onClose }) {
  const { t } = useTranslation();
  const modalRef = useFocusTrap(open);
  const encryptionBulletsRaw = t('settingsMsgEncryptionModalBullets', { returnObjects: true });
  const encryptionBullets = Array.isArray(encryptionBulletsRaw) ? encryptionBulletsRaw : [];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-content encryption-tips-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="encryption-tips-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="encryption-tips-modal-header">
          <div className="encryption-tips-modal-title-row">
            <Lock className="icon-md text-cyan" />
            <h3 id="encryption-tips-title" className="modal-title">
              {t('settingsMsgEncryptionModalTitle')}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X className="icon-md" />
          </button>
        </div>
        <div className="modal-body encryption-tips-modal-body">
          <p className="encryption-tips-lead">{t('settingsMsgEncryptionBody')}</p>
          <ul className="encryption-tips-list">
            {encryptionBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="encryption-tips-footnote">{t('settingsMsgEncryptionModalFootnote')}</p>
        </div>
        <div className="modal-actions encryption-tips-modal-actions">
          <button type="button" className="btn btn-primary modal-btn" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
