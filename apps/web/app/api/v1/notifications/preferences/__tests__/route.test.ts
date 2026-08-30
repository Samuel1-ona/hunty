import { beforeEach, describe, expect, it, vi } from 'vitest';

const walletAddress = 'GPLAYER';

function request(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/v1/notifications/preferences', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function getRequest(wallet = walletAddress): Request {
  return new Request(
    `http://localhost/api/v1/notifications/preferences?walletAddress=${encodeURIComponent(wallet)}`
  );
}

describe('/api/v1/notifications/preferences', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
  });

  it('returns defaults for a wallet with no saved preferences', async () => {
    const { GET } = await import('../route');
    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences).toMatchObject({
      enabled: true,
      huntEvents: true,
      rewards: true,
      social: true,
      achievements: true,
    });
  });

  it('persists independent category changes for the wallet', async () => {
    const { GET, PUT } = await import('../route');
    const response = await PUT(
      request('PUT', {
        walletAddress,
        preferences: { huntEvents: false, social: false },
      })
    );
    const saved = await response.json();

    expect(response.status).toBe(200);
    expect(saved.preferences.huntEvents).toBe(false);
    expect(saved.preferences.social).toBe(false);
    expect(saved.preferences.rewards).toBe(true);

    const readBack = await GET(getRequest());
    const readBody = await readBack.json();
    expect(readBody.preferences.huntEvents).toBe(false);
    expect(readBody.preferences.social).toBe(false);
    expect(readBody.preferences.rewards).toBe(true);
  });

  it('stores the global mute without changing category choices', async () => {
    const { GET, PUT } = await import('../route');
    await PUT(
      request('PUT', {
        walletAddress,
        preferences: { rewards: false },
      })
    );
    await PUT(
      request('PUT', {
        walletAddress,
        preferences: { enabled: false },
      })
    );

    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.preferences.enabled).toBe(false);
    expect(body.preferences.rewards).toBe(false);
  });

  it("does not share one wallet's preferences with another wallet", async () => {
    const { GET, PUT } = await import('../route');
    await PUT(
      request('PUT', {
        walletAddress,
        preferences: { social: false },
      })
    );

    const response = await GET(getRequest('GOTHER'));
    const body = await response.json();
    expect(body.preferences.social).toBe(true);
  });

  it('rejects writes without a wallet and preference document', async () => {
    const { PUT } = await import('../route');
    const response = await PUT(request('PUT', { preferences: { social: false } }));
    expect(response.status).toBe(400);
  });
});
