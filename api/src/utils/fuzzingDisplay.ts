/** Distance label presentation by viewer fuzzing strategy (demo — no raw geo). */

const BROAD_BANDS: { pattern: RegExp; label: string }[] = [
  { pattern: /500m|1 km|nearby/i, label: 'Nearby' },
  { pattern: /2 km|3 km|5 km/i, label: 'Within a few km' },
  { pattern: /10 km|15 km|20 km/i, label: 'In your area' },
];

export function applyFuzzingStrategyToLabel(label: string, strategy = 'grid_snap'): string {
  if (!label || strategy === 'grid_snap') return label;

  if (strategy === 'distance_only') {
    for (const band of BROAD_BANDS) {
      if (band.pattern.test(label)) return band.label;
    }
    return 'Nearby';
  }

  if (strategy === 'jitter') {
    const jittered = label
      .replace(/Nearby\s*\(\s*<\s*500m\s*\)/i, 'About 500m away')
      .replace(/Within\s+(\d+)\s*km/i, 'Roughly $1 km');
    return jittered === label ? `${label} (approx.)` : jittered;
  }

  return label;
}
