import { ScraperFactory, SupportedSite, ScraperFactoryConfig } from '../ScraperFactory';
import { SuumoScraper } from '../SuumoScraper';

// Mock the SuumoScraper
jest.mock('../SuumoScraper');

describe('ScraperFactory', () => {
  let factory: ScraperFactory;
  let mockConfig: ScraperFactoryConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
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
    };

    factory = new ScraperFactory(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(factory).toBeInstanceOf(ScraperFactory);
    });
  });

  describe('createScraper', () => {
    it('should create SuumoScraper for suumo site', () => {
      const scraper = factory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        mockConfig.browserConfig,
        mockConfig.scraperOptions
      );
      expect(scraper).toBeInstanceOf(SuumoScraper);
    });

    it('should handle case-insensitive site names', () => {
      const scraper = factory.createScraper('SUUMO' as SupportedSite);

      expect(SuumoScraper).toHaveBeenCalledWith(
        mockConfig.browserConfig,
        mockConfig.scraperOptions
      );
      expect(scraper).toBeInstanceOf(SuumoScraper);
    });

    it('should throw error for unsupported homes site', () => {
      expect(() => {
        factory.createScraper('homes');
      }).toThrow('Homes scraper not yet implemented');
    });

    it('should throw error for unsupported athome site', () => {
      expect(() => {
        factory.createScraper('athome');
      }).toThrow('AtHome scraper not yet implemented');
    });

    it('should throw error for completely unsupported site', () => {
      expect(() => {
        factory.createScraper('unknown' as SupportedSite);
      }).toThrow('Unsupported website: unknown');
    });
  });

  describe('getSupportedSites', () => {
    it('should return list of supported sites', () => {
      const sites = factory.getSupportedSites();

      expect(sites).toEqual(['suumo']);
      expect(sites).toHaveLength(1);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported sites', () => {
      expect(factory.isSupported('suumo')).toBe(true);
    });

    it('should return true for supported sites with different case', () => {
      expect(factory.isSupported('SUUMO')).toBe(true);
      expect(factory.isSupported('Suumo')).toBe(true);
    });

    it('should return false for unsupported sites', () => {
      expect(factory.isSupported('homes')).toBe(false);
      expect(factory.isSupported('athome')).toBe(false);
      expect(factory.isSupported('unknown')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(factory.isSupported('')).toBe(false);
    });
  });

  describe('createAllScrapers', () => {
    it('should create scrapers for all supported sites', () => {
      const scrapers = factory.createAllScrapers();

      expect(scrapers.size).toBe(1);
      expect(scrapers.has('suumo')).toBe(true);
      expect(scrapers.get('suumo')).toBeInstanceOf(SuumoScraper);
    });

    it('should handle scraper creation failures gracefully', () => {
      // Mock SuumoScraper constructor to throw error
      (SuumoScraper as jest.MockedClass<typeof SuumoScraper>).mockImplementationOnce(() => {
        throw new Error('Scraper creation failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const scrapers = factory.createAllScrapers();

      expect(scrapers.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create scraper for suumo:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const defaultConfig = ScraperFactory.getDefaultConfig();

      expect(defaultConfig).toEqual({
        browserConfig: {
          headless: true,
          timeout: 30000,
          viewport: {
            width: 1366,
            height: 768
          }
        },
        scraperOptions: {
          maxRetries: 3,
          retryDelay: 2000,
          requestDelay: 3000,
          maxConcurrentPages: 2,
          timeout: 30000
        }
      });
    });

    it('should return a new object each time', () => {
      const config1 = ScraperFactory.getDefaultConfig();
      const config2 = ScraperFactory.getDefaultConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('updateConfig', () => {
    it('should update browser configuration', () => {
      const updates = {
        browserConfig: {
          headless: false,
          timeout: 60000
        }
      };

      factory.updateConfig(updates);

      // Create a scraper to verify the updated config is used
      factory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false,
          timeout: 60000,
          viewport: { width: 1366, height: 768 } // Should preserve existing values
        }),
        mockConfig.scraperOptions
      );
    });

    it('should update scraper options', () => {
      const updates = {
        scraperOptions: {
          maxRetries: 5,
          requestDelay: 5000,
          retryDelay: 2000,
          maxConcurrentPages: 2,
          timeout: 30000
        }
      };

      factory.updateConfig(updates);

      factory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        mockConfig.browserConfig,
        expect.objectContaining({
          maxRetries: 5,
          requestDelay: 5000,
          retryDelay: 2000, // Should preserve existing values
          maxConcurrentPages: 2,
          timeout: 30000
        })
      );
    });

    it('should update both browser and scraper configurations', () => {
      const updates = {
        browserConfig: {
          headless: false,
          timeout: 30000
        },
        scraperOptions: {
          maxRetries: 5,
          retryDelay: 2000,
          requestDelay: 3000,
          maxConcurrentPages: 2,
          timeout: 30000
        }
      };

      factory.updateConfig(updates);

      factory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false
        }),
        expect.objectContaining({
          maxRetries: 5
        })
      );
    });

    it('should handle partial updates without overwriting existing config', () => {
      const originalBrowserConfig = { ...mockConfig.browserConfig };
      const originalScraperOptions = { ...mockConfig.scraperOptions };

      factory.updateConfig({
        browserConfig: {
          headless: false,
          timeout: 30000
        }
      });

      factory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        {
          ...originalBrowserConfig,
          headless: false
        },
        originalScraperOptions
      );
    });

    it('should handle empty updates', () => {
      factory.updateConfig({});

      factory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        mockConfig.browserConfig,
        mockConfig.scraperOptions
      );
    });
  });

  describe('integration with actual scraper creation', () => {
    it('should pass correct configuration to created scrapers', () => {
      const customConfig: ScraperFactoryConfig = {
        browserConfig: {
          headless: false,
          userAgent: 'custom-agent',
          viewport: { width: 1920, height: 1080 },
          timeout: 45000
        },
        scraperOptions: {
          maxRetries: 5,
          retryDelay: 3000,
          requestDelay: 4000,
          maxConcurrentPages: 3,
          timeout: 45000
        }
      };

      const customFactory = new ScraperFactory(customConfig);
      customFactory.createScraper('suumo');

      expect(SuumoScraper).toHaveBeenCalledWith(
        customConfig.browserConfig,
        customConfig.scraperOptions
      );
    });
  });
});