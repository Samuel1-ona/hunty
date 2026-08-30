import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifyWallet = vi.fn();
const notifyWallets = vi.fn();

vi.mock('@/lib/notifications/pushService', () => ({
  notifyWallet: (...args: unknown[]) => notifyWallet(...args),
  notifyWallets: (...args: unknown[]) => notifyWallets(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

async function loadRoute() {
  vi.resetModules();
  notifyWallet.mockReset();
  notifyWallets.mockReset();
  return import('../route');
}

function sendRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function withBearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

const validBody = {
  type: 'hunt_start',
  walletAddresses: ['GALICE00000000000000000000000000000000000000000000000'],
  context: { huntId: 1, huntName: 'Test Hunt' },
};

describe('POST /api/push/send', () => {
  beforeEach(() => {
    delete process.env.PUSH_API_SECRET;
    delete process.env.ADMIN_API_SECRET;
  });

  it('rejects requests with no Authorization header when no secret is configured (fails closed, not open)', async () => {
    const { POST } = await loadRoute();
    const res = await POST(sendRequest(validBody) as any);
    expect(res.status).toBe(401);
    expect(notifyWallet).not.toHaveBeenCalled();
  });

  it('rejects requests with no Authorization header when PUSH_API_SECRET is configured', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const res = await POST(sendRequest(validBody) as any);
    expect(res.status).toBe(401);
    expect(notifyWallet).not.toHaveBeenCalled();
  });

  it('rejects an incorrect bearer token', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const res = await POST(sendRequest(validBody, withBearer('wrong-secret')) as any);
    expect(res.status).toBe(401);
    expect(notifyWallet).not.toHaveBeenCalled();
  });

  it('accepts the configured PUSH_API_SECRET as a bearer token', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const res = await POST(sendRequest(validBody, withBearer('correct-push-secret')) as any);
    expect(res.status).toBe(200);
    expect(notifyWallet).toHaveBeenCalledTimes(1);
  });

  it('also accepts the configured ADMIN_API_SECRET as a bearer token (admin session equivalent)', async () => {
    process.env.ADMIN_API_SECRET = 'correct-admin-secret';
    const { POST } = await loadRoute();
    const res = await POST(sendRequest(validBody, withBearer('correct-admin-secret')) as any);
    expect(res.status).toBe(200);
    expect(notifyWallet).toHaveBeenCalledTimes(1);
  });

  it("does not accept the admin secret's value if only PUSH_API_SECRET is configured with a different value", async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    process.env.ADMIN_API_SECRET = 'correct-admin-secret';
    const { POST } = await loadRoute();
    const res = await POST(sendRequest(validBody, withBearer('some-other-token')) as any);
    expect(res.status).toBe(401);
  });

  it('rejects a malformed JSON body even with a valid credential', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...withBearer('correct-push-secret') },
      body: '{{{not valid json',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('validates type against the known PushEventType list', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const res = await POST(
      sendRequest(
        { ...validBody, type: 'not_a_real_event' },
        withBearer('correct-push-secret')
      ) as any
    );
    expect(res.status).toBe(400);
    expect(notifyWallet).not.toHaveBeenCalled();
  });

  it('requires a non-empty walletAddresses array', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const res = await POST(
      sendRequest({ ...validBody, walletAddresses: [] }, withBearer('correct-push-secret')) as any
    );
    expect(res.status).toBe(400);
    expect(notifyWallet).not.toHaveBeenCalled();
  });

  it('fans out to notifyWallets when multiple recipients are given', async () => {
    process.env.PUSH_API_SECRET = 'correct-push-secret';
    const { POST } = await loadRoute();
    const res = await POST(
      sendRequest(
        {
          ...validBody,
          walletAddresses: [
            'GALICE0000000000000000000000000000000000000000000000',
            'GBOB0000000000000000000000000000000000000000000000000',
          ],
        },
        withBearer('correct-push-secret')
      ) as any
    );
    expect(res.status).toBe(200);
    expect(notifyWallets).toHaveBeenCalledTimes(1);
    expect(notifyWallet).not.toHaveBeenCalled();
  });
});
