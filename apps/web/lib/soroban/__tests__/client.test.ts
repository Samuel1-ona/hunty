import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Soroban RPC client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getSorobanRpcOptimizer', () => {
    it('creates and returns a singleton SorobanRpcOptimizer', async () => {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_SOROBAN_RPC_URL', 'https://rpc.test');
      vi.stubEnv('NEXT_PUBLIC_SOROBAN_FALLBACK_RPC_URL', 'https://fallback.test');
      vi.stubEnv('NEXT_PUBLIC_SOROBAN_DEBOUNCE_MS', '5');
      vi.stubEnv('NEXT_PUBLIC_SOROBAN_READ_TTL_MS', '5000');

      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => [{ id: '1', result: 'ok' }],
      });

      const { getSorobanRpcOptimizer, readSorobanContractState } = await import('../client');

      const optimizer = getSorobanRpcOptimizer();
      expect(optimizer).toBeDefined();
      expect(typeof optimizer.readContractState).toBe('function');

      const resultPromise = readSorobanContractState({
        key: 'test-key',
        method: 'getContractData',
        params: ['arg1'],
      });

      const result = await resultPromise;
      expect(result).toBe('ok');
    }, 15_000);

    it('returns the same instance on subsequent calls', async () => {
      vi.resetModules();

      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => [{ id: '1', result: 'cached' }],
      });

      const { getSorobanRpcOptimizer } = await import('../client');

      const a = getSorobanRpcOptimizer();
      const b = getSorobanRpcOptimizer();
      expect(a).toBe(b);
    });
  });

  describe('readSorobanContractState', () => {
    it('forwards errors to Sentry and re-throws', async () => {
      vi.resetModules();
      const sentry = await import('@sentry/nextjs');
      const captureExceptionSpy = vi.spyOn(sentry, 'captureException');

      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockRejectedValue(new Error('RPC failure'));

      const { readSorobanContractState } = await import('../client');

      await expect(
        readSorobanContractState({
          key: 'error-key',
          method: 'getContractData',
        })
      ).rejects.toThrow('RPC failure');

      expect(captureExceptionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'RPC failure' }),
        expect.objectContaining({
          tags: { source: 'sorobanRpc', method: 'getContractData' },
        })
      );
    }, 15_000);

    it('returns parsed response on success', async () => {
      vi.resetModules();

      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => [{ id: '1', result: { value: 42 } }],
      });

      const { readSorobanContractState } = await import('../client');

      const result = await readSorobanContractState<{ value: number }>({
        key: 'parsed-key',
        method: 'getContractData',
        parser: (raw) => ({ value: (raw as { value: number }).value * 2 }),
      });

      expect(result).toEqual({ value: 84 });
    }, 15_000);
  });
});
