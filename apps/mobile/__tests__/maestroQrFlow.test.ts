/**
 * Keeps the Maestro QR flow's injected payloads in sync with the real QR
 * verification logic, so a change to the payload format or seed data fails
 * here instead of only on an emulator run.
 */
import { readFileSync } from 'fs';
import path from 'path';

import { verifyQrAgainstClue } from '@lib/qrCodeDecryptor';
import type { Clue } from '@lib/types';

const FLOW_PATH = path.join(__dirname, '..', '.maestro', 'flows', 'scan-qr-clue.yaml');

function flowEnv(name: string): string {
  const flow = readFileSync(FLOW_PATH, 'utf8');
  const match = flow.match(new RegExp(`^\\s+${name}:\\s*'([^']+)'`, 'm'));
  if (!match) throw new Error(`${name} not found in ${FLOW_PATH}`);
  return match[1];
}

// Mirrors SEED_CLUES in store/huntStore.ts for hunt 1 ("City Secrets").
const clue1 = { id: 1, huntId: 1, question: 'q1', answer: 'spiral mural', points: 10 } as Clue;
const clue2 = { id: 2, huntId: 1, question: 'q2', answer: 'lantern statue', points: 10 } as Clue;

describe('Maestro scan-qr-clue flow payloads', () => {
  it('VALID_CLUE_QR is accepted for the first clue of hunt 1', async () => {
    const result = await verifyQrAgainstClue(flowEnv('VALID_CLUE_QR'), clue1, 1);
    expect(result).toEqual({ match: true, answer: 'spiral mural' });
  });

  it('WRONG_CLUE_QR is rejected while the first clue is active', async () => {
    const result = await verifyQrAgainstClue(flowEnv('WRONG_CLUE_QR'), clue1, 1);
    expect(result).toEqual({ match: false, reason: 'QR code belongs to a different clue' });
  });

  it('WRONG_CLUE_QR is a genuine answer for clue 2, so only the clue check rejects it', async () => {
    const result = await verifyQrAgainstClue(flowEnv('WRONG_CLUE_QR'), clue2, 1);
    expect(result.match).toBe(true);
  });

  it('seed data still matches the fixtures used above', () => {
    const store = readFileSync(path.join(__dirname, '..', 'store', 'huntStore.ts'), 'utf8');
    expect(store).toMatch(/id: 1,\s+huntId: 1,[\s\S]*?answer: 'spiral mural'/);
    expect(store).toMatch(/id: 2,\s+huntId: 1,[\s\S]*?answer: 'lantern statue'/);
    expect(store).toMatch(/id: 1,\s+title: 'City Secrets',[\s\S]*?cluesCount: 5,/);
  });
});
