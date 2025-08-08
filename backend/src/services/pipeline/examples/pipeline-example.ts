import { DataProcessingPipeline, PipelineConfig } from '../DataProcessingPipeline';
import { PipelineLogger } from '../PipelineLogger';
import { PipelineError, PipelineErrorType } from '../PipelineError';

/**
 * Example demonstrating how to use the DataProcessingPipeline
 * This example shows the complete workflow from initialization to cleanup
 */
async function runPipelineExample() {
  const logger = new PipelineLogger();
  
  try {
    // 1. Configure the pipeline
    const config: PipelineConfig = {
      scraperConfig: {
        browserConfig: {
          headless: true,
          timeout: 30000,
          viewport: { width: 1366, height: 768 }
        },
        scraperOptions: {
          maxRetries: 3,
          retryDelay: 2000,
          requestDelay: 3000,
          maxConcurrentPages: 2,
          timeout: 30000
        }
      },
      translationConfig: {
        googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id',
        googleCloudKeyFile: process.env.GOOGLE_CLOUD_KEY_FILE,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        batchSize: 10,
        batchDelayMs: 1000,
        fallbackEnabled: true,
        cacheConfig: {
          ttl: 86400, // 24 hours
          maxSize: 10000
        }
      },
      processingOptions: {
        batchSize: 20,
        maxConcurrentSites: 3,
        enableDuplicateDetection: true,
        enableDataUpdate: true,
        skipTranslationOnError: false
      }
    };

    // 2. Create and initialize the pipeline
    logger.info('Creating data processing pipeline');
    const pipeline = new DataProcessingPipeline(config);
    
    logger.info('Initializing pipeline services');
    await pipeline.initialize();

    // 3. Check system health before processing
    logger.info('Checking system health');
    const healthStatus = await pipeline.getHealthStatus();
    logger.logHealthCheck(healthStatus.status, healthStatus.services);

    if (healthStatus.status === 'unhealthy') {
      throw new PipelineError(
        'System is unhealthy, aborting pipeline execution',
        PipelineErrorType.INITIALIZATION_ERROR
      );
    }

    // 4. Process all supported sites
    logger.info('Starting pipeline processing for all sites');
    const startTime = Date.now();
    
    const result = await pipeline.processAllSites();
    
    const processingTime = Date.now() - startTime;

    // 5. Log results and metrics
    logger.logPipelineMetrics({
      totalProcessed: result.totalProcessed,
      newProperties: result.newProperties,
      updatedProperties: result.updatedProperties,
      translatedProperties: result.translatedProperties,
      errors: result.errors.length,
      processingTime,
      sitesProcessed: result.siteResults.size
    });

    // 6. Handle errors if any
    if (result.errors.length > 0) {
      logger.warn(`Pipeline completed with ${result.errors.length} errors`);
      
      // Log error summary
      const errorsByType: Record<string, number> = {};
      result.errors.forEach(error => {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      });
      
      logger.info('Error summary by type', errorsByType);

      // Log retryable errors
      const retryableErrors = result.errors.filter(error => error.retryable);
      if (retryableErrors.length > 0) {
        logger.info(`${retryableErrors.length} errors are retryable and may succeed on next run`);
      }

      // Log alertable errors
      const alertableErrors = result.errors.filter(error => error.shouldAlert());
      if (alertableErrors.length > 0) {
        logger.error(`${alertableErrors.length} critical errors require immediate attention`);
        alertableErrors.forEach(error => {
          logger.error(`Critical error: ${error.getUserFriendlyMessage()}`, error);
        });
      }
    }

    // 7. Display site-specific results
    logger.info('Site-specific processing results:');
    result.siteResults.forEach((siteResult, siteName) => {
      logger.info(`${siteName}: ${siteResult.scraped} scraped, ${siteResult.translated} translated, ${siteResult.stored} stored`);
      
      if (siteResult.errors.length > 0) {
        logger.warn(`${siteName} had ${siteResult.errors.length} errors`);
      }
    });

    // 8. Final health check
    const finalHealthStatus = await pipeline.getHealthStatus();
    logger.logHealthCheck(finalHealthStatus.status, finalHealthStatus.services, {
      afterProcessing: true
    });

    logger.info('Pipeline execution completed successfully', {
      success: result.success,
      totalProcessed: result.totalProcessed,
      processingTime: result.processingTime
    });

    return result;

  } catch (error) {
    if (error instanceof PipelineError) {
      logger.error(`Pipeline error: ${error.getUserFriendlyMessage()}`, error);
      
      if (error.shouldAlert()) {
        logger.error('ALERT: Critical pipeline error detected', error);
        // Here you would typically send alerts to monitoring systems
      }
    } else {
      logger.error('Unexpected error during pipeline execution', error as Error);
    }
    
    throw error;
  }
}

/**
 * Example of processing a specific site only
 */
async function runSingleSiteExample() {
  const logger = new PipelineLogger();
  
  try {
    const config: PipelineConfig = {
      // ... same config as above
      scraperConfig: {
        browserConfig: {
          headless: true,
          timeout: 30000,
          viewport: { width: 1366, height: 768 }
        },
        scraperOptions: {
          maxRetries: 3,
          retryDelay: 2000,
          requestDelay: 3000,
          maxConcurrentPages: 2,
          timeout: 30000
        }
      },
      translationConfig: {
        googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id',
        googleCloudKeyFile: process.env.GOOGLE_CLOUD_KEY_FILE,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        batchSize: 10,
        batchDelayMs: 1000,
        fallbackEnabled: true,
        cacheConfig: {
          ttl: 86400,
          maxSize: 10000
        }
      },
      processingOptions: {
        batchSize: 20,
        maxConcurrentSites: 1, // Only one site
        enableDuplicateDetection: true,
        enableDataUpdate: true,
        skipTranslationOnError: false
      }
    };

    const pipeline = new DataProcessingPipeline(config);
    await pipeline.initialize();

    // Process only Suumo
    logger.info('Processing single site: suumo');
    const siteResult = await pipeline.processSite('suumo');

    logger.info('Single site processing completed', {
      siteName: siteResult.siteName,
      scraped: siteResult.scraped,
      translated: siteResult.translated,
      stored: siteResult.stored,
      errors: siteResult.errors.length,
      processingTime: siteResult.processingTime
    });

    await pipeline.cleanup();
    return siteResult;

  } catch (error) {
    logger.error('Single site processing failed', error as Error);
    throw error;
  }
}

/**
 * Example of error handling and recovery
 */
async function runErrorHandlingExample() {
  const logger = new PipelineLogger();
  
  try {
    // Create config with intentionally problematic settings for demonstration
    const config: PipelineConfig = {
      scraperConfig: {
        browserConfig: {
          headless: true,
          timeout: 5000, // Very short timeout to trigger errors
          viewport: { width: 1366, height: 768 }
        },
        scraperOptions: {
          maxRetries: 1, // Minimal retries
          retryDelay: 1000,
          requestDelay: 1000,
          maxConcurrentPages: 1,
          timeout: 5000
        }
      },
      translationConfig: {
        googleCloudProjectId: 'invalid-project', // Invalid project to trigger errors
        redisUrl: 'redis://invalid-host:6379', // Invalid Redis URL
        batchSize: 5,
        batchDelayMs: 500,
        fallbackEnabled: true,
        cacheConfig: {
          ttl: 3600,
          maxSize: 1000
        }
      },
      processingOptions: {
        batchSize: 10,
        maxConcurrentSites: 2,
        enableDuplicateDetection: true,
        enableDataUpdate: true,
        skipTranslationOnError: true // Skip translation errors to continue processing
      }
    };

    const pipeline = new DataProcessingPipeline(config);
    
    try {
      await pipeline.initialize();
    } catch (error) {
      logger.error('Pipeline initialization failed, but continuing with degraded functionality');
      // In a real scenario, you might want to use fallback configurations
    }

    const result = await pipeline.processAllSites();

    // Demonstrate error analysis
    if (result.errors.length > 0) {
      logger.info('Analyzing errors for recovery strategies');

      const retryableErrors = result.errors.filter(error => error.retryable);
      const nonRetryableErrors = result.errors.filter(error => !error.retryable);

      logger.info(`Found ${retryableErrors.length} retryable errors and ${nonRetryableErrors.length} permanent errors`);

      // Schedule retries for retryable errors
      for (const error of retryableErrors) {
        const delay = error.getRetryDelay();
        logger.info(`Error ${error.type} can be retried after ${delay}ms delay`);
      }

      // Report permanent errors for manual intervention
      for (const error of nonRetryableErrors) {
        logger.error(`Permanent error requires manual intervention: ${error.getUserFriendlyMessage()}`);
      }
    }

    await pipeline.cleanup();
    return result;

  } catch (error) {
    logger.error('Error handling example failed', error as Error);
    throw error;
  }
}

// Export examples for use in other modules
export {
  runPipelineExample,
  runSingleSiteExample,
  runErrorHandlingExample
};

// Run example if this file is executed directly
if (require.main === module) {
  runPipelineExample()
    .then(() => {
      console.log('Pipeline example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Pipeline example failed:', error);
      process.exit(1);
    });
}