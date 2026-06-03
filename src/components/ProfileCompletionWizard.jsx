import React, { useState } from 'react';
import { MSG } from '../utils/userMessages';

export default function ProfileCompletionWizard({ onComplete, onSkip }) {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [discoverable, setDiscoverable] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete?.({ username: username.trim(), bio: bio.trim(), discoverable });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content glass-panel" style={{ maxWidth: '24rem', margin: '2rem auto' }}>
        <h2 className="grid-section-title">Complete your profile</h2>
        <p className="grid-section-desc">A few details help others discover you safely.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-label">Display name</span>
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={40}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">{MSG.profileModalBio}</span>
            <textarea
              className="auth-input"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
          </label>
          <label className="auth-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={discoverable}
              onChange={(e) => setDiscoverable(e.target.checked)}
            />
            <span className="auth-label">Show me on the discovery grid</span>
          </label>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Continue
          </button>
          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onSkip}>
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
