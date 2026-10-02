export const EMPTY_ANSWER_ERROR = 'Please enter an answer before submitting.';

export function normalizeClueAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidClueAnswer(submitted: string): boolean {
  return submitted.trim().length > 0;
}
