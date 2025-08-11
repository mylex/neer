/**
 * Example demonstrating how to integrate the monitoring system with existing services
 * This shows how to instrument your code with logging, metrics, and health checks
 */

import { Pool } from 'pg';
import { createClient } from 'redis';
import { 
  systemLogger, 
  metricsCollector, 
  healthCheckService, 
  notificationService 
} from '../index';

/**
 * Example: Setting up monitoring for database operations
 */
export async function setupDatabaseMonitoring(dbPool: Pool) {
  // Configure health check service with database pool
  healthCheckService.setDatabasePool(dbPool);
  
  // Log database setup
  systemLogger.logAudit('database_monitoring_setup', {
    poolSize: dbPool.options.max || 10,
    host: dbPool.options.host,
    database: dbPool.options.database
  });

  // Example of instrumenting a database operation
  async function instrumentedQuery(query: string, params?: any[]) {
    const startTime = Date.now();
    
    try {
      systemLogger.debug('Executing database query', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        paramCount: params?.length || 0
      });

      const result = await dbPool.query(query, params);
      const duration = Date.now() - startTime;
      
      // Record metrics
      metricsCollector.recordDatabaseOperation('query', duration, result.rowCount || 0);
      
      // Log successful operation
      systemLogger.logDatabaseMetrics('query', duration, result.rowCount || 0, {
        success: true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed operation
      metricsCollector.recordDatabaseOperation('query_failed', duration);
      
      // Log error
      systemLogger.error('Database query failed', error instanceof Error ? error : new Error(String(error)), {
        query: query.substring(0, 100),
        duration
      });

      // Send alert for critical database errors
      if (error instanceof Error && error.message.includes('connection')) {
        await notificationService.sendDatabaseAlert('query', error.message, {
          query: query.substring(0, 100),
          duration
        });
      }

      throw error;
    }
  }

  return { instrumentedQuery };
}

/**
 * Example: Setting up monitoring for Redis operations
 */
export async function setupRedisMonitoring() {
  const redisClient = createClient({
    url: process.env['REDIS_URL'] || 'redis://localhost:6379'
  });

  // Configure health check service with Redis client
  healthCheckService.setRedisClient(redisClient);

  // Log Redis setup
  systemLogger.logAudit('redis_monitoring_setup', {
    url: process.env['REDIS_URL'] || 'redis://localhost:6379'
  });

  // Example of instrumenting Redis operations
  async function instrumentedRedisGet(key: string) {
    const startTime = Date.now();
    
    try {
      const result = await redisClient.get(key);
      const duration = Date.now() - startTime;
      
      // Record cache hit/miss
      const cacheHit = result !== null;
      metricsCollector.recordTranslation(true, duration, 0, cacheHit);
      
      systemLogger.debug('Redis GET operation', {
        key,
        duration,
        cacheHit,
        resultLength: result?.length || 0
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      systemLogger.error('Redis GET operation failed', error instanceof Error ? error : new Error(String(error)), {
        key,
        duration
      });

      throw error;
    }
  }

  return { redisClient, instrumentedRedisGet };
}

/**
 * Example: Monitoring scraping operations
 */
export async function monitorScrapingOperation(siteName: string, scrapingFunction: () => Promise<any[]>) {
  const startTime = Date.now();
  
  systemLogger.info(`Starting scraping operation for ${siteName}`, {
    type: 'scraping_start',
    siteName,
    timestamp: new Date().toISOString()
  });

  try {
    const results = await scrapingFunction();
    const duration = Date.now() - startTime;
    const propertiesFound = results.length;
    
    // Record successful scraping
    metricsCollector.recordScrapingAttempt(siteName, true, duration, propertiesFound);
    
    systemLogger.info(`Scraping completed successfully for ${siteName}`, {
      type: 'scraping_success',
      siteName,
      propertiesFound,
      duration
    });

    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failed scraping
    metricsCollector.recordScrapingAttempt(siteName, false, duration);
    
    systemLogger.error(`Scraping failed for ${siteName}`, error instanceof Error ? error : new Error(String(error)), {
      type: 'scraping_error',
      siteName,
      duration
    });

    // Check if we should send an alert
    const successRate = metricsCollector.getScrapingSuccessRate(siteName);
    if (successRate < 50) {
      await notificationService.sendScrapingAlert(
        siteName, 
        error instanceof Error ? error.message : String(error), 
        successRate
      );
    }

    throw error;
  }
}

/**
 * Example: Monitoring translation operations
 */
export async function monitorTranslationOperation(
  text: string, 
  translationFunction: (text: string) => Promise<string>,
  cacheFunction?: (text: string) => Promise<string | null>
) {
  const startTime = Date.now();
  
  try {
    // Check cache first if available
    let cacheHit = false;
    if (cacheFunction) {
      const cachedResult = await cacheFunction(text);
      if (cachedResult) {
        const duration = Date.now() - startTime;
        metricsCollector.recordTranslation(true, duration, text.length, true);
        
        systemLogger.debug('Translation cache hit', {
          textLength: text.length,
          duration
        });
        
        return cachedResult;
      }
    }

    // Perform translation
    const result = await translationFunction(text);
    const duration = Date.now() - startTime;
    
    // Record successful translation
    metricsCollector.recordTranslation(true, duration, text.length, cacheHit);
    
    systemLogger.debug('Translation completed', {
      textLength: text.length,
      resultLength: result.length,
      duration,
      cacheHit
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failed translation
    metricsCollector.recordTranslation(false, duration, text.length, false);
    
    systemLogger.error('Translation failed', error instanceof Error ? error : new Error(String(error)), {
      textLength: text.length,
      duration
    });

    throw error;
  }
}

/**
 * Example: Setting up periodic health checks and alerts
 */
export async function setupPeriodicMonitoring() {
  systemLogger.info('Setting up periodic monitoring', {
    type: 'audit',
    event: 'periodic_monitoring_setup'
  });

  // Set up daily metrics reset (run at midnight)
  const scheduleMetricsReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      metricsCollector.resetDailyMetrics();
      
      // Schedule for next day
      setInterval(() => {
        metricsCollector.resetDailyMetrics();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
      
    }, msUntilMidnight);
  };

  scheduleMetricsReset();

  // Set up periodic system health alerts
  setInterval(async () => {
    try {
      const healthStatus = await healthCheckService.performHealthCheck();
      
      if (healthStatus.overall !== 'healthy') {
        await notificationService.sendHealthAlert(healthStatus);
      }
    } catch (error) {
      systemLogger.error('Periodic health check failed', error instanceof Error ? error : new Error(String(error)));
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  systemLogger.info('Periodic monitoring setup completed');
}

/**
 * Example: Express middleware for request monitoring
 */
export function createRequestMonitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Log incoming request
    systemLogger.debug('Incoming request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      
      // Log request completion
      systemLogger.logRequest(req.method, req.url, res.statusCode, duration, {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Call original end method
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Example: Graceful shutdown with monitoring cleanup
 */
export async function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    systemLogger.info(`Received ${signal}, starting graceful shutdown`);
    
    try {
      // Stop periodic health checks
      healthCheckService.stopPeriodicHealthChecks();
      
      // Stop metrics collection
      metricsCollector.stopMetricsCollection();
      
      // Flush logs
      await systemLogger.shutdown();
      
      systemLogger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      systemLogger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    systemLogger.error('Uncaught exception', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    systemLogger.error('Unhandled rejection', new Error(String(reason)), {
      promise: promise.toString()
    });
  });
}

/**
 * Example: Complete monitoring setup for the application
 */
export async function initializeMonitoring(dbPool: Pool) {
  systemLogger.info('Initializing comprehensive monitoring system');

  try {
    // Set up database monitoring
    const { instrumentedQuery } = await setupDatabaseMonitoring(dbPool);
    
    // Set up Redis monitoring (optional)
    try {
      await setupRedisMonitoring();
    } catch (error) {
      systemLogger.warn('Redis monitoring setup failed, continuing without Redis', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Set up periodic monitoring
    await setupPeriodicMonitoring();
    
    // Set up graceful shutdown
    await setupGracefulShutdown();
    
    systemLogger.info('Monitoring system initialization completed');
    
    return {
      instrumentedQuery,
      requestMonitoringMiddleware: createRequestMonitoringMiddleware()
    };
  } catch (error) {
    systemLogger.error('Failed to initialize monitoring system', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}