import React from 'react';
import { ShieldAlert, Smartphone } from 'lucide-react';
import { useTranslation } from '../i18n/index.js';
import { getOrderedMobileStoreLinks, hasMobileStoreLinks } from '../utils/mobileLinks';

/**
 * Shown on web when private album features are unavailable.
 */
export default function WebAlbumBlockedBanner({ compact = false }) {
  const { t } = useTranslation();
  const storeLinks = getOrderedMobileStoreLinks();
  const hasLinks = hasMobileStoreLinks();
  const storeLabels = {
    ios: t('webAlbumBlockedAppStore'),
    android: t('webAlbumBlockedPlayStore'),
  };

  return (
    <div className={`warning-banner warning-banner--cyan${compact ? ' warning-banner--compact' : ''}`}>
      <div className="banner-icon-wrap">
        <ShieldAlert className="icon-md" />
      </div>
      <div className="warning-banner-text">
        <strong className="banner-title">{t('webAlbumBlockedTitle')}</strong>
        <p>{t('webAlbumBlockedBody')}</p>
        {hasLinks ? (
          <div className="web-album-store-links">
            {storeLinks.map(({ platform, href }) => (
              <a
                key={platform}
                href={href}
                className={`btn btn-secondary btn-sm${platform === storeLinks[0]?.platform ? ' web-album-store-links-primary' : ''}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {storeLabels[platform]}
              </a>
            ))}
          </div>
        ) : (
          <p className="web-album-blocked-cta">
            <Smartphone className="icon-xs" aria-hidden />
            {t('webAlbumBlockedCta')}
          </p>
        )}
      </div>
    </div>
  );
}
