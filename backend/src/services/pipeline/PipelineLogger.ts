import winston from 'winston';
import path from 'path';

export interface LogContext {
  [key: string]: any;
}

/**
 * Specialized logger for the data processing pipeline
 * Provides structured logging with different levels and contexts
 */
export class PipelineLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
          
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
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // File transport for general logs
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'pipeline.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Separate file for errors
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'pipeline-errors.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Separate file for scraping activities
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'scraping.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              if (meta.activity === 'scraping') {
                return `${timestamp} [${level.toUpperCase()}] ${message} | ${JSON.stringify(meta)}`;
              }
              return '';
            })
          )
        }),
        
        // Separate file for translation activities
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'translation.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              if (meta.activity === 'translation') {
                return `${timestamp} [${level.toUpperCase()}] ${message} | ${JSON.stringify(meta)}`;
              }
              return '';
            })
          )
        })
      ],
      
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'exceptions.log')
        })
      ],
      
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'rejections.log')
        })
      ]
    });
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
    const logContext = {
      ...context,
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
   * Log scraping activity
   */
  logScrapingActivity(
    siteName: string, 
    action: 'start' | 'success' | 'error' | 'retry',
    details?: LogContext
  ): void {
    const context = {
      activity: 'scraping',
      siteName,
      action,
      ...details
    };

    switch (action) {
      case 'start':
        this.info(`Starting scraping for ${siteName}`, context);
        break;
      case 'success':
        this.info(`Scraping completed for ${siteName}`, context);
        break;
      case 'error':
        this.error(`Scraping failed for ${siteName}`, undefined, context);
        break;
      case 'retry':
        this.warn(`Retrying scraping for ${siteName}`, context);
        break;
    }
  }

  /**
   * Log translation activity
   */
  logTranslationActivity(
    action: 'start' | 'success' | 'error' | 'cache_hit' | 'cache_miss',
    details?: LogContext
  ): void {
    const context = {
      activity: 'translation',
      action,
      ...details
    };

    switch (action) {
      case 'start':
        this.info('Starting translation batch', context);
        break;
      case 'success':
        this.info('Translation batch completed', context);
        break;
      case 'error':
        this.error('Translation batch failed', undefined, context);
        break;
      case 'cache_hit':
        this.debug('Translation cache hit', context);
        break;
      case 'cache_miss':
        this.debug('Translation cache miss', context);
        break;
    }
  }

  /**
   * Log database activity
   */
  logDatabaseActivity(
    action: 'insert' | 'update' | 'upsert' | 'error' | 'duplicate_detected',
    details?: LogContext
  ): void {
    const context = {
      activity: 'database',
      action,
      ...details
    };

    switch (action) {
      case 'insert':
        this.info('Property inserted', context);
        break;
      case 'update':
        this.info('Property updated', context);
        break;
      case 'upsert':
        this.info('Property upserted', context);
        break;
      case 'error':
        this.error('Database operation failed', undefined, context);
        break;
      case 'duplicate_detected':
        this.debug('Duplicate property detected', context);
        break;
    }
  }

  /**
   * Log pipeline metrics
   */
  logPipelineMetrics(metrics: {
    totalProcessed: number;
    newProperties: number;
    updatedProperties: number;
    translatedProperties: number;
    errors: number;
    processingTime: number;
    sitesProcessed: number;
  }): void {
    this.info('Pipeline processing completed', {
      activity: 'pipeline_metrics',
      ...metrics,
      avgProcessingTimePerProperty: metrics.totalProcessed > 0 
        ? Math.round(metrics.processingTime / metrics.totalProcessed) 
        : 0
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(
    operation: string,
    duration: number,
    details?: LogContext
  ): void {
    this.info(`Performance: ${operation}`, {
      activity: 'performance',
      operation,
      duration,
      ...details
    });
  }

  /**
   * Log system health check
   */
  logHealthCheck(
    status: 'healthy' | 'degraded' | 'unhealthy',
    services: Record<string, boolean>,
    details?: LogContext
  ): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    
    this.logger.log(level, `System health check: ${status}`, {
      activity: 'health_check',
      status,
      services,
      ...details
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): PipelineLogger {
    const childLogger = new PipelineLogger();
    
    // Override the logger to include the context
    const originalLogger = childLogger.logger;
    childLogger.logger = originalLogger.child(context);
    
    return childLogger;
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.logger.level;
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
}