import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from '../i18n/index.js';
import { listSocialLinksForDisplay } from '../utils/socialLinks';

export default function ProfileSocialLinks({ socialLinks }) {
  const { t } = useTranslation();
  const links = listSocialLinksForDisplay(socialLinks);
  if (!links.length) return null;

  return (
    <div className="modal-social-section">
      <div className="modal-label">{t('profileModalSocial')}</div>
      <div className="profile-social-links">
        {links.map(({ platform, label, href, username }) => {
          const userLabel = platform === 'bluesky' ? username : `@${username}`;
          const content = (
            <>
              <span className="profile-social-link-label">{label}</span>
              <span className="profile-social-link-user">{userLabel}</span>
              {href ? (
                <ExternalLink className="icon-xs profile-social-link-icon" aria-hidden="true" />
              ) : null}
            </>
          );

          if (!href) {
            return (
              <span key={platform} className="profile-social-link profile-social-link--static">
                {content}
              </span>
            );
          }

          return (
            <a
              key={platform}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-social-link"
            >
              {content}
            </a>
          );
        })}
      </div>
    </div>
  );
}
