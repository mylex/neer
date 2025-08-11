// Mock winston before importing SystemLogger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  child: jest.fn().mockReturnThis(),
  on: jest.fn(),
  end: jest.fn(),
  level: 'info'
};

jest.mock('winston', () => ({
  createLogger: jest.fn(() => mockLogger),
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

import { SystemLogger } from '../SystemLogger';

describe('SystemLogger', () => {
  let systemLogger: SystemLogger;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset singleton
    (SystemLogger as any).instance = undefined;
    systemLogger = SystemLogger.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SystemLogger.getInstance();
      const instance2 = SystemLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logging methods', () => {
    it('should log info messages', () => {
      const message = 'Test info message';
      const context = { key: 'value' };

      systemLogger.info(message, context);

      expect(mockLogger.info).toHaveBeenCalledWith(message, context);
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const context = { key: 'value' };

      systemLogger.warn(message, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, context);
    });

    it('should log error messages with error object', () => {
      const message = 'Test error message';
      const error = new Error('Test error');
      const context = { key: 'value' };

      systemLogger.error(message, error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        ...context,
        errorId: expect.any(String),
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

      systemLogger.debug(message, context);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, context);
    });
  });

  describe('specialized logging methods', () => {
    it('should log HTTP requests', () => {
      systemLogger.logRequest('GET', '/api/test', 200, 150);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'GET /api/test 200 - 150ms',
        expect.objectContaining({
          type: 'http_request',
          method: 'GET',
          url: '/api/test',
          statusCode: 200,
          responseTime: 150
        })
      );
    });

    it('should log HTTP requests as warnings for error status codes', () => {
      systemLogger.logRequest('GET', '/api/test', 500, 150);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'GET /api/test 500 - 150ms',
        expect.objectContaining({
          type: 'http_request',
          statusCode: 500
        })
      );
    });

    it('should log system metrics', () => {
      const metrics = {
        timestamp: new Date(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: 1000
      };

      systemLogger.logMetrics(metrics);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'System metrics collected',
        expect.objectContaining({
          type: 'metrics',
          ...metrics
        })
      );
    });

    it('should log scraping metrics', () => {
      const siteName = 'test-site';
      const metrics = {
        totalAttempts: 100,
        successfulScrapes: 90,
        failedScrapes: 10,
        averageResponseTime: 500
      };

      systemLogger.logScrapingMetrics(siteName, metrics);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Scraping metrics for ${siteName}`,
        expect.objectContaining({
          type: 'metrics',
          category: 'scraping',
          siteName,
          successRate: 90,
          ...metrics
        })
      );
    });

    it('should log audit events', () => {
      const event = 'test_event';
      const details = { userId: 'user123' };

      systemLogger.logAudit(event, details);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Audit: ${event}`,
        expect.objectContaining({
          type: 'audit',
          event,
          timestamp: expect.any(String),
          ...details
        })
      );
    });

    it('should log security events', () => {
      const event = 'unauthorized_access';
      const severity = 'high';
      const details = { ip: '192.168.1.1' };

      systemLogger.logSecurity(event, severity, details);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'error',
        `Security: ${event}`,
        expect.objectContaining({
          type: 'security',
          event,
          severity,
          timestamp: expect.any(String),
          ...details
        })
      );
    });
  });

  describe('system statistics', () => {
    it('should return system stats', () => {
      const stats = systemLogger.getSystemStats();

      expect(stats).toEqual({
        uptime: expect.any(Number),
        requestCount: expect.any(Number),
        errorCount: expect.any(Number),
        memoryUsage: expect.any(Object)
      });
    });

    it('should increment request count when logging requests', () => {
      const initialStats = systemLogger.getSystemStats();
      
      systemLogger.logRequest('GET', '/test', 200, 100);
      
      const updatedStats = systemLogger.getSystemStats();
      expect(updatedStats.requestCount).toBe(initialStats.requestCount + 1);
    });

    it('should increment error count when logging errors', () => {
      const initialStats = systemLogger.getSystemStats();
      
      systemLogger.error('Test error');
      
      const updatedStats = systemLogger.getSystemStats();
      expect(updatedStats.errorCount).toBe(initialStats.errorCount + 1);
    });
  });

  describe('log level management', () => {
    it('should set log level', () => {
      systemLogger.setLevel('debug');
      expect(mockLogger.level).toBe('debug');
    });

    it('should get current log level', () => {
      mockLogger.level = 'warn';
      expect(systemLogger.getLevel()).toBe('warn');
    });
  });

  describe('child logger', () => {
    it('should create child logger with context', () => {
      const context = { service: 'test-service' };
      const childLogger = systemLogger.child(context);

      expect(mockLogger.child).toHaveBeenCalledWith(context);
      expect(childLogger).toBeInstanceOf(SystemLogger);
    });
  });

  describe('shutdown', () => {
    it('should log shutdown event and flush logs', async () => {
      mockLogger.on.mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          setTimeout(callback, 0);
        }
      });

      await systemLogger.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit: system_shutdown'),
        expect.objectContaining({
          type: 'audit',
          uptime: expect.any(Number),
          totalRequests: expect.any(Number),
          totalErrors: expect.any(Number)
        })
      );
      expect(mockLogger.end).toHaveBeenCalled();
    });
  });
});