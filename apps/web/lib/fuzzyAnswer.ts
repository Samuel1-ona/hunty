/**
 * Fuzzy answer matching: normalization, Levenshtein, common alternatives, strictness.
 */

export type AnswerStrictness = 'strict' | 'normal' | 'lenient';

export interface FuzzyMatchOptions {
  /** Primary correct answer (plaintext). */
  answer: string;
  /** Creator-specified accepted alternatives. */
  alternatives?: string[];
  /** Matching strictness. Defaults to "normal". */
  strictness?: AnswerStrictness;
  /** Extra built-in alias expansion (NYC → New York City, etc.). Default true. */
  useCommonAliases?: boolean;
}

export interface FuzzyMatchResult {
  matched: boolean;
  /** How the answer matched, if it did. */
  method?: 'exact' | 'alias' | 'alternative' | 'fuzzy';
  /** Normalized candidate used for comparison. */
  normalizedCandidate: string;
  /** Distance used when method === "fuzzy". */
  distance?: number;
  /** Max distance allowed for the given strictness. */
  maxDistance?: number;
}

/** Common aliases / abbreviations accepted as equivalents. */
export const COMMON_ANSWER_ALIASES: Record<string, string[]> = {
  'new york city': ['nyc', 'new york', 'ny'],
  nyc: ['new york city', 'new york', 'ny'],
  'new york': ['nyc', 'new york city', 'ny'],
  'los angeles': ['la', 'l.a.', 'l.a'],
  la: ['los angeles', 'l.a.', 'l.a'],
  'san francisco': ['sf', 'san fran'],
  sf: ['san francisco', 'san fran'],
  'united states': ['usa', 'us', 'u.s.', 'u.s.a.', 'america'],
  usa: ['united states', 'us', 'america'],
  'united kingdom': ['uk', 'u.k.', 'britain', 'great britain'],
  uk: ['united kingdom', 'britain', 'great britain'],
  saint: ['st', 'st.'],
  st: ['saint', 'st.'],
  'st.': ['saint', 'st'],
  mount: ['mt', 'mt.'],
  mt: ['mount', 'mt.'],
  'mt.': ['mount', 'mt'],
  and: ['&'],
  '&': ['and'],
  'number one': ['1', 'no. 1', 'no 1', '#1'],
  '1': ['one', 'number one', '#1'],
  two: ['2'],
  '2': ['two'],
  three: ['3'],
  '3': ['three'],
  yes: ['y', 'yeah', 'yep'],
  no: ['n', 'nope'],
  true: ['t', 'yes'],
  false: ['f', 'no'],
};

/**
 * Normalize for comparison: lowercase, collapse whitespace, strip most punctuation.
 */
export function normalizeAnswerForMatch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classic Levenshtein edit distance. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);

  for (let j = 0; j < cols; j++) prev[j] = j;

  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

/** Max allowed edit distance for a target string given strictness. */
export function maxDistanceForStrictness(
  targetLength: number,
  strictness: AnswerStrictness
): number {
  if (strictness === 'strict') return 0;
  if (targetLength <= 2) return 0;
  if (strictness === 'lenient') {
    if (targetLength <= 4) return 1;
    if (targetLength <= 8) return 2;
    return Math.min(4, Math.floor(targetLength * 0.3));
  }
  // normal
  if (targetLength <= 4) return 1;
  if (targetLength <= 10) return 2;
  return Math.min(3, Math.floor(targetLength * 0.2));
}

function expandAliases(normalized: string, enabled: boolean): Set<string> {
  const set = new Set<string>([normalized]);
  if (!enabled) return set;
  const aliases = COMMON_ANSWER_ALIASES[normalized];
  if (aliases) {
    for (const a of aliases) set.add(normalizeAnswerForMatch(a));
  }
  // Also expand word-level saint/mount/and substitutions inside phrases
  const words = normalized.split(' ');
  if (words.length > 1) {
    const variants = [words];
    for (let i = 0; i < words.length; i++) {
      const alts = COMMON_ANSWER_ALIASES[words[i]];
      if (!alts) continue;
      for (const alt of alts) {
        const copy = [...words];
        copy[i] = normalizeAnswerForMatch(alt);
        variants.push(copy);
      }
    }
    for (const v of variants) set.add(v.join(' '));
  }
  return set;
}

/**
 * Match a candidate against the primary answer + alternatives using
 * case-insensitive / whitespace-normalized equality, aliases, then Levenshtein.
 */
export function matchAnswerFuzzy(candidate: string, options: FuzzyMatchOptions): FuzzyMatchResult {
  const strictness = options.strictness ?? 'normal';
  const useAliases = options.useCommonAliases !== false;
  const normalizedCandidate = normalizeAnswerForMatch(candidate);

  if (!normalizedCandidate) {
    return { matched: false, normalizedCandidate };
  }

  const targets = [options.answer, ...(options.alternatives ?? [])]
    .map(normalizeAnswerForMatch)
    .filter(Boolean);

  // Exact / alias match against each target
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const targetSet = expandAliases(target, useAliases);
    const candidateSet = expandAliases(normalizedCandidate, useAliases);

    for (const t of targetSet) {
      if (candidateSet.has(t) || normalizedCandidate === t) {
        const method =
          i === 0 && normalizedCandidate === normalizeAnswerForMatch(options.answer)
            ? 'exact'
            : i === 0
              ? 'alias'
              : 'alternative';
        return { matched: true, method, normalizedCandidate };
      }
    }
  }

  if (strictness === 'strict') {
    return { matched: false, normalizedCandidate, maxDistance: 0 };
  }

  // Fuzzy (Levenshtein) against each expanded target
  let bestDistance = Infinity;
  let bestMax = 0;
  for (const target of targets) {
    const targetSet = expandAliases(target, useAliases);
    for (const t of targetSet) {
      const maxDist = maxDistanceForStrictness(t.length, strictness);
      const dist = levenshteinDistance(normalizedCandidate, t);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMax = maxDist;
      }
      if (dist <= maxDist) {
        return {
          matched: true,
          method: 'fuzzy',
          normalizedCandidate,
          distance: dist,
          maxDistance: maxDist,
        };
      }
    }
  }

  return {
    matched: false,
    normalizedCandidate,
    distance: Number.isFinite(bestDistance) ? bestDistance : undefined,
    maxDistance: bestMax,
  };
}

/** Convenience boolean wrapper. */
export function isAnswerCorrectFuzzy(candidate: string, options: FuzzyMatchOptions): boolean {
  return matchAnswerFuzzy(candidate, options).matched;
}
