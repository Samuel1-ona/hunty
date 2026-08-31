import { matchesClueAnswer } from '@lib/clueAnswerVerification';
import { verifyQrAgainstClue } from '@lib/qrCodeDecryptor';
import type { Clue } from '@hunty/types';

const clue: Clue = {
  id: 7,
  huntId: 3,
  question: 'Name the checkpoint',
  answer: 'Clock Tower|Old Clocktower',
  points: 10,
};

describe('offline answer validation', () => {
  it('normalizes cached plaintext answers without a network request', async () => {
    await expect(matchesClueAnswer('  clock-tower ', clue, clue.huntId)).resolves.toBe(true);
  });

  it('accepts a QR answer for the matching cached hunt and clue', async () => {
    await expect(
      verifyQrAgainstClue(
        JSON.stringify({ huntId: clue.huntId, clueId: clue.id, answer: 'Old Clocktower' }),
        clue,
        clue.huntId,
      ),
    ).resolves.toEqual({ match: true, answer: 'Old Clocktower' });
  });

  it('rejects QR payloads for another clue deterministically', async () => {
    await expect(
      verifyQrAgainstClue(
        JSON.stringify({ huntId: clue.huntId, clueId: 99, answer: 'Clock Tower' }),
        clue,
        clue.huntId,
      ),
    ).resolves.toEqual({ match: false, reason: 'QR code belongs to a different clue' });
  });

  it('supports alternative, fuzzy, and assigned variant answers offline', async () => {
    const flexibleClue: Clue = {
      ...clue,
      answer: 'Clock Tower',
      alternativeAnswers: ['Old Bell Tower'],
      answerStrictness: 'normal',
      variants: { B: { answer: 'West Belfry', alternativeAnswers: ['Western Belfry'] } },
    };

    await expect(matchesClueAnswer('old bell towr', flexibleClue, clue.huntId)).resolves.toBe(true);
    await expect(matchesClueAnswer('western belfry', flexibleClue, clue.huntId, 'B')).resolves.toBe(
      true,
    );
  });
});
