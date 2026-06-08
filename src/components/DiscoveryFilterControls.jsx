import React from 'react';
import ProfileChipSelect from './ProfileChipSelect';
import { MSG } from '../utils/userMessages';
import { AGE_OPTIONS, GENDER_OPTIONS, PRESET_INTERESTS } from '../utils/profileOptions';

/**
 * Shared discovery filter and display-preference controls for Settings and Grid.
 */
export default function DiscoveryFilterControls({
  discoveryFilters,
  profileViewPrefs,
  onFiltersChange,
  onViewPrefsChange,
  disabled = false,
  showDisplayToggles = true,
}) {
  const patchFilters = (updates) => {
    onFiltersChange({ ...discoveryFilters, ...updates });
  };

  const patchView = (updates) => {
    onViewPrefsChange({ ...profileViewPrefs, ...updates });
  };

  return (
    <div className="settings-stack">
      <div className="u-flex-col u-gap-sm">
        <span className="section-label">{MSG.settingsDiscoveryFiltersTitle}</span>
        <p className="settings-row-desc">{MSG.settingsDiscoveryFiltersDesc}</p>

        <div className="discovery-filter-age-row">
          <label className="profile-field">
            <span className="profile-field-label">{MSG.settingsDiscoveryAgeMin}</span>
            <select
              className="profile-input"
              value={discoveryFilters.ageMin ?? ''}
              onChange={(e) =>
                patchFilters({ ageMin: e.target.value ? Number(e.target.value) : null })
              }
              disabled={disabled}
            >
              <option value="">{MSG.settingsDiscoveryAgeAny}</option>
              {AGE_OPTIONS.map((age) => (
                <option key={`min-${age}`} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </label>
          <label className="profile-field">
            <span className="profile-field-label">{MSG.settingsDiscoveryAgeMax}</span>
            <select
              className="profile-input"
              value={discoveryFilters.ageMax ?? ''}
              onChange={(e) =>
                patchFilters({ ageMax: e.target.value ? Number(e.target.value) : null })
              }
              disabled={disabled}
            >
              <option value="">{MSG.settingsDiscoveryAgeAny}</option>
              {AGE_OPTIONS.map((age) => (
                <option key={`max-${age}`} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="u-flex-col u-gap-sm">
          <span className="profile-field-label">{MSG.settingsDiscoveryGenders}</span>
          <ProfileChipSelect
            options={GENDER_OPTIONS}
            value={discoveryFilters.genders ?? []}
            onChange={(genders) => patchFilters({ genders })}
            ariaLabel={MSG.settingsDiscoveryGenders}
            disabled={disabled}
          />
        </div>

        <div className="u-flex-col u-gap-sm">
          <span className="profile-field-label">{MSG.settingsDiscoveryInterests}</span>
          <ProfileChipSelect
            options={PRESET_INTERESTS}
            value={discoveryFilters.interests ?? []}
            onChange={(interests) => patchFilters({ interests })}
            ariaLabel={MSG.settingsDiscoveryInterests}
            disabled={disabled}
          />
        </div>

        <div className="u-flex-col u-gap-sm">
          <span className="profile-field-label">{MSG.settingsDiscoveryInterestMatch}</span>
          <div className="strategy-list">
            {[
              { id: 'any', label: MSG.settingsDiscoveryInterestMatchAny },
              { id: 'all', label: MSG.settingsDiscoveryInterestMatchAll },
            ].map((mode) => (
              <div
                key={mode.id}
                onClick={() => !disabled && patchFilters({ interestMatch: mode.id })}
                className={`strategy-option ${discoveryFilters.interestMatch === mode.id ? 'strategy-option-active' : ''}`}
              >
                <input
                  type="radio"
                  checked={discoveryFilters.interestMatch === mode.id}
                  onChange={() => {}}
                  className="strategy-radio"
                  disabled={disabled}
                />
                <div>
                  <h5 className="strategy-option-title">{mode.label}</h5>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDisplayToggles && (
        <div className="u-flex-col u-gap-sm">
          <span className="section-label">{MSG.settingsDiscoveryDisplayTitle}</span>
          <p className="settings-row-desc">{MSG.settingsDiscoveryDisplayDesc}</p>
          {[
            ['showAge', MSG.settingsDiscoveryShowAge],
            ['showGender', MSG.settingsDiscoveryShowGender],
            ['showInterests', MSG.settingsDiscoveryShowInterests],
            ['showLookingFor', MSG.settingsDiscoveryShowLookingFor],
          ].map(([key, label]) => (
            <div key={key} className="settings-row settings-row--compact">
              <div>
                <h4 className="settings-row-label">{label}</h4>
              </div>
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={profileViewPrefs[key] !== false}
                  onChange={() => patchView({ [key]: !profileViewPrefs[key] })}
                  disabled={disabled}
                />
                <span className="form-toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
