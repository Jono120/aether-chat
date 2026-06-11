import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../i18n/index.js';

function LegalDocument({ sections, title, lastUpdated, disclaimer, contentsLabel }) {
  return (
    <article className="legal-document">
      <header className="legal-document__header">
        <h2 className="legal-document__title">{title}</h2>
        <p className="legal-document__meta">
          {lastUpdated}
        </p>
        <p className="legal-document__disclaimer">{disclaimer}</p>
      </header>

      <nav className="legal-document__toc" aria-label="Sections">
        <h3 className="legal-document__toc-title">{contentsLabel}</h3>
        <ol>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#legal-${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal-document__sections">
        {sections.map((section) => (
          <section key={section.id} id={`legal-${section.id}`} className="legal-document__section">
            <h3>{section.title}</h3>
            {section.paragraphs.map((paragraph, i) => (
              <p key={`${section.id}-${i}`}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

export default function LegalPage({ type = 'terms', onClose }) {
  const { t } = useTranslation();
  const { t: tLegal } = useTranslation('legal');
  const dialogRef = useRef(null);
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? t('legalPrivacyTitle') : t('legalTermsTitle');
  const sectionsRaw = isPrivacy
    ? tLegal('privacySections', { returnObjects: true, ns: 'legal' })
    : tLegal('termsSections', { returnObjects: true, ns: 'legal' });
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const lastUpdated = `${t('legalLastUpdated')} ${tLegal('lastUpdated', { ns: 'legal' })}`;
  const disclaimer = tLegal('disclaimer', { ns: 'legal' });
  const contentsLabel = t('legalContents');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="legal-overlay" role="presentation">
      <div
        className="legal-overlay__panel glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-dialog-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="legal-overlay__toolbar">
          <h2 id="legal-dialog-title" className="visually-hidden">
            {title}
          </h2>
          {onClose && (
            <button
              type="button"
              className="btn btn-secondary btn-sm legal-overlay__close"
              onClick={onClose}
              aria-label={t('legalClose')}
            >
              <X className="icon-sm" aria-hidden="true" />
              {t('legalClose')}
            </button>
          )}
        </div>
        <div className="legal-overlay__scroll">
          <LegalDocument
            sections={sections}
            title={title}
            lastUpdated={lastUpdated}
            disclaimer={disclaimer}
            contentsLabel={contentsLabel}
          />
        </div>
      </div>
    </div>
  );
}
