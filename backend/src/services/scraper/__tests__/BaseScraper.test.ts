import { BaseScraper, ScrapingResult, ScraperOptions } from '../BaseScraper';
import { BrowserManager, BrowserConfig } from '../BrowserManager';
import { RateLimiter } from '../RateLimiter';
import { PropertyData } from '../../../models/Property';
import { Page } from 'puppeteer';

// Mock dependencies
jest.mock('../BrowserManager');
jest.mock('../RateLimiter');

// Create a concrete implementation for testing
class TestScraper extends BaseScraper {
  async scrapeProperties(): Promise<ScrapingResult> {
    return {
      success: true,
      data: [],
      errors: [],
      scrapedCount: 0,
      skippedCount: 0
    };
  }

  protected async extractPropertyData(_page: Page, url: string): Promise<PropertyData | null> {
    return {
      url,
      title: 'Test Property',
      price: 100000,
      location: 'Tokyo',
      size: 50,
      propertyType: 'apartment',
      description: 'Test description',
      images: [],
      listingDate: new Date(),
      sourceWebsite: 'test'
    };
  }

  protected async getPropertyUrls(): Promise<string[]> {
    return ['http://test.com/property1', 'http://test.com/property2'];
  }

  // Expose protected methods for testing
  public async testNavigateToPage(page: Page, url: string): Promise<boolean> {
    return this.navigateToPage(page, url);
  }

  public async testScrapePropertyUrls(urls: string[]): Promise<ScrapingResult> {
    return this.scrapePropertyUrls(urls);
  }

  public testValidatePropertyData(data: Partial<PropertyData>): boolean {
    return this.validatePropertyData(data);
  }

  public testNormalizePropertyData(data: Partial<PropertyData>): PropertyData {
    return this.normalizePropertyData(data);
  }

  public testExtractNumericValue(text: string): number {
    return this.extractNumericValue(text);
  }

  public testChunkArray<T>(array: T[], chunkSize: number): T[][] {
    return this.chunkArray(array, chunkSize);
  }
}

describe('BaseScraper', () => {
  let scraper: TestScraper;
  let mockBrowserManager: jest.Mocked<BrowserManager>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;
  let mockPage: jest.Mocked<Page>;

  const browserConfig: BrowserConfig = {
    headless: true,
    timeout: 30000
  };

  const scraperOptions: ScraperOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    requestDelay: 2000,
    maxConcurrentPages: 2,
    timeout: 30000
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockBrowserManager = new BrowserManager(browserConfig) as jest.Mocked<BrowserManager>;
    mockRateLimiter = new RateLimiter({ requestsPerMinute: 60, burstLimit: 10 }) as jest.Mocked<RateLimiter>;
    mockPage = {
      goto: jest.fn(),
      close: jest.fn(),
      isClosed: jest.fn().mockReturnValue(false)
    } as any;

    // Mock constructors
    (BrowserManager as jest.MockedClass<typeof BrowserManager>).mockImplementation(() => mockBrowserManager);
    (RateLimiter as jest.MockedClass<typeof RateLimiter>).mockImplementation(() => mockRateLimiter);

    // Setup default mock behaviors
    mockBrowserManager.createPage.mockResolvedValue(mockPage);
    mockBrowserManager.closePage.mockResolvedValue();
    mockRateLimiter.waitForSlot.mockResolvedValue();

    scraper = new TestScraper(
      'test',
      browserConfig,
      scraperOptions,
      { requestsPerMinute: 60, burstLimit: 10 }
    );
  });

  afterEach(async () => {
    await scraper.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(BrowserManager).toHaveBeenCalledWith(browserConfig);
      expect(RateLimiter).toHaveBeenCalledWith({ requestsPerMinute: 60, burstLimit: 10 });
    });
  });

  describe('navigateToPage', () => {
    it('should successfully navigate to a page', async () => {
      mockPage.goto.mockResolvedValue({} as any);

      const result = await scraper.testNavigateToPage(mockPage, 'http://test.com');

      expect(result).toBe(true);
      expect(mockRateLimiter.waitForSlot).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith('http://test.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    });

    it('should retry on failure and eventually succeed', async () => {
      mockPage.goto
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({} as any);

      const result = await scraper.testNavigateToPage(mockPage, 'http://test.com');

      expect(result).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockPage.goto.mockRejectedValue(new Error('Network error'));

      const result = await scraper.testNavigateToPage(mockPage, 'http://test.com');

      expect(result).toBe(false);
      expect(mockPage.goto).toHaveBeenCalledTimes(3); // maxRetries
    });
  });

  describe('validatePropertyData', () => {
    it('should validate complete property data', () => {
      const validData: Partial<PropertyData> = {
        url: 'http://test.com',
        title: 'Test Property',
        price: 100000,
        location: 'Tokyo',
        sourceWebsite: 'test'
      };

      expect(scraper.testValidatePropertyData(validData)).toBe(true);
    });

    it('should reject incomplete property data', () => {
      const invalidData: Partial<PropertyData> = {
        url: 'http://test.com',
        title: 'Test Property'
        // missing required fields
      };

      expect(scraper.testValidatePropertyData(invalidData)).toBe(false);
    });

    it('should reject data with undefined price', () => {
      const invalidData: Partial<PropertyData> = {
        url: 'http://test.com',
        title: 'Test Property',
        price: undefined,
        location: 'Tokyo',
        sourceWebsite: 'test'
      };

      expect(scraper.testValidatePropertyData(invalidData)).toBe(false);
    });
  });

  describe('normalizePropertyData', () => {
    it('should normalize property data with defaults', () => {
      const inputData: Partial<PropertyData> = {
        url: 'http://test.com',
        title: '  Test Property  ',
        price: 100000,
        location: '  Tokyo  '
      };

      const result = scraper.testNormalizePropertyData(inputData);

      expect(result).toEqual({
        url: 'http://test.com',
        title: 'Test Property',
        price: 100000,
        location: 'Tokyo',
        size: 0,
        propertyType: 'unknown',
        description: '',
        images: [],
        listingDate: expect.any(Date),
        sourceWebsite: 'test'
      });
    });

    it('should preserve existing values', () => {
      const inputData: Partial<PropertyData> = {
        url: 'http://test.com',
        title: 'Test Property',
        price: 100000,
        location: 'Tokyo',
        size: 50,
        propertyType: 'apartment',
        description: 'Test description',
        images: ['image1.jpg'],
        listingDate: new Date('2023-01-01')
      };

      const result = scraper.testNormalizePropertyData(inputData);

      expect(result.size).toBe(50);
      expect(result.propertyType).toBe('apartment');
      expect(result.description).toBe('Test description');
      expect(result.images).toEqual(['image1.jpg']);
      expect(result.listingDate).toEqual(new Date('2023-01-01'));
    });
  });

  describe('extractNumericValue', () => {
    it('should extract numeric values from text', () => {
      expect(scraper.testExtractNumericValue('¥1,000,000')).toBe(1000000);
      expect(scraper.testExtractNumericValue('Price: 500,000 yen')).toBe(500000);
      expect(scraper.testExtractNumericValue('123')).toBe(123);
    });

    it('should return 0 for non-numeric text', () => {
      expect(scraper.testExtractNumericValue('No price')).toBe(0);
      expect(scraper.testExtractNumericValue('')).toBe(0);
      expect(scraper.testExtractNumericValue('abc')).toBe(0);
    });
  });

  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const chunks = scraper.testChunkArray(array, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      const chunks = scraper.testChunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const array = [1, 2];
      const chunks = scraper.testChunkArray(array, 5);

      expect(chunks).toEqual([[1, 2]]);
    });
  });

  describe('scrapePropertyUrls', () => {
    it('should scrape multiple URLs successfully', async () => {
      const urls = ['http://test.com/1', 'http://test.com/2'];
      mockPage.goto.mockResolvedValue({} as any);

      const result = await scraper.testScrapePropertyUrls(urls);

      expect(result.success).toBe(true);
      expect(result.scrapedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.data).toHaveLength(2);
      expect(mockBrowserManager.createPage).toHaveBeenCalledTimes(2);
      expect(mockBrowserManager.closePage).toHaveBeenCalledTimes(2);
    });

    it('should handle navigation failures', async () => {
      const urls = ['http://test.com/1'];
      mockPage.goto.mockRejectedValue(new Error('Network error'));

      const result = await scraper.testScrapePropertyUrls(urls);

      expect(result.success).toBe(false);
      expect(result.scrapedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to navigate');
    });

    it('should handle extraction errors', async () => {
      const urls = ['http://test.com/1'];
      mockPage.goto.mockResolvedValue({} as any);
      
      // Mock extractPropertyData to throw error
      jest.spyOn(scraper as any, 'extractPropertyData').mockRejectedValue(new Error('Extraction error'));

      const result = await scraper.testScrapePropertyUrls(urls);

      expect(result.success).toBe(false);
      expect(result.scrapedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Extraction error');
    });

    it('should close pages even on errors', async () => {
      const urls = ['http://test.com/1'];
      mockPage.goto.mockRejectedValue(new Error('Network error'));

      await scraper.testScrapePropertyUrls(urls);

      expect(mockBrowserManager.closePage).toHaveBeenCalledWith(mockPage);
    });
  });

  describe('cleanup', () => {
    it('should close browser manager', async () => {
      await scraper.cleanup();
      expect(mockBrowserManager.close).toHaveBeenCalled();
    });
  });
});