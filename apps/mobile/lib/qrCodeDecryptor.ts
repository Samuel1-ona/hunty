import type { Clue } from '@hunty/types';

export interface QrVerificationResult {
  match: boolean;
  reason?: string;
}

export async function verifyQrAgainstClue(
  qrData: string,
  _clue: Clue,
  _huntId: number,
): Promise<QrVerificationResult> {
  const trimmed = qrData.trim();
  if (!trimmed) {
    return { match: false, reason: 'No QR data provided.' };
  }
  return { match: true };
}
