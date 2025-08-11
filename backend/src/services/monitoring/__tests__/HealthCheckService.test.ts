import { HealthCheckService } from '../HealthCheckService';
import { metricsCollector } from '../MetricsCollector';

// Mock dependencies
jest.mock('../SystemLogger', () => ({
  systemLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../MetricsCollector', () => ({
  metricsCollector: {
    getAllScrapingMetrics: jest.fn(),
    getScrapingSuccessRate: jest.fn()
  }
}));

// Mock database pool
const mockDbPool = {
  query: jest.fn(),
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0
};

// Mock Redis client
const mockRedisClient = {
  ping: jest.fn(),
  info: jest.fn()
};

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    // Reset singleton
    (HealthCheckService as any).instance = undefined;
    healthCheckService = HealthCheckService.getInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock setInterval to prevent actual intervals during tests
    jest.spyOn(global, 'setInterval').mockImplementation(() => ({} as any));
    
    // Setup default mock responses
    mockDbPool.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\r\nconnected_clients:5\r\n');
    
    (metricsCollector.getAllScrapingMetrics as jest.Mock).mockReturnValue([
      { siteName: 'site1', totalAttempts: 100 },
      { siteName: 'site2', totalAttempts: 50 }
    ]);
    
    (metricsCollector.getScrapingSuccessRate as jest.Mock).mockReturnValue(85);
  });

  afterEach(() => {
    healthCheckService.stopPeriodicHealthChecks();
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = HealthCheckService.getInstance();
      const instance2 = HealthCheckService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('database health check', () => {
    beforeEach(() => {
      healthCheckService.setDatabasePool(mockDbPool as any);
    });

    it('should return healthy status for successful database check', async () => {
      const healthStatus = await healthCheckService.performHealthCheck();
      
      const dbHealth = healthStatus.services.find(s => s.service === 'database');
      expect(dbHealth).toEqual({
        service: 'database',
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          queryResult: { health_check: 1 },
          poolStatus: {
            totalConnections: 10,
            idleConnections: 5,
            waitingClients: 0
          }
        }
      });
    });

    it('should return degraded status for slow database response', async () => {
      // Mock slow response
      mockDbPool.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [{ health_check: 1 }] }), 1100))
      );

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const dbHealth = healthStatus.services.find(s => s.service === 'database');
      expect(dbHealth?.status).toBe('degraded');
      expect(dbHealth?.responseTime).toBeGreaterThan(1000);
    });

    it('should return unhealthy status for database error', async () => {
      mockDbPool.query.mockRejectedValue(new Error('Connection failed'));

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const dbHealth = healthStatus.services.find(s => s.service === 'database');
      expect(dbHealth).toEqual({
        service: 'database',
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Connection failed'
      });
    });

    it('should return unhealthy status when database pool not configured', async () => {
      healthCheckService.setDatabasePool(undefined as any);

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const dbHealth = healthStatus.services.find(s => s.service === 'database');
      expect(dbHealth).toEqual({
        service: 'database',
        status: 'unhealthy',
        responseTime: 0,
        error: 'Database pool not configured'
      });
    });
  });

  describe('Redis health check', () => {
    beforeEach(() => {
      healthCheckService.setRedisClient(mockRedisClient);
    });

    it('should return healthy status for successful Redis check', async () => {
      const healthStatus = await healthCheckService.performHealthCheck();
      
      const redisHealth = healthStatus.services.find(s => s.service === 'redis');
      expect(redisHealth).toEqual({
        service: 'redis',
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          memoryUsage: '1.5M',
          connectedClients: '5'
        }
      });
    });

    it('should return degraded status for slow Redis response', async () => {
      mockRedisClient.ping.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('PONG'), 600))
      );

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const redisHealth = healthStatus.services.find(s => s.service === 'redis');
      expect(redisHealth?.status).toBe('degraded');
    });

    it('should return unhealthy status for Redis error', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Redis connection failed'));

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const redisHealth = healthStatus.services.find(s => s.service === 'redis');
      expect(redisHealth).toEqual({
        service: 'redis',
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Redis connection failed'
      });
    });

    it('should return degraded status when Redis not configured', async () => {
      healthCheckService.setRedisClient(undefined);

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const redisHealth = healthStatus.services.find(s => s.service === 'redis');
      expect(redisHealth).toEqual({
        service: 'redis',
        status: 'degraded',
        responseTime: 0,
        details: { note: 'Redis client not configured - caching disabled' }
      });
    });
  });

  describe('system resources health check', () => {
    it('should return system health status', async () => {
      const healthStatus = await healthCheckService.performHealthCheck();
      
      const systemHealth = healthStatus.services.find(s => s.service === 'system');
      expect(systemHealth?.service).toBe('system');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(systemHealth?.status);
      expect(systemHealth?.details).toEqual({
        memoryUsage: {
          heapUsed: expect.any(String),
          heapTotal: expect.any(String),
          usagePercent: expect.any(Number)
        },
        uptime: expect.any(Number),
        nodeVersion: process.version,
        platform: process.platform
      });
    });
  });

  describe('external services health check', () => {
    it('should return healthy status when translation API configured', async () => {
      process.env['GOOGLE_TRANSLATE_API_KEY'] = 'test-key';

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const externalHealth = healthStatus.services.find(s => s.service === 'external_services');
      expect(externalHealth).toEqual({
        service: 'external_services',
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          translationService: 'configured',
          note: 'Translation API keys found'
        }
      });

      delete process.env['GOOGLE_TRANSLATE_API_KEY'];
    });

    it('should return degraded status when translation API not configured', async () => {
      const healthStatus = await healthCheckService.performHealthCheck();
      
      const externalHealth = healthStatus.services.find(s => s.service === 'external_services');
      expect(externalHealth?.status).toBe('degraded');
      expect(externalHealth?.details?.translationService).toBe('not configured');
    });
  });

  describe('scraping services health check', () => {
    it('should return healthy status for good scraping performance', async () => {
      (metricsCollector.getScrapingSuccessRate as jest.Mock).mockReturnValue(90);

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const scrapingHealth = healthStatus.services.find(s => s.service === 'scraping');
      expect(scrapingHealth?.status).toBe('healthy');
      expect(scrapingHealth?.details?.totalSites).toBe(2);
    });

    it('should return degraded status for moderate scraping issues', async () => {
      (metricsCollector.getScrapingSuccessRate as jest.Mock)
        .mockReturnValueOnce(70) // site1
        .mockReturnValueOnce(85); // site2

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const scrapingHealth = healthStatus.services.find(s => s.service === 'scraping');
      expect(scrapingHealth?.status).toBe('degraded');
      expect(scrapingHealth?.details?.issues).toContain('site1: 70.0% success rate');
    });

    it('should return unhealthy status for severe scraping issues', async () => {
      (metricsCollector.getScrapingSuccessRate as jest.Mock)
        .mockReturnValueOnce(30) // site1
        .mockReturnValueOnce(85); // site2

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const scrapingHealth = healthStatus.services.find(s => s.service === 'scraping');
      expect(scrapingHealth?.status).toBe('unhealthy');
      expect(scrapingHealth?.details?.issues).toContain('site1: 30.0% success rate');
    });
  });

  describe('overall health status', () => {
    beforeEach(() => {
      healthCheckService.setDatabasePool(mockDbPool as any);
      healthCheckService.setRedisClient(mockRedisClient);
    });

    it('should return overall health status', async () => {
      const healthStatus = await healthCheckService.performHealthCheck();
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.overall);
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(healthStatus.uptime).toBeGreaterThan(0);
      expect(healthStatus.version).toBeDefined();
    });

    it('should return degraded overall status when some services are degraded', async () => {
      // Make Redis slow to trigger degraded status
      mockRedisClient.ping.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('PONG'), 600))
      );

      const healthStatus = await healthCheckService.performHealthCheck();
      
      expect(healthStatus.overall).toBe('degraded');
    });

    it('should return unhealthy overall status when any service is unhealthy', async () => {
      mockDbPool.query.mockRejectedValue(new Error('Database down'));

      const healthStatus = await healthCheckService.performHealthCheck();
      
      expect(healthStatus.overall).toBe('unhealthy');
    });
  });

  describe('health check utilities', () => {
    beforeEach(() => {
      healthCheckService.setDatabasePool(mockDbPool as any);
      healthCheckService.setRedisClient(mockRedisClient);
    });

    it('should store last health check result', async () => {
      const healthStatus = await healthCheckService.performHealthCheck();
      const lastCheck = healthCheckService.getLastHealthCheck();
      
      expect(lastCheck).toEqual(healthStatus);
    });

    it('should determine system health status', async () => {
      await healthCheckService.performHealthCheck();
      
      expect(typeof healthCheckService.isSystemHealthy()).toBe('boolean');
    });

    it('should get specific service health', async () => {
      await healthCheckService.performHealthCheck();
      
      const dbHealth = healthCheckService.getServiceHealth('database');
      expect(dbHealth?.service).toBe('database');
      expect(dbHealth?.status).toBe('healthy');
    });

    it('should generate health summary', async () => {
      await healthCheckService.performHealthCheck();
      
      const summary = healthCheckService.getHealthSummary();
      expect(summary).toEqual({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        services: expect.any(Object),
        issues: expect.any(Array) // May or may not have issues
      });
    });
  });
});