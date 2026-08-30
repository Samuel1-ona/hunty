/**
 * Free-form hunt tags: normalize, autocomplete, and content-based suggestions.
 */

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'this',
  'that',
  'it',
  'as',
  'into',
  'your',
  'you',
  'we',
  'our',
  'their',
  'find',
  'hunt',
  'clue',
  'clues',
  'solve',
  'answer',
  'game',
  'play',
]);

/** Normalize a raw tag string for storage and comparison. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

/** Deduplicate and normalize a list of tags. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const n = normalizeTag(tag);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    result.push(n);
  }
  return result;
}

/**
 * Suggest tags from title/description/question text.
 * Picks meaningful tokens and common multi-word phrases.
 */
export function suggestTagsFromContent(
  content: { title?: string; description?: string; questions?: string[] },
  existing: string[] = [],
  limit = 8
): string[] {
  const existingSet = new Set(normalizeTags(existing));
  const text = [content.title, content.description, ...(content.questions ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const tokens = text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  const freq = new Map<string, number>();
  for (const token of tokens) {
    const tag = normalizeTag(token);
    if (!tag || existingSet.has(tag)) continue;
    freq.set(tag, (freq.get(tag) ?? 0) + 1);
  }

  // Boost known domain keywords
  const DOMAIN_BOOST: Record<string, number> = {
    outdoor: 3,
    indoor: 2,
    walking: 2,
    mural: 3,
    landmark: 3,
    park: 2,
    museum: 3,
    campus: 2,
    downtown: 2,
    night: 2,
    daytime: 1,
    beginner: 2,
    advanced: 2,
    team: 2,
    solo: 2,
    timed: 2,
    photo: 2,
    qr: 2,
    treasure: 3,
  };

  for (const [key, boost] of Object.entries(DOMAIN_BOOST)) {
    if (text.includes(key) && !existingSet.has(key)) {
      freq.set(key, (freq.get(key) ?? 0) + boost);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Autocomplete against a known tag corpus (plus optional extras).
 * Case-insensitive prefix / substring match.
 */
export function autocompleteTags(query: string, corpus: string[], limit = 10): string[] {
  const q = normalizeTag(query);
  if (!q) return [];

  const normalizedCorpus = normalizeTags(corpus);
  const prefix: string[] = [];
  const contains: string[] = [];

  for (const tag of normalizedCorpus) {
    if (tag === q) continue;
    if (tag.startsWith(q)) prefix.push(tag);
    else if (tag.includes(q)) contains.push(tag);
  }

  return [...prefix, ...contains].slice(0, limit);
}

/** True when a hunt's tags include any of the filter tags. */
export function huntMatchesTags(huntTags: string[] | undefined, filterTags: string[]): boolean {
  if (!filterTags.length) return true;
  if (!huntTags?.length) return false;
  const set = new Set(normalizeTags(huntTags));
  return filterTags.every((t) => set.has(normalizeTag(t)));
}
