import React from 'react';
import { ShieldAlert, Smartphone } from 'lucide-react';
import { MSG } from '../utils/userMessages';

/**
 * Shown on web when private album features are unavailable.
 */
export default function WebAlbumBlockedBanner({ compact = false }) {
  return (
    <div className={`warning-banner warning-banner--cyan${compact ? ' warning-banner--compact' : ''}`}>
      <div className="banner-icon-wrap">
        <ShieldAlert className="icon-md" />
      </div>
      <div className="warning-banner-text">
        <strong className="banner-title">{MSG.webAlbumBlockedTitle}</strong>
        <p>{MSG.webAlbumBlockedBody}</p>
        <p className="web-album-blocked-cta">
          <Smartphone className="icon-xs" aria-hidden />
          {MSG.webAlbumBlockedCta}
        </p>
      </div>
    </div>
  );
}
