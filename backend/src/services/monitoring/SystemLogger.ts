import winston from 'winston';
import path from 'path';

export interface LogContext {
  [key: string]: any;
}

export interface SystemMetrics {
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  activeConnections?: number;
  requestCount?: number;
  errorCount?: number;
}

/**
 * System-wide logger for the Japanese Real Estate Scraper application
 * Provides structured logging with different levels, file rotation, and metrics collection
 */
export class SystemLogger {
  private logger: winston.Logger;
  private static instance: SystemLogger;
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;

  private constructor() {
    this.startTime = Date.now();
    this.logger = winston.createLogger({
      level: process.env['LOG_LEVEL'] || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, service, ...meta }) => {
          let log = `${timestamp} [${level.toUpperCase()}]`;
          
          if (service) {
            log += ` [${service}]`;
          }
          
          log += ` ${message}`;
          
          // Add context if provided
          if (Object.keys(meta).length > 0) {
            log += ` | Context: ${JSON.stringify(meta)}`;
          }
          
          // Add stack trace for errors
          if (stack) {
            log += `\n${stack}`;
          }
          
          return log;
        })
      ),
      defaultMeta: {
        service: 'japanese-real-estate-scraper'
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // Main application log with rotation
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'application.log'),
          maxsize: 20 * 1024 * 1024, // 20MB
          maxFiles: 10,
          tailable: true
        }),
        
        // Error log with rotation
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        
        // System metrics log
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'metrics.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              if (meta['type'] === 'metrics') {
                return `${timestamp} [METRICS] ${message} | ${JSON.stringify(meta)}`;
              }
              return '';
            })
          )
        }),
        
        // Audit log for important system events
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'audit.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              if (meta['type'] === 'audit') {
                return `${timestamp} [AUDIT] ${message} | ${JSON.stringify(meta)}`;
              }
              return '';
            })
          )
        })
      ],
      
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 3
        })
      ],
      
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'rejections.log'),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 3
        })
      ]
    });

    // Log system startup
    this.info('System logger initialized', {
      type: 'audit',
      event: 'system_startup',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    });
  }

  /**
   * Get singleton instance of SystemLogger
   */
  public static getInstance(): SystemLogger {
    if (!SystemLogger.instance) {
      SystemLogger.instance = new SystemLogger();
    }
    return SystemLogger.instance;
  }

  /**
   * Log info level message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  /**
   * Log error level message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.errorCount++;
    
    const logContext = {
      ...context,
      errorId: this.generateErrorId(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.logger.error(message, logContext);
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  /**
   * Log HTTP request
   */
  logRequest(method: string, url: string, statusCode: number, responseTime: number, context?: LogContext): void {
    this.requestCount++;
    
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, `${method} ${url} ${statusCode} - ${responseTime}ms`, {
      type: 'http_request',
      method,
      url,
      statusCode,
      responseTime,
      ...context
    });
  }

  /**
   * Log system metrics
   */
  logMetrics(metrics: SystemMetrics): void {
    this.logger.info('System metrics collected', {
      type: 'metrics',
      ...metrics,
      requestCount: this.requestCount,
      errorCount: this.errorCount
    });
  }

  /**
   * Log scraping success rate
   */
  logScrapingMetrics(siteName: string, metrics: {
    totalAttempts: number;
    successfulScrapes: number;
    failedScrapes: number;
    averageResponseTime: number;
    lastSuccessfulScrape?: Date;
    lastFailedScrape?: Date;
  }): void {
    const successRate = metrics.totalAttempts > 0 
      ? (metrics.successfulScrapes / metrics.totalAttempts) * 100 
      : 0;

    this.logger.info(`Scraping metrics for ${siteName}`, {
      type: 'metrics',
      category: 'scraping',
      siteName,
      successRate: Math.round(successRate * 100) / 100,
      ...metrics
    });
  }

  /**
   * Log database performance metrics
   */
  logDatabaseMetrics(operation: string, duration: number, recordCount?: number, context?: LogContext): void {
    this.logger.info(`Database operation: ${operation}`, {
      type: 'metrics',
      category: 'database',
      operation,
      duration,
      recordCount,
      ...context
    });
  }

  /**
   * Log translation service metrics
   */
  logTranslationMetrics(metrics: {
    totalTranslations: number;
    cacheHits: number;
    cacheMisses: number;
    averageTranslationTime: number;
    apiCallsToday: number;
    apiQuotaRemaining?: number;
  }): void {
    const cacheHitRate = metrics.totalTranslations > 0 
      ? (metrics.cacheHits / metrics.totalTranslations) * 100 
      : 0;

    this.logger.info('Translation service metrics', {
      type: 'metrics',
      category: 'translation',
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      ...metrics
    });
  }

  /**
   * Log audit events
   */
  logAudit(event: string, details: LogContext): void {
    this.logger.info(`Audit: ${event}`, {
      type: 'audit',
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    this.logger.log(level, `Security: ${event}`, {
      type: 'security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log performance metrics for specific operations
   */
  logPerformance(operation: string, duration: number, details?: LogContext): void {
    this.logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...details
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): SystemLogger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: string): void {
    this.logger.level = level;
    this.logAudit('log_level_changed', { newLevel: level });
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.logger.level;
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    uptime: number;
    requestCount: number;
    errorCount: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      uptime: Date.now() - this.startTime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Generate unique error ID for tracking
   */
  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Flush all log transports
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logAudit('system_shutdown', { 
      uptime: Date.now() - this.startTime,
      totalRequests: this.requestCount,
      totalErrors: this.errorCount
    });
    
    await this.flush();
  }
}

// Export singleton instance
export const systemLogger = SystemLogger.getInstance();