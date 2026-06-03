import React, { useState } from 'react';
import { confirmAge } from '../utils/ageGateStorage';
import LegalLinks from './LegalLinks';
import { MSG } from '../utils/userMessages';

export default function AgeGate({ onConfirmed }) {
  const [denied, setDenied] = useState(false);

  if (denied) {
    return (
      <div className="app-container" style={{ padding: '2rem' }}>
        <p>{MSG.ageGateDenied}</p>
      </div>
    );
  }

  return (
    <div className="app-container app-container--auth">
      <div className="auth-card glass-panel">
        <h1 className="auth-title">{MSG.ageGateTitle}</h1>
        <p className="auth-subtitle">{MSG.ageGateSubtitle}</p>
        <p className="age-gate-legal-note">{MSG.ageGateLegalNote}</p>
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
            {MSG.ageGateConfirm}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setDenied(true)}>
            {MSG.ageGateDeny}
          </button>
        </div>
      </div>
    </div>
  );
}
