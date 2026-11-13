// Camelot Key System & Circle of Fifths Matrix
// Keys in Camelot format: 1A-12A (Minor), 1B-12B (Major)

export const CAMELOT_MAP: Record<string, string> = {
  // Minor keys
  'Abm': '1A', 'G#m': '1A', 'Bbm': '3A', 'A#m': '3A', 'Ebm': '2A', 'D#m': '2A',
  'Fm': '4A', 'Cm': '5A', 'Gm': '6A', 'Dm': '7A', 'Am': '8A', 'Em': '9A',
  'Bm': '10A', 'F#m': '11A', 'Gbm': '11A', 'C#m': '12A', 'Dbm': '12A',
  'A Minor': '8A', 'C Minor': '5A', 'D Minor': '7A', 'E Minor': '9A', 'F Minor': '4A', 'G Minor': '6A',
  // Major keys
  'B': '1B', 'F#': '2B', 'Gb': '2B', 'Db': '3B', 'C#': '3B', 'Ab': '4B', 'G#': '4B',
  'Eb': '5B', 'D#': '5B', 'Bb': '6B', 'A#': '6B', 'F': '7B', 'C': '8B', 'G': '9B',
  'D': '10B', 'A': '11B', 'E': '12B',
  'C Major': '8B', 'G Major': '9B', 'D Major': '10B', 'A Major': '11B', 'E Major': '12B', 'F Major': '7B'
};

export function normalizeCamelotKey(rawKey?: string): string | null {
  if (!rawKey) return null;
  const trimmed = rawKey.trim();
  // If already like "8A" or "11B"
  if (/^[1-9]|1[0-2][ABab]$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return CAMELOT_MAP[trimmed] || null;
}

/**
 * Checks harmonic compatibility between two keys:
 * Same key (8A -> 8A), Relative major/minor (8A <-> 8B), Adjacent hour (8A -> 7A or 9A)
 */
export function areKeysHarmonic(keyA?: string, keyB?: string): boolean {
  const normA = normalizeCamelotKey(keyA);
  const normB = normalizeCamelotKey(keyB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const numA = parseInt(normA.slice(0, -1), 10);
  const modeA = normA.slice(-1);
  const numB = parseInt(normB.slice(0, -1), 10);
  const modeB = normB.slice(-1);

  // Relative Major/Minor (same number, different letter)
  if (numA === numB && modeA !== modeB) return true;

  // Adjacent hours in same mode (+1, -1, wrap around 12 to 1)
  if (modeA === modeB) {
    const diff = Math.abs(numA - numB);
    if (diff === 1 || diff === 11) return true;
  }

  return false;
}
