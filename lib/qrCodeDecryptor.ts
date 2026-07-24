import { matchesClueAnswer } from './clueAnswerVerification';
import type { Clue } from './types';

const HUNTY_QR_PREFIX = 'hunty:v1:';

type HuntyQrPayload = {
  h?: number;
  c?: number;
  a?: string;
  hash?: string;
  huntId?: number;
  clueId?: number;
  answer?: string;
};

export type ParsedQrPayload =
  | { ok: true; answer?: string; hash?: string; huntId?: number; clueId?: number }
  | { ok: false; error: string };

export type QrVerifyResult =
  | { match: true; answer: string }
  | { match: false; reason: string };

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(normalized + padding);
  }

  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function encodeBase64Url(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function normalizePayload(payload: HuntyQrPayload): ParsedQrPayload {
  const huntId = payload.h ?? payload.huntId;
  const clueId = payload.c ?? payload.clueId;
  const answer = payload.a ?? payload.answer;
  const hash = payload.hash;

  if (!answer && !hash) {
    return { ok: false, error: 'QR payload is missing an answer or hash' };
  }

  return {
    ok: true,
    huntId: typeof huntId === 'number' ? huntId : undefined,
    clueId: typeof clueId === 'number' ? clueId : undefined,
    answer: typeof answer === 'string' ? answer : undefined,
    hash: typeof hash === 'string' ? hash : undefined,
  };
}

function parseHuntyUrl(raw: string): ParsedQrPayload {
  try {
    const checkpointMatch = raw.match(/^hunty:\/\/checkpoint\/(\d+)\/(\d+)/i);
    const huntId = checkpointMatch ? Number(checkpointMatch[1]) : undefined;
    const clueId = checkpointMatch ? Number(checkpointMatch[2]) : undefined;

    const queryIndex = raw.indexOf('?');
    const query = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';
    const params = new URLSearchParams(query);
    const answerParam = params.get('a') ?? params.get('answer') ?? undefined;
    const hashParam = params.get('hash') ?? undefined;

    let answer = answerParam ?? undefined;
    if (answerParam) {
      answer = decodeURIComponent(answerParam);
    }

    return normalizePayload({
      huntId: Number.isFinite(huntId) ? huntId : undefined,
      clueId: Number.isFinite(clueId) ? clueId : undefined,
      answer,
      hash: hashParam ?? undefined,
    });
  } catch {
    return { ok: false, error: 'Invalid Hunty QR URL' };
  }
}

/** Parses a scanned QR payload into structured clue answer data. */
export function parseQrPayload(raw: string): ParsedQrPayload {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'QR code is empty' };
  }

  if (trimmed.startsWith(HUNTY_QR_PREFIX)) {
    try {
      const decoded = decodeBase64Url(trimmed.slice(HUNTY_QR_PREFIX.length));
      return normalizePayload(JSON.parse(decoded) as HuntyQrPayload);
    } catch {
      return { ok: false, error: 'Unable to decrypt QR payload' };
    }
  }

  if (trimmed.startsWith('hunty://')) {
    return parseHuntyUrl(trimmed);
  }

  if (trimmed.startsWith('{')) {
    try {
      return normalizePayload(JSON.parse(trimmed) as HuntyQrPayload);
    } catch {
      return { ok: false, error: 'Invalid QR JSON payload' };
    }
  }

  return { ok: true, answer: trimmed };
}

/** Encodes a checkpoint answer into the signed Hunty QR v1 format. */
export function encodeHuntyQrPayload(payload: {
  huntId: number;
  clueId: number;
  answer: string;
}): string {
  const encoded = encodeBase64Url(
    JSON.stringify({ h: payload.huntId, c: payload.clueId, a: payload.answer }),
  );
  return `${HUNTY_QR_PREFIX}${encoded}`;
}

/**
 * Securely parses a scanned QR code and verifies it against the active clue's
 * Soroban hash requirements.
 */
export async function verifyQrAgainstClue(
  raw: string,
  clue: Clue,
  huntId: number,
): Promise<QrVerifyResult> {
  const parsed = parseQrPayload(raw);
  if (!parsed.ok) {
    return { match: false, reason: parsed.error };
  }

  if (parsed.huntId != null && parsed.huntId !== huntId) {
    return { match: false, reason: 'QR code belongs to a different hunt' };
  }

  if (parsed.clueId != null && parsed.clueId !== clue.id) {
    return { match: false, reason: 'QR code belongs to a different clue' };
  }

  const candidate = parsed.hash ?? parsed.answer;
  if (!candidate) {
    return { match: false, reason: 'QR code does not contain a clue answer' };
  }

  const match = await matchesClueAnswer(candidate, clue, huntId);
  if (!match) {
    return { match: false, reason: 'QR code does not match this clue checkpoint' };
  }

  const answer = parsed.answer ?? candidate;
  return { match: true, answer: answer.trim() };
}
