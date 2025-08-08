import { SuumoScraper } from '../SuumoScraper';
import { BrowserConfig } from '../BrowserManager';
import { ScraperOptions } from '../BaseScraper';

describe('SuumoScraper Integration', () => {
  let scraper: SuumoScraper;
  let browserConfig: BrowserConfig;
  let scraperOptions: ScraperOptions;

  beforeAll(() => {
    browserConfig = {
      headless: true,
      timeout: 30000
    };

    scraperOptions = {
      maxRetries: 2,
      retryDelay: 1000,
      requestDelay: 2000,
      maxConcurrentPages: 1,
      timeout: 30000
    };
  });

  beforeEach(() => {
    scraper = new SuumoScraper(browserConfig, scraperOptions);
  });

  afterEach(async () => {
    if (scraper) {
      await scraper.cleanup();
    }
  });

  it('should create scraper instance successfully', () => {
    expect(scraper).toBeInstanceOf(SuumoScraper);
  });

  it('should extract price from Japanese text correctly', () => {
    const testCases = [
      { input: '8.5万円', expected: 85000 },
      { input: '12万円', expected: 120000 },
      { input: '相談', expected: 0 },
      { input: '', expected: 0 }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = (scraper as any).extractPriceFromText(input);
      expect(result).toBe(expected);
    });
  });

  it('should extract size from Japanese text correctly', () => {
    const testCases = [
      { input: '25.5㎡', expected: 25.5 },
      { input: '30m²', expected: 30 },
      { input: '6畳', expected: 10 }, // 6 * 1.65 = 9.9, rounded to 10
      { input: '不明', expected: 0 }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = (scraper as any).extractSizeFromText(input);
      expect(result).toBe(expected);
    });
  });

  it('should parse Japanese dates correctly', () => {
    const result = (scraper as any).parseDateFromText('2024年1月15日');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January is 0
    expect(result.getDate()).toBe(15);
  });

  it('should normalize URLs correctly', () => {
    const testCases = [
      { 
        input: '/chintai/jnc_000001.html', 
        expected: 'https://suumo.jp/chintai/jnc_000001.html' 
      },
      { 
        input: 'https://suumo.jp/chintai/jnc_000001.html', 
        expected: 'https://suumo.jp/chintai/jnc_000001.html' 
      },
      { 
        input: '', 
        expected: null 
      }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = (scraper as any).normalizePropertyUrl(input);
      expect(result).toBe(expected);
    });
  });

  it('should validate image URLs correctly', () => {
    const validUrls = [
      'image.jpg',
      'photo.png',
      'pic.gif',
      'https://example.com/image/123',
      'https://example.com/photo/456'
    ];

    const invalidUrls = [
      'document.pdf',
      'script.js',
      ''
    ];

    validUrls.forEach(url => {
      expect((scraper as any).isValidImageUrl(url)).toBe(true);
    });

    invalidUrls.forEach(url => {
      expect((scraper as any).isValidImageUrl(url)).toBe(false);
    });
  });

  it('should build search URLs correctly', () => {
    const searchParams = {
      prefecture: '13',
      city: '1301',
      minPrice: 50000,
      maxPrice: 100000,
      propertyType: '1K'
    };

    const result = (scraper as any).buildSearchUrl(searchParams, 2);
    
    expect(result).toContain('sc=13');
    expect(result).toContain('cb=1301');
    expect(result).toContain('rn=50000');
    expect(result).toContain('rx=100000');
    expect(result).toContain('kt=1K');
    expect(result).toContain('page=2');
  });
});