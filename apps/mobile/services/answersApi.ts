import env from '@config/env';

export interface AnswerSubmission {
  huntId: number;
  clueId: number;
  answer: string;
  wallet: string;
  clientTimestamp?: number;
  hintsUsed?: number;
}

export interface AnswerSubmissionResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown> | null;
}

export function isRetryableAnswerStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function submitClueAnswer(entry: AnswerSubmission): Promise<AnswerSubmissionResult> {
  const response = await fetch(`${env.apiUrl}/v1/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      huntId: entry.huntId,
      clueId: entry.clueId,
      answer: entry.answer,
      wallet: entry.wallet,
      clientTimestamp: entry.clientTimestamp,
      hintsUsed: entry.hintsUsed ?? 0,
    }),
  });

  let body: Record<string, unknown> | null = null;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // The HTTP status is sufficient when the response has no JSON body.
  }

  return { ok: response.ok, status: response.status, body };
}

export async function submitQueuedAnswer(
  entry: AnswerSubmission,
): Promise<Pick<AnswerSubmissionResult, 'ok' | 'status'> & { correct?: boolean }> {
  const { ok, status, body } = await submitClueAnswer(entry);
  return typeof body?.correct === 'boolean'
    ? { ok, status, correct: body.correct }
    : { ok, status };
}
