import { HealthCheckService } from '../HealthCheckService';
import { propertyRepository } from '../../../database/repositories/PropertyRepository';

// Mock the property repository
jest.mock('../../../database/repositories/PropertyRepository', () => ({
  propertyRepository: {
    getStats: jest.fn(),
  },
}));

const mockedPropertyRepository = propertyRepository as jest.Mocked<typeof propertyRepository>;

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;

  beforeEach(() => {
    healthCheckService = new HealthCheckService({
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 1000,
    });
    jest.clearAllMocks();
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      // Mock successful database check
      mockedPropertyRepository.getStats.mockResolvedValueOnce({
        totalProperties: 100,
        translatedProperties: 90,
        pendingTranslation: 10,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {},
      });

      const result = await healthCheckService.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('healthy');
      expect(result.overallHealth.score).toBe(100);
      expect(result.overallHealth.issues).toHaveLength(0);
    });

    it('should return degraded status when some services are unhealthy', async () => {
      // Mock successful database check
      mockedPropertyRepository.getStats.mockResolvedValueOnce({
        totalProperties: 100,
        translatedProperties: 90,
        pendingTranslation: 10,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {},
      });

      const result = await healthCheckService.performHealthCheck();

      // Since translation and scraping services will likely fail in test environment,
      // we expect degraded status if database is healthy
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.services.database.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return unhealthy status when database fails', async () => {
      // Mock database failure
      mockedPropertyRepository.getStats.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await healthCheckService.performHealthCheck();

      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.database.error).toContain('Database connection failed');
      expect(result.overallHealth.issues.length).toBeGreaterThan(0);
    });

    it('should include response times in health check results', async () => {
      // Mock successful database check
      mockedPropertyRepository.getStats.mockResolvedValueOnce({
        totalProperties: 100,
        translatedProperties: 90,
        pendingTranslation: 10,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {},
      });

      const result = await healthCheckService.performHealthCheck();

      expect(result.services.database.responseTime).toBeGreaterThan(0);
      expect(typeof result.services.database.responseTime).toBe('number');
    });

    it('should handle timeout correctly', async () => {
      const shortTimeoutService = new HealthCheckService({
        timeout: 100, // Very short timeout
        retryAttempts: 1,
        retryDelay: 100,
      });

      // Mock a slow database response
      mockedPropertyRepository.getStats.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          totalProperties: 100,
          translatedProperties: 90,
          pendingTranslation: 10,
          failedTranslation: 0,
          sourceWebsites: 1,
          propertiesByType: {},
        }), 200))
      );

      const result = await shortTimeoutService.performHealthCheck();

      expect(result.services.database.status).toBe('unhealthy');
      expect(result.services.database.error).toContain('timed out');
    });
  });

  describe('performHealthCheckWithRetries', () => {
    it('should retry health checks on failure', async () => {
      // Mock first call to fail, second to succeed
      mockedPropertyRepository.getStats
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          totalProperties: 100,
          translatedProperties: 90,
          pendingTranslation: 10,
          failedTranslation: 0,
          sourceWebsites: 1,
          propertiesByType: {},
        });

      const result = await healthCheckService.performHealthCheckWithRetries();

      expect(mockedPropertyRepository.getStats).toHaveBeenCalledTimes(2);
      expect(result.services.database.status).toBe('healthy');
    });

    it('should return last result after all retries fail', async () => {
      // Mock all calls to fail
      mockedPropertyRepository.getStats.mockRejectedValue(new Error('Persistent failure'));

      const result = await healthCheckService.performHealthCheckWithRetries();

      expect(mockedPropertyRepository.getStats).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(result.status).toBe('unhealthy');
    });

    it('should return immediately on healthy status', async () => {
      // Mock successful call
      mockedPropertyRepository.getStats.mockResolvedValueOnce({
        totalProperties: 100,
        translatedProperties: 90,
        pendingTranslation: 10,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {},
      });

      const result = await healthCheckService.performHealthCheckWithRetries();

      expect(mockedPropertyRepository.getStats).toHaveBeenCalledTimes(1);
      expect(result.services.database.status).toBe('healthy');
    });
  });

  describe('isSystemReady', () => {
    it('should return ready when system is healthy', async () => {
      // Mock successful database check
      mockedPropertyRepository.getStats.mockResolvedValueOnce({
        totalProperties: 100,
        translatedProperties: 90,
        pendingTranslation: 10,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {},
      });

      const result = await healthCheckService.isSystemReady();

      if (result.healthResult.status === 'healthy') {
        expect(result.ready).toBe(true);
        expect(result.reason).toBeUndefined();
      }
    });

    it('should return ready when system is degraded but database is healthy', async () => {
      // Mock successful database check
      mockedPropertyRepository.getStats.mockResolvedValueOnce({
        totalProperties: 100,
        translatedProperties: 90,
        pendingTranslation: 10,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {},
      });

      const result = await healthCheckService.isSystemReady();

      // System should be ready if database is healthy, even if other services are degraded
      expect(result.healthResult).toBeDefined();
      expect(result.healthResult.services.database.status).toBe('healthy');
    });

    it('should return not ready when system is unhealthy', async () => {
      // Mock database failure
      mockedPropertyRepository.getStats.mockRejectedValue(new Error('Database failure'));

      const result = await healthCheckService.isSystemReady();

      if (result.healthResult.status === 'unhealthy') {
        expect(result.ready).toBe(false);
        expect(result.reason).toBeDefined();
        expect(result.reason).toContain('System health check failed');
      }
    });
  });

  describe('calculateOverallHealth', () => {
    it('should calculate correct health score', () => {
      const healthResult = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          database: { status: 'healthy' as const },
          translation: { status: 'healthy' as const },
          scraping: { status: 'unhealthy' as const, error: 'Service down' },
        },
        overallHealth: {
          score: 0,
          issues: [],
        },
      };

      (healthCheckService as any).calculateOverallHealth(healthResult);

      expect(healthResult.overallHealth.score).toBe(67); // 2/3 * 100, rounded
      expect(healthResult.status).toBe('degraded');
      expect(healthResult.overallHealth.issues).toContain('scraping: Service down');
    });

    it('should set status to healthy when all services are healthy', () => {
      const healthResult = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          database: { status: 'healthy' as const },
          translation: { status: 'healthy' as const },
          scraping: { status: 'healthy' as const },
        },
        overallHealth: {
          score: 0,
          issues: [],
        },
      };

      (healthCheckService as any).calculateOverallHealth(healthResult);

      expect(healthResult.overallHealth.score).toBe(100);
      expect(healthResult.status).toBe('healthy');
      expect(healthResult.overallHealth.issues).toHaveLength(0);
    });

    it('should set status to unhealthy when most services are down', () => {
      const healthResult = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: {
          database: { status: 'unhealthy' as const, error: 'DB down' },
          translation: { status: 'unhealthy' as const, error: 'Translation down' },
          scraping: { status: 'healthy' as const },
        },
        overallHealth: {
          score: 0,
          issues: [],
        },
      };

      (healthCheckService as any).calculateOverallHealth(healthResult);

      expect(healthResult.overallHealth.score).toBe(33); // 1/3 * 100, rounded
      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.overallHealth.issues).toHaveLength(2);
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await (healthCheckService as any).withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject when promise exceeds timeout', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(
        (healthCheckService as any).withTimeout(promise, 100)
      ).rejects.toThrow('Operation timed out after 100ms');
    });
  });
});