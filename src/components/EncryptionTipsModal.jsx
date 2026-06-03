import React, { useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import { MSG } from '../utils/userMessages';

export default function EncryptionTipsModal({ open, onClose }) {
  const modalRef = useFocusTrap(open);

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
              {MSG.settingsMsgEncryptionModalTitle}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={MSG.close}
          >
            <X className="icon-md" />
          </button>
        </div>
        <div className="modal-body encryption-tips-modal-body">
          <p className="encryption-tips-lead">{MSG.settingsMsgEncryptionBody}</p>
          <ul className="encryption-tips-list">
            {MSG.settingsMsgEncryptionModalBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="encryption-tips-footnote">{MSG.settingsMsgEncryptionModalFootnote}</p>
        </div>
        <div className="modal-actions encryption-tips-modal-actions">
          <button type="button" className="btn btn-primary modal-btn" onClick={onClose}>
            {MSG.close}
          </button>
        </div>
      </div>
    </div>
  );
}
