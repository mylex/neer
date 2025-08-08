import { RateLimiter, RateLimiterConfig } from '../RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  const config: RateLimiterConfig = {
    requestsPerMinute: 60,
    burstLimit: 5
  };

  beforeEach(() => {
    rateLimiter = new RateLimiter(config);
  });

  describe('constructor', () => {
    it('should create a rate limiter with valid config', () => {
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should throw error for invalid requestsPerMinute', () => {
      expect(() => new RateLimiter({ requestsPerMinute: 0, burstLimit: 5 }))
        .toThrow('requestsPerMinute must be greater than 0');
    });

    it('should throw error for invalid burstLimit', () => {
      expect(() => new RateLimiter({ requestsPerMinute: 60, burstLimit: 0 }))
        .toThrow('burstLimit must be greater than 0');
    });

    it('should throw error when burstLimit exceeds requestsPerMinute', () => {
      expect(() => new RateLimiter({ requestsPerMinute: 30, burstLimit: 40 }))
        .toThrow('burstLimit cannot be greater than requestsPerMinute');
    });
  });

  describe('waitForSlot', () => {
    it('should allow immediate request when under limits', async () => {
      const startTime = Date.now();
      await rateLimiter.waitForSlot();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should be immediate
    });

    it('should enforce burst limit', async () => {
      // Make burst limit number of requests
      for (let i = 0; i < config.burstLimit; i++) {
        await rateLimiter.waitForSlot();
      }

      // Next request should be delayed
      const startTime = Date.now();
      await rateLimiter.waitForSlot();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThan(900); // Should wait ~1 second
    }, 10000);
  });

  describe('getStats', () => {
    it('should return correct initial stats', () => {
      const stats = rateLimiter.getStats();
      
      expect(stats.totalRequests).toBe(0);
      expect(stats.requestsInLastMinute).toBe(0);
      expect(stats.requestsInLastSecond).toBe(0);
      expect(stats.canMakeRequest).toBe(true);
      expect(stats.nextAvailableSlot).toBe(0);
    });

    it('should update stats after requests', async () => {
      await rateLimiter.waitForSlot();
      await rateLimiter.waitForSlot();
      
      const stats = rateLimiter.getStats();
      
      expect(stats.totalRequests).toBe(2);
      expect(stats.requestsInLastMinute).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset all counters and history', async () => {
      await rateLimiter.waitForSlot();
      await rateLimiter.waitForSlot();
      
      rateLimiter.reset();
      const stats = rateLimiter.getStats();
      
      expect(stats.totalRequests).toBe(0);
      expect(stats.requestsInLastMinute).toBe(0);
      expect(stats.canMakeRequest).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = { requestsPerMinute: 30 };
      rateLimiter.updateConfig(newConfig);
      
      // Should not throw error, indicating config was updated successfully
      expect(() => rateLimiter.getStats()).not.toThrow();
    });
  });
});