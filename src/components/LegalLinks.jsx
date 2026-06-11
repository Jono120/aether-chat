import { useTranslation } from '../i18n/index.js';

function openLegal(type) {
  window.location.hash = type;
}

/**
 * Inline links to Terms (#terms) and Privacy (#privacy). App shows LegalPage overlay on hash change.
 */
export default function LegalLinks({ className = 'legal-links' }) {
  const { t } = useTranslation();
  return (
    <p className={className}>
      <button type="button" className="legal-links__btn" onClick={() => openLegal('terms')}>
        {t('legalTermsLink')}
      </button>
      <span className="legal-links__sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="legal-links__btn" onClick={() => openLegal('privacy')}>
        {t('legalPrivacyLink')}
      </button>
    </p>
  );
}
