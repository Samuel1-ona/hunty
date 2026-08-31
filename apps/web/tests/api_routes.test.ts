import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-expect-error supertest has no types installed
import request from 'supertest';

import { GET as getFeatured } from '@/app/api/admin/featured/route';
import { GET as getAnalytics } from '@/app/api/analytics/performance/route';
import { POST as postIpfs, GET as getIpfs } from '@/app/api/ipfs/route';
import { GET as getHunts } from '@/app/api/v1/hunts/route';
import { GET as getHuntById } from '@/app/api/v1/hunts/[id]/route';
import { GET as getLeaderboard } from '@/app/api/v1/hunts/[id]/leaderboard/route';
import { GET as getPublicLeaderboard } from '@/app/api/v1/hunts/[id]/leaderboard/public/route';
import { GET as getLeaderboardOgImage } from '@/app/api/og/leaderboard/route';
import { GET as getResultOgImage } from '@/app/api/og/result/route';

function handlerToExpress(handler: unknown) {
  return async (req: any, res: any) => {
    try {
      const url = `http://localhost${req.url || req.originalUrl}`;
      const method = req.method;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => headers.append(key, v));
          } else {
            headers.set(key, String(value));
          }
        }
      }
      let body = undefined;
      if (method !== "GET" && method !== "HEAD" && req.body) {
        body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      }
      
      const webRequest = new Request(url, {
        method,
        headers,
        body,
      });

      // Parse route parameters from the URL path.
      // e.g. /api/v1/hunts/123/leaderboard -> id = 123
      const params: Record<string, string> = {};
      const matchLeaderboard = req.url.match(/\/api\/v1\/hunts\/([^\/]+)\/leaderboard/);
      if (matchLeaderboard) {
        params.id = matchLeaderboard[1];
      }
      const matchHuntId = req.url.match(/\/api\/v1\/hunts\/([^\/]+)$/);
      if (matchHuntId && !params.id) {
        params.id = matchHuntId[1];
      }

      const result = await handler(webRequest, { params });
      
      if (result instanceof Response) {
        res.statusCode = result.status;
        result.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        const contentType = result.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await result.json();
          res.end(JSON.stringify(data));
        } else {
          const text = await result.text();
          res.end(text);
        }
      } else if (result?.json) {
        const data = await result.json();
        res.statusCode = result.status || 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(data));
      } else {
        res.statusCode = 200;
        res.end(typeof result === "string" ? result : JSON.stringify(result));
      }
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  };
}

describe('API Integration Tests', () => {
  it('GET /api/v1/hunts should return paginated hunts', async () => {
    const app = request(handlerToExpress(getHunts));
    const response = await app.get('/api/v1/hunts?limit=5');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
  });

  it('GET /api/v1/hunts/:id/leaderboard returns leaderboard data', async () => {
    const app = request(handlerToExpress(getLeaderboard));
    const response = await app.get('/api/v1/hunts/123/leaderboard');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
  });

  it('GET /api/v1/hunts/:id/leaderboard/public returns public leaderboard payload', async () => {
    const app = request(handlerToExpress(getPublicLeaderboard));
    const response = await app.get('/api/v1/hunts/123/leaderboard/public');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('hunt');
    expect(response.body).toHaveProperty('leaderboard');
    expect(response.body).toHaveProperty('embedUrl');
  });

  it('GET /api/og/leaderboard returns an image response', async () => {
    const app = request(handlerToExpress(getLeaderboardOgImage));
    const response = await app.get('/api/og/leaderboard?huntId=123&wallet=GABC123');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image');
  });

  it('GET /api/og/result returns a result-card image response on completion', async () => {
    const app = request(handlerToExpress(getResultOgImage));
    const response = await app.get('/api/og/result?huntId=3&wallet=GABC123&rank=2&time=300');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image');
  });

  it('GET /api/admin/featured returns featured items', async () => {
    const app = request(handlerToExpress(getFeatured));
    const response = await app.get('/api/admin/featured');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('featuredHuntId');
  });

  it('POST /api/ipfs returns 503 if not configured', async () => {
    const app = request(handlerToExpress(postIpfs));
    const response = await app.post('/api/ipfs');
    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/analytics returns analytics data', async () => {
    const app = request(handlerToExpress(getAnalytics));
    const response = await app.get('/api/analytics');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metrics');
  });

  it('Unauthorized access returns 401 when applicable', async () => {
    const app = request(handlerToExpress(getHunts));
    const response = await app.get('/api/v1/hunts');
    if (response.status === 401) {
      expect(response.body).toHaveProperty('error');
    } else {
      expect([200, 403]).toContain(response.status);
    }
  });

  it('Error response follows format', async () => {
    const errorHandler = async () => { throw new Error('Test error'); };
    const app = request(handlerToExpress(errorHandler));
    const response = await app.get('/api/error');
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/v1/hunts/[id] - private hunt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for a private hunt', async () => {
    vi.mock('@/lib/db/queryOptimizer', () => ({
      getPublicHuntByIdOptimized: vi.fn().mockReturnValue(undefined),
    }));

    const { GET } = await import('@/app/api/v1/hunts/[id]/route');
    const app = request(handlerToExpress(GET));
    const response = await app.get('/api/v1/hunts/999');
    expect(response.status).toBe(404);
  });
});
