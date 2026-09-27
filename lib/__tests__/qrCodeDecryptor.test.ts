import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../crypto';
import type { Clue } from '../types';
import {
  encodeHuntyQrPayload,
  parseQrPayload,
  verifyQrAgainstClue,
} from '../qrCodeDecryptor';

const clue: Clue = {
  id: 7,
  huntId: 2,
  question: 'Where is the lantern?',
  answer: 'lantern statue',
  points: 10,
};

describe('qrCodeDecryptor', () => {
  it('parses plain-text QR payloads', () => {
    expect(parseQrPayload(' lantern statue ')).toEqual({
      ok: true,
      answer: 'lantern statue',
      hash: undefined,
      huntId: undefined,
      clueId: undefined,
    });
  });

  it('parses encrypted hunty:v1 payloads', () => {
    const raw = encodeHuntyQrPayload({ huntId: 2, clueId: 7, answer: 'lantern statue' });
    expect(parseQrPayload(raw)).toEqual({
      ok: true,
      huntId: 2,
      clueId: 7,
      answer: 'lantern statue',
      hash: undefined,
    });
  });

  it('parses hunty:// checkpoint URLs', () => {
    const raw = 'hunty://checkpoint/2/7?answer=lantern%20statue';
    expect(parseQrPayload(raw)).toEqual({
      ok: true,
      huntId: 2,
      clueId: 7,
      answer: 'lantern statue',
      hash: undefined,
    });
  });

  it('verifies plaintext answers against legacy stored answers', async () => {
    const result = await verifyQrAgainstClue('lantern statue', clue, 2);
    expect(result).toEqual({ match: true, answer: 'lantern statue' });
  });

  it('verifies encrypted payloads against Soroban hashed answers', async () => {
    const hashed = await sha256Hex('stellar' + '3_16');
    const hashedClue: Clue = {
      id: 16,
      huntId: 3,
      question: 'Vault passphrase',
      answer: hashed,
      points: 30,
    };
    const raw = encodeHuntyQrPayload({ huntId: 3, clueId: 16, answer: 'stellar' });

    await expect(verifyQrAgainstClue(raw, hashedClue, 3)).resolves.toEqual({
      match: true,
      answer: 'stellar',
    });
  });

  it('rejects QR codes scoped to another clue', async () => {
    const raw = encodeHuntyQrPayload({ huntId: 2, clueId: 99, answer: 'lantern statue' });
    await expect(verifyQrAgainstClue(raw, clue, 2)).resolves.toEqual({
      match: false,
      reason: 'QR code belongs to a different clue',
    });
  });

  it('rejects empty QR payloads', async () => {
    await expect(verifyQrAgainstClue('   ', clue, 2)).resolves.toEqual({
      match: false,
      reason: 'QR code is empty',
    });
  });
});
