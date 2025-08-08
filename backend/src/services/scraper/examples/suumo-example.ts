import { SuumoScraper } from '../SuumoScraper';
import { ScraperFactory } from '../ScraperFactory';

/**
 * Example usage of the Suumo scraper
 */
async function exampleSuumoScraping() {
  console.log('Starting Suumo scraper example...');

  try {
    // Method 1: Direct instantiation
    const scraper = new SuumoScraper(
      {
        headless: true,
        timeout: 30000,
        viewport: { width: 1366, height: 768 }
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        requestDelay: 3000,
        maxConcurrentPages: 2,
        timeout: 30000
      }
    );

    // Method 2: Using ScraperFactory (recommended)
    const factory = new ScraperFactory(ScraperFactory.getDefaultConfig());
    const factoryScraper = factory.createScraper('suumo');

    // Example search parameters
    const searchParams = {
      prefecture: '13', // Tokyo
      minPrice: 50000,
      maxPrice: 150000,
      maxPages: 2 // Limit to 2 pages for example
    };

    console.log('Scraping properties with search parameters:', searchParams);

    // Scrape properties
    const result = await scraper.scrapeProperties(searchParams);

    console.log('Scraping completed!');
    console.log(`Success: ${result.success}`);
    console.log(`Properties scraped: ${result.scrapedCount}`);
    console.log(`Properties skipped: ${result.skippedCount}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (result.data.length > 0) {
      console.log('\nFirst few properties:');
      result.data.slice(0, 3).forEach((property, index) => {
        console.log(`\n${index + 1}. ${property.title}`);
        console.log(`   Price: ¥${property.price?.toLocaleString() || 'N/A'}`);
        console.log(`   Location: ${property.location}`);
        console.log(`   Size: ${property.size || 'N/A'}㎡`);
        console.log(`   Type: ${property.propertyType}`);
        console.log(`   URL: ${property.url}`);
      });
    }

    // Clean up resources
    await scraper.cleanup();
    await factoryScraper.cleanup();

  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

/**
 * Example of error handling with retry mechanisms
 */
async function exampleErrorHandling() {
  console.log('Starting error handling example...');

  const scraper = new SuumoScraper(
    {
      headless: true,
      timeout: 10000 // Short timeout to trigger errors
    },
    {
      maxRetries: 2,
      retryDelay: 1000,
      requestDelay: 1000,
      maxConcurrentPages: 1,
      timeout: 10000
    }
  );

  try {
    // This might fail due to short timeout
    const result = await scraper.scrapeProperties({ maxPages: 1 });
    
    console.log('Result:', {
      success: result.success,
      scraped: result.scrapedCount,
      errors: result.errors.length
    });

  } catch (error) {
    console.error('Caught error:', error);
  } finally {
    await scraper.cleanup();
  }
}

/**
 * Example of testing individual scraper methods
 */
async function exampleMethodTesting() {
  console.log('Starting method testing example...');

  const scraper = new SuumoScraper(
    { headless: true, timeout: 30000 },
    { maxRetries: 3, retryDelay: 1000, requestDelay: 2000, maxConcurrentPages: 1, timeout: 30000 }
  );

  // Test price extraction
  console.log('\nTesting price extraction:');
  const priceTests = ['8.5万円', '12万円', '相談', ''];
  priceTests.forEach(text => {
    const price = (scraper as any).extractPriceFromText(text);
    console.log(`  "${text}" -> ¥${price.toLocaleString()}`);
  });

  // Test size extraction
  console.log('\nTesting size extraction:');
  const sizeTests = ['25.5㎡', '30m²', '6畳', '不明'];
  sizeTests.forEach(text => {
    const size = (scraper as any).extractSizeFromText(text);
    console.log(`  "${text}" -> ${size}㎡`);
  });

  // Test date parsing
  console.log('\nTesting date parsing:');
  const dateTests = ['2024年1月15日', '今日', '昨日', '不明'];
  dateTests.forEach(text => {
    const date = (scraper as any).parseDateFromText(text);
    console.log(`  "${text}" -> ${date ? date.toDateString() : 'undefined'}`);
  });

  await scraper.cleanup();
}

// Export functions for use in other files
export {
  exampleSuumoScraping,
  exampleErrorHandling,
  exampleMethodTesting
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    await exampleSuumoScraping();
    console.log('\n' + '='.repeat(50) + '\n');
    await exampleErrorHandling();
    console.log('\n' + '='.repeat(50) + '\n');
    await exampleMethodTesting();
  })().catch(console.error);
}