import { DataProcessingPipeline, PipelineConfig } from '../pipeline/DataProcessingPipeline';
import { SuumoScraper } from '../scraper/SuumoScraper';
import { TranslationService } from '../translation/TranslationService';
import { TranslationConfig } from '../translation/TranslationConfig';
import { propertyRepository } from '../../database/repositories/PropertyRepository';
import { PropertyData, PropertyType, TranslationStatus } from '../../models/Property';
import { ScrapingResult } from '../scraper/BaseScraper';
import { SupportedSite } from '../scraper/ScraperFactory';

// Mock dependencies
jest.mock('../scraper/SuumoScraper');
jest.mock('../translation/TranslationService');
jest.mock('../translation/TranslationConfig');
jest.mock('../../database/repositories/PropertyRepository');

describe('Scraping and Translation Pipeline Integration', () => {
  let pipeline: DataProcessingPipeline;
  let mockSuumoScraper: jest.Mocked<SuumoScraper>;
  let mockTranslationService: jest.Mocked<TranslationService>;
  let mockTranslationConfig: jest.Mocked<TranslationConfig>;
  let mockPropertyRepository: jest.Mocked<typeof propertyRepository>;

  const mockPropertyData: PropertyData = {
    url: 'http://suumo.jp/property/123',
    title: '東京のアパート',
    price: 100000,
    location: '東京都渋谷区',
    size: 50,
    propertyType: PropertyType.APARTMENT,
    description: '駅から徒歩5分の便利な立地',
    images: ['image1.jpg', 'image2.jpg'],
    listingDate: new Date('2023-01-01'),
    sourceWebsite: 'suumo'
  };

  const mockTranslatedPropertyData = {
    ...mockPropertyData,
    titleEn: 'Tokyo Apartment',
    locationEn: 'Shibuya, Tokyo',
    descriptionEn: 'Convenient location 5 minutes walk from station',
    translationStatus: TranslationStatus.COMPLETE
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockSuumoScraper = new SuumoScraper({} as any, {} as any) as jest.Mocked<SuumoScraper>;
    mockTranslationService = new TranslationService({} as any) as jest.Mocked<TranslationService>;
    mockTranslationConfig = new TranslationConfig() as jest.Mocked<TranslationConfig>;
    mockPropertyRepository = propertyRepository as jest.Mocked<typeof propertyRepository>;

    // Mock constructors
    (SuumoScraper as jest.MockedClass<typeof SuumoScraper>).mockImplementation(() => mockSuumoScraper);
    (TranslationService as jest.MockedClass<typeof TranslationService>).mockImplementation(() => mockTranslationService);
    (TranslationConfig as jest.MockedClass<typeof TranslationConfig>).mockImplementation(() => mockTranslationConfig);

    const pipelineConfig: PipelineConfig = {
      translationConfig: mockTranslationConfig,
      enableDuplicateDetection: true,
      skipTranslationOnError: false,
      maxConcurrentSites: 1
    };

    pipeline = new DataProcessingPipeline(pipelineConfig);
  });

  describe('complete pipeline flow', () => {
    it('should successfully scrape, translate, and store properties', async () => {
      // Setup successful scraping
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup successful translation
      mockTranslationService.translateProperty.mockResolvedValue(mockTranslatedPropertyData);

      // Setup successful storage
      mockPropertyRepository.create.mockResolvedValue({ id: 1, ...mockTranslatedPropertyData } as any);
      mockPropertyRepository.findByUrl.mockResolvedValue(null); // No existing property

      // Execute pipeline
      const result = await pipeline.processSite('suumo' as SupportedSite);

      // Verify scraping was called
      expect(mockSuumoScraper.scrapeProperties).toHaveBeenCalled();

      // Verify translation was called
      expect(mockTranslationService.translateProperty).toHaveBeenCalledWith(mockPropertyData);

      // Verify storage was called
      expect(mockPropertyRepository.create).toHaveBeenCalledWith(mockTranslatedPropertyData);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle scraping failures gracefully', async () => {
      // Setup failed scraping
      const scrapingResult: ScrapingResult = {
        success: false,
        data: [],
        errors: ['Network error', 'Timeout error'],
        scrapedCount: 0,
        skippedCount: 2
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(0);
      expect(result.errors).toContain('Scraping failed: Network error, Timeout error');

      // Translation and storage should not be called
      expect(mockTranslationService.translateProperty).not.toHaveBeenCalled();
      expect(mockPropertyRepository.create).not.toHaveBeenCalled();
    });

    it('should handle translation failures and store with partial translation', async () => {
      // Setup successful scraping
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup failed translation
      const partialTranslation = {
        ...mockPropertyData,
        titleEn: 'Tokyo Apartment',
        locationEn: undefined, // Translation failed for location
        descriptionEn: undefined, // Translation failed for description
        translationStatus: TranslationStatus.PARTIAL
      };
      mockTranslationService.translateProperty.mockResolvedValue(partialTranslation);

      // Setup successful storage
      mockPropertyRepository.create.mockResolvedValue({ id: 1, ...partialTranslation } as any);
      mockPropertyRepository.findByUrl.mockResolvedValue(null);

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(mockPropertyRepository.create).toHaveBeenCalledWith(partialTranslation);
    });

    it('should update existing properties instead of creating duplicates', async () => {
      // Setup successful scraping
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup successful translation
      mockTranslationService.translateProperty.mockResolvedValue(mockTranslatedPropertyData);

      // Setup existing property
      const existingProperty = { id: 1, ...mockPropertyData };
      mockPropertyRepository.findByUrl.mockResolvedValue(existingProperty as any);
      mockPropertyRepository.update.mockResolvedValue({ ...existingProperty, ...mockTranslatedPropertyData } as any);

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(mockPropertyRepository.update).toHaveBeenCalledWith(1, mockTranslatedPropertyData);
      expect(mockPropertyRepository.create).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Setup successful scraping and translation
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);
      mockTranslationService.translateProperty.mockResolvedValue(mockTranslatedPropertyData);

      // Setup database error
      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create.mockRejectedValue(new Error('Database connection failed'));

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(0);
      expect(result.errors).toContain('Database error: Database connection failed');
    });

    it('should process multiple properties in batch', async () => {
      const property1 = { ...mockPropertyData, url: 'http://suumo.jp/property/1' };
      const property2 = { ...mockPropertyData, url: 'http://suumo.jp/property/2' };
      const property3 = { ...mockPropertyData, url: 'http://suumo.jp/property/3' };

      // Setup successful scraping with multiple properties
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [property1, property2, property3],
        errors: [],
        scrapedCount: 3,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup successful translation for all properties
      mockTranslationService.translateProperty
        .mockResolvedValueOnce({ ...property1, ...mockTranslatedPropertyData, url: property1.url })
        .mockResolvedValueOnce({ ...property2, ...mockTranslatedPropertyData, url: property2.url })
        .mockResolvedValueOnce({ ...property3, ...mockTranslatedPropertyData, url: property3.url });

      // Setup no existing properties
      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
        .mockResolvedValueOnce({ id: 3 } as any);

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      expect(mockTranslationService.translateProperty).toHaveBeenCalledTimes(3);
      expect(mockPropertyRepository.create).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const property1 = { ...mockPropertyData, url: 'http://suumo.jp/property/1' };
      const property2 = { ...mockPropertyData, url: 'http://suumo.jp/property/2' };

      // Setup successful scraping
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [property1, property2],
        errors: [],
        scrapedCount: 2,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup mixed translation results
      mockTranslationService.translateProperty
        .mockResolvedValueOnce({ ...property1, ...mockTranslatedPropertyData, url: property1.url })
        .mockRejectedValueOnce(new Error('Translation API error'));

      // Setup storage
      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create.mockResolvedValueOnce({ id: 1 } as any);

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(false); // Overall failure due to one property failing
      expect(result.processedCount).toBe(1); // One property processed successfully
      expect(result.errors).toContain('Translation error: Translation API error');
    });

    it('should cleanup resources after processing', async () => {
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);
      mockSuumoScraper.cleanup.mockResolvedValue();
      mockTranslationService.translateProperty.mockResolvedValue(mockTranslatedPropertyData);
      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create.mockResolvedValue({ id: 1 } as any);

      await pipeline.processSite('suumo' as SupportedSite);

      expect(mockSuumoScraper.cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);
      mockSuumoScraper.cleanup.mockRejectedValue(new Error('Cleanup failed'));
      mockTranslationService.translateProperty.mockResolvedValue(mockTranslatedPropertyData);
      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create.mockResolvedValue({ id: 1 } as any);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(true); // Main processing should still succeed
      expect(consoleSpy).toHaveBeenCalledWith('Failed to cleanup scraper:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('performance and concurrency', () => {
    it('should handle large batches of properties efficiently', async () => {
      // Create 100 mock properties
      const properties = Array.from({ length: 100 }, (_, i) => ({
        ...mockPropertyData,
        url: `http://suumo.jp/property/${i}`,
        title: `Property ${i}`
      }));

      const scrapingResult: ScrapingResult = {
        success: true,
        data: properties,
        errors: [],
        scrapedCount: 100,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup translation to resolve quickly
      mockTranslationService.translateProperty.mockImplementation(async (property) => ({
        ...property,
        titleEn: `${property.title} (EN)`,
        locationEn: 'Tokyo (EN)',
        descriptionEn: 'Description (EN)',
        translationStatus: TranslationStatus.COMPLETE
      }));

      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create.mockImplementation(async (data) => ({ id: Math.random(), ...data } as any));

      const startTime = Date.now();
      const result = await pipeline.processSite('suumo' as SupportedSite);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(100);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('error recovery and retry logic', () => {
    it('should retry failed operations according to configuration', async () => {
      const scrapingResult: ScrapingResult = {
        success: true,
        data: [mockPropertyData],
        errors: [],
        scrapedCount: 1,
        skippedCount: 0
      };
      mockSuumoScraper.scrapeProperties.mockResolvedValue(scrapingResult);

      // Setup translation to fail twice then succeed
      mockTranslationService.translateProperty
        .mockRejectedValueOnce(new Error('Temporary API error'))
        .mockRejectedValueOnce(new Error('Temporary API error'))
        .mockResolvedValueOnce(mockTranslatedPropertyData);

      mockPropertyRepository.findByUrl.mockResolvedValue(null);
      mockPropertyRepository.create.mockResolvedValue({ id: 1 } as any);

      const result = await pipeline.processSite('suumo' as SupportedSite);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(mockTranslationService.translateProperty).toHaveBeenCalledTimes(3);
    });
  });
});