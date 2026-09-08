import { Buffer } from 'buffer';

import type { Clue } from '@hunty/types';

import { matchesClueAnswer } from './clueAnswerVerification';

type QrPayload = {
  h?: number;
  c?: number;
  a?: string;
  hash?: string;
  huntId?: number;
  clueId?: number;
  answer?: string;
};

export type QrVerifyResult = { match: true; answer: string } | { match: false; reason: string };

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function parsePayload(raw: string): QrPayload | null {
  const value = raw.trim();
  try {
    if (value.startsWith('hunty:v1:')) {
      return JSON.parse(decodeBase64Url(value.slice('hunty:v1:'.length))) as QrPayload;
    }
    if (value.startsWith('{')) {
      return JSON.parse(value) as QrPayload;
    }
    if (value.startsWith('hunty://')) {
      const checkpoint = value.match(/^hunty:\/\/checkpoint\/(\d+)\/(\d+)/i);
      const query = value.includes('?') ? value.slice(value.indexOf('?') + 1) : '';
      const params = new URLSearchParams(query);
      return {
        huntId: checkpoint ? Number(checkpoint[1]) : undefined,
        clueId: checkpoint ? Number(checkpoint[2]) : undefined,
        answer: params.get('a') ?? params.get('answer') ?? undefined,
        hash: params.get('hash') ?? undefined,
      };
    }
    return value ? { answer: value } : null;
  } catch {
    return null;
  }
}

export async function verifyQrAgainstClue(
  raw: string,
  clue: Clue,
  huntId: number,
): Promise<QrVerifyResult> {
  const payload = parsePayload(raw);
  if (!payload) return { match: false, reason: 'Unable to read QR payload' };

  const payloadHuntId = payload.h ?? payload.huntId;
  const payloadClueId = payload.c ?? payload.clueId;
  if (payloadHuntId != null && payloadHuntId !== huntId) {
    return { match: false, reason: 'QR code belongs to a different hunt' };
  }
  if (payloadClueId != null && payloadClueId !== clue.id) {
    return { match: false, reason: 'QR code belongs to a different clue' };
  }

  const candidate = payload.hash ?? payload.a ?? payload.answer;
  if (!candidate || !(await matchesClueAnswer(candidate, clue, huntId))) {
    return { match: false, reason: 'QR code does not match this clue checkpoint' };
  }
  return { match: true, answer: (payload.a ?? payload.answer ?? candidate).trim() };
}
