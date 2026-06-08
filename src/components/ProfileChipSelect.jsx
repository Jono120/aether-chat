import React from 'react';

export default function ProfileChipSelect({ options, value = [], onChange, ariaLabel, disabled = false }) {
  const normalized = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
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
