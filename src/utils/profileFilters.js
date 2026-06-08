export const DEFAULT_DISCOVERY_FILTERS = {
  ageMin: null,
  ageMax: null,
  genders: [],
  interests: [],
  interestMatch: 'any',
};

export const DEFAULT_VIEW_PREFS = {
  showAge: true,
  showGender: true,
  showInterests: true,
  showLookingFor: true,
};

function tagMatchesInterest(tag, interest) {
  return String(tag).trim().toLowerCase() === String(interest).trim().toLowerCase();
}

export function applyDiscoveryFilters(profiles, filters = DEFAULT_DISCOVERY_FILTERS) {
  const { ageMin, ageMax, genders, interests, interestMatch } = {
    ...DEFAULT_DISCOVERY_FILTERS,
    ...filters,
  };

  return profiles.filter((profile) => {
    if (ageMin != null && profile.age != null && profile.age < ageMin) return false;
    if (ageMax != null && profile.age != null && profile.age > ageMax) return false;

    if (genders.length > 0 && profile.gender && !genders.includes(profile.gender)) {
      return false;
    }

    if (interests.length > 0) {
      const tags = profile.tags ?? [];
      if (interestMatch === 'all') {
        const hasAll = interests.every((interest) =>
          tags.some((tag) => tagMatchesInterest(tag, interest)),
        );
        if (!hasAll) return false;
      } else {
        const hasAny = interests.some((interest) =>
          tags.some((tag) => tagMatchesInterest(tag, interest)),
        );
        if (!hasAny) return false;
      }
    }

    return true;
  });
}

export function maskProfileForView(profile, viewPrefs = DEFAULT_VIEW_PREFS) {
  const prefs = { ...DEFAULT_VIEW_PREFS, ...viewPrefs };
  return {
    ...profile,
    age: prefs.showAge ? profile.age : null,
    gender: prefs.showGender ? profile.gender : null,
    tags: prefs.showInterests ? profile.tags : [],
    lookingFor: prefs.showLookingFor ? profile.lookingFor : [],
  };
}

export function countActiveFilters(filters = DEFAULT_DISCOVERY_FILTERS) {
  let count = 0;
  if (filters.ageMin != null) count += 1;
  if (filters.ageMax != null) count += 1;
  if (filters.genders?.length) count += 1;
  if (filters.interests?.length) count += 1;
  return count;
}
