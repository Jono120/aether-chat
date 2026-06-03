import React, { useState, useEffect } from 'react';
import { MessageSquare, Image, ShieldAlert, X, ShieldCheck } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import { MSG } from '../utils/userMessages';
import { genderLabel } from '../utils/profileOptions';

/**
 * Grid Component
 *
 * Lists nearby profiles. Built with custom semantic classes:
 * - warning-banner / warning-banner-text
 * - grid-section-header / grid-section-title / grid-section-desc
 * - discovery-grid / profile-card-enter
 * - profile-card / profile-card-overlay / profile-card-name / profile-card-distance
 * - modal-backdrop / modal-content / modal-header-banner / modal-avatar-wrapper
 */
export default function Grid({
  stealthMode,
  onSelectChat,
  profiles,
  profilesLoading,
  profilesError,
  onRefreshProfiles,
  onBlockUser,
  onReportUser,
}) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const profileModalRef = useFocusTrap(!!selectedProfile);

  useEffect(() => {
    if (!selectedProfile) return undefined;

    const handleEscape = (e) => {
      if (e.key === 'Escape') setSelectedProfile(null);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedProfile]);

  const renderGenerativeAvatar = (seedColor, secondaryColor, patternType) => {
    return (
      <svg className="profile-card-media" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-${patternType}-${seedColor.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={seedColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <filter id="glow-svg">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100" height="100" fill={`url(#grad-${patternType}-${seedColor.replace('#', '')})`} />

        <path d="M 0 10 L 100 10 M 0 30 L 100 30 M 0 50 L 100 50 M 0 70 L 100 70 M 0 90 L 100 90" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <path d="M 10 0 L 10 100 M 30 0 L 30 100 M 50 0 L 50 100 M 70 0 L 70 100 M 90 0 L 90 100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

        {patternType === 1 && (
          <>
            <circle cx="50" cy="40" r="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" filter="url(#glow-svg)" />
            <path d="M 25 80 C 25 65, 75 65, 75 80 Z" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <polygon points="50,16 64,38 36,38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          </>
        )}
        {patternType === 2 && (
          <>
            <rect x="36" y="26" width="28" height="28" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" transform="rotate(45 50 40)" filter="url(#glow-svg)" />
            <path d="M 20 85 C 30 68, 70 68, 80 85 Z" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          </>
        )}
        {patternType === 3 && (
          <>
            <polygon points="50,22 66,50 34,50" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" filter="url(#glow-svg)" />
            <path d="M 15 88 C 25 70, 75 70, 85 88 Z" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          </>
        )}
        {patternType === 4 && (
          <>
            <circle cx="50" cy="38" r="14" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <rect x="33" y="60" width="34" height="25" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <path d="M 50 24 L 50 52 M 36 38 L 64 38" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
          </>
        )}
      </svg>
    );
  };

  return (
    <div className="page-stack">
      {stealthMode && (
        <div className="warning-banner">
          <div className="banner-icon-wrap">
            <ShieldAlert className="icon-md" />
          </div>
          <div className="warning-banner-text">
            <strong className="banner-title">Offline Mode</strong>
            You're hidden right now — other people nearby won't see your profile or how far away you are. Go back online to show up again.
          </div>
        </div>
      )}

      <div className="grid-section-header">
        <div>
          <h2 className="grid-section-title">
            Nearby Profiles
            {profilesLoading && <span className="metadata-badge"> Syncing…</span>}
          </h2>
          <p className="grid-section-desc">
            Distances are approximate for privacy reasons.
          </p>
        </div>
        <div>
          <span className={`metadata-badge ${stealthMode ? 'badge-stealth' : 'badge-success'}`}>
            {stealthMode ? 'Hidden from grid' : `${profiles.length} Online Nearby`}
          </span>
        </div>
      </div>

      {profilesError && (
        <div className="warning-banner">
          <div className="warning-banner-text">
            <strong className="banner-title">Could not load profiles</strong>
            <p>{profilesError}</p>
            {onRefreshProfiles && (
              <button type="button" className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={onRefreshProfiles}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {stealthMode ? (
        <div className="discovery-grid grid-empty-state">
          <p className="grid-empty-text">
            Discovery is paused while offline. Go online to show up again.
          </p>
        </div>
      ) : profiles.length === 0 && !profilesLoading ? (
        <div className="discovery-grid grid-empty-state">
          <p className="grid-empty-text">
            {profilesError ? 'Fix the connection above and retry.' : 'No one nearby right now. Check back later.'}
          </p>
        </div>
      ) : (
        <div className="discovery-grid">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="profile-card profile-card-enter"
              onClick={() => setSelectedProfile(profile)}
            >
              <div className="profile-card-media">
                {renderGenerativeAvatar(profile.primaryColor, profile.secondaryColor, profile.pattern)}
              </div>

              <div className="profile-card-overlay">
                <div className="profile-card-name">
                  <span className="status-indicator status-online" />
                  <span>
                    {profile.username}
                    {profile.age != null ? `, ${profile.age}` : ''}
                  </span>
                </div>
                <div className="profile-card-distance">
                  <span>{profile.fuzzedDistance}</span>
                  {profile.hasSecureAlbum && (
                    <span className="metadata-badge badge-success badge-sm">
                      <ShieldCheck className="icon-xs" /> Album
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProfile && (
        <div className="modal-backdrop" onClick={() => setSelectedProfile(null)}>
          <div
            ref={profileModalRef}
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-banner">
              <button
                onClick={() => setSelectedProfile(null)}
                className="modal-close-btn"
                aria-label="Close profile details"
              >
                <X className="icon-md" />
              </button>

              <div className="modal-avatar-wrapper">
                {renderGenerativeAvatar(
                  selectedProfile.primaryColor,
                  selectedProfile.secondaryColor,
                  selectedProfile.pattern,
                )}
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-identity">
                <div className="modal-title-row">
                  <h3 id="profile-modal-title" className="modal-title">{selectedProfile.username}</h3>
                  {selectedProfile.age != null && (
                    <>
                      <span className="text-secondary">·</span>
                      <span className="modal-age">{MSG.profileModalAge} {selectedProfile.age}</span>
                    </>
                  )}
                </div>
                {(selectedProfile.gender || selectedProfile.role) && (
                  <p className="modal-subtitle">
                    {[genderLabel(selectedProfile.gender), selectedProfile.role].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              <div className="modal-distance-box">
                <div className="modal-distance-title">
                  <span>Location Security</span>
                  <span className="modal-distance-value">{selectedProfile.fuzzedDistance}</span>
                </div>
                <p className="modal-distance-desc">
                  You only see an approximate distance — not their exact location. We round location on our side so nobody can locate them.
                </p>
              </div>

              <div className="modal-bio-section">
                <div className="modal-label">{MSG.profileModalBio}</div>
                <p className="modal-bio-text">{selectedProfile.bio}</p>
              </div>

              {(selectedProfile.lookingFor?.length ?? 0) > 0 && (
                <div className="modal-tags-section">
                  <div className="modal-label">{MSG.profileModalLookingFor}</div>
                  <div className="modal-tags-list modal-tags-list--inline">
                    {selectedProfile.lookingFor.map((item, i) => (
                      <span key={i} className="modal-tag modal-tag--accent">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {(selectedProfile.tags?.length ?? 0) > 0 && (
                <div className="modal-tags-section">
                  <div className="modal-label">{MSG.profileModalInterests}</div>
                  <div className="modal-tags-list modal-tags-list--inline">
                    {selectedProfile.tags.map((tag, i) => (
                      <span key={i} className="modal-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  onClick={() => {
                    onSelectChat(selectedProfile);
                    setSelectedProfile(null);
                  }}
                  className="btn btn-primary modal-btn"
                >
                  <MessageSquare className="icon-md" /> Message
                </button>
                {selectedProfile.hasSecureAlbum && (
                  <button
                    onClick={() => {
                      onSelectChat(selectedProfile, true);
                      setSelectedProfile(null);
                    }}
                    className="btn btn-secure modal-btn"
                  >
                    <Image className="icon-md" /> Album
                  </button>
                )}
              </div>
              {(onBlockUser || onReportUser) && (
                <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                  {onBlockUser && (
                    <button
                      type="button"
                      className="btn btn-secondary modal-btn"
                      onClick={async () => {
                        await onBlockUser(selectedProfile);
                        setSelectedProfile(null);
                      }}
                    >
                      Block
                    </button>
                  )}
                  {onReportUser && (
                    <button
                      type="button"
                      className="btn btn-secondary modal-btn"
                      onClick={async () => {
                        await onReportUser(selectedProfile);
                        setSelectedProfile(null);
                      }}
                    >
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
