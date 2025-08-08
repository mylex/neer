import { ScraperConfigManager, SiteConfig } from '../ScraperConfig';

describe('ScraperConfigManager', () => {
  let configManager: ScraperConfigManager;

  beforeEach(() => {
    configManager = new ScraperConfigManager();
  });

  describe('initialization', () => {
    it('should initialize with default configurations', () => {
      const supportedSites = configManager.getSupportedSites();
      
      expect(supportedSites).toContain('suumo');
      expect(supportedSites).toContain('homes');
      expect(supportedSites).toContain('athome');
      expect(supportedSites.length).toBe(3);
    });

    it('should have valid default configurations', () => {
      const suumoConfig = configManager.getConfig('suumo');
      
      expect(suumoConfig).toBeDefined();
      expect(suumoConfig?.name).toBe('Suumo');
      expect(suumoConfig?.baseUrl).toBe('https://suumo.jp');
      expect(suumoConfig?.selectors.propertyCard).toBeDefined();
      expect(suumoConfig?.rateLimit.requestsPerMinute).toBeGreaterThan(0);
    });
  });

  describe('getConfig', () => {
    it('should return config for existing site', () => {
      const config = configManager.getConfig('suumo');
      expect(config).toBeDefined();
      expect(config?.name).toBe('Suumo');
    });

    it('should return null for non-existing site', () => {
      const config = configManager.getConfig('nonexistent');
      expect(config).toBeNull();
    });

    it('should be case insensitive', () => {
      const config1 = configManager.getConfig('SUUMO');
      const config2 = configManager.getConfig('suumo');
      
      expect(config1).toEqual(config2);
    });
  });

  describe('addConfig', () => {
    it('should add new configuration', () => {
      const newConfig: SiteConfig = {
        name: 'TestSite',
        baseUrl: 'https://test.com',
        searchUrl: 'https://test.com/search',
        selectors: {
          propertyCard: '.property',
          title: '.title',
          price: '.price',
          location: '.location',
          size: '.size',
          propertyType: '.type',
          description: '.desc',
          images: '.images img',
          listingDate: '.date',
          propertyLink: '.title a'
        },
        pagination: {
          type: 'button',
          maxPages: 10
        },
        rateLimit: {
          requestsPerMinute: 30,
          burstLimit: 5
        },
        userAgent: 'test-agent'
      };

      configManager.addConfig('testsite', newConfig);
      const retrieved = configManager.getConfig('testsite');
      
      expect(retrieved).toEqual(newConfig);
    });
  });

  describe('updateConfig', () => {
    it('should update existing configuration', () => {
      const updates = {
        rateLimit: {
          requestsPerMinute: 20,
          burstLimit: 3
        }
      };

      const success = configManager.updateConfig('suumo', updates);
      const updated = configManager.getConfig('suumo');
      
      expect(success).toBe(true);
      expect(updated?.rateLimit.requestsPerMinute).toBe(20);
      expect(updated?.rateLimit.burstLimit).toBe(3);
    });

    it('should return false for non-existing site', () => {
      const success = configManager.updateConfig('nonexistent', {});
      expect(success).toBe(false);
    });
  });

  describe('removeConfig', () => {
    it('should remove existing configuration', () => {
      const success = configManager.removeConfig('suumo');
      const retrieved = configManager.getConfig('suumo');
      
      expect(success).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existing site', () => {
      const success = configManager.removeConfig('nonexistent');
      expect(success).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid config', () => {
      const validConfig: SiteConfig = {
        name: 'TestSite',
        baseUrl: 'https://test.com',
        searchUrl: 'https://test.com/search',
        selectors: {
          propertyCard: '.property',
          title: '.title',
          price: '.price',
          location: '.location',
          size: '.size',
          propertyType: '.type',
          description: '.desc',
          images: '.images img',
          listingDate: '.date',
          propertyLink: '.title a'
        },
        pagination: {
          type: 'button',
          maxPages: 10
        },
        rateLimit: {
          requestsPerMinute: 30,
          burstLimit: 5
        },
        userAgent: 'test-agent'
      };

      const errors = configManager.validateConfig(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid config', () => {
      const invalidConfig = {
        // Missing required fields
        selectors: {
          // Missing required selectors
          title: '.title'
        },
        rateLimit: {
          requestsPerMinute: 0, // Invalid value
          burstLimit: -1 // Invalid value
        }
      } as SiteConfig;

      const errors = configManager.validateConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Site name is required'))).toBe(true);
      expect(errors.some(error => error.includes('Base URL is required'))).toBe(true);
    });
  });

  describe('getAllConfigs', () => {
    it('should return all configurations', () => {
      const allConfigs = configManager.getAllConfigs();
      
      expect(allConfigs).toHaveLength(3);
      expect(allConfigs.some(config => config.name === 'Suumo')).toBe(true);
      expect(allConfigs.some(config => config.name === 'Homes')).toBe(true);
      expect(allConfigs.some(config => config.name === 'AtHome')).toBe(true);
    });
  });
});