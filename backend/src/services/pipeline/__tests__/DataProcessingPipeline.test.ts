import { DataProcessingPipeline, PipelineConfig } from '../DataProcessingPipeline';
import { PipelineError, PipelineErrorType } from '../PipelineError';
import { TranslationStatus, PropertyType } from '@shared/types';
import { propertyRepository } from '../../../database/repositories/PropertyRepository';
import { TranslationService } from '../../translation/TranslationService';
import { ScraperFactory } from '../../scraper/ScraperFactory';

// Mock dependencies
jest.mock('../../../database/repositories/PropertyRepository');
jest.mock('../../translation/TranslationService');
jest.mock('../../scraper/ScraperFactory');

const mockPropertyRepository = propertyRepository as jest.Mocked<typeof propertyRepository>;
const MockTranslationService = TranslationService as jest.MockedClass<typeof TranslationService>;
const MockScraperFactory = ScraperFactory as jest.MockedClass<typeof ScraperFactory>;

describe('DataProcessingPipeline', () => {
  let pipeline: DataProcessingPipeline;
  let mockConfig: PipelineConfig;
  let mockTranslationService: jest.Mocked<TranslationService>;
  let mockScraperFactory: jest.Mocked<ScraperFactory>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock config
    const mockTranslationConfig = {
      googleCloudProjectId: 'test-project',
      googleCloudKeyFile: undefined,
      redisUrl: 'redis://localhost:6379',
      batchSize: 10,
      batchDelayMs: 1000,
      fallbackEnabled: false,
      cacheConfig: {
        ttl: 86400,
        maxSize: 10000,
        keyPrefix: 'test:'
      },
      validateConfig: jest.fn(),
      getSummary: jest.fn().mockReturnValue({})
    };

    mockConfig = {
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
      translationConfig: mockTranslationConfig as any,
      processingOptions: {
        batchSize: 5,
        maxConcurrentSites: 2,
        enableDuplicateDetection: true,
        enableDataUpdate: true,
        skipTranslationOnError: false
      }
    };

    // Create mock instances
    mockTranslationService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      translateBatch: jest.fn(),
      cleanup: jest.fn().mockResolvedValue(undefined),
      getCacheStats: jest.fn().mockResolvedValue({ hits: 0, misses: 0, size: 0 })
    } as any;

    mockScraperFactory = {
      getSupportedSites: jest.fn().mockReturnValue(['suumo']),
      createScraper: jest.fn()
    } as any;

    // Mock constructors
    MockTranslationService.mockImplementation(() => mockTranslationService);
    MockScraperFactory.mockImplementation(() => mockScraperFactory);

    pipeline = new DataProcessingPipeline(mockConfig);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(pipeline.initialize()).resolves.not.toThrow();
      expect(mockTranslationService.initialize).toHaveBeenCalled();
    });

    it('should throw PipelineError on initialization failure', async () => {
      const error = new Error('Translation service failed');
      mockTranslationService.initialize.mockRejectedValue(error);

      await expect(pipeline.initialize()).rejects.toThrow(PipelineError);
    });
  });

  describe('processAllSites', () => {
    const mockPropertyData = {
      url: 'https://suumo.jp/property/1',
      title: 'テストプロパティ',
      price: 50000000,
      location: '東京都渋谷区',
      sizeSqm: 50,
      propertyType: PropertyType.APARTMENT,
      description: 'テスト説明',
      images: ['image1.jpg'],
      listingDate: new Date(),
      sourceWebsite: 'suumo'
    };

    const mockTranslatedData = {
      ...mockPropertyData,
      titleEn: 'Test Property',
      locationEn: 'Shibuya, Tokyo',
      descriptionEn: 'Test description',
      translationStatus: TranslationStatus.COMPLETE
    };

    beforeEach(() => {
      // Mock scraper
      const mockScraper = {
        scrapeProperties: jest.fn().mockResolvedValue({
          success: true,
          data: [mockPropertyData],
          errors: [],
          scrapedCount: 1,
          skippedCount: 0
        })
      };
      mockScraperFactory.createScraper.mockReturnValue(mockScraper as any);

      // Mock translation service
      mockTranslationService.translateBatch.mockResolvedValue([mockTranslatedData]);

      // Mock repository
      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.upsert.mockResolvedValue({
        id: 1,
        ...mockTranslatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockPropertyRepository.getStats.mockResolvedValue({
        totalProperties: 1,
        translatedProperties: 1,
        pendingTranslation: 0,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {
          [PropertyType.APARTMENT]: 1,
          [PropertyType.HOUSE]: 0,
          [PropertyType.MANSION]: 0,
          [PropertyType.LAND]: 0,
          [PropertyType.OTHER]: 0
        }
      });
    });

    it('should process all sites successfully', async () => {
      const result = await pipeline.processAllSites();

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(1);
      expect(result.translatedProperties).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.siteResults.has('suumo')).toBe(true);
    });

    it('should handle scraping errors gracefully', async () => {
      const mockScraper = {
        scrapeProperties: jest.fn().mockResolvedValue({
          success: false,
          data: [],
          errors: ['Scraping failed'],
          scrapedCount: 0,
          skippedCount: 0
        })
      };
      mockScraperFactory.createScraper.mockReturnValue(mockScraper as any);

      const result = await pipeline.processAllSites();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.type).toBe(PipelineErrorType.SITE_PROCESSING_ERROR);
    });

    it('should handle translation errors when skipTranslationOnError is true', async () => {
      mockConfig.processingOptions.skipTranslationOnError = true;
      pipeline = new DataProcessingPipeline(mockConfig);

      mockTranslationService.translateBatch.mockRejectedValue(new Error('Translation failed'));

      const result = await pipeline.processAllSites();

      expect(result.totalProcessed).toBe(1);
      expect(mockPropertyRepository.upsert).toHaveBeenCalled();
    });

    it('should detect and skip duplicates when enabled', async () => {
      mockPropertyRepository.findByUrl.mockResolvedValue({
        id: 1,
        ...mockTranslatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await pipeline.processAllSites();

      expect(result.totalProcessed).toBe(1);
      expect(mockPropertyRepository.upsert).toHaveBeenCalled(); // Should still upsert when enableDataUpdate is true
    });

    it('should process multiple sites concurrently', async () => {
      mockScraperFactory.getSupportedSites.mockReturnValue(['suumo', 'homes']);
      
      // Mock homes scraper (even though it's not implemented)
      const mockHomesScraper = {
        scrapeProperties: jest.fn().mockResolvedValue({
          success: true,
          data: [{ ...mockPropertyData, sourceWebsite: 'homes' }],
          errors: [],
          scrapedCount: 1,
          skippedCount: 0
        })
      };
      
      mockScraperFactory.createScraper.mockImplementation((site) => {
        if (site === 'suumo') {
          return {
            scrapeProperties: jest.fn().mockResolvedValue({
              success: true,
              data: [mockPropertyData],
              errors: [],
              scrapedCount: 1,
              skippedCount: 0
            })
          } as any;
        } else if (site === 'homes') {
          return mockHomesScraper as any;
        }
        throw new Error(`Unsupported site: ${site}`);
      });

      const result = await pipeline.processAllSites();

      expect(result.siteResults.size).toBe(2);
      expect(result.siteResults.has('suumo')).toBe(true);
      expect(result.siteResults.has('homes')).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all services are working', async () => {
      mockPropertyRepository.getStats.mockResolvedValue({
        totalProperties: 10,
        translatedProperties: 8,
        pendingTranslation: 2,
        failedTranslation: 0,
        sourceWebsites: 1,
        propertiesByType: {
          [PropertyType.APARTMENT]: 5,
          [PropertyType.HOUSE]: 3,
          [PropertyType.MANSION]: 2,
          [PropertyType.LAND]: 0,
          [PropertyType.OTHER]: 0
        }
      });

      const health = await pipeline.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.services.translation).toBe(true);
      expect(health.services.database).toBe(true);
      expect(health.services.scraping).toBe(true);
    });

    it('should return degraded status when some services fail', async () => {
      mockTranslationService.getCacheStats.mockRejectedValue(new Error('Translation service down'));

      const health = await pipeline.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.services.translation).toBe(false);
      expect(health.services.database).toBe(true);
      expect(health.services.scraping).toBe(true);
    });

    it('should return unhealthy status when most services fail', async () => {
      mockTranslationService.getCacheStats.mockRejectedValue(new Error('Translation service down'));
      mockPropertyRepository.getStats.mockRejectedValue(new Error('Database down'));

      const health = await pipeline.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.services.translation).toBe(false);
      expect(health.services.database).toBe(false);
      expect(health.services.scraping).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources successfully', async () => {
      await expect(pipeline.cleanup()).resolves.not.toThrow();
      expect(mockTranslationService.cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockTranslationService.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      await expect(pipeline.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should create appropriate error types for different failures', () => {
      const scrapingError = PipelineError.scrapingError('Scraping failed');
      expect(scrapingError.type).toBe(PipelineErrorType.SCRAPING_ERROR);
      expect(scrapingError.retryable).toBe(false);

      const networkError = PipelineError.networkError('Network failed');
      expect(networkError.type).toBe(PipelineErrorType.NETWORK_ERROR);
      expect(networkError.retryable).toBe(true);

      const dbError = PipelineError.databaseError('Database failed');
      expect(dbError.type).toBe(PipelineErrorType.DATABASE_ERROR);
      expect(dbError.retryable).toBe(true);
    });

    it('should provide user-friendly error messages', () => {
      const error = new PipelineError('Test error', PipelineErrorType.SCRAPING_ERROR);
      const friendlyMessage = error.getUserFriendlyMessage();
      
      expect(friendlyMessage).toContain('scrape property data');
      expect(friendlyMessage).not.toContain('Test error');
    });

    it('should determine correct retry delays', () => {
      const rateLimitError = PipelineError.rateLimitError('Rate limited');
      expect(rateLimitError.getRetryDelay()).toBe(60000);

      const networkError = PipelineError.networkError('Network error');
      expect(networkError.getRetryDelay()).toBe(30000);

      const validationError = PipelineError.validationError('Invalid data');
      expect(validationError.getRetryDelay()).toBe(0);
    });
  });
});