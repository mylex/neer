import { systemLogger } from './SystemLogger';

export interface ScrapingMetrics {
  siteName: string;
  totalAttempts: number;
  successfulScrapes: number;
  failedScrapes: number;
  averageResponseTime: number;
  lastSuccessfulScrape?: Date;
  lastFailedScrape?: Date;
  propertiesScraped: number;
  duplicatesFound: number;
}

export interface TranslationMetrics {
  totalTranslations: number;
  successfulTranslations: number;
  failedTranslations: number;
  cacheHits: number;
  cacheMisses: number;
  averageTranslationTime: number;
  apiCallsToday: number;
  apiQuotaRemaining?: number;
  charactersTranslated: number;
}

export interface DatabaseMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
  totalProperties: number;
  propertiesAddedToday: number;
  propertiesUpdatedToday: number;
}

export interface SystemHealthMetrics {
  timestamp: Date;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  diskUsage?: {
    total: number;
    used: number;
    available: number;
  };
  networkConnections: number;
  requestsPerMinute: number;
  errorsPerMinute: number;
}

/**
 * Collects and aggregates system metrics for monitoring and alerting
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private scrapingMetrics: Map<string, ScrapingMetrics> = new Map();
  private translationMetrics: TranslationMetrics;
  private databaseMetrics: DatabaseMetrics;
  private systemMetrics: SystemHealthMetrics[] = [];
  private maxMetricsHistory = 1000; // Keep last 1000 metric entries
  private metricsCollectionInterval?: NodeJS.Timeout | undefined;

  private constructor() {
    this.translationMetrics = {
      totalTranslations: 0,
      successfulTranslations: 0,
      failedTranslations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTranslationTime: 0,
      apiCallsToday: 0,
      charactersTranslated: 0
    };

    this.databaseMetrics = {
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      connectionPoolSize: 0,
      activeConnections: 0,
      totalProperties: 0,
      propertiesAddedToday: 0,
      propertiesUpdatedToday: 0
    };

    this.startMetricsCollection();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record scraping attempt
   */
  recordScrapingAttempt(siteName: string, success: boolean, responseTime: number, propertiesFound?: number): void {
    let metrics = this.scrapingMetrics.get(siteName);
    
    if (!metrics) {
      metrics = {
        siteName,
        totalAttempts: 0,
        successfulScrapes: 0,
        failedScrapes: 0,
        averageResponseTime: 0,
        propertiesScraped: 0,
        duplicatesFound: 0
      };
      this.scrapingMetrics.set(siteName, metrics);
    }

    metrics.totalAttempts++;
    
    if (success) {
      metrics.successfulScrapes++;
      metrics.lastSuccessfulScrape = new Date();
      if (propertiesFound) {
        metrics.propertiesScraped += propertiesFound;
      }
    } else {
      metrics.failedScrapes++;
      metrics.lastFailedScrape = new Date();
    }

    // Update average response time
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalAttempts - 1) + responseTime) / metrics.totalAttempts;

    // Log metrics periodically
    if (metrics.totalAttempts % 10 === 0) {
      systemLogger.logScrapingMetrics(siteName, metrics);
    }
  }

  /**
   * Record duplicate property found during scraping
   */
  recordDuplicateProperty(siteName: string): void {
    const metrics = this.scrapingMetrics.get(siteName);
    if (metrics) {
      metrics.duplicatesFound++;
    }
  }

  /**
   * Record translation operation
   */
  recordTranslation(success: boolean, translationTime: number, charactersCount: number, cacheHit: boolean): void {
    this.translationMetrics.totalTranslations++;
    
    if (success) {
      this.translationMetrics.successfulTranslations++;
      this.translationMetrics.charactersTranslated += charactersCount;
    } else {
      this.translationMetrics.failedTranslations++;
    }

    if (cacheHit) {
      this.translationMetrics.cacheHits++;
    } else {
      this.translationMetrics.cacheMisses++;
      this.translationMetrics.apiCallsToday++;
    }

    // Update average translation time
    const totalTranslations = this.translationMetrics.totalTranslations;
    this.translationMetrics.averageTranslationTime = 
      (this.translationMetrics.averageTranslationTime * (totalTranslations - 1) + translationTime) / totalTranslations;

    // Log translation metrics every 50 translations
    if (this.translationMetrics.totalTranslations % 50 === 0) {
      systemLogger.logTranslationMetrics(this.translationMetrics);
    }
  }

  /**
   * Record database operation
   */
  recordDatabaseOperation(operation: string, duration: number, recordCount?: number): void {
    this.databaseMetrics.totalQueries++;
    
    // Update average query time
    this.databaseMetrics.averageQueryTime = 
      (this.databaseMetrics.averageQueryTime * (this.databaseMetrics.totalQueries - 1) + duration) / this.databaseMetrics.totalQueries;

    // Track slow queries (> 1000ms)
    if (duration > 1000) {
      this.databaseMetrics.slowQueries++;
      systemLogger.warn('Slow database query detected', {
        operation,
        duration,
        recordCount
      });
    }

    systemLogger.logDatabaseMetrics(operation, duration, recordCount);
  }

  /**
   * Update database connection metrics
   */
  updateDatabaseConnectionMetrics(poolSize: number, activeConnections: number): void {
    this.databaseMetrics.connectionPoolSize = poolSize;
    this.databaseMetrics.activeConnections = activeConnections;
  }

  /**
   * Update property count metrics
   */
  updatePropertyMetrics(totalProperties: number, addedToday: number, updatedToday: number): void {
    this.databaseMetrics.totalProperties = totalProperties;
    this.databaseMetrics.propertiesAddedToday = addedToday;
    this.databaseMetrics.propertiesUpdatedToday = updatedToday;
  }

  /**
   * Get scraping success rate for a site
   */
  getScrapingSuccessRate(siteName: string): number {
    const metrics = this.scrapingMetrics.get(siteName);
    if (!metrics || metrics.totalAttempts === 0) {
      return 0;
    }
    return (metrics.successfulScrapes / metrics.totalAttempts) * 100;
  }

  /**
   * Get translation cache hit rate
   */
  getTranslationCacheHitRate(): number {
    const total = this.translationMetrics.cacheHits + this.translationMetrics.cacheMisses;
    if (total === 0) {
      return 0;
    }
    return (this.translationMetrics.cacheHits / total) * 100;
  }

  /**
   * Get all scraping metrics
   */
  getAllScrapingMetrics(): ScrapingMetrics[] {
    return Array.from(this.scrapingMetrics.values());
  }

  /**
   * Get translation metrics
   */
  getTranslationMetrics(): TranslationMetrics {
    return { ...this.translationMetrics };
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    return { ...this.databaseMetrics };
  }

  /**
   * Get current system health metrics
   */
  getCurrentSystemMetrics(): SystemHealthMetrics {
    const now = new Date();
    const recentMetrics = this.systemMetrics.filter(m => 
      now.getTime() - m.timestamp.getTime() < 60000 // Last minute
    );

    return {
      timestamp: now,
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      networkConnections: 0, // Would need to implement actual network monitoring
      requestsPerMinute: recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1]!.requestsPerMinute : 0,
      errorsPerMinute: recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1]!.errorsPerMinute : 0
    };
  }

  /**
   * Get system metrics history
   */
  getSystemMetricsHistory(minutes: number = 60): SystemHealthMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.systemMetrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get comprehensive system summary
   */
  getSystemSummary(): {
    scraping: {
      totalSites: number;
      averageSuccessRate: number;
      totalPropertiesScraped: number;
      sitesWithIssues: string[];
    };
    translation: {
      successRate: number;
      cacheHitRate: number;
      apiCallsToday: number;
      charactersTranslated: number;
    };
    database: {
      totalProperties: number;
      averageQueryTime: number;
      slowQueriesCount: number;
      connectionUtilization: number;
    };
    system: {
      uptime: number;
      memoryUsagePercent: number;
      errorRate: number;
    };
  } {
    const scrapingMetrics = this.getAllScrapingMetrics();
    const avgSuccessRate = scrapingMetrics.length > 0 
      ? scrapingMetrics.reduce((sum, m) => sum + this.getScrapingSuccessRate(m.siteName), 0) / scrapingMetrics.length
      : 0;

    const sitesWithIssues = scrapingMetrics
      .filter(m => this.getScrapingSuccessRate(m.siteName) < 80)
      .map(m => m.siteName);

    const totalPropertiesScraped = scrapingMetrics.reduce((sum, m) => sum + m.propertiesScraped, 0);

    const translationSuccessRate = this.translationMetrics.totalTranslations > 0
      ? (this.translationMetrics.successfulTranslations / this.translationMetrics.totalTranslations) * 100
      : 0;

    const connectionUtilization = this.databaseMetrics.connectionPoolSize > 0
      ? (this.databaseMetrics.activeConnections / this.databaseMetrics.connectionPoolSize) * 100
      : 0;

    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      scraping: {
        totalSites: scrapingMetrics.length,
        averageSuccessRate: Math.round(avgSuccessRate * 100) / 100,
        totalPropertiesScraped,
        sitesWithIssues
      },
      translation: {
        successRate: Math.round(translationSuccessRate * 100) / 100,
        cacheHitRate: Math.round(this.getTranslationCacheHitRate() * 100) / 100,
        apiCallsToday: this.translationMetrics.apiCallsToday,
        charactersTranslated: this.translationMetrics.charactersTranslated
      },
      database: {
        totalProperties: this.databaseMetrics.totalProperties,
        averageQueryTime: Math.round(this.databaseMetrics.averageQueryTime * 100) / 100,
        slowQueriesCount: this.databaseMetrics.slowQueries,
        connectionUtilization: Math.round(connectionUtilization * 100) / 100
      },
      system: {
        uptime: process.uptime() * 1000,
        memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
        errorRate: 0 // Would need to calculate from recent error metrics
      }
    };
  }

  /**
   * Start automatic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics every minute
    this.metricsCollectionInterval = setInterval(() => {
      const metrics = this.getCurrentSystemMetrics();
      this.systemMetrics.push(metrics);

      // Keep only recent metrics
      if (this.systemMetrics.length > this.maxMetricsHistory) {
        this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
      }

      // Log system metrics every 5 minutes
      if (this.systemMetrics.length % 5 === 0) {
        systemLogger.logMetrics(metrics);
      }
    }, 60000); // Every minute

    systemLogger.info('Metrics collection started', {
      type: 'audit',
      event: 'metrics_collection_started'
    });
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    systemLogger.info('Metrics collection stopped', {
      type: 'audit',
      event: 'metrics_collection_stopped'
    });
  }

  /**
   * Reset daily metrics (should be called at midnight)
   */
  resetDailyMetrics(): void {
    this.translationMetrics.apiCallsToday = 0;
    this.databaseMetrics.propertiesAddedToday = 0;
    this.databaseMetrics.propertiesUpdatedToday = 0;

    systemLogger.logAudit('daily_metrics_reset', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    timestamp: string;
    scraping: ScrapingMetrics[];
    translation: TranslationMetrics;
    database: DatabaseMetrics;
    system: SystemHealthMetrics;
  } {
    return {
      timestamp: new Date().toISOString(),
      scraping: this.getAllScrapingMetrics(),
      translation: this.getTranslationMetrics(),
      database: this.getDatabaseMetrics(),
      system: this.getCurrentSystemMetrics()
    };
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();