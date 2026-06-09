import type { DiscoveryFilters } from '../services/discoveryPreferences.js';

export type FilterableProfile = {
  age?: number | null;
  gender?: string | null;
  tags?: string[];
};

function tagMatchesInterest(tag: string, interest: string): boolean {
  return tag.trim().toLowerCase() === interest.trim().toLowerCase();
}

/** Pure filter logic — must stay aligned with buildDiscoveryFilterSql and profileFilters.js */
export function profileMatchesDiscoveryFilters(
  profile: FilterableProfile,
  filters: DiscoveryFilters,
): boolean {
  if (filters.ageMin != null && profile.age != null && profile.age < filters.ageMin) {
    return false;
  }
  if (filters.ageMax != null && profile.age != null && profile.age > filters.ageMax) {
    return false;
  }

  const genders = filters.genders ?? [];
  if (genders.length > 0 && profile.gender && !genders.includes(profile.gender)) {
    return false;
  }

  const interests = filters.interests ?? [];
  if (interests.length > 0) {
    const tags = profile.tags ?? [];
    if (filters.interestMatch === 'all') {
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
}
