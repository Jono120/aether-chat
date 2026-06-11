import { Filter, RotateCcw } from 'lucide-react';
import ProfileChipSelect from './ProfileChipSelect';
import { useTranslation } from '../i18n/index.js';
import { AGE_OPTIONS, GENDER_OPTIONS, presetInterestOptions } from '../utils/profileOptions';
import {
  DEFAULT_DISCOVERY_FILTERS,
  countActiveFilters,
  coerceDiscoveryAgeRange,
} from '../utils/profileFilters';

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
  showHeader = true,
}) {
  const { t } = useTranslation();
  const activeFilterCount = countActiveFilters(discoveryFilters);

  const patchFilters = (updates) => {
    onFiltersChange(coerceDiscoveryAgeRange({ ...discoveryFilters, ...updates }));
  };

  const maxAgeOptions =
    discoveryFilters.ageMin != null
      ? AGE_OPTIONS.filter((age) => age >= discoveryFilters.ageMin)
      : AGE_OPTIONS;

  const patchView = (updates) => {
    onViewPrefsChange({ ...profileViewPrefs, ...updates });
  };

  const handleClearFilters = () => {
    onFiltersChange({ ...DEFAULT_DISCOVERY_FILTERS });
  };

  return (
    <div className="discovery-filters-card privacy-card">
      {showHeader && (
        <div className="discovery-filters-header">
          <div className="discovery-filters-header-title">
            <Filter className="icon-md text-violet" aria-hidden />
            <div>
              <h3 className="privacy-card-title">{t('settingsDiscoveryFiltersTitle')}</h3>
              {activeFilterCount > 0 && (
                <p className="discovery-filters-active-count">
                  {t('discoveryFiltersActiveCount', { count: activeFilterCount })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm discovery-filters-clear-btn"
            onClick={handleClearFilters}
            disabled={disabled || activeFilterCount === 0}
          >
            <RotateCcw className="icon-sm" aria-hidden />
            {t('gridFiltersClear')}
          </button>
        </div>
      )}

      <div className="discovery-filters-body">
        <p className="settings-row-desc discovery-filters-intro">
          {t('settingsDiscoveryFiltersDesc')}
        </p>

        <div className="discovery-filters-field">
          <div className="profile-fields profile-fields--grid">
            <label className="profile-field">
              <span className="profile-field-label">{t('settingsDiscoveryAgeMin')}</span>
              <select
                className="profile-input profile-select"
                value={discoveryFilters.ageMin ?? ''}
                onChange={(e) =>
                  patchFilters({ ageMin: e.target.value ? Number(e.target.value) : null })
                }
                disabled={disabled}
              >
                <option value="">{t('settingsDiscoveryAgeAny')}</option>
                {AGE_OPTIONS.map((age) => (
                  <option key={`min-${age}`} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </label>
            <label className="profile-field">
              <span className="profile-field-label">{t('settingsDiscoveryAgeMax')}</span>
              <select
                className="profile-input profile-select"
                value={discoveryFilters.ageMax ?? ''}
                onChange={(e) =>
                  patchFilters({ ageMax: e.target.value ? Number(e.target.value) : null })
                }
                disabled={disabled}
              >
                <option value="">{t('settingsDiscoveryAgeAny')}</option>
                {maxAgeOptions.map((age) => (
                  <option key={`max-${age}`} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="discovery-filters-field">
          <span className="section-label">{t('settingsDiscoveryGenders')}</span>
          <ProfileChipSelect
            options={GENDER_OPTIONS}
            value={discoveryFilters.genders ?? []}
            onChange={(genders) => patchFilters({ genders })}
            ariaLabel={t('settingsDiscoveryGenders')}
            disabled={disabled}
          />
        </div>

        <div className="discovery-filters-field">
          <span className="section-label">{t('settingsDiscoveryInterests')}</span>
          <ProfileChipSelect
            options={presetInterestOptions()}
            value={discoveryFilters.interests ?? []}
            onChange={(interests) => patchFilters({ interests })}
            ariaLabel={t('settingsDiscoveryInterests')}
            disabled={disabled}
          />
        </div>

        <div className="discovery-filters-field">
          <span className="section-label">{t('settingsDiscoveryInterestMatch')}</span>
          <div className="strategy-list">
            {[
              { id: 'any', label: t('settingsDiscoveryInterestMatchAny') },
              { id: 'all', label: t('settingsDiscoveryInterestMatchAll') },
            ].map((mode) => (
              <div
                key={mode.id}
                role="radio"
                aria-checked={discoveryFilters.interestMatch === mode.id}
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && patchFilters({ interestMatch: mode.id })}
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    patchFilters({ interestMatch: mode.id });
                  }
                }}
                className={`strategy-option ${discoveryFilters.interestMatch === mode.id ? 'strategy-option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="discovery-interest-match"
                  checked={discoveryFilters.interestMatch === mode.id}
                  onChange={() => patchFilters({ interestMatch: mode.id })}
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

        {!showHeader && (
          <div className="discovery-filters-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm discovery-filters-clear-btn"
              onClick={handleClearFilters}
              disabled={disabled || activeFilterCount === 0}
            >
              <RotateCcw className="icon-sm" aria-hidden />
              {t('gridFiltersClear')}
            </button>
          </div>
        )}
      </div>

      {showDisplayToggles && (
        <div className="discovery-filters-display">
          <div className="privacy-card-header discovery-filters-display-header">
            <h3 className="privacy-card-title">{t('settingsDiscoveryDisplayTitle')}</h3>
          </div>
          <p className="settings-row-desc">{t('settingsDiscoveryDisplayDesc')}</p>
          <div className="settings-stack settings-stack--tight">
            {[
              ['showAge', t('settingsDiscoveryShowAge')],
              ['showGender', t('settingsDiscoveryShowGender')],
              ['showInterests', t('settingsDiscoveryShowInterests')],
              ['showLookingFor', t('settingsDiscoveryShowLookingFor')],
            ].map(([key, label]) => (
              <div key={key} className="settings-row settings-row--compact settings-row--flush">
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
        </div>
      )}
    </div>
  );
}
