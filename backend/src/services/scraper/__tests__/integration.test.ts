import { BrowserManager, BrowserConfig } from '../BrowserManager';
import { ScraperConfigManager } from '../ScraperConfig';
import { RateLimiter } from '../RateLimiter';

describe('Scraper Integration Tests', () => {
  let browserManager: BrowserManager;
  let configManager: ScraperConfigManager;
  let rateLimiter: RateLimiter;

  const browserConfig: BrowserConfig = {
    headless: true,
    timeout: 30000
  };

  beforeEach(() => {
    browserManager = new BrowserManager(browserConfig);
    configManager = new ScraperConfigManager();
    rateLimiter = new RateLimiter({ requestsPerMinute: 60, burstLimit: 5 });
  });

  afterEach(async () => {
    await browserManager.close();
  });

  describe('Component Integration', () => {
    it('should initialize all components successfully', () => {
      expect(browserManager).toBeInstanceOf(BrowserManager);
      expect(configManager).toBeInstanceOf(ScraperConfigManager);
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should have valid site configurations', () => {
      const supportedSites = configManager.getSupportedSites();
      expect(supportedSites.length).toBeGreaterThan(0);

      for (const siteName of supportedSites) {
        const config = configManager.getConfig(siteName);
        expect(config).toBeDefined();
        
        const errors = configManager.validateConfig(config!);
        expect(errors).toHaveLength(0);
      }
    });

    it('should create and manage browser pages', async () => {
      await browserManager.initialize();
      expect(browserManager.isInitialized()).toBe(true);

      const page = await browserManager.createPage();
      expect(page).toBeDefined();
      expect(page.isClosed()).toBe(false);

      await browserManager.closePage(page);
      expect(page.isClosed()).toBe(true);
    });

    it('should enforce rate limiting across multiple requests', async () => {
      const startTime = Date.now();
      
      // Make multiple requests that should trigger rate limiting
      const promises = [];
      for (let i = 0; i < 7; i++) { // More than burst limit
        promises.push(rateLimiter.waitForSlot());
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // Should take at least 1 second due to burst limiting
      expect(endTime - startTime).toBeGreaterThan(900);
      
      const stats = rateLimiter.getStats();
      expect(stats.totalRequests).toBe(7);
    }, 15000);
  });

  describe('Configuration Management', () => {
    it('should allow dynamic configuration updates', () => {
      const originalConfig = configManager.getConfig('suumo');
      expect(originalConfig).toBeDefined();

      const updates = {
        rateLimit: {
          requestsPerMinute: 20,
          burstLimit: 2
        }
      };

      const success = configManager.updateConfig('suumo', updates);
      expect(success).toBe(true);

      const updatedConfig = configManager.getConfig('suumo');
      expect(updatedConfig?.rateLimit.requestsPerMinute).toBe(20);
      expect(updatedConfig?.rateLimit.burstLimit).toBe(2);
    });

    it('should validate configuration changes', () => {
      const invalidConfig = {
        name: '',
        baseUrl: '',
        searchUrl: '',
        selectors: {},
        rateLimit: {
          requestsPerMinute: -1,
          burstLimit: 0
        }
      } as any;

      const errors = configManager.validateConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle browser initialization errors gracefully', async () => {
      const invalidBrowserConfig: BrowserConfig = {
        headless: true,
        timeout: -1 // Invalid timeout
      };

      const invalidBrowserManager = new BrowserManager(invalidBrowserConfig);
      
      // Should not throw during construction
      expect(invalidBrowserManager).toBeInstanceOf(BrowserManager);
      
      // May throw during initialization, but should be handled gracefully
      try {
        await invalidBrowserManager.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle rate limiter configuration errors', () => {
      expect(() => new RateLimiter({ requestsPerMinute: 0, burstLimit: 5 }))
        .toThrow();
      
      expect(() => new RateLimiter({ requestsPerMinute: 60, burstLimit: 0 }))
        .toThrow();
      
      expect(() => new RateLimiter({ requestsPerMinute: 30, burstLimit: 40 }))
        .toThrow();
    });
  });
});