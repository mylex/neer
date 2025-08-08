import { TranslationService } from '../TranslationService';
import { TranslationConfig } from '../TranslationConfig';
import { PropertyData, TranslationStatus } from '../../../../../shared/src/types';

// This integration test requires actual Redis and Google Translate API setup
// Skip by default and run manually when needed
describe.skip('TranslationService Integration Tests', () => {
  let translationService: TranslationService;
  let config: TranslationConfig;

  beforeAll(async () => {
    // Set up test environment variables
    process.env['GOOGLE_CLOUD_PROJECT_ID'] = process.env['TEST_GOOGLE_CLOUD_PROJECT_ID'] || 'test-project';
    process.env['GOOGLE_CLOUD_KEY_FILE'] = process.env['TEST_GOOGLE_CLOUD_KEY_FILE'];
    process.env['REDIS_URL'] = process.env['TEST_REDIS_URL'] || 'redis://localhost:6379';
    process.env['TRANSLATION_BATCH_SIZE'] = '3';
    process.env['TRANSLATION_BATCH_DELAY_MS'] = '500';
    process.env['TRANSLATION_CACHE_TTL'] = '300'; // 5 minutes for testing

    config = new TranslationConfig();
    translationService = new TranslationService(config);
    
    await translationService.initialize();
  });

  afterAll(async () => {
    await translationService.cleanup();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await translationService.clearCache();
  });

  describe('Real Translation Tests', () => {
    const testProperty: PropertyData = {
      url: 'https://example.com/property/1',
      title: '東京都渋谷区の素晴らしいアパート',
      location: '東京都渋谷区神南1-1-1',
      description: 'この物件は駅から徒歩5分の便利な立地にあります。新築で設備も充実しています。',
      price: 150000,
      size: 45,
      propertyType: 'apartment',
      images: ['image1.jpg', 'image2.jpg'],
      sourceWebsite: 'test-site',
    };

    it('should translate Japanese property to English', async () => {
      const result = await translationService.translateProperty(testProperty);

      expect(result.titleEn).toBeDefined();
      expect(result.titleEn).not.toBe(testProperty.title);
      expect(result.titleEn?.toLowerCase()).toContain('apartment');
      expect(result.titleEn?.toLowerCase()).toContain('tokyo');

      expect(result.locationEn).toBeDefined();
      expect(result.locationEn).not.toBe(testProperty.location);
      expect(result.locationEn?.toLowerCase()).toContain('tokyo');

      expect(result.descriptionEn).toBeDefined();
      expect(result.descriptionEn).not.toBe(testProperty.description);

      expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
    });

    it('should use cache for repeated translations', async () => {
      // First translation
      const result1 = await translationService.translateProperty(testProperty);
      expect(result1.translationStatus).toBe(TranslationStatus.COMPLETE);

      // Second translation should use cache
      const result2 = await translationService.translateProperty(testProperty);
      expect(result2.translationStatus).toBe(TranslationStatus.COMPLETE);

      // Results should be identical
      expect(result1.titleEn).toBe(result2.titleEn);
      expect(result1.locationEn).toBe(result2.locationEn);
      expect(result1.descriptionEn).toBe(result2.descriptionEn);

      // Verify cache was used
      const cacheStats = await translationService.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    });

    it('should handle batch translation efficiently', async () => {
      const properties: PropertyData[] = [
        {
          ...testProperty,
          url: 'https://example.com/property/1',
          title: '東京のマンション',
        },
        {
          ...testProperty,
          url: 'https://example.com/property/2',
          title: '大阪のアパート',
        },
        {
          ...testProperty,
          url: 'https://example.com/property/3',
          title: '京都の一戸建て',
        },
        {
          ...testProperty,
          url: 'https://example.com/property/4',
          title: '名古屋のマンション',
        },
      ];

      const startTime = Date.now();
      const results = await translationService.translateBatch(properties);
      const endTime = Date.now();

      expect(results).toHaveLength(4);
      results.forEach((result, index) => {
        expect(result.titleEn).toBeDefined();
        expect(result.titleEn).not.toBe(properties[index]?.title);
        expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
      });

      // Should include batch delay
      expect(endTime - startTime).toBeGreaterThan(500); // At least one batch delay
    });

    it('should handle empty and undefined text fields', async () => {
      const propertyWithEmptyFields: PropertyData = {
        ...testProperty,
        title: '',
        description: undefined,
      };

      const result = await translationService.translateProperty(propertyWithEmptyFields);

      expect(result.titleEn).toBeUndefined();
      expect(result.locationEn).toBeDefined(); // Location should still be translated
      expect(result.descriptionEn).toBeUndefined();
      expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
    });
  });

  describe('Cache Operations', () => {
    it('should store and retrieve cached translations', async () => {
      const originalText = '東京のテスト物件';
      
      // First check - should not be cached
      let cached = await translationService.getCachedTranslation(originalText);
      expect(cached).toBeNull();

      // Translate to populate cache
      const testProperty: PropertyData = {
        url: 'https://example.com/test',
        title: originalText,
        location: '東京',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test',
      };

      await translationService.translateProperty(testProperty);

      // Should now be cached
      cached = await translationService.getCachedTranslation(originalText);
      expect(cached).toBeDefined();
      expect(cached).not.toBe(originalText);
    });

    it('should provide accurate cache statistics', async () => {
      const initialStats = await translationService.getCacheStats();
      
      const testProperty: PropertyData = {
        url: 'https://example.com/test',
        title: '統計テスト物件',
        location: '東京',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test',
      };

      // First translation - should increase misses
      await translationService.translateProperty(testProperty);
      
      // Second translation - should increase hits
      await translationService.translateProperty(testProperty);

      const finalStats = await translationService.getCacheStats();
      expect(finalStats.hits).toBeGreaterThan(initialStats.hits);
      expect(finalStats.size).toBeGreaterThan(initialStats.size);
    });

    it('should clear cache successfully', async () => {
      const testProperty: PropertyData = {
        url: 'https://example.com/test',
        title: 'キャッシュクリアテスト',
        location: '東京',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test',
      };

      // Populate cache
      await translationService.translateProperty(testProperty);
      
      let stats = await translationService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      await translationService.clearCache();
      
      stats = await translationService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create a service with invalid project ID to simulate auth error
      const invalidConfig = new TranslationConfig();
      // Override the project ID to cause authentication failure
      (invalidConfig as any).googleCloudProjectId = 'invalid-project-id-12345';
      
      const invalidService = new TranslationService(invalidConfig);
      await invalidService.initialize();

      const testProperty: PropertyData = {
        url: 'https://example.com/test',
        title: 'エラーテスト',
        location: '東京',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'test',
      };

      const result = await invalidService.translateProperty(testProperty);
      
      // Should fail gracefully
      expect(result.translationStatus).toBe(TranslationStatus.FAILED);
      expect(result.titleEn).toBeUndefined();

      await invalidService.cleanup();
    });
  });
});