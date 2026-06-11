import { useState } from 'react';
import { useTranslation } from '../i18n/index.js';

export default function ProfileCompletionWizard({ onComplete, onSkip }) {
  const { t } = useTranslation();
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
        <h2 className="grid-section-title">
          {t('profileCompletionTitle', { defaultValue: 'Complete your profile' })}
        </h2>
        <p className="grid-section-desc">
          {t('profileCompletionSubtitle', {
            defaultValue: 'A few details help others discover you safely.',
          })}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-label">{t('profileDisplayName')}</span>
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={40}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">{t('profileModalBio')}</span>
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
            <span className="auth-label">{t('profileShowOnGrid')}</span>
          </label>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {t('profileCompletionContinue', { defaultValue: 'Continue' })}
          </button>
          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onSkip}>
            {t('profileCompletionSkip', { defaultValue: 'Skip for now' })}
          </button>
        </form>
      </div>
    </div>
  );
}
