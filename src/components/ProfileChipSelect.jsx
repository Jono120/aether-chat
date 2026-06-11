import { useTranslation } from '../i18n/index.js';

export default function ProfileChipSelect({ options, value = [], onChange, ariaLabel, disabled = false }) {
  const { t } = useTranslation();
  const normalized = options.map((option) => {
    if (typeof option === 'string') return { value: option, label: option };
    if (option.labelKey) return { value: option.value, label: t(option.labelKey) };
    return option;
  });
  const selected = new Set(value);

  const toggle = (optionValue) => {
    if (disabled) return;
    const next = selected.has(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
  };

  return (
    <div className="profile-chip-group" role="group" aria-label={ariaLabel}>
      {normalized.map((option) => {
        const active = selected.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            className={`profile-chip${active ? ' profile-chip--active' : ''}`}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
