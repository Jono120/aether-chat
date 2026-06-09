import React, { useState, useEffect, useRef } from 'react';
import { User, Image, Palette, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  fetchMyProfile,
  isApiEnabled,
  requestUploadSas,
  updateMyProfile,
} from '../api/client';
import { useTranslation } from '../i18n/index.js';
import { isWebBrowser } from '../utils/platform';
import WebAlbumBlockedBanner from './WebAlbumBlockedBanner';
import ProfileChipSelect from './ProfileChipSelect';
import {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  LOOKING_FOR_OPTIONS,
  presetInterestOptions,
} from '../utils/profileOptions';
import {
  DEFAULT_LOCAL_PROFILE,
  formToProfile,
  loadLocalProfile,
  loadMediaPreview,
  profileToApiPayload,
  profileToForm,
  saveLocalProfile,
  saveMediaPreview,
  clearMediaPreview,
} from '../utils/profileStorage';
import { SOCIAL_PLATFORM_META } from '../utils/socialLinks';
import { GenerativeAvatar } from '../utils/avatarArt';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UserProfile({ onProfileSaved, setStealthMode }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const webBlocked = isWebBrowser();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(() => profileToForm(DEFAULT_LOCAL_PROFILE));
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pattern, setPattern] = useState(1);

  const patchForm = (updates) => setForm((prev) => ({ ...prev, ...updates }));

  const patchSocialLink = (platform, value) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
    }));
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      let profile;
      if (isApiEnabled()) {
        profile = await fetchMyProfile();
        if (profile) saveLocalProfile(profile);
      } else {
        profile = loadLocalProfile();
      }
      if (profile) {
        setForm(profileToForm(profile));
        setPattern(profile.pattern ?? 1);
        setAvatarPreview(loadMediaPreview(profile.avatarMediaId));
        if (setStealthMode) setStealthMode(!profile.discoverable);
      }
    } catch (err) {
      console.warn('Profile load failed', err);
      const local = loadLocalProfile();
      setForm(profileToForm(local));
      setAvatarPreview(loadMediaPreview(local.avatarMediaId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = loadLocalProfile();
      const merged = formToProfile(form, base);
      let saved = merged;

      if (isApiEnabled()) {
        saved = await updateMyProfile(profileToApiPayload(merged));
        if (saved) saveLocalProfile(saved);
      } else {
        saveLocalProfile(merged);
      }

      if (setStealthMode) setStealthMode(!saved.discoverable);
      onProfileSaved?.(saved);
      toast(t('profileSaved'), { type: 'success' });
    } catch (err) {
      toast(err?.message ?? t('profileSaveFailed'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = () => {
    if (!form.allowProfileMediaUpload) {
      toast(t('profilePhotoDisabled'), { type: 'info' });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      let mediaId = `local-${Date.now()}`;

      if (isApiEnabled()) {
        const sas = await requestUploadSas(file.type || 'image/jpeg');
        if (sas?.mediaId) {
          mediaId = sas.mediaId;
          if (sas.uploadUrl) {
            await fetch(sas.uploadUrl, {
              method: 'PUT',
              headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': file.type,
              },
              body: file,
            });
          }
        }
      }

      saveMediaPreview(mediaId, dataUrl);
      setAvatarPreview(dataUrl);
      patchForm({ avatarMediaId: mediaId });
    } catch (err) {
      console.warn('Avatar upload failed', err);
      toast(t('profileSaveFailed'), { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (form.avatarMediaId) clearMediaPreview(form.avatarMediaId);
    setAvatarPreview(null);
    patchForm({ avatarMediaId: null });
  };

  if (loading) {
    return <div className="page-stack profile-page">{t('profileLoading')}</div>;
  }

  return (
    <div className="page-stack profile-page">
      <header className="profile-page-header">
        <h2 className="grid-section-title">{t('profilePageTitle')}</h2>
        <p className="grid-section-desc">{t('profilePageDesc')}</p>
      </header>

      <form onSubmit={handleSave} className="profile-form">
        <section className="privacy-card profile-card profile-card--photo">
          <div className="privacy-card-header profile-card-header--tight">
            <Image className="icon-md text-cyan" />
            <h3 className="privacy-card-title">{t('profilePhotoTitle')}</h3>
          </div>
          <p className="profile-card-intro">{t('profilePhotoDesc')}</p>

          <div className="profile-avatar-row">
            <div className="profile-avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="profile-avatar-img" />
              ) : (
                <GenerativeAvatar
                  primaryColor={form.primaryColor}
                  secondaryColor={form.secondaryColor}
                  pattern={pattern}
                  className="profile-avatar-img"
                />
              )}
            </div>
            <div className="profile-avatar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={handleAvatarFile}
                disabled={!form.allowProfileMediaUpload || uploading}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAvatarPick}
                disabled={!form.allowProfileMediaUpload || uploading}
              >
                {uploading
                  ? t('profilePhotoUploading')
                  : avatarPreview
                    ? t('profilePhotoChange')
                    : t('profilePhotoUpload')}
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  {t('profilePhotoRemove')}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="privacy-card profile-card profile-card--appearance">
          <div className="privacy-card-header profile-card-header--tight">
            <Palette className="icon-md text-emerald" />
            <h3 className="privacy-card-title">{t('profileSectionAppearance')}</h3>
          </div>
          <div className="profile-color-row">
            <label className="profile-color-field">
              <span>{t('profilePrimaryColor')}</span>
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => patchForm({ primaryColor: e.target.value })}
              />
            </label>
            <label className="profile-color-field">
              <span>{t('profileSecondaryColor')}</span>
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => patchForm({ secondaryColor: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="privacy-card profile-card profile-card--full">
          <div className="privacy-card-header profile-card-header--tight">
            <User className="icon-md text-violet" />
            <h3 className="privacy-card-title">{t('profileSectionAbout')}</h3>
          </div>

          <div className="profile-fields profile-fields--grid">
            <label className="profile-field">
              <span className="profile-field-label">{t('profileDisplayName')}</span>
              <input
                className="profile-input"
                value={form.username}
                onChange={(e) => patchForm({ username: e.target.value })}
                maxLength={64}
                required
              />
            </label>

            <label className="profile-field">
              <span className="profile-field-label">{t('profileGender')}</span>
              <select
                className="profile-input profile-select"
                value={form.gender}
                onChange={(e) => patchForm({ gender: e.target.value })}
              >
                <option value="">{t('profileGenderUnset')}</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="profile-field">
              <span className="profile-field-label">{t('profileAge')}</span>
              <span className="profile-field-hint">{t('profileAgeHint')}</span>
              <select
                className="profile-input profile-select"
                value={form.age}
                onChange={(e) => patchForm({ age: e.target.value })}
              >
                <option value="">{t('profileAgeUnset')}</option>
                {AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </label>

            <label className="profile-field profile-field--full">
              <span className="profile-field-label">{t('profileLookingFor')}</span>
              <span className="profile-field-hint">{t('profileLookingForHint')}</span>
              <ProfileChipSelect
                options={LOOKING_FOR_OPTIONS}
                value={form.lookingFor}
                onChange={(lookingFor) => patchForm({ lookingFor })}
                ariaLabel={t('profileLookingFor')}
              />
            </label>

            <label className="profile-field">
              <span className="profile-field-label">{t('profileHeadline')}</span>
              <span className="profile-field-hint">{t('profileHeadlineHint')}</span>
              <input
                className="profile-input"
                value={form.role}
                onChange={(e) => patchForm({ role: e.target.value })}
                maxLength={120}
              />
            </label>

            <label className="profile-field profile-field--full">
              <span className="profile-field-label">{t('profileBio')}</span>
              <textarea
                className="profile-input profile-textarea"
                value={form.bio}
                onChange={(e) => patchForm({ bio: e.target.value })}
                rows={3}
                maxLength={500}
              />
            </label>

            <div className="profile-field profile-field--full">
              <span className="profile-field-label">{t('profileSocialTitle')}</span>
              <span className="profile-field-hint">{t('profileSocialHint')}</span>
              <div className="profile-social-fields">
                {SOCIAL_PLATFORM_META.map(({ id, label, placeholder }) => (
                  <label key={id} className="profile-social-field">
                    <span className="profile-social-field-label">{label}</span>
                    <input
                      className="profile-input"
                      value={form.socialLinks?.[id] ?? ''}
                      onChange={(e) => patchSocialLink(id, e.target.value)}
                      placeholder={placeholder}
                      maxLength={100}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="profile-field profile-field--full">
              <span className="profile-field-label">{t('profileTags')}</span>
              <span className="profile-field-hint">{t('profileTagsHint')}</span>
              <ProfileChipSelect
                options={presetInterestOptions()}
                value={form.interestsSelected}
                onChange={(interestsSelected) => patchForm({ interestsSelected })}
                ariaLabel={t('profileTags')}
              />
              <input
                className="profile-input profile-input--spaced"
                value={form.interestsCustom}
                onChange={(e) => patchForm({ interestsCustom: e.target.value })}
                placeholder={t('profileTagsCustomPlaceholder')}
              />
            </div>

            <div className="settings-row settings-row--compact profile-field--full">
              <div>
                <h4 className="settings-row-label">{t('profileShowOnGrid')}</h4>
                <p className="settings-row-desc">{t('profileShowOnGridDesc')}</p>
              </div>
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={form.discoverable}
                  onChange={(e) => patchForm({ discoverable: e.target.checked })}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="privacy-card profile-card profile-card--media">
          <div className="privacy-card-header profile-card-header--tight">
            <Image className="icon-md text-rose" />
            <h3 className="privacy-card-title">{t('profileSectionMedia')}</h3>
          </div>

          <div className="profile-media-toggles">
            <div className="settings-row settings-row--compact">
              <div>
                <h4 className="settings-row-label">{t('profileAllowPhotoUploads')}</h4>
                <p className="settings-row-desc">{t('profileAllowPhotoUploadsDesc')}</p>
              </div>
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={form.allowProfileMediaUpload}
                  onChange={(e) => patchForm({ allowProfileMediaUpload: e.target.checked })}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>

            <div className="settings-row settings-row--flush">
              <div>
                <h4 className="settings-row-label">{t('profileAllowAlbum')}</h4>
                <p className="settings-row-desc">
                  {webBlocked ? t('webAlbumBlockedInline') : t('profileAllowAlbumDesc')}
                </p>
              </div>
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={form.hasSecureAlbum}
                  onChange={(e) => patchForm({ hasSecureAlbum: e.target.checked })}
                  disabled={!form.allowAlbumMediaUpload || webBlocked}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>

            <div className="settings-row settings-row--flush">
              <div>
                <h4 className="settings-row-label">{t('profileAllowAlbumMedia')}</h4>
                <p className="settings-row-desc">
                  {webBlocked ? t('webAlbumBlockedInline') : t('profileAllowAlbumMediaDesc')}
                </p>
              </div>
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={form.allowAlbumMediaUpload}
                  onChange={(e) => {
                    const on = e.target.checked;
                    patchForm({
                      allowAlbumMediaUpload: on,
                      hasSecureAlbum: on ? form.hasSecureAlbum : false,
                    });
                  }}
                  disabled={webBlocked}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>
            {webBlocked && <WebAlbumBlockedBanner compact />}
          </div>
        </section>

        <button type="submit" className="btn btn-secure profile-save-btn" disabled={saving}>
          <Save className="icon-sm" />
          {saving ? t('profileSaving') : t('profileSave')}
        </button>
      </form>
    </div>
  );
}
