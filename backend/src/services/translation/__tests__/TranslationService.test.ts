import { TranslationService } from '../TranslationService';
import { TranslationConfig } from '../TranslationConfig';
import { PropertyData, TranslationStatus } from '../../../../../shared/src/types';

// Mock Google Translate
jest.mock('@google-cloud/translate/build/src/v2', () => ({
  Translate: jest.fn().mockImplementation(() => ({
    translate: jest.fn(),
  })),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    exists: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    mGet: jest.fn(),
    multi: jest.fn().mockReturnValue({
      setEx: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  }),
}));

describe('TranslationService', () => {
  let translationService: TranslationService;
  let mockTranslate: jest.Mocked<any>;
  let mockRedisClient: jest.Mocked<any>;
  let config: TranslationConfig;

  beforeEach(() => {
    // Set up environment variables for config
    process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['TRANSLATION_BATCH_SIZE'] = '5';
    process.env['TRANSLATION_BATCH_DELAY_MS'] = '100';
    process.env['TRANSLATION_CACHE_TTL'] = '3600';

    config = new TranslationConfig();
    translationService = new TranslationService(config);

    // Get mocked instances
    const { Translate } = require('@google-cloud/translate/build/src/v2');
    mockTranslate = Translate.mock.results[0].value;
    
    const { createClient } = require('redis');
    mockRedisClient = createClient.mock.results[0].value;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables
    delete process.env['GOOGLE_CLOUD_PROJECT_ID'];
    delete process.env['REDIS_URL'];
    delete process.env['TRANSLATION_BATCH_SIZE'];
    delete process.env['TRANSLATION_BATCH_DELAY_MS'];
    delete process.env['TRANSLATION_CACHE_TTL'];
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await expect(translationService.initialize()).resolves.not.toThrow();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should throw error if Redis connection fails', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(translationService.initialize()).rejects.toThrow('Failed to initialize translation service');
    });
  });

  describe('translateProperty', () => {
    const mockProperty: PropertyData = {
      url: 'https://example.com/property/1',
      title: '東京のアパート',
      location: '渋谷区',
      description: '素晴らしい物件です',
      price: 100000,
      size: 50,
      propertyType: 'apartment',
      images: [],
      sourceWebsite: 'test-site',
    };

    beforeEach(async () => {
      await translationService.initialize();
      // Mock cache miss
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
    });

    it('should translate all text fields successfully', async () => {
      mockTranslate.translate
        .mockResolvedValueOnce(['Tokyo Apartment'])
        .mockResolvedValueOnce(['Shibuya Ward'])
        .mockResolvedValueOnce(['This is a wonderful property']);

      const result = await translationService.translateProperty(mockProperty);

      expect(result.titleEn).toBe('Tokyo Apartment');
      expect(result.locationEn).toBe('Shibuya Ward');
      expect(result.descriptionEn).toBe('This is a wonderful property');
      expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
    });

    it('should handle partial translation failures', async () => {
      mockTranslate.translate
        .mockResolvedValueOnce(['Tokyo Apartment'])
        .mockRejectedValueOnce(new Error('Translation failed'))
        .mockResolvedValueOnce(['This is a wonderful property']);

      const result = await translationService.translateProperty(mockProperty);

      expect(result.titleEn).toBe('Tokyo Apartment');
      expect(result.locationEn).toBeUndefined();
      expect(result.descriptionEn).toBe('This is a wonderful property');
      expect(result.translationStatus).toBe(TranslationStatus.PARTIAL);
    });

    it('should handle complete translation failure', async () => {
      mockTranslate.translate.mockRejectedValue(new Error('API Error'));

      const result = await translationService.translateProperty(mockProperty);

      expect(result.titleEn).toBeUndefined();
      expect(result.locationEn).toBeUndefined();
      expect(result.descriptionEn).toBeUndefined();
      expect(result.translationStatus).toBe(TranslationStatus.FAILED);
    });

    it('should use cached translations when available', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('Cached Tokyo Apartment')
        .mockResolvedValueOnce('Cached Shibuya Ward')
        .mockResolvedValueOnce('Cached wonderful property');

      const result = await translationService.translateProperty(mockProperty);

      expect(result.titleEn).toBe('Cached Tokyo Apartment');
      expect(result.locationEn).toBe('Cached Shibuya Ward');
      expect(result.descriptionEn).toBe('Cached wonderful property');
      expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
      expect(mockTranslate.translate).not.toHaveBeenCalled();
    });

    it('should handle empty or undefined text fields', async () => {
      const propertyWithEmptyFields: PropertyData = {
        ...mockProperty,
        title: '',
        description: undefined,
      };

      mockTranslate.translate.mockResolvedValueOnce(['Shibuya Ward']);

      const result = await translationService.translateProperty(propertyWithEmptyFields);

      expect(result.titleEn).toBeUndefined();
      expect(result.locationEn).toBe('Shibuya Ward');
      expect(result.descriptionEn).toBeUndefined();
      expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
    });
  });

  describe('translateBatch', () => {
    const mockProperties: PropertyData[] = [
      {
        url: 'https://example.com/property/1',
        title: '東京のアパート1',
        location: '渋谷区',
        price: 100000,
        size: 50,
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test-site',
      },
      {
        url: 'https://example.com/property/2',
        title: '東京のアパート2',
        location: '新宿区',
        price: 120000,
        size: 60,
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test-site',
      },
    ];

    beforeEach(async () => {
      await translationService.initialize();
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
    });

    it('should translate multiple properties in batch', async () => {
      mockTranslate.translate
        .mockResolvedValueOnce(['Tokyo Apartment 1'])
        .mockResolvedValueOnce(['Shibuya Ward'])
        .mockResolvedValueOnce(['Tokyo Apartment 2'])
        .mockResolvedValueOnce(['Shinjuku Ward']);

      const results = await translationService.translateBatch(mockProperties);

      expect(results).toHaveLength(2);
      expect(results[0]?.titleEn).toBe('Tokyo Apartment 1');
      expect(results[0]?.locationEn).toBe('Shibuya Ward');
      expect(results[1]?.titleEn).toBe('Tokyo Apartment 2');
      expect(results[1]?.locationEn).toBe('Shinjuku Ward');
    });

    it('should handle individual property failures in batch', async () => {
      mockTranslate.translate
        .mockResolvedValueOnce(['Tokyo Apartment 1'])
        .mockResolvedValueOnce(['Shibuya Ward'])
        .mockRejectedValueOnce(new Error('Translation failed'))
        .mockRejectedValueOnce(new Error('Translation failed'));

      const results = await translationService.translateBatch(mockProperties);

      expect(results).toHaveLength(2);
      expect(results[0]?.translationStatus).toBe(TranslationStatus.COMPLETE);
      expect(results[1]?.translationStatus).toBe(TranslationStatus.FAILED);
    });

    it('should process large batches with proper batching', async () => {
      const largeBatch = Array.from({ length: 12 }, (_, i) => ({
        ...mockProperties[0],
        url: `https://example.com/property/${i}`,
        title: `東京のアパート${i}`,
        location: '東京都',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test-site',
      }));

      mockTranslate.translate.mockResolvedValue(['Translated']);
      
      const results = await translationService.translateBatch(largeBatch);

      expect(results).toHaveLength(12);
      // Should be processed in batches of 5 (config.batchSize)
      expect(mockTranslate.translate).toHaveBeenCalledTimes(12); // 12 properties * 2 fields each (title + location)
    });
  });

  describe('getCachedTranslation', () => {
    beforeEach(async () => {
      await translationService.initialize();
    });

    it('should return cached translation if exists', async () => {
      mockRedisClient.get.mockResolvedValue('Cached Translation');

      const result = await translationService.getCachedTranslation('テスト');

      expect(result).toBe('Cached Translation');
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should return null if no cached translation exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await translationService.getCachedTranslation('テスト');

      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    beforeEach(async () => {
      await translationService.initialize();
    });

    it('should clear all cached translations', async () => {
      mockRedisClient.keys.mockResolvedValue(['translation:key1', 'translation:key2']);
      mockRedisClient.del.mockResolvedValue(2);

      await translationService.clearCache();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('translation:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['translation:key1', 'translation:key2']);
    });
  });

  describe('getCacheStats', () => {
    beforeEach(async () => {
      await translationService.initialize();
    });

    it('should return cache statistics', async () => {
      mockRedisClient.keys.mockResolvedValue(['translation:key1', 'translation:key2']);

      const stats = await translationService.getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats.size).toBe(2);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await translationService.initialize();
    });

    it('should cleanup resources successfully', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await translationService.cleanup();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRedisClient.quit.mockRejectedValue(new Error('Cleanup failed'));

      await expect(translationService.cleanup()).resolves.not.toThrow();
    });
  });
});