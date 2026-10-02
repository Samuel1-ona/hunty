import type { Clue } from '@hunty/types';

export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function matchesClueAnswer(
  submitted: string,
  clue: Clue,
  _huntId?: number,
): Promise<boolean> {
  const answer = normalizeAnswer(submitted);
  const expected = normalizeAnswer(clue.answer);
  if (answer === '') return false;
  return answer === expected;
}
