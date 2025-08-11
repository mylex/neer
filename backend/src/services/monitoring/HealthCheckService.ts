import { Pool } from 'pg';
import { systemLogger } from './SystemLogger';
import { metricsCollector } from './MetricsCollector';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: HealthCheckResult[];
  uptime: number;
  version: string;
}

/**
 * Health check service for monitoring system components
 */
export class HealthCheckService {
  private static instance: HealthCheckService;
  private dbPool?: Pool;
  private redisClient?: any;
  private healthCheckInterval?: NodeJS.Timeout | undefined;
  private lastHealthCheck?: SystemHealthStatus;

  private constructor() {
    this.startPeriodicHealthChecks();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Set database pool for health checks
   */
  setDatabasePool(pool: Pool): void {
    this.dbPool = pool;
  }

  /**
   * Set Redis client for health checks
   */
  setRedisClient(client: any): void {
    this.redisClient = client;
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.dbPool) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: 0,
          error: 'Database pool not configured'
        };
      }

      // Simple query to check database connectivity
      const result = await this.dbPool.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      // Check connection pool status
      const poolStatus = {
        totalConnections: this.dbPool.totalCount,
        idleConnections: this.dbPool.idleCount,
        waitingClients: this.dbPool.waitingCount
      };

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Mark as degraded if response time is high or pool is stressed
      if (responseTime > 1000 || poolStatus.waitingClients > 5) {
        status = 'degraded';
      }

      return {
        service: 'database',
        status,
        responseTime,
        details: {
          queryResult: result.rows[0],
          poolStatus
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.redisClient) {
        return {
          service: 'redis',
          status: 'degraded',
          responseTime: 0,
          details: { note: 'Redis client not configured - caching disabled' }
        };
      }

      // Test Redis connectivity with ping
      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;

      // Get Redis info
      const info = await this.redisClient.info('memory');
      const memoryInfo = this.parseRedisInfo(info);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Mark as degraded if response time is high
      if (responseTime > 500) {
        status = 'degraded';
      }

      return {
        service: 'redis',
        status,
        responseTime,
        details: {
          memoryUsage: memoryInfo['used_memory_human'],
          connectedClients: memoryInfo['connected_clients']
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Mark as degraded if memory usage is high
      if (memoryUsagePercent > 80) {
        status = 'degraded';
      }
      
      // Mark as unhealthy if memory usage is critical
      if (memoryUsagePercent > 95) {
        status = 'unhealthy';
      }

      const responseTime = Date.now() - startTime;

      return {
        service: 'system',
        status,
        responseTime,
        details: {
          memoryUsage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
            usagePercent: Math.round(memoryUsagePercent * 100) / 100
          },
          uptime: Math.round(uptime),
          nodeVersion: process.version,
          platform: process.platform
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: 'system',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown system error'
      };
    }
  }

  /**
   * Check external services (translation API, etc.)
   */
  private async checkExternalServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // For now, we'll just check if the translation service configuration is available
      const hasTranslationConfig = !!(
        process.env['GOOGLE_TRANSLATE_API_KEY'] || 
        process.env['AZURE_TRANSLATOR_KEY']
      );

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!hasTranslationConfig) {
        status = 'degraded';
      }

      const responseTime = Date.now() - startTime;

      return {
        service: 'external_services',
        status,
        responseTime,
        details: {
          translationService: hasTranslationConfig ? 'configured' : 'not configured',
          note: hasTranslationConfig ? 'Translation API keys found' : 'No translation API keys configured'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: 'external_services',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown external service error'
      };
    }
  }

  /**
   * Check scraping services health
   */
  private async checkScrapingServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const scrapingMetrics = metricsCollector.getAllScrapingMetrics();
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let issues: string[] = [];

      // Check if any sites have low success rates
      for (const metrics of scrapingMetrics) {
        const successRate = metricsCollector.getScrapingSuccessRate(metrics.siteName);
        if (successRate < 50) {
          status = 'unhealthy';
          issues.push(`${metrics.siteName}: ${successRate.toFixed(1)}% success rate`);
        } else if (successRate < 80) {
          if (status === 'healthy') status = 'degraded';
          issues.push(`${metrics.siteName}: ${successRate.toFixed(1)}% success rate`);
        }
      }

      return {
        service: 'scraping',
        status,
        responseTime,
        details: {
          totalSites: scrapingMetrics.length,
          issues: issues.length > 0 ? issues : undefined,
          summary: scrapingMetrics.map(m => ({
            site: m.siteName,
            successRate: metricsCollector.getScrapingSuccessRate(m.siteName),
            lastSuccess: m.lastSuccessfulScrape,
            totalAttempts: m.totalAttempts
          }))
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        service: 'scraping',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown scraping service error'
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    
    systemLogger.info('Starting system health check');

    const healthChecks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSystemResources(),
      this.checkExternalServices(),
      this.checkScrapingServices()
    ]);

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const unhealthyServices = healthChecks.filter(check => check.status === 'unhealthy');
    const degradedServices = healthChecks.filter(check => check.status === 'degraded');

    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    }

    const healthStatus: SystemHealthStatus = {
      overall: overallStatus,
      timestamp: new Date(),
      services: healthChecks,
      uptime: process.uptime() * 1000,
      version: process.env['npm_package_version'] || '1.0.0'
    };

    const totalTime = Date.now() - startTime;
    
    systemLogger.info(`Health check completed in ${totalTime}ms`, {
      type: 'health_check',
      overallStatus,
      servicesChecked: healthChecks.length,
      unhealthyServices: unhealthyServices.length,
      degradedServices: degradedServices.length
    });

    // Log individual service issues
    [...unhealthyServices, ...degradedServices].forEach(service => {
      const level = service.status === 'unhealthy' ? 'error' : 'warn';
      if (level === 'error') {
        systemLogger.error(`Service ${service.service} is ${service.status}`, new Error(service.error || 'Service unhealthy'), {
          serviceName: service.service,
          status: service.status,
          responseTime: service.responseTime,
          details: service.details
        });
      } else {
        systemLogger.warn(`Service ${service.service} is ${service.status}`, {
          serviceName: service.service,
          status: service.status,
          responseTime: service.responseTime,
          error: service.error,
          details: service.details
        });
      }
    });

    this.lastHealthCheck = healthStatus;
    return healthStatus;
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): SystemHealthStatus | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Check if system is healthy
   */
  isSystemHealthy(): boolean {
    return this.lastHealthCheck?.overall === 'healthy';
  }

  /**
   * Get health check for specific service
   */
  getServiceHealth(serviceName: string): HealthCheckResult | undefined {
    return this.lastHealthCheck?.services.find(service => service.service === serviceName);
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    // Perform initial health check
    this.performHealthCheck().catch(error => {
      systemLogger.error('Initial health check failed', error);
    });

    // Schedule periodic health checks every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        systemLogger.error('Periodic health check failed', error instanceof Error ? error : new Error(String(error)));
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    systemLogger.info('Periodic health checks started', {
      type: 'audit',
      event: 'health_checks_started',
      interval: '5 minutes'
    });
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    systemLogger.info('Periodic health checks stopped', {
      type: 'audit',
      event: 'health_checks_stopped'
    });
  }

  /**
   * Parse Redis info string
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value !== undefined) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * Get health check summary for monitoring endpoints
   */
  getHealthSummary(): {
    status: string;
    timestamp: string;
    uptime: number;
    services: { [key: string]: string };
    issues?: string[];
  } {
    if (!this.lastHealthCheck) {
      return {
        status: 'unknown',
        timestamp: new Date().toISOString(),
        uptime: process.uptime() * 1000,
        services: {}
      };
    }

    const services: { [key: string]: string } = {};
    const issues: string[] = [];

    this.lastHealthCheck.services.forEach(service => {
      services[service.service] = service.status;
      if (service.status !== 'healthy') {
        issues.push(`${service.service}: ${service.status}${service.error ? ` (${service.error})` : ''}`);
      }
    });

    const result: {
      status: string;
      timestamp: string;
      uptime: number;
      services: { [key: string]: string };
      issues?: string[];
    } = {
      status: this.lastHealthCheck.overall,
      timestamp: this.lastHealthCheck.timestamp.toISOString(),
      uptime: this.lastHealthCheck.uptime,
      services
    };

    if (issues.length > 0) {
      result.issues = issues;
    }

    return result;
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();