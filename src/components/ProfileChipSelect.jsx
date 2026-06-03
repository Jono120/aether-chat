import React from 'react';

export default function ProfileChipSelect({ options, value = [], onChange, ariaLabel }) {
  const selected = new Set(value);

  const toggle = (option) => {
    const next = selected.has(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(next);
  };

  return (
    <div className="profile-chip-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = selected.has(option);
        return (
          <button
            key={option}
            type="button"
            className={`profile-chip${active ? ' profile-chip--active' : ''}`}
            aria-pressed={active}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
