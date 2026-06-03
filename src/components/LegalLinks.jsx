import React from 'react';
import { MSG } from '../utils/userMessages';

function openLegal(type) {
  window.location.hash = type;
}

/**
 * Inline links to Terms (#terms) and Privacy (#privacy). App shows LegalPage overlay on hash change.
 */
export default function LegalLinks({ className = 'legal-links' }) {
  return (
    <p className={className}>
      <button type="button" className="legal-links__btn" onClick={() => openLegal('terms')}>
        {MSG.legalTermsLink}
      </button>
      <span className="legal-links__sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="legal-links__btn" onClick={() => openLegal('privacy')}>
        {MSG.legalPrivacyLink}
      </button>
    </p>
  );
}
