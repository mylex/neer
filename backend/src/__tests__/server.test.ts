import request from 'supertest';
import app from '../index';

describe('Server', () => {
  it('should start and respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
  });

  it('should handle 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body.error.message).toContain('Route GET /unknown-route not found');
  });
});