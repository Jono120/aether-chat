import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import {
  LEGAL_DISCLAIMER,
  LEGAL_LAST_UPDATED,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from '../content/legal';
import { MSG } from '../utils/userMessages';

function LegalDocument({ sections, title }) {
  return (
    <article className="legal-document">
      <header className="legal-document__header">
        <h2 className="legal-document__title">{title}</h2>
        <p className="legal-document__meta">
          {MSG.legalLastUpdated} {LEGAL_LAST_UPDATED}
        </p>
        <p className="legal-document__disclaimer">{LEGAL_DISCLAIMER}</p>
      </header>

      <nav className="legal-document__toc" aria-label="Sections">
        <h3 className="legal-document__toc-title">{MSG.legalContents}</h3>
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
  const dialogRef = useRef(null);
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? MSG.legalPrivacyTitle : MSG.legalTermsTitle;
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

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
              aria-label={MSG.legalClose}
            >
              <X className="icon-sm" aria-hidden="true" />
              {MSG.legalClose}
            </button>
          )}
        </div>
        <div className="legal-overlay__scroll">
          <LegalDocument sections={sections} title={title} />
        </div>
      </div>
    </div>
  );
}
