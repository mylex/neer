import { SuumoScraper, SuumoSearchParams } from '../SuumoScraper';
import { BrowserConfig } from '../BrowserManager';
import { ScraperOptions } from '../BaseScraper';
import { PropertyData } from '../../../models/Property';

// Mock dependencies
jest.mock('../BrowserManager');
jest.mock('../ScraperConfig');

describe('SuumoScraper', () => {
  let scraper: SuumoScraper;
  let mockBrowserManager: any;
  let mockPage: any;
  let browserConfig: BrowserConfig;
  let scraperOptions: ScraperOptions;

  beforeEach(() => {
    // Setup mock browser manager
    mockBrowserManager = {
      createPage: jest.fn(),
      closePage: jest.fn(),
      close: jest.fn(),
      initialize: jest.fn()
    };

    // Setup mock page
    mockPage = {
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      $: jest.fn(),
      $$: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
      isClosed: jest.fn().mockReturnValue(false)
    };

    mockBrowserManager.createPage.mockResolvedValue(mockPage);

    // Mock ScraperConfigManager
    const mockConfigManager = {
      getConfig: jest.fn().mockReturnValue({
        name: 'Suumo',
        baseUrl: 'https://suumo.jp',
        searchUrl: 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/',
        selectors: {
          propertyCard: '.cassetteitem',
          title: '.cassetteitem_content-title',
          price: '.cassetteitem_price--rent',
          location: '.cassetteitem_detail-col1',
          size: '.cassetteitem_menseki',
          propertyType: '.cassetteitem_madori',
          description: '.cassetteitem_other',
          images: '.cassetteitem_object-item img',
          listingDate: '.cassetteitem_other-emphasis',
          nextPage: '.pagination_set-next',
          propertyLink: '.cassetteitem_content-title a'
        },
        pagination: {
          type: 'button' as const,
          maxPages: 50,
          pageParam: 'page'
        },
        rateLimit: {
          requestsPerMinute: 30,
          burstLimit: 5
        },
        userAgent: 'Mozilla/5.0 test agent'
      })
    };

    const { ScraperConfigManager } = require('../ScraperConfig');
    ScraperConfigManager.mockImplementation(() => mockConfigManager);

    browserConfig = {
      headless: true,
      timeout: 30000
    };

    scraperOptions = {
      maxRetries: 3,
      retryDelay: 1000,
      requestDelay: 2000,
      maxConcurrentPages: 2,
      timeout: 30000
    };

    scraper = new SuumoScraper(browserConfig, scraperOptions);
    
    // Replace the browser manager with our mock
    (scraper as any).browserManager = mockBrowserManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(scraper).toBeInstanceOf(SuumoScraper);
      expect((scraper as any).websiteName).toBe('Suumo');
    });

    it('should throw error if Suumo configuration not found', () => {
      const mockConfigManagerEmpty = {
        getConfig: jest.fn().mockReturnValue(null)
      };

      const { ScraperConfigManager } = require('../ScraperConfig');
      ScraperConfigManager.mockImplementation(() => mockConfigManagerEmpty);

      expect(() => new SuumoScraper(browserConfig, scraperOptions)).toThrow('Suumo configuration not found');
    });
  });

  describe('scrapeProperties', () => {
    it('should successfully scrape properties', async () => {
      // Mock getPropertyUrls to return test URLs
      const testUrls = [
        'https://suumo.jp/chintai/jnc_000001.html',
        'https://suumo.jp/chintai/jnc_000002.html'
      ];
      
      jest.spyOn(scraper as any, 'getPropertyUrls').mockResolvedValue(testUrls);
      jest.spyOn(scraper as any, 'scrapePropertyUrls').mockResolvedValue({
        success: true,
        data: [mockPropertyData(), mockPropertyData()],
        errors: [],
        scrapedCount: 2,
        skippedCount: 0
      });

      const result = await scraper.scrapeProperties();

      expect(result.success).toBe(true);
      expect(result.scrapedCount).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle no property URLs found', async () => {
      jest.spyOn(scraper as any, 'getPropertyUrls').mockResolvedValue([]);

      const result = await scraper.scrapeProperties();

      expect(result.success).toBe(true);
      expect(result.scrapedCount).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('should handle scraping errors gracefully', async () => {
      jest.spyOn(scraper as any, 'getPropertyUrls').mockRejectedValue(new Error('Network error'));

      const result = await scraper.scrapeProperties();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Fatal error during Suumo scraping');
    });
  });

  describe('extractPropertyData', () => {
    beforeEach(() => {
      // Setup common page mocks
      mockPage.waitForSelector.mockResolvedValue(true);
    });

    it('should extract complete property data', async () => {
      const testUrl = 'https://suumo.jp/chintai/jnc_000001.html';
      
      // Mock DOM elements and their content
      const mockTitleElement = {};
      const mockPriceElement = {};
      const mockLocationElement = {};
      const mockSizeElement = {};
      const mockTypeElement = {};
      const mockDescElement = {};
      const mockDateElement = {};
      const mockImageElements = [{}, {}];

      mockPage.$.mockImplementation((selector: string) => {
        switch (selector) {
          case '.cassetteitem_content-title': return Promise.resolve(mockTitleElement);
          case '.cassetteitem_price--rent': return Promise.resolve(mockPriceElement);
          case '.cassetteitem_detail-col1': return Promise.resolve(mockLocationElement);
          case '.cassetteitem_menseki': return Promise.resolve(mockSizeElement);
          case '.cassetteitem_madori': return Promise.resolve(mockTypeElement);
          case '.cassetteitem_other': return Promise.resolve(mockDescElement);
          case '.cassetteitem_other-emphasis': return Promise.resolve(mockDateElement);
          default: return Promise.resolve(null);
        }
      });

      mockPage.$$.mockImplementation((selector: string) => {
        if (selector === '.cassetteitem_object-item img') {
          return Promise.resolve(mockImageElements);
        }
        return Promise.resolve([]);
      });

      mockPage.evaluate.mockImplementation((element: any) => {
        if (element === mockTitleElement) return Promise.resolve('Test Property Title');
        if (element === mockPriceElement) return Promise.resolve('8.5万円');
        if (element === mockLocationElement) return Promise.resolve('東京都渋谷区');
        if (element === mockSizeElement) return Promise.resolve('25.5㎡');
        if (element === mockTypeElement) return Promise.resolve('1K');
        if (element === mockDescElement) return Promise.resolve('Test description');
        if (element === mockDateElement) return Promise.resolve('2024年1月15日');
        if (mockImageElements.includes(element)) return Promise.resolve('https://suumo.jp/image1.jpg');
        return Promise.resolve('');
      });

      // Mock validation and normalization
      jest.spyOn(scraper as any, 'validatePropertyData').mockReturnValue(true);
      jest.spyOn(scraper as any, 'normalizePropertyData').mockImplementation((data: any) => ({
        ...data,
        sourceWebsite: 'Suumo'
      }));

      const result = await (scraper as any).extractPropertyData(mockPage, testUrl);

      expect(result).toBeTruthy();
      expect(result.url).toBe(testUrl);
      expect(result.title).toBe('Test Property Title');
      expect(result.price).toBe(85000);
      expect(result.location).toBe('東京都渋谷区');
      expect(result.size).toBe(25.5);
      expect(result.propertyType).toBe('1K');
      expect(result.sourceWebsite).toBe('Suumo');
    });

    it('should handle missing elements gracefully', async () => {
      const testUrl = 'https://suumo.jp/chintai/jnc_000001.html';
      
      // Mock missing elements
      mockPage.$.mockResolvedValue(null);
      mockPage.$$.mockResolvedValue([]);

      jest.spyOn(scraper as any, 'validatePropertyData').mockReturnValue(false);

      const result = await (scraper as any).extractPropertyData(mockPage, testUrl);

      expect(result).toBeNull();
    });

    it('should handle extraction errors', async () => {
      const testUrl = 'https://suumo.jp/chintai/jnc_000001.html';
      
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));

      const result = await (scraper as any).extractPropertyData(mockPage, testUrl);

      expect(result).toBeNull();
    });
  });

  describe('price extraction', () => {
    it('should extract price in 万円 format', () => {
      const result = (scraper as any).extractPriceFromText('8.5万円');
      expect(result).toBe(85000);
    });

    it('should extract price in 万円 format with decimal', () => {
      const result = (scraper as any).extractPriceFromText('12.8万円');
      expect(result).toBe(128000);
    });

    it('should handle invalid price text', () => {
      const result = (scraper as any).extractPriceFromText('相談');
      expect(result).toBe(0);
    });

    it('should handle empty price text', () => {
      const result = (scraper as any).extractPriceFromText('');
      expect(result).toBe(0);
    });
  });

  describe('size extraction', () => {
    it('should extract size in square meters', () => {
      const result = (scraper as any).extractSizeFromText('25.5㎡');
      expect(result).toBe(25.5);
    });

    it('should extract size in m²', () => {
      const result = (scraper as any).extractSizeFromText('30.2m²');
      expect(result).toBe(30.2);
    });

    it('should convert tatami to square meters', () => {
      const result = (scraper as any).extractSizeFromText('6畳');
      expect(result).toBe(10); // 6 * 1.65 = 9.9, rounded to 10
    });

    it('should handle invalid size text', () => {
      const result = (scraper as any).extractSizeFromText('不明');
      expect(result).toBe(0);
    });
  });

  describe('date parsing', () => {
    it('should parse Japanese date format', () => {
      const result = (scraper as any).parseDateFromText('2024年1月15日');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it('should handle "今日" (today)', () => {
      const result = (scraper as any).parseDateFromText('今日');
      expect(result).toBeInstanceOf(Date);
      // Should be close to current date
      const now = new Date();
      expect(Math.abs(result.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('should handle "昨日" (yesterday)', () => {
      const result = (scraper as any).parseDateFromText('昨日');
      expect(result).toBeInstanceOf(Date);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(result.toDateString()).toBe(yesterday.toDateString());
    });

    it('should handle invalid date text', () => {
      const result = (scraper as any).parseDateFromText('不明');
      expect(result).toBeUndefined();
    });
  });

  describe('URL normalization', () => {
    it('should normalize relative URLs', () => {
      const result = (scraper as any).normalizePropertyUrl('/chintai/jnc_000001.html');
      expect(result).toBe('https://suumo.jp/chintai/jnc_000001.html');
    });

    it('should keep absolute URLs unchanged', () => {
      const url = 'https://suumo.jp/chintai/jnc_000001.html';
      const result = (scraper as any).normalizePropertyUrl(url);
      expect(result).toBe(url);
    });

    it('should handle invalid URLs', () => {
      const result = (scraper as any).normalizePropertyUrl('');
      expect(result).toBeNull();
    });
  });

  describe('image URL validation', () => {
    it('should validate image URLs with extensions', () => {
      expect((scraper as any).isValidImageUrl('image.jpg')).toBe(true);
      expect((scraper as any).isValidImageUrl('photo.png')).toBe(true);
      expect((scraper as any).isValidImageUrl('pic.gif')).toBe(true);
    });

    it('should validate image URLs with keywords', () => {
      expect((scraper as any).isValidImageUrl('https://example.com/image/123')).toBe(true);
      expect((scraper as any).isValidImageUrl('https://example.com/photo/456')).toBe(true);
    });

    it('should reject non-image URLs', () => {
      expect((scraper as any).isValidImageUrl('document.pdf')).toBe(false);
      expect((scraper as any).isValidImageUrl('script.js')).toBe(false);
      expect((scraper as any).isValidImageUrl('')).toBe(false);
    });
  });

  describe('search URL building', () => {
    it('should build URL with search parameters', () => {
      const searchParams: SuumoSearchParams = {
        prefecture: '13',
        city: '1301',
        minPrice: 50000,
        maxPrice: 100000,
        propertyType: '1K'
      };

      const result = (scraper as any).buildSearchUrl(searchParams, 1);
      
      expect(result).toContain('sc=13');
      expect(result).toContain('cb=1301');
      expect(result).toContain('rn=50000');
      expect(result).toContain('rx=100000');
      expect(result).toContain('kt=1K');
    });

    it('should build URL with page parameter', () => {
      const result = (scraper as any).buildSearchUrl({}, 2);
      expect(result).toContain('page=2');
    });

    it('should build URL without parameters', () => {
      const result = (scraper as any).buildSearchUrl();
      expect(result).toBe('https://suumo.jp/jj/chintai/ichiran/FR301FC001/');
    });
  });
});

// Helper function to create mock property data
function mockPropertyData(): PropertyData {
  return {
    url: 'https://suumo.jp/chintai/jnc_000001.html',
    title: 'Test Property',
    price: 85000,
    location: '東京都渋谷区',
    size: 25.5,
    propertyType: '1K',
    description: 'Test description',
    images: ['https://suumo.jp/image1.jpg'],
    listingDate: new Date('2024-01-15'),
    sourceWebsite: 'Suumo'
  };
}