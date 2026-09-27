import { describe, it, expect } from 'vitest';
import request from 'supertest';

// Import handlers from the app directory.
import { GET as getHunts } from '../../app/api/v1/hunts/route';
import { GET as getLeaderboard } from '../../app/api/v1/hunts/[id]/leaderboard/route';
import { GET as getFeatured } from '../../app/api/admin/featured/route';
import { GET as getIpfs } from '../../app/api/ipfs/route';
import { GET as getAnalytics } from '../../app/api/analytics/route';

function handlerToExpress(handler) {
  return async (req, res) => {
    const result = await handler(req);
    if (result?.json) {
      const data = await result.json();
      res.status(result.status || 200).json(data);
    } else {
      res.status(200).send(result);
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
    expect(response.body).toHaveProperty('leaderboard');
  });

  it('GET /api/admin/featured returns featured items', async () => {
    const app = request(handlerToExpress(getFeatured));
    const response = await app.get('/api/admin/featured');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/ipfs returns IPFS info', async () => {
    const app = request(handlerToExpress(getIpfs));
    const response = await app.get('/api/ipfs');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('cid');
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
