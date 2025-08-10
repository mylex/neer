import { BaseScraper, ScraperOptions } from './BaseScraper';
import { BrowserConfig } from './BrowserManager';
import { SuumoScraper } from './SuumoScraper';


export type SupportedSite = 'suumo' | 'homes' | 'athome';

export interface ScraperFactoryConfig {
  browserConfig: BrowserConfig;
  scraperOptions: ScraperOptions;
}

export class ScraperFactory {
  private factoryConfig: ScraperFactoryConfig;

  constructor(config: ScraperFactoryConfig) {
    this.factoryConfig = config;
  }

  /**
   * Create a scraper instance for the specified website
   */
  createScraper(siteName: SupportedSite): BaseScraper {
    switch (siteName.toLowerCase()) {
      case 'suumo':
        return new SuumoScraper(
          this.factoryConfig.browserConfig,
          this.factoryConfig.scraperOptions
        );
      
      case 'homes':
        throw new Error('Homes scraper not yet implemented');
      
      case 'athome':
        throw new Error('AtHome scraper not yet implemented');
      
      default:
        throw new Error(`Unsupported website: ${siteName}`);
    }
  }

  /**
   * Get list of supported websites
   */
  getSupportedSites(): SupportedSite[] {
    return ['suumo']; // Will expand as more scrapers are implemented
  }

  /**
   * Check if a website is supported
   */
  isSupported(siteName: string): boolean {
    return this.getSupportedSites().includes(siteName.toLowerCase() as SupportedSite);
  }

  /**
   * Create scrapers for all supported websites
   */
  createAllScrapers(): Map<SupportedSite, BaseScraper> {
    const scrapers = new Map<SupportedSite, BaseScraper>();
    
    for (const siteName of this.getSupportedSites()) {
      try {
        const scraper = this.createScraper(siteName);
        scrapers.set(siteName, scraper);
      } catch (error) {
        console.warn(`Failed to create scraper for ${siteName}:`, error);
      }
    }
    
    return scrapers;
  }

  /**
   * Get default scraper configuration
   */
  static getDefaultConfig(): ScraperFactoryConfig {
    return {
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
    };
  }

  /**
   * Update factory configuration
   */
  updateConfig(updates: Partial<ScraperFactoryConfig>): void {
    this.factoryConfig = {
      ...this.factoryConfig,
      ...updates,
      browserConfig: {
        ...this.factoryConfig.browserConfig,
        ...updates.browserConfig
      },
      scraperOptions: {
        ...this.factoryConfig.scraperOptions,
        ...updates.scraperOptions
      }
    };
  }
}