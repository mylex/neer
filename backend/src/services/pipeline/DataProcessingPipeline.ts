import { PropertyData, TranslatedPropertyData, TranslationStatus, CreatePropertyInput, PropertyType } from '../../models/Property';
import { propertyRepository } from '../../database/repositories/PropertyRepository';
import { ScraperFactory, SupportedSite, BaseScraper } from '../scraper';
import { TranslationService } from '../translation/TranslationService';
import { TranslationConfig } from '../translation/TranslationConfig';
import { PipelineLogger } from './PipelineLogger';
import { PipelineError, PipelineErrorType } from './PipelineError';

export interface PipelineConfig {
  scraperConfig: {
    browserConfig: {
      headless: boolean;
      timeout: number;
      viewport: { width: number; height: number };
    };
    scraperOptions: {
      maxRetries: number;
      retryDelay: number;
      requestDelay: number;
      maxConcurrentPages: number;
      timeout: number;
    };
  };
  translationConfig: TranslationConfig;
  processingOptions: {
    batchSize: number;
    maxConcurrentSites: number;
    enableDuplicateDetection: boolean;
    enableDataUpdate: boolean;
    skipTranslationOnError: boolean;
  };
}

export interface PipelineResult {
  success: boolean;
  totalProcessed: number;
  newProperties: number;
  updatedProperties: number;
  translatedProperties: number;
  errors: PipelineError[];
  processingTime: number;
  siteResults: Map<SupportedSite, SiteProcessingResult>;
}

export interface SiteProcessingResult {
  siteName: SupportedSite;
  scraped: number;
  translated: number;
  stored: number;
  errors: PipelineError[];
  processingTime: number;
}

/**
 * Main data processing pipeline that coordinates scraping, translation, and storage
 */
export class DataProcessingPipeline {
  private scraperFactory: ScraperFactory;
  private translationService: TranslationService;
  private logger: PipelineLogger;
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.scraperFactory = new ScraperFactory(config.scraperConfig);
    this.translationService = new TranslationService(config.translationConfig);
    this.logger = new PipelineLogger();
  }

  /**
   * Initialize the pipeline
   */
  async initialize(): Promise<void> {
    try {
      await this.translationService.initialize();
      this.logger.info('Data processing pipeline initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize pipeline', error as Error);
      throw new PipelineError(
        'Pipeline initialization failed',
        PipelineErrorType.INITIALIZATION_ERROR,
        error as Error
      );
    }
  }

  /**
   * Process all supported websites
   */
  async processAllSites(): Promise<PipelineResult> {
    const startTime = Date.now();
    const supportedSites = this.scraperFactory.getSupportedSites();
    
    this.logger.info(`Starting pipeline processing for ${supportedSites.length} sites`);

    const result: PipelineResult = {
      success: true,
      totalProcessed: 0,
      newProperties: 0,
      updatedProperties: 0,
      translatedProperties: 0,
      errors: [],
      processingTime: 0,
      siteResults: new Map()
    };

    // Process sites with concurrency control
    const semaphore = new Array(this.config.processingOptions.maxConcurrentSites).fill(null);
    const sitePromises = supportedSites.map(async (siteName, index) => {
      // Wait for available slot
      await this.waitForSlot(semaphore, index % this.config.processingOptions.maxConcurrentSites);
      
      try {
        const siteResult = await this.processSite(siteName);
        result.siteResults.set(siteName, siteResult);
        
        // Aggregate results
        result.totalProcessed += siteResult.scraped;
        result.translatedProperties += siteResult.translated;
        result.errors.push(...siteResult.errors);
        
        this.logger.info(`Completed processing for ${siteName}`, {
          scraped: siteResult.scraped,
          translated: siteResult.translated,
          stored: siteResult.stored
        });
      } catch (error) {
        const pipelineError = new PipelineError(
          `Failed to process site ${siteName}`,
          PipelineErrorType.SITE_PROCESSING_ERROR,
          error as Error
        );
        result.errors.push(pipelineError);
        this.logger.error(`Site processing failed for ${siteName}`, error as Error);
      } finally {
        // Release slot
        semaphore[index % this.config.processingOptions.maxConcurrentSites] = null;
      }
    });

    await Promise.allSettled(sitePromises);

    // Calculate final statistics
    result.processingTime = Date.now() - startTime;
    result.success = result.errors.length === 0;

    // Count new vs updated properties from database operations
    await this.calculateStorageStats(result);

    this.logger.info('Pipeline processing completed', {
      totalProcessed: result.totalProcessed,
      newProperties: result.newProperties,
      updatedProperties: result.updatedProperties,
      translatedProperties: result.translatedProperties,
      errors: result.errors.length,
      processingTime: result.processingTime
    });

    return result;
  }

  /**
   * Process a specific website
   */
  async processSite(siteName: SupportedSite): Promise<SiteProcessingResult> {
    const startTime = Date.now();
    const result: SiteProcessingResult = {
      siteName,
      scraped: 0,
      translated: 0,
      stored: 0,
      errors: [],
      processingTime: 0
    };

    try {
      this.logger.info(`Starting processing for site: ${siteName}`);

      // Step 1: Scrape data
      const scraper = this.scraperFactory.createScraper(siteName);
      const scrapedData = await this.scrapeWithErrorHandling(scraper, siteName);
      result.scraped = scrapedData.length;

      if (scrapedData.length === 0) {
        this.logger.warn(`No data scraped from ${siteName}`);
        return result;
      }

      // Step 2: Process in batches
      const batchSize = this.config.processingOptions.batchSize;
      for (let i = 0; i < scrapedData.length; i += batchSize) {
        const batch = scrapedData.slice(i, i + batchSize);
        
        try {
          const batchResult = await this.processBatch(batch, siteName);
          result.translated += batchResult.translated;
          result.stored += batchResult.stored;
          result.errors.push(...batchResult.errors);
        } catch (error) {
          const pipelineError = new PipelineError(
            `Batch processing failed for ${siteName}`,
            PipelineErrorType.BATCH_PROCESSING_ERROR,
            error as Error
          );
          result.errors.push(pipelineError);
          this.logger.error(`Batch processing error for ${siteName}`, error as Error);
        }
      }

    } catch (error) {
      const pipelineError = new PipelineError(
        `Site processing failed for ${siteName}`,
        PipelineErrorType.SITE_PROCESSING_ERROR,
        error as Error
      );
      result.errors.push(pipelineError);
      this.logger.error(`Site processing error for ${siteName}`, error as Error);
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Process a batch of properties
   */
  private async processBatch(
    properties: PropertyData[], 
    siteName: SupportedSite
  ): Promise<{ translated: number; stored: number; errors: PipelineError[] }> {
    const result: { translated: number; stored: number; errors: PipelineError[] } = { 
      translated: 0, 
      stored: 0, 
      errors: [] 
    };

    try {
      // Step 1: Duplicate detection and filtering
      const filteredProperties = await this.filterDuplicates(properties);
      
      // Step 2: Translation
      let translatedProperties: TranslatedPropertyData[];
      try {
        translatedProperties = await this.translationService.translateBatch(filteredProperties);
        result.translated = translatedProperties.filter(p => 
          p.translationStatus === TranslationStatus.COMPLETE || 
          p.translationStatus === TranslationStatus.PARTIAL
        ).length;
      } catch (error) {
        if (this.config.processingOptions.skipTranslationOnError) {
          this.logger.warn('Translation failed, storing without translation', error as Error);
          translatedProperties = filteredProperties.map(p => ({
            ...p,
            translationStatus: TranslationStatus.FAILED
          }));
        } else {
          throw error;
        }
      }

      // Step 3: Storage with update mechanism
      const storedProperties = await this.storeProperties(translatedProperties);
      result.stored = storedProperties.length;

    } catch (error) {
      const pipelineError = new PipelineError(
        `Batch processing failed for ${siteName}`,
        PipelineErrorType.BATCH_PROCESSING_ERROR,
        error as Error
      );
      result.errors.push(pipelineError);
      this.logger.error('Batch processing error', error as Error);
    }

    return result;
  }

  /**
   * Scrape data with error handling and retries
   */
  private async scrapeWithErrorHandling(
    scraper: BaseScraper, 
    siteName: SupportedSite
  ): Promise<PropertyData[]> {
    try {
      const scrapingResult = await scraper.scrapeProperties();
      
      if (!scrapingResult.success) {
        throw new PipelineError(
          `Scraping failed for ${siteName}`,
          PipelineErrorType.SCRAPING_ERROR,
          new Error(scrapingResult.errors?.join(', ') || 'Unknown scraping error')
        );
      }

      return scrapingResult.data || [];
    } catch (error) {
      this.logger.error(`Scraping error for ${siteName}`, error as Error);
      throw error;
    }
  }

  /**
   * Filter out duplicate properties based on URL
   */
  private async filterDuplicates(properties: PropertyData[]): Promise<PropertyData[]> {
    if (!this.config.processingOptions.enableDuplicateDetection) {
      return properties;
    }

    const filtered: PropertyData[] = [];
    const seenUrls = new Set<string>();

    for (const property of properties) {
      if (!seenUrls.has(property.url)) {
        // Check if property exists in database
        try {
          const existingProperty = await propertyRepository.findByUrl(property.url);
          
          if (!existingProperty || this.config.processingOptions.enableDataUpdate) {
            filtered.push(property);
            seenUrls.add(property.url);
          } else {
            this.logger.debug(`Skipping duplicate property: ${property.url}`);
          }
        } catch (error) {
          this.logger.error(`Error checking for duplicate: ${property.url}`, error as Error);
          // Include property if we can't check for duplicates
          filtered.push(property);
          seenUrls.add(property.url);
        }
      }
    }

    this.logger.info(`Filtered ${properties.length - filtered.length} duplicates`);
    return filtered;
  }

  /**
   * Store properties in database with upsert logic
   */
  private async storeProperties(properties: TranslatedPropertyData[]): Promise<TranslatedPropertyData[]> {
    const stored: TranslatedPropertyData[] = [];

    for (const property of properties) {
      try {
        // Convert to create input format
        const createInput: CreatePropertyInput = {
          url: property.url,
          title: property.title,
          titleEn: property.titleEn,
          price: property.price,
          location: property.location,
          locationEn: property.locationEn,
          sizeSqm: property.size,
          propertyType: property.propertyType as PropertyType,
          description: property.description,
          descriptionEn: property.descriptionEn,
          images: property.images,
          listingDate: property.listingDate,
          sourceWebsite: property.sourceWebsite,
          translationStatus: property.translationStatus
        };

        await propertyRepository.upsert(createInput);
        stored.push(property);
      } catch (error) {
        this.logger.error(`Failed to store property: ${property.url}`, error as Error);
        // Continue with other properties
      }
    }

    return stored;
  }

  /**
   * Calculate storage statistics (new vs updated)
   */
  private async calculateStorageStats(result: PipelineResult): Promise<void> {
    // This is a simplified calculation - in a real implementation,
    // you might want to track this during the storage process
    try {
      await propertyRepository.getStats();
      // For now, assume all processed properties are new
      // This could be enhanced to track actual new vs updated counts
      result.newProperties = result.totalProcessed;
      result.updatedProperties = 0;
    } catch (error) {
      this.logger.error('Failed to calculate storage stats', error as Error);
    }
  }

  /**
   * Wait for available processing slot
   */
  private async waitForSlot(semaphore: any[], slotIndex: number): Promise<void> {
    while (semaphore[slotIndex] !== null) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    semaphore[slotIndex] = true;
  }

  /**
   * Cleanup pipeline resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.translationService.cleanup();
      this.logger.info('Pipeline cleanup completed');
    } catch (error) {
      this.logger.error('Pipeline cleanup error', error as Error);
    }
  }

  /**
   * Get pipeline health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      translation: boolean;
      database: boolean;
      scraping: boolean;
    };
    lastProcessed?: Date;
  }> {
    const health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: {
        translation: boolean;
        database: boolean;
        scraping: boolean;
      };
    } = {
      status: 'healthy',
      services: {
        translation: false,
        database: false,
        scraping: false
      }
    };

    try {
      // Check translation service
      await this.translationService.getCacheStats();
      health.services.translation = true;
    } catch (error) {
      this.logger.error('Translation service health check failed', error as Error);
    }

    try {
      // Check database
      await propertyRepository.getStats();
      health.services.database = true;
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
    }

    try {
      // Check scraping capability
      const supportedSites = this.scraperFactory.getSupportedSites();
      health.services.scraping = supportedSites.length > 0;
    } catch (error) {
      this.logger.error('Scraping service health check failed', error as Error);
    }

    // Determine overall health
    const healthyServices = Object.values(health.services).filter(Boolean).length;
    if (healthyServices === 3) {
      health.status = 'healthy';
    } else if (healthyServices >= 2) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    return health;
  }
}