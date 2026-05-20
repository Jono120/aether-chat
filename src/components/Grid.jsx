import React, { useState } from 'react';
import { MessageSquare, Image, ShieldAlert, X, ShieldCheck } from 'lucide-react';

/**
 * Grid Component
 * 
 * Lists nearby profiles. Built with custom semantic classes:
 * - warning-banner / warning-banner-text
 * - grid-section-header / grid-section-title / grid-section-desc
 * - discovery-grid
 * - profile-card / profile-card-overlay / profile-card-name / profile-card-distance
 * - modal-backdrop / modal-content / modal-header-banner / modal-avatar-wrapper
 */
export default function Grid({ stealthMode, onSelectChat, profiles }) {
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Generative SVG avatars matching the profile themes
  const renderGenerativeAvatar = (seedColor, secondaryColor, patternType) => {
    return (
      <svg style={{ width: '100%', height: '100%', display: 'block' }} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`grad-${patternType}-${seedColor.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={seedColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <filter id="glow-svg">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect width="100" height="100" fill={`url(#grad-${patternType}-${seedColor.replace('#','')})`} />
        
        {/* Fine background grid lines */}
        <path d="M 0 10 L 100 10 M 0 30 L 100 30 M 0 50 L 100 50 M 0 70 L 100 70 M 0 90 L 100 90" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        <path d="M 10 0 L 10 100 M 30 0 L 30 100 M 50 0 L 50 100 M 70 0 L 70 100 M 90 0 L 90 100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        
        {/* Geometric patterns representing individuals */}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Stealth Warning Banner */}
      {stealthMode && (
        <div className="warning-banner">
          <div className="logo-icon" style={{ flexShrink: 0, width: '2.5rem', height: '2.5rem', borderRadius: '8px', background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="warning-banner-text">
            <strong style={{ color: '#ffffff', display: 'block', fontSize: '0.8rem', marginBottom: '0.15rem' }}>
              Stealth Mode Active
            </strong>
            Your profile is currently hidden from the discovery grid. Nearby users cannot discover you, view your distance, or request encryption handshakes. Toggle this off in the status header to reappear.
          </div>
        </div>
      )}

      {/* Discovery Grid Header */}
      <div className="grid-section-header">
        <div>
          <h2 className="grid-section-title">Nearby Profiles</h2>
          <p className="grid-section-desc">
            Distance metrics are coarsened server-side using secure snap-grid offsets.
          </p>
        </div>
        <div>
          <span className="metadata-badge badge-success" style={{ padding: '0.25rem 0.5rem' }}>
            {profiles.length} Online Nearby
          </span>
        </div>
      </div>

      {/* Profiles Discovery Grid */}
      <div className="discovery-grid">
        {profiles.map((profile) => (
          <div 
            key={profile.id} 
            className="profile-card"
            onClick={() => setSelectedProfile(profile)}
          >
            {/* Visual Generative Graphic Panel */}
            <div style={{ width: '100%', height: '100%' }}>
              {renderGenerativeAvatar(profile.primaryColor, profile.secondaryColor, profile.pattern)}
            </div>
            
            {/* Bottom identity content overlay */}
            <div className="profile-card-overlay">
              <div className="profile-card-name">
                <span className="status-indicator status-online" />
                <span>{profile.username}, {profile.age}</span>
              </div>
              <div className="profile-card-distance">
                <span>{profile.fuzzedDistance}</span>
                {profile.hasSecureAlbum && (
                  <span className="metadata-badge badge-success" style={{ fontSize: '0.55rem', padding: '0.05rem 0.2rem' }}>
                    <ShieldCheck style={{ width: '0.65rem', height: '0.65rem' }} /> Album
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Profile Detailed Modal --- */}
      {selectedProfile && (
        <div className="modal-backdrop" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Graphics Banner */}
            <div className="modal-header-banner">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="modal-close-btn"
              >
                <X className="h-4.5 w-4.5" />
              </button>
              
              <div className="modal-avatar-wrapper">
                {renderGenerativeAvatar(
                  selectedProfile.primaryColor, 
                  selectedProfile.secondaryColor, 
                  selectedProfile.pattern
                )}
              </div>
            </div>

            {/* Modal Information Contents */}
            <div className="modal-body">
              
              {/* Identity Row */}
              <div className="modal-identity">
                <div className="modal-title-row">
                  <h3 className="modal-title">{selectedProfile.username}</h3>
                  <span style={{ color: 'var(--text-secondary)' }}>·</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '600' }}>Age {selectedProfile.age}</span>
                </div>
                <p className="modal-subtitle">{selectedProfile.role}</p>
              </div>

              {/* Fuzzed Distance Container */}
              <div className="modal-distance-box">
                <div className="modal-distance-title">
                  <span>Location Security</span>
                  <span style={{ color: '#ffffff' }}>{selectedProfile.fuzzedDistance}</span>
                </div>
                <p className="modal-distance-desc">
                  This user's distance is snapping-fuzzed to a 1km coordinate block. Accurate GPS lines are blocked by device client scripts.
                </p>
              </div>

              {/* Bio block */}
              <div className="modal-bio-section">
                <div className="modal-label">Biography</div>
                <p className="modal-bio-text">
                  {selectedProfile.bio}
                </p>
              </div>

              {/* Tags Group */}
              <div className="modal-tags-list">
                {selectedProfile.tags.map((tag, i) => (
                  <span key={i} className="modal-tag">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Handles */}
              <div className="modal-actions">
                <button
                  onClick={() => {
                    onSelectChat(selectedProfile);
                    setSelectedProfile(null);
                  }}
                  className="btn btn-primary modal-btn"
                >
                  <MessageSquare className="h-4 w-4" /> Secure Chat
                </button>
                {selectedProfile.hasSecureAlbum && (
                  <button
                    onClick={() => {
                      onSelectChat(selectedProfile, true);
                      setSelectedProfile(null);
                    }}
                    className="btn btn-secure modal-btn"
                  >
                    <Image className="h-4 w-4" /> Secure Album
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
