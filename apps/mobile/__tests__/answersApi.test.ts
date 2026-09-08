import { submitClueAnswer, submitQueuedAnswer } from '@services/answersApi';

jest.mock('@config/env', () => ({
  __esModule: true,
  default: { apiUrl: 'https://api.example.test' },
}));

describe('answersApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('posts the answer contract to the v1 endpoint and returns the server decision', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ correct: true, score: 10 }),
    });

    const result = await submitClueAnswer({
      huntId: 4,
      clueId: 9,
      answer: 'clock tower',
      wallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ2',
      clientTimestamp: 1_700_000_000_000,
      hintsUsed: 1,
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.test/v1/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        huntId: 4,
        clueId: 9,
        answer: 'clock tower',
        wallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ2',
        clientTimestamp: 1_700_000_000_000,
        hintsUsed: 1,
      }),
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      body: { correct: true, score: 10 },
    });
  });

  it('reduces queued submissions to the status contract used by reconciliation', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new Error('not json')),
    });

    await expect(
      submitQueuedAnswer({
        huntId: 4,
        clueId: 9,
        answer: 'clock tower',
        wallet: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ2',
      }),
    ).resolves.toEqual({ ok: false, status: 503 });
  });
});
