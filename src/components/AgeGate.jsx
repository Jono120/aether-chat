import React, { useState } from 'react';
import { confirmAge } from '../utils/ageGateStorage';
import LegalLinks from './LegalLinks';
import { useTranslation } from '../i18n/index.js';

export default function AgeGate({ onConfirmed }) {
  const { t } = useTranslation();
  const [denied, setDenied] = useState(false);

  if (denied) {
    return (
      <div className="app-container" style={{ padding: '2rem' }}>
        <p>{t('ageGateDenied')}</p>
      </div>
    );
  }

  return (
    <div className="app-container app-container--auth">
      <div className="auth-card glass-panel">
        <h1 className="auth-title">{t('ageGateTitle')}</h1>
        <p className="auth-subtitle">{t('ageGateSubtitle')}</p>
        <p className="age-gate-legal-note">{t('ageGateLegalNote')}</p>
        <LegalLinks className="auth-legal-links" />
        <div className="auth-form">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              confirmAge();
              onConfirmed?.();
            }}
          >
            {t('ageGateConfirm')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setDenied(true)}>
            {t('ageGateDeny')}
          </button>
        </div>
      </div>
    </div>
  );
}
