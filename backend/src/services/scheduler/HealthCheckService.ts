import { DataProcessingPipeline, PipelineConfig } from '../pipeline/DataProcessingPipeline';
import { propertyRepository } from '../../database/repositories/PropertyRepository';
import { TranslationConfig } from '../translation/TranslationConfig';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    translation: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    scraping: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
  overallHealth: {
    score: number; // 0-100
    issues: string[];
  };
}

export interface HealthCheckConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Service for performing health checks before scheduled scraping operations
 */
export class HealthCheckService {
  private config: HealthCheckConfig;

  constructor(config: HealthCheckConfig) {
    this.config = config;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: { status: 'unhealthy' },
        translation: { status: 'unhealthy' },
        scraping: { status: 'unhealthy' },
      },
      overallHealth: {
        score: 0,
        issues: [],
      },
    };

    // Perform health checks concurrently
    const [databaseHealth, translationHealth, scrapingHealth] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkTranslationHealth(),
      this.checkScrapingHealth(),
    ]);

    // Process database health check
    if (databaseHealth.status === 'fulfilled') {
      result.services.database = databaseHealth.value;
    } else {
      result.services.database = {
        status: 'unhealthy',
        error: databaseHealth.reason?.message || 'Unknown database error',
      };
    }

    // Process translation health check
    if (translationHealth.status === 'fulfilled') {
      result.services.translation = translationHealth.value;
    } else {
      result.services.translation = {
        status: 'unhealthy',
        error: translationHealth.reason?.message || 'Unknown translation error',
      };
    }

    // Process scraping health check
    if (scrapingHealth.status === 'fulfilled') {
      result.services.scraping = scrapingHealth.value;
    } else {
      result.services.scraping = {
        status: 'unhealthy',
        error: scrapingHealth.reason?.message || 'Unknown scraping error',
      };
    }

    // Calculate overall health
    this.calculateOverallHealth(result);

    return result;
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test database connection with a simple query
      await this.withTimeout(
        propertyRepository.getStats(),
        this.config.timeout
      );

      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Check translation service health
   */
  private async checkTranslationHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Create a minimal pipeline configuration for health check
      const pipelineConfig: PipelineConfig = {
        scraperConfig: {
          browserConfig: {
            headless: true,
            timeout: 30000,
            viewport: { width: 1920, height: 1080 },
          },
          scraperOptions: {
            maxRetries: 1,
            retryDelay: 1000,
            requestDelay: 1000,
            maxConcurrentPages: 1,
            timeout: 30000,
          },
        },
        translationConfig: new TranslationConfig(),
        processingOptions: {
          batchSize: 1,
          maxConcurrentSites: 1,
          enableDuplicateDetection: false,
          enableDataUpdate: false,
          skipTranslationOnError: true,
        },
      };

      const pipeline = new DataProcessingPipeline(pipelineConfig);
      await pipeline.initialize();

      // Test translation service health
      const healthStatus = await this.withTimeout(
        pipeline.getHealthStatus(),
        this.config.timeout
      );

      await pipeline.cleanup();

      const responseTime = Date.now() - startTime;
      return {
        status: healthStatus.services.translation ? 'healthy' : 'unhealthy',
        responseTime,
        ...(healthStatus.services.translation ? {} : { error: 'Translation service unavailable' }),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown translation error',
      };
    }
  }

  /**
   * Check scraping service health
   */
  private async checkScrapingHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Create a minimal pipeline configuration for health check
      const pipelineConfig: PipelineConfig = {
        scraperConfig: {
          browserConfig: {
            headless: true,
            timeout: 30000,
            viewport: { width: 1920, height: 1080 },
          },
          scraperOptions: {
            maxRetries: 1,
            retryDelay: 1000,
            requestDelay: 1000,
            maxConcurrentPages: 1,
            timeout: 30000,
          },
        },
        translationConfig: new TranslationConfig(),
        processingOptions: {
          batchSize: 1,
          maxConcurrentSites: 1,
          enableDuplicateDetection: false,
          enableDataUpdate: false,
          skipTranslationOnError: true,
        },
      };

      const pipeline = new DataProcessingPipeline(pipelineConfig);
      await pipeline.initialize();

      // Test scraping service health
      const healthStatus = await this.withTimeout(
        pipeline.getHealthStatus(),
        this.config.timeout
      );

      await pipeline.cleanup();

      const responseTime = Date.now() - startTime;
      return {
        status: healthStatus.services.scraping ? 'healthy' : 'unhealthy',
        responseTime,
        ...(healthStatus.services.scraping ? {} : { error: 'Scraping service unavailable' }),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
      };
    }
  }

  /**
   * Calculate overall health score and status
   */
  private calculateOverallHealth(result: HealthCheckResult): void {
    const services = Object.values(result.services);
    const healthyServices = services.filter(service => service.status === 'healthy').length;
    const totalServices = services.length;

    // Calculate health score (0-100)
    result.overallHealth.score = Math.round((healthyServices / totalServices) * 100);

    // Collect issues
    result.overallHealth.issues = [];
    Object.entries(result.services).forEach(([serviceName, serviceHealth]) => {
      if (serviceHealth.status === 'unhealthy') {
        result.overallHealth.issues.push(
          `${serviceName}: ${serviceHealth.error || 'Service unavailable'}`
        );
      }
    });

    // Determine overall status
    if (result.overallHealth.score === 100) {
      result.status = 'healthy';
    } else if (result.overallHealth.score >= 66) {
      result.status = 'degraded';
    } else {
      result.status = 'unhealthy';
    }
  }

  /**
   * Perform health check with retries
   */
  async performHealthCheckWithRetries(): Promise<HealthCheckResult> {
    let lastResult: HealthCheckResult | null = null;
    let attempt = 0;

    while (attempt < this.config.retryAttempts) {
      try {
        const result = await this.performHealthCheck();
        
        // If healthy or degraded, return immediately
        if (result.status === 'healthy' || result.status === 'degraded') {
          return result;
        }

        lastResult = result;
        attempt++;

        // Wait before retry (except for last attempt)
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      } catch (error) {
        attempt++;
        lastResult = {
          status: 'unhealthy',
          timestamp: new Date(),
          services: {
            database: { status: 'unhealthy', error: 'Health check failed' },
            translation: { status: 'unhealthy', error: 'Health check failed' },
            scraping: { status: 'unhealthy', error: 'Health check failed' },
          },
          overallHealth: {
            score: 0,
            issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          },
        };

        // Wait before retry (except for last attempt)
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    return lastResult!;
  }

  /**
   * Check if system is ready for scraping
   */
  async isSystemReady(): Promise<{ ready: boolean; reason?: string; healthResult: HealthCheckResult }> {
    const healthResult = await this.performHealthCheckWithRetries();

    if (healthResult.status === 'healthy') {
      return { ready: true, healthResult };
    }

    if (healthResult.status === 'degraded') {
      // Allow scraping if at least database and one other service is healthy
      const healthyServices = Object.entries(healthResult.services)
        .filter(([, service]) => service.status === 'healthy')
        .map(([name]) => name);

      if (healthyServices.includes('database') && healthyServices.length >= 2) {
        return { ready: true, healthResult };
      }
    }

    return {
      ready: false,
      reason: `System health check failed: ${healthResult.overallHealth.issues.join(', ')}`,
      healthResult,
    };
  }

  /**
   * Utility function to add timeout to promises
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}