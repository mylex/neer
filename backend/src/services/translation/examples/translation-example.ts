import { TranslationService, TranslationConfig } from '../index';
import { PropertyData, TranslationStatus } from '@shared/types';

/**
 * Example usage of the Translation Service
 * This demonstrates how to integrate the translation service into your application
 */

async function demonstrateTranslationService() {
  console.log('🌐 Translation Service Example');
  console.log('================================\n');

  // Initialize the translation service
  const config = new TranslationConfig();
  console.log('📋 Configuration Summary:');
  console.log(JSON.stringify(config.getSummary(), null, 2));
  console.log();

  const translationService = new TranslationService(config);
  
  try {
    // Initialize the service
    console.log('🚀 Initializing translation service...');
    await translationService.initialize();
    console.log('✅ Translation service initialized successfully\n');

    // Example property data from Japanese real estate site
    const sampleProperties: PropertyData[] = [
      {
        url: 'https://suumo.jp/property/1',
        title: '東京都渋谷区の新築マンション',
        location: '東京都渋谷区神南1-1-1',
        description: '駅から徒歩3分の好立地。南向きで日当たり良好。',
        price: 180000,
        size: 55,
        propertyType: 'apartment',
        images: ['image1.jpg', 'image2.jpg'],
        sourceWebsite: 'suumo',
      },
      {
        url: 'https://homes.co.jp/property/2',
        title: '大阪市中央区の中古一戸建て',
        location: '大阪府大阪市中央区本町2-2-2',
        description: 'リノベーション済み。庭付きで駐車場完備。',
        price: 250000,
        size: 85,
        propertyType: 'house',
        images: ['house1.jpg'],
        sourceWebsite: 'homes',
      },
      {
        url: 'https://athome.co.jp/property/3',
        title: '京都市左京区の古民家',
        location: '京都府京都市左京区銀閣寺町3-3-3',
        description: '歴史ある建物を改装。和の趣を残した住まい。',
        price: 120000,
        size: 120,
        propertyType: 'house',
        images: ['kyoto1.jpg', 'kyoto2.jpg'],
        sourceWebsite: 'athome',
      },
    ];

    // Example 1: Translate a single property
    console.log('📝 Example 1: Single Property Translation');
    console.log('----------------------------------------');
    const firstProperty = sampleProperties[0];
    if (!firstProperty) {
      throw new Error('No sample properties available');
    }
    const singleResult = await translationService.translateProperty(firstProperty);
    
    console.log('Original Title:', firstProperty.title);
    console.log('Translated Title:', singleResult.titleEn);
    console.log('Original Location:', firstProperty.location);
    console.log('Translated Location:', singleResult.locationEn);
    console.log('Translation Status:', singleResult.translationStatus);
    console.log();

    // Example 2: Batch translation
    console.log('📦 Example 2: Batch Translation');
    console.log('-------------------------------');
    const startTime = Date.now();
    const batchResults = await translationService.translateBatch(sampleProperties);
    const endTime = Date.now();
    
    console.log(`Translated ${batchResults.length} properties in ${endTime - startTime}ms`);
    batchResults.forEach((result, index) => {
      const originalProperty = sampleProperties[index];
      if (originalProperty) {
        console.log(`\nProperty ${index + 1}:`);
        console.log(`  Original: ${originalProperty.title}`);
        console.log(`  Translated: ${result.titleEn}`);
        console.log(`  Status: ${result.translationStatus}`);
      }
    });
    console.log();

    // Example 3: Cache demonstration
    console.log('💾 Example 3: Cache Performance');
    console.log('-------------------------------');
    
    // First translation (cache miss)
    const cacheTestStart = Date.now();
    const cacheTestProperty = sampleProperties[0];
    if (!cacheTestProperty) {
      throw new Error('No sample properties available for cache test');
    }
    await translationService.translateProperty(cacheTestProperty);
    const firstTranslationTime = Date.now() - cacheTestStart;
    
    // Second translation (cache hit)
    const cacheHitStart = Date.now();
    await translationService.translateProperty(cacheTestProperty);
    const secondTranslationTime = Date.now() - cacheHitStart;
    
    console.log(`First translation (cache miss): ${firstTranslationTime}ms`);
    console.log(`Second translation (cache hit): ${secondTranslationTime}ms`);
    console.log(`Speed improvement: ${Math.round((firstTranslationTime / secondTranslationTime) * 100) / 100}x faster`);
    
    // Show cache statistics
    const cacheStats = await translationService.getCacheStats();
    console.log('\nCache Statistics:');
    console.log(`  Hits: ${cacheStats.hits}`);
    console.log(`  Misses: ${cacheStats.misses}`);
    console.log(`  Hit Rate: ${Math.round(cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100)}%`);
    console.log(`  Cache Size: ${cacheStats.size} entries`);
    console.log();

    // Example 4: Direct cache access
    console.log('🔍 Example 4: Direct Cache Access');
    console.log('---------------------------------');
    const testText = '東京の素晴らしい物件';
    
    // Check if translation is cached
    let cachedTranslation = await translationService.getCachedTranslation(testText);
    console.log(`Cached translation for "${testText}":`, cachedTranslation || 'Not found');
    
    // Translate to populate cache
    if (!cachedTranslation) {
      const tempProperty: PropertyData = {
        url: 'temp',
        title: testText,
        location: '東京',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'temp',
      };
      await translationService.translateProperty(tempProperty);
      
      // Check cache again
      cachedTranslation = await translationService.getCachedTranslation(testText);
      console.log(`After translation, cached result:`, cachedTranslation);
    }
    console.log();

    // Example 5: Error handling
    console.log('⚠️  Example 5: Error Handling');
    console.log('-----------------------------');
    
    const propertyWithEmptyFields: PropertyData = {
      url: 'https://example.com/empty',
      title: '', // Empty title
      location: '東京都',
      description: undefined, // Undefined description
      propertyType: 'apartment',
      images: [],
      sourceWebsite: 'test',
    };
    
    const errorResult = await translationService.translateProperty(propertyWithEmptyFields);
    console.log('Property with empty fields:');
    console.log(`  Title translation: ${errorResult.titleEn || 'None (empty input)'}`);
    console.log(`  Location translation: ${errorResult.locationEn || 'None'}`);
    console.log(`  Description translation: ${errorResult.descriptionEn || 'None (undefined input)'}`);
    console.log(`  Translation status: ${errorResult.translationStatus}`);
    console.log();

    // Example 6: Performance monitoring
    console.log('📊 Example 6: Performance Monitoring');
    console.log('------------------------------------');
    
    const performanceTestProperties = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/perf/${i}`,
      title: `テスト物件 ${i + 1}`,
      location: `東京都テスト区${i + 1}`,
      description: `これは性能テスト用の物件説明です。物件番号: ${i + 1}`,
      propertyType: 'apartment' as const,
      images: [],
      sourceWebsite: 'performance-test',
    }));
    
    const perfStart = Date.now();
    const perfResults = await translationService.translateBatch(performanceTestProperties);
    const perfEnd = Date.now();
    
    const successfulTranslations = perfResults.filter(r => r.translationStatus === TranslationStatus.COMPLETE).length;
    const partialTranslations = perfResults.filter(r => r.translationStatus === TranslationStatus.PARTIAL).length;
    const failedTranslations = perfResults.filter(r => r.translationStatus === TranslationStatus.FAILED).length;
    
    console.log(`Performance Test Results (${performanceTestProperties.length} properties):`);
    console.log(`  Total time: ${perfEnd - perfStart}ms`);
    console.log(`  Average per property: ${Math.round((perfEnd - perfStart) / performanceTestProperties.length)}ms`);
    console.log(`  Successful: ${successfulTranslations}`);
    console.log(`  Partial: ${partialTranslations}`);
    console.log(`  Failed: ${failedTranslations}`);
    console.log(`  Success rate: ${Math.round(successfulTranslations / performanceTestProperties.length * 100)}%`);

  } catch (error) {
    console.error('❌ Error during translation service demonstration:', error);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await translationService.cleanup();
    console.log('✅ Translation service cleaned up successfully');
  }
}

// Integration example with property processing pipeline
async function integrateWithPropertyPipeline() {
  console.log('\n🔄 Integration Example: Property Processing Pipeline');
  console.log('===================================================\n');

  const translationService = new TranslationService(new TranslationConfig());
  await translationService.initialize();

  try {
    // Simulate scraped properties from multiple sources
    const scrapedProperties: PropertyData[] = [
      {
        url: 'https://suumo.jp/chintai/jnc_000012345/',
        title: '【敷金礼金0円】渋谷駅徒歩5分！新築デザイナーズマンション',
        location: '東京都渋谷区道玄坂1-10-8',
        description: '渋谷駅から徒歩5分の好立地！新築のデザイナーズマンションです。オートロック、宅配ボックス完備。',
        price: 185000,
        size: 25.5,
        propertyType: 'apartment',
        images: ['https://example.com/img1.jpg'],
        listingDate: new Date('2024-01-15'),
        sourceWebsite: 'suumo',
      },
    ];

    console.log('Processing scraped properties through translation pipeline...\n');

    // Process each property
    for (const property of scrapedProperties) {
      console.log(`Processing: ${property.url}`);
      
      // Translate the property
      const translatedProperty = await translationService.translateProperty(property);
      
      // Log the results
      console.log('✅ Translation completed:');
      console.log(`   Status: ${translatedProperty.translationStatus}`);
      console.log(`   Title (JP): ${property.title}`);
      console.log(`   Title (EN): ${translatedProperty.titleEn}`);
      console.log(`   Location (JP): ${property.location}`);
      console.log(`   Location (EN): ${translatedProperty.locationEn}`);
      console.log();

      // Here you would typically save to database
      // await propertyRepository.save(translatedProperty);
    }

    // Show final cache statistics
    const finalStats = await translationService.getCacheStats();
    console.log('Final Cache Statistics:');
    console.log(`  Total entries: ${finalStats.size}`);
    console.log(`  Hit rate: ${Math.round(finalStats.hits / (finalStats.hits + finalStats.misses) * 100)}%`);

  } finally {
    await translationService.cleanup();
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await demonstrateTranslationService();
      await integrateWithPropertyPipeline();
    } catch (error) {
      console.error('Example execution failed:', error);
      process.exit(1);
    }
  })();
}

export { demonstrateTranslationService, integrateWithPropertyPipeline };