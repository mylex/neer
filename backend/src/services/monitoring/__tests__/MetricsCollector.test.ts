import { MetricsCollector } from '../MetricsCollector';
import { systemLogger } from '../SystemLogger';

// Mock the system logger
jest.mock('../SystemLogger', () => ({
  systemLogger: {
    logScrapingMetrics: jest.fn(),
    logTranslationMetrics: jest.fn(),
    logDatabaseMetrics: jest.fn(),
    logMetrics: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    logAudit: jest.fn()
  }
}));

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    // Reset singleton
    (MetricsCollector as any).instance = undefined;
    metricsCollector = MetricsCollector.getInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock setInterval to prevent actual intervals during tests
    jest.spyOn(global, 'setInterval').mockImplementation(() => ({} as any));
  });

  afterEach(() => {
    metricsCollector.stopMetricsCollection();
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = MetricsCollector.getInstance();
      const instance2 = MetricsCollector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('scraping metrics', () => {
    it('should record successful scraping attempt', () => {
      const siteName = 'test-site';
      const responseTime = 500;
      const propertiesFound = 10;

      metricsCollector.recordScrapingAttempt(siteName, true, responseTime, propertiesFound);

      const metrics = metricsCollector.getAllScrapingMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        siteName,
        totalAttempts: 1,
        successfulScrapes: 1,
        failedScrapes: 0,
        averageResponseTime: responseTime,
        propertiesScraped: propertiesFound,
        lastSuccessfulScrape: expect.any(Date)
      }));
    });

    it('should record failed scraping attempt', () => {
      const siteName = 'test-site';
      const responseTime = 1000;

      metricsCollector.recordScrapingAttempt(siteName, false, responseTime);

      const metrics = metricsCollector.getAllScrapingMetrics();
      expect(metrics[0]).toEqual(expect.objectContaining({
        siteName,
        totalAttempts: 1,
        successfulScrapes: 0,
        failedScrapes: 1,
        averageResponseTime: responseTime,
        lastFailedScrape: expect.any(Date)
      }));
    });

    it('should calculate average response time correctly', () => {
      const siteName = 'test-site';

      metricsCollector.recordScrapingAttempt(siteName, true, 400);
      metricsCollector.recordScrapingAttempt(siteName, true, 600);

      const metrics = metricsCollector.getAllScrapingMetrics();
      expect(metrics[0]?.averageResponseTime).toBe(500);
    });

    it('should calculate success rate correctly', () => {
      const siteName = 'test-site';

      metricsCollector.recordScrapingAttempt(siteName, true, 500);
      metricsCollector.recordScrapingAttempt(siteName, true, 500);
      metricsCollector.recordScrapingAttempt(siteName, false, 500);

      const successRate = metricsCollector.getScrapingSuccessRate(siteName);
      expect(successRate).toBeCloseTo(66.67, 2);
    });

    it('should record duplicate properties', () => {
      const siteName = 'test-site';

      metricsCollector.recordScrapingAttempt(siteName, true, 500, 5);
      metricsCollector.recordDuplicateProperty(siteName);
      metricsCollector.recordDuplicateProperty(siteName);

      const metrics = metricsCollector.getAllScrapingMetrics();
      expect(metrics[0]?.duplicatesFound).toBe(2);
    });
  });

  describe('translation metrics', () => {
    it('should record successful translation', () => {
      metricsCollector.recordTranslation(true, 200, 100, false);

      const metrics = metricsCollector.getTranslationMetrics();
      expect(metrics).toEqual(expect.objectContaining({
        totalTranslations: 1,
        successfulTranslations: 1,
        failedTranslations: 0,
        cacheHits: 0,
        cacheMisses: 1,
        averageTranslationTime: 200,
        apiCallsToday: 1,
        charactersTranslated: 100
      }));
    });

    it('should record failed translation', () => {
      metricsCollector.recordTranslation(false, 300, 50, false);

      const metrics = metricsCollector.getTranslationMetrics();
      expect(metrics).toEqual(expect.objectContaining({
        totalTranslations: 1,
        successfulTranslations: 0,
        failedTranslations: 1,
        charactersTranslated: 0
      }));
    });

    it('should record cache hits and misses', () => {
      metricsCollector.recordTranslation(true, 50, 100, true); // Cache hit
      metricsCollector.recordTranslation(true, 200, 100, false); // Cache miss

      const metrics = metricsCollector.getTranslationMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.apiCallsToday).toBe(1); // Only cache misses count as API calls
    });

    it('should calculate cache hit rate correctly', () => {
      metricsCollector.recordTranslation(true, 50, 100, true);
      metricsCollector.recordTranslation(true, 50, 100, true);
      metricsCollector.recordTranslation(true, 200, 100, false);

      const cacheHitRate = metricsCollector.getTranslationCacheHitRate();
      expect(cacheHitRate).toBeCloseTo(66.67, 2);
    });
  });

  describe('database metrics', () => {
    it('should record database operation', () => {
      const operation = 'SELECT';
      const duration = 150;
      const recordCount = 10;

      metricsCollector.recordDatabaseOperation(operation, duration, recordCount);

      const metrics = metricsCollector.getDatabaseMetrics();
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.averageQueryTime).toBe(duration);
    });

    it('should track slow queries', () => {
      metricsCollector.recordDatabaseOperation('SELECT', 1500); // Slow query

      const metrics = metricsCollector.getDatabaseMetrics();
      expect(metrics.slowQueries).toBe(1);
      expect(systemLogger.warn).toHaveBeenCalledWith(
        'Slow database query detected',
        expect.objectContaining({
          operation: 'SELECT',
          duration: 1500
        })
      );
    });

    it('should update connection metrics', () => {
      metricsCollector.updateDatabaseConnectionMetrics(10, 5);

      const metrics = metricsCollector.getDatabaseMetrics();
      expect(metrics.connectionPoolSize).toBe(10);
      expect(metrics.activeConnections).toBe(5);
    });

    it('should update property metrics', () => {
      metricsCollector.updatePropertyMetrics(1000, 50, 25);

      const metrics = metricsCollector.getDatabaseMetrics();
      expect(metrics.totalProperties).toBe(1000);
      expect(metrics.propertiesAddedToday).toBe(50);
      expect(metrics.propertiesUpdatedToday).toBe(25);
    });
  });

  describe('system summary', () => {
    it('should generate comprehensive system summary', () => {
      // Add some test data
      metricsCollector.recordScrapingAttempt('site1', true, 500, 10);
      metricsCollector.recordScrapingAttempt('site1', false, 600);
      metricsCollector.recordScrapingAttempt('site2', true, 400, 5);
      
      metricsCollector.recordTranslation(true, 200, 100, true);
      metricsCollector.recordTranslation(true, 300, 150, false);
      
      metricsCollector.recordDatabaseOperation('SELECT', 100);
      metricsCollector.updatePropertyMetrics(500, 20, 10);

      const summary = metricsCollector.getSystemSummary();

      expect(summary).toEqual({
        scraping: {
          totalSites: 2,
          averageSuccessRate: expect.any(Number),
          totalPropertiesScraped: 15,
          sitesWithIssues: expect.any(Array)
        },
        translation: {
          successRate: 100,
          cacheHitRate: 50,
          apiCallsToday: 1,
          charactersTranslated: 250
        },
        database: {
          totalProperties: 500,
          averageQueryTime: 100,
          slowQueriesCount: 0,
          connectionUtilization: 0
        },
        system: {
          uptime: expect.any(Number),
          memoryUsagePercent: expect.any(Number),
          errorRate: 0
        }
      });
    });

    it('should identify sites with issues', () => {
      // Create a site with low success rate
      metricsCollector.recordScrapingAttempt('problematic-site', true, 500);
      metricsCollector.recordScrapingAttempt('problematic-site', false, 600);
      metricsCollector.recordScrapingAttempt('problematic-site', false, 700);
      metricsCollector.recordScrapingAttempt('problematic-site', false, 800);
      metricsCollector.recordScrapingAttempt('problematic-site', false, 900);

      const summary = metricsCollector.getSystemSummary();
      expect(summary.scraping.sitesWithIssues).toContain('problematic-site');
    });
  });

  describe('metrics export', () => {
    it('should export all metrics in structured format', () => {
      metricsCollector.recordScrapingAttempt('test-site', true, 500, 10);
      metricsCollector.recordTranslation(true, 200, 100, false);
      metricsCollector.recordDatabaseOperation('SELECT', 150);

      const exportedMetrics = metricsCollector.exportMetrics();

      expect(exportedMetrics).toEqual({
        timestamp: expect.any(String),
        scraping: expect.any(Array),
        translation: expect.any(Object),
        database: expect.any(Object),
        system: expect.any(Object)
      });
    });
  });

  describe('daily metrics reset', () => {
    it('should reset daily counters', () => {
      metricsCollector.recordTranslation(true, 200, 100, false);
      metricsCollector.updatePropertyMetrics(100, 10, 5);

      let metrics = metricsCollector.getTranslationMetrics();
      let dbMetrics = metricsCollector.getDatabaseMetrics();
      
      expect(metrics.apiCallsToday).toBe(1);
      expect(dbMetrics.propertiesAddedToday).toBe(10);
      expect(dbMetrics.propertiesUpdatedToday).toBe(5);

      metricsCollector.resetDailyMetrics();

      metrics = metricsCollector.getTranslationMetrics();
      dbMetrics = metricsCollector.getDatabaseMetrics();
      
      expect(metrics.apiCallsToday).toBe(0);
      expect(dbMetrics.propertiesAddedToday).toBe(0);
      expect(dbMetrics.propertiesUpdatedToday).toBe(0);
    });
  });
});