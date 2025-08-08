import { PipelineLogger } from '../PipelineLogger';
import winston from 'winston';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

describe('PipelineLogger', () => {
  let logger: PipelineLogger;
  let mockWinstonLogger: any;

  beforeEach(() => {
    mockWinstonLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      child: jest.fn(),
      on: jest.fn(),
      end: jest.fn()
    };

    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);
    
    logger = new PipelineLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic logging methods', () => {
    it('should log info messages', () => {
      const message = 'Test info message';
      const context = { key: 'value' };

      logger.info(message, context);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, context);
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const context = { key: 'value' };

      logger.warn(message, context);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, context);
    });

    it('should log error messages with error details', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      const context = { key: 'value' };

      logger.error(message, error, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const context = { key: 'value' };

      logger.debug(message, context);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, context);
    });
  });

  describe('specialized logging methods', () => {
    it('should log scraping activities', () => {
      const siteName = 'suumo';
      const details = { propertiesFound: 10 };

      logger.logScrapingActivity(siteName, 'start', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        `Starting scraping for ${siteName}`,
        {
          activity: 'scraping',
          siteName,
          action: 'start',
          ...details
        }
      );

      logger.logScrapingActivity(siteName, 'success', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        `Scraping completed for ${siteName}`,
        {
          activity: 'scraping',
          siteName,
          action: 'success',
          ...details
        }
      );

      logger.logScrapingActivity(siteName, 'error', details);
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        `Scraping failed for ${siteName}`,
        undefined,
        {
          activity: 'scraping',
          siteName,
          action: 'error',
          ...details
        }
      );

      logger.logScrapingActivity(siteName, 'retry', details);
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        `Retrying scraping for ${siteName}`,
        {
          activity: 'scraping',
          siteName,
          action: 'retry',
          ...details
        }
      );
    });

    it('should log translation activities', () => {
      const details = { batchSize: 5 };

      logger.logTranslationActivity('start', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Starting translation batch',
        {
          activity: 'translation',
          action: 'start',
          ...details
        }
      );

      logger.logTranslationActivity('success', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Translation batch completed',
        {
          activity: 'translation',
          action: 'success',
          ...details
        }
      );

      logger.logTranslationActivity('error', details);
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Translation batch failed',
        undefined,
        {
          activity: 'translation',
          action: 'error',
          ...details
        }
      );

      logger.logTranslationActivity('cache_hit', details);
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        'Translation cache hit',
        {
          activity: 'translation',
          action: 'cache_hit',
          ...details
        }
      );

      logger.logTranslationActivity('cache_miss', details);
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        'Translation cache miss',
        {
          activity: 'translation',
          action: 'cache_miss',
          ...details
        }
      );
    });

    it('should log database activities', () => {
      const details = { propertyUrl: 'https://example.com/property/1' };

      logger.logDatabaseActivity('insert', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Property inserted',
        {
          activity: 'database',
          action: 'insert',
          ...details
        }
      );

      logger.logDatabaseActivity('update', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Property updated',
        {
          activity: 'database',
          action: 'update',
          ...details
        }
      );

      logger.logDatabaseActivity('upsert', details);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Property upserted',
        {
          activity: 'database',
          action: 'upsert',
          ...details
        }
      );

      logger.logDatabaseActivity('error', details);
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Database operation failed',
        undefined,
        {
          activity: 'database',
          action: 'error',
          ...details
        }
      );

      logger.logDatabaseActivity('duplicate_detected', details);
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        'Duplicate property detected',
        {
          activity: 'database',
          action: 'duplicate_detected',
          ...details
        }
      );
    });

    it('should log pipeline metrics', () => {
      const metrics = {
        totalProcessed: 100,
        newProperties: 80,
        updatedProperties: 20,
        translatedProperties: 90,
        errors: 5,
        processingTime: 60000,
        sitesProcessed: 3
      };

      logger.logPipelineMetrics(metrics);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Pipeline processing completed',
        {
          activity: 'pipeline_metrics',
          ...metrics,
          avgProcessingTimePerProperty: 600 // 60000 / 100
        }
      );
    });

    it('should log performance metrics', () => {
      const operation = 'scraping';
      const duration = 5000;
      const details = { siteName: 'suumo' };

      logger.logPerformanceMetrics(operation, duration, details);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        `Performance: ${operation}`,
        {
          activity: 'performance',
          operation,
          duration,
          ...details
        }
      );
    });

    it('should log health checks with appropriate levels', () => {
      const services = { translation: true, database: true, scraping: false };
      const details = { lastCheck: new Date() };

      // Healthy status
      logger.logHealthCheck('healthy', services, details);
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'info',
        'System health check: healthy',
        {
          activity: 'health_check',
          status: 'healthy',
          services,
          ...details
        }
      );

      // Degraded status
      logger.logHealthCheck('degraded', services, details);
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'warn',
        'System health check: degraded',
        {
          activity: 'health_check',
          status: 'degraded',
          services,
          ...details
        }
      );

      // Unhealthy status
      logger.logHealthCheck('unhealthy', services, details);
      expect(mockWinstonLogger.log).toHaveBeenCalledWith(
        'error',
        'System health check: unhealthy',
        {
          activity: 'health_check',
          status: 'unhealthy',
          services,
          ...details
        }
      );
    });
  });

  describe('utility methods', () => {
    it('should create child logger with context', () => {
      const context = { requestId: '123', userId: 'user456' };
      mockWinstonLogger.child.mockReturnValue(mockWinstonLogger);

      const childLogger = logger.child(context);

      expect(childLogger).toBeInstanceOf(PipelineLogger);
      expect(mockWinstonLogger.child).toHaveBeenCalledWith(context);
    });

    it('should set and get log level', () => {
      logger.setLevel('debug');
      expect(mockWinstonLogger.level).toBe('debug');

      mockWinstonLogger.level = 'info';
      expect(logger.getLevel()).toBe('info');
    });

    it('should flush logs', async () => {
      const flushPromise = logger.flush();
      
      // Simulate the 'finish' event
      const finishCallback = mockWinstonLogger.on.mock.calls.find(
        call => call[0] === 'finish'
      )?.[1];
      
      if (finishCallback) {
        finishCallback();
      }

      await expect(flushPromise).resolves.toBeUndefined();
      expect(mockWinstonLogger.end).toHaveBeenCalled();
    });
  });

  describe('winston configuration', () => {
    it('should create winston logger with correct configuration', () => {
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: expect.any(String),
          format: expect.anything(),
          transports: expect.any(Array),
          exceptionHandlers: expect.any(Array),
          rejectionHandlers: expect.any(Array)
        })
      );
    });

    it('should use environment LOG_LEVEL if available', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';

      // Create new logger to test environment variable
      new PipelineLogger();

      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );

      // Restore original value
      if (originalLogLevel !== undefined) {
        process.env.LOG_LEVEL = originalLogLevel;
      } else {
        delete process.env.LOG_LEVEL;
      }
    });
  });
});