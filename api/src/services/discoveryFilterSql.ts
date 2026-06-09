import type { DiscoveryFilters } from './discoveryPreferences.js';

export function isDiscoveryFilterActive(filters: DiscoveryFilters): boolean {
  return (
    filters.ageMin != null ||
    filters.ageMax != null ||
    (filters.genders?.length ?? 0) > 0 ||
    (filters.interests?.length ?? 0) > 0
  );
}

export type SqlFragment = {
  clauses: string[];
  params: unknown[];
  nextParam: number;
};

/** Build AND clauses for discovery filters; param indices start at startIndex. */
export function buildDiscoveryFilterSql(
  filters: DiscoveryFilters,
  startIndex: number,
): SqlFragment {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

  if (filters.ageMin != null) {
    clauses.push(`(p.age IS NULL OR p.age >= $${i})`);
    params.push(filters.ageMin);
    i += 1;
  }

  if (filters.ageMax != null) {
    clauses.push(`(p.age IS NULL OR p.age <= $${i})`);
    params.push(filters.ageMax);
    i += 1;
  }

  if (filters.genders?.length) {
    clauses.push(`(p.gender IS NULL OR p.gender = ANY($${i}::text[]))`);
    params.push(filters.genders);
    i += 1;
  }

  if (filters.interests?.length) {
    if (filters.interestMatch === 'all') {
      clauses.push(`NOT EXISTS (
        SELECT 1 FROM unnest($${i}::text[]) AS interest
        WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.tags) AS tag
          WHERE lower(tag) = lower(interest)
        )
      )`);
    } else {
      clauses.push(`EXISTS (
        SELECT 1 FROM unnest($${i}::text[]) AS interest
        WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.tags) AS tag
          WHERE lower(tag) = lower(interest)
        )
      )`);
    }
    params.push(filters.interests);
    i += 1;
  }

  return { clauses, params, nextParam: i };
}
