import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPaymasterBudget, PaymasterBudgetError } from '@/lib/paymaster/client';

const ADDRESS = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

describe('fetchPaymasterBudget', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a malformed address without calling fetch', async () => {
    await expect(fetchPaymasterBudget('not-an-address')).rejects.toMatchObject({
      kind: 'invalid-address',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches and parses budget info for a valid address', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        walletAddress: ADDRESS,
        usedTx: 1,
        maxTx: 3,
        usedBudget: 100_000,
        maxBudget: 10_000_000,
        eligible: true,
      })
    );

    const info = await fetchPaymasterBudget(ADDRESS);

    expect(fetchMock).toHaveBeenCalledWith(`/api/paymaster/budget/${ADDRESS}`, expect.any(Object));
    expect(info.eligible).toBe(true);
    expect(info.maxTx).toBe(3);
  });

  it('throws an http error on a non-2xx response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500 }));

    await expect(fetchPaymasterBudget(ADDRESS)).rejects.toMatchObject({
      kind: 'http',
      status: 500,
    });
  });

  it('throws a network error when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));

    await expect(fetchPaymasterBudget(ADDRESS)).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('throws a parse error when the response body is not valid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalid json');
      },
    } as Response);

    await expect(fetchPaymasterBudget(ADDRESS)).rejects.toMatchObject({
      kind: 'parse',
    });
  });

  it('exposes PaymasterBudgetError as an Error subclass', () => {
    const err = new PaymasterBudgetError('network', 'boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('PaymasterBudgetError');
  });
});
