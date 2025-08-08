import { Page } from 'puppeteer';
import { BrowserManager, BrowserConfig } from './BrowserManager';
import { RateLimiter } from './RateLimiter';
import { PropertyData } from '../../models/Property';

export interface ScrapingResult {
  success: boolean;
  data: PropertyData[];
  errors: string[];
  scrapedCount: number;
  skippedCount: number;
}

export interface ScraperOptions {
  maxRetries: number;
  retryDelay: number;
  requestDelay: number;
  maxConcurrentPages: number;
  timeout: number;
}

export abstract class BaseScraper {
  protected browserManager: BrowserManager;
  protected rateLimiter: RateLimiter;
  protected options: ScraperOptions;
  protected websiteName: string;

  constructor(
    websiteName: string,
    browserConfig: BrowserConfig,
    scraperOptions: ScraperOptions,
    rateLimiterConfig: { requestsPerMinute: number; burstLimit: number }
  ) {
    this.websiteName = websiteName;
    this.browserManager = new BrowserManager(browserConfig);
    this.rateLimiter = new RateLimiter(rateLimiterConfig);
    this.options = scraperOptions;
  }

  /**
   * Main scraping method to be implemented by specific scrapers
   */
  abstract scrapeProperties(searchParams?: any): Promise<ScrapingResult>;

  /**
   * Extract property data from a single page
   */
  protected abstract extractPropertyData(page: Page, url: string): Promise<PropertyData | null>;

  /**
   * Get list of property URLs to scrape
   */
  protected abstract getPropertyUrls(page: Page, searchParams?: any): Promise<string[]>;

  /**
   * Navigate to a page with retry logic and rate limiting
   */
  protected async navigateToPage(page: Page, url: string): Promise<boolean> {
    await this.rateLimiter.waitForSlot();
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: this.options.timeout 
        });
        
        // Add random delay to appear more human-like
        await this.randomDelay(500, 2000);
        
        return true;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Navigation attempt ${attempt} failed for ${url}:`, error);
        
        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelay * attempt);
        }
      }
    }
    
    console.error(`Failed to navigate to ${url} after ${this.options.maxRetries} attempts:`, lastError);
    return false;
  }

  /**
   * Scrape multiple property URLs with concurrency control
   */
  protected async scrapePropertyUrls(urls: string[]): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: true,
      data: [],
      errors: [],
      scrapedCount: 0,
      skippedCount: 0
    };

    const chunks = this.chunkArray(urls, this.options.maxConcurrentPages);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (url) => {
        let page: Page | null = null;
        try {
          page = await this.browserManager.createPage();
          
          const success = await this.navigateToPage(page, url);
          if (!success) {
            result.errors.push(`Failed to navigate to ${url}`);
            result.skippedCount++;
            return;
          }

          const propertyData = await this.extractPropertyData(page, url);
          if (propertyData) {
            result.data.push(propertyData);
            result.scrapedCount++;
          } else {
            result.skippedCount++;
          }
          
        } catch (error) {
          const errorMessage = `Error scraping ${url}: ${error}`;
          console.error(errorMessage);
          result.errors.push(errorMessage);
          result.skippedCount++;
        } finally {
          if (page) {
            await this.browserManager.closePage(page);
          }
        }
      });

      await Promise.all(promises);
      
      // Add delay between chunks to be respectful
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(this.options.requestDelay);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Validate extracted property data
   */
  protected validatePropertyData(data: Partial<PropertyData>): boolean {
    return !!(
      data.url &&
      data.title &&
      data.price !== undefined &&
      data.location &&
      data.sourceWebsite
    );
  }

  /**
   * Normalize property data
   */
  protected normalizePropertyData(data: Partial<PropertyData>): PropertyData {
    return {
      url: data.url || '',
      title: data.title?.trim() || '',
      price: data.price || 0,
      location: data.location?.trim() || '',
      size: data.size || 0,
      propertyType: data.propertyType || 'unknown',
      description: data.description?.trim() || '',
      images: data.images || [],
      listingDate: data.listingDate || new Date(),
      sourceWebsite: this.websiteName
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.browserManager.close();
  }

  /**
   * Utility methods
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }

  protected chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  protected extractTextContent(element: any): string {
    if (!element) return '';
    return element.textContent?.trim() || '';
  }

  protected extractNumericValue(text: string): number {
    const match = text.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''), 10);
    }
    return 0;
  }
}