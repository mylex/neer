import { Page } from 'puppeteer';
import { BaseScraper, ScrapingResult, ScraperOptions } from './BaseScraper';
import { BrowserConfig } from './BrowserManager';
import { PropertyData } from '../../models/Property';
import { ScraperConfigManager, SiteConfig } from './ScraperConfig';

export interface SuumoSearchParams {
  prefecture?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  propertyType?: string;
  maxPages?: number;
}

export class SuumoScraper extends BaseScraper {
  private config: SiteConfig;

  constructor(
    browserConfig: BrowserConfig,
    scraperOptions: ScraperOptions
  ) {
    const configManager = new ScraperConfigManager();
    const siteConfig = configManager.getConfig('suumo');
    
    if (!siteConfig) {
      throw new Error('Suumo configuration not found');
    }

    super(
      siteConfig.name,
      browserConfig,
      scraperOptions,
      siteConfig.rateLimit
    );

    this.config = siteConfig;
  }

  /**
   * Main scraping method for Suumo properties
   */
  async scrapeProperties(searchParams?: SuumoSearchParams): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: true,
      data: [],
      errors: [],
      scrapedCount: 0,
      skippedCount: 0
    };

    try {
      console.log('Starting Suumo property scraping...');
      
      // Get property URLs from search results
      const propertyUrls = await this.getPropertyUrls(null, searchParams);
      
      if (propertyUrls.length === 0) {
        console.warn('No property URLs found');
        return result;
      }

      console.log(`Found ${propertyUrls.length} property URLs to scrape`);

      // Scrape individual property pages
      const scrapingResult = await this.scrapePropertyUrls(propertyUrls);
      
      // Merge results
      result.data = scrapingResult.data;
      result.errors = scrapingResult.errors;
      result.scrapedCount = scrapingResult.scrapedCount;
      result.skippedCount = scrapingResult.skippedCount;
      result.success = scrapingResult.success;

      console.log(`Scraping completed. Success: ${result.scrapedCount}, Skipped: ${result.skippedCount}, Errors: ${result.errors.length}`);

    } catch (error) {
      const errorMessage = `Fatal error during Suumo scraping: ${error}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      result.success = false;
    }

    return result;
  } 
 /**
   * Get property URLs from Suumo search results
   */
  protected async getPropertyUrls(_page: Page | null, searchParams?: SuumoSearchParams): Promise<string[]> {
    const urls: string[] = [];
    let currentPage = 1;
    const maxPages = searchParams?.maxPages || this.config.pagination.maxPages;

    try {
      while (currentPage <= maxPages) {
        const searchPage = await this.browserManager.createPage();
        
        try {
          // Build search URL with parameters
          const searchUrl = this.buildSearchUrl(searchParams, currentPage);
          console.log(`Scraping search page ${currentPage}: ${searchUrl}`);

          const success = await this.navigateToPage(searchPage, searchUrl);
          if (!success) {
            console.error(`Failed to navigate to search page ${currentPage}`);
            break;
          }

          // Wait for property listings to load
          await searchPage.waitForSelector(this.config.selectors.propertyCard, { timeout: 10000 });

          // Extract property URLs from current page
          const pageUrls = await this.extractPropertyUrlsFromPage(searchPage);
          
          if (pageUrls.length === 0) {
            console.log(`No properties found on page ${currentPage}, stopping`);
            break;
          }

          urls.push(...pageUrls);
          console.log(`Found ${pageUrls.length} properties on page ${currentPage}`);

          // Check if there's a next page
          const hasNextPage = await this.hasNextPage(searchPage);
          if (!hasNextPage) {
            console.log('No more pages available');
            break;
          }

          currentPage++;

        } finally {
          await this.browserManager.closePage(searchPage);
        }
      }

    } catch (error) {
      console.error('Error getting property URLs:', error);
      throw error;
    }

    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Extract property data from a single Suumo property page
   */
  protected async extractPropertyData(page: Page, url: string): Promise<PropertyData | null> {
    try {
      // Wait for main content to load
      await page.waitForSelector('.property_view_main', { timeout: 15000 });

      const propertyData: Partial<PropertyData> = {
        url,
        sourceWebsite: this.websiteName
      };

      // Extract title
      try {
        const titleElement = await page.$(this.config.selectors.title);
        if (titleElement) {
          propertyData.title = await page.evaluate(el => el?.textContent?.trim() || '', titleElement);
        }
      } catch (error) {
        console.warn(`Error extracting title from ${url}:`, error);
      }

      // Extract price
      try {
        const priceElement = await page.$(this.config.selectors.price);
        if (priceElement) {
          const priceText = await page.evaluate(el => el?.textContent?.trim() || '', priceElement);
          propertyData.price = this.extractPriceFromText(priceText);
        }
      } catch (error) {
        console.warn(`Error extracting price from ${url}:`, error);
      }

      // Extract location
      try {
        const locationElement = await page.$(this.config.selectors.location);
        if (locationElement) {
          propertyData.location = await page.evaluate(el => el?.textContent?.trim() || '', locationElement);
        }
      } catch (error) {
        console.warn(`Error extracting location from ${url}:`, error);
      }

      // Extract size
      try {
        const sizeElement = await page.$(this.config.selectors.size);
        if (sizeElement) {
          const sizeText = await page.evaluate(el => el?.textContent?.trim() || '', sizeElement);
          propertyData.size = this.extractSizeFromText(sizeText);
        }
      } catch (error) {
        console.warn(`Error extracting size from ${url}:`, error);
      }

      // Extract property type
      try {
        const typeElement = await page.$(this.config.selectors.propertyType);
        if (typeElement) {
          propertyData.propertyType = await page.evaluate(el => el?.textContent?.trim() || '', typeElement);
        }
      } catch (error) {
        console.warn(`Error extracting property type from ${url}:`, error);
      }

      // Extract description
      try {
        const descElement = await page.$(this.config.selectors.description);
        if (descElement) {
          propertyData.description = await page.evaluate(el => el?.textContent?.trim() || '', descElement);
        }
      } catch (error) {
        console.warn(`Error extracting description from ${url}:`, error);
      }

      // Extract images
      try {
        const imageElements = await page.$$(this.config.selectors.images);
        const images: string[] = [];
        
        for (const imgElement of imageElements) {
          const src = await page.evaluate(el => el?.getAttribute('src') || el?.getAttribute('data-src') || '', imgElement);
          if (src && this.isValidImageUrl(src)) {
            images.push(this.normalizeImageUrl(src));
          }
        }
        
        propertyData.images = images;
      } catch (error) {
        console.warn(`Error extracting images from ${url}:`, error);
        propertyData.images = [];
      }

      // Extract listing date
      try {
        const dateElement = await page.$(this.config.selectors.listingDate);
        if (dateElement) {
          const dateText = await page.evaluate(el => el?.textContent?.trim() || '', dateElement);
          propertyData.listingDate = this.parseDateFromText(dateText);
        }
      } catch (error) {
        console.warn(`Error extracting listing date from ${url}:`, error);
      }

      // Validate and normalize the extracted data
      if (!this.validatePropertyData(propertyData)) {
        console.warn(`Invalid property data extracted from ${url}`);
        return null;
      }

      return this.normalizePropertyData(propertyData);

    } catch (error) {
      console.error(`Error extracting property data from ${url}:`, error);
      return null;
    }
  }  /*
*
   * Build search URL with parameters
   */
  private buildSearchUrl(searchParams?: SuumoSearchParams, page: number = 1): string {
    let url = this.config.searchUrl;
    const params = new URLSearchParams();

    if (searchParams) {
      if (searchParams.prefecture) params.append('sc', searchParams.prefecture);
      if (searchParams.city) params.append('cb', searchParams.city);
      if (searchParams.minPrice) params.append('rn', searchParams.minPrice.toString());
      if (searchParams.maxPrice) params.append('rx', searchParams.maxPrice.toString());
      if (searchParams.minSize) params.append('md', searchParams.minSize.toString());
      if (searchParams.maxSize) params.append('mx', searchParams.maxSize.toString());
      if (searchParams.propertyType) params.append('kt', searchParams.propertyType);
    }

    if (page > 1) {
      params.append('page', page.toString());
    }

    const queryString = params.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }

  /**
   * Extract property URLs from search results page
   */
  private async extractPropertyUrlsFromPage(page: Page): Promise<string[]> {
    const urls: string[] = [];

    try {
      const linkElements = await page.$$(this.config.selectors.propertyLink);
      
      for (const linkElement of linkElements) {
        const href = await page.evaluate(el => el?.getAttribute('href') || '', linkElement);
        if (href) {
          const fullUrl = this.normalizePropertyUrl(href);
          if (fullUrl) {
            urls.push(fullUrl);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting property URLs from page:', error);
    }

    return urls;
  }

  /**
   * Check if there's a next page available
   */
  private async hasNextPage(page: Page): Promise<boolean> {
    try {
      if (!this.config.selectors.nextPage) {
        return false;
      }

      const nextPageElement = await page.$(this.config.selectors.nextPage);
      if (!nextPageElement) {
        return false;
      }

      // Check if the next page button is disabled or not clickable
      const isDisabled = await page.evaluate(el => {
        return el?.classList.contains('disabled') || 
               el?.getAttribute('aria-disabled') === 'true' ||
               !el?.getAttribute('href');
      }, nextPageElement);

      return !isDisabled;
    } catch (error) {
      console.warn('Error checking for next page:', error);
      return false;
    }
  }

  /**
   * Extract price from Japanese text
   */
  private extractPriceFromText(text: string): number {
    if (!text) return 0;

    // Remove common Japanese price indicators and spaces
    const cleanText = text.replace(/[円万千百十,\s]/g, '');
    
    // Handle different price formats
    if (text.includes('万円')) {
      const match = text.match(/([\d.]+)万円/);
      if (match && match[1]) {
        return Math.round(parseFloat(match[1]) * 10000);
      }
    }

    // Extract numeric value
    const numericMatch = cleanText.match(/\d+/);
    return numericMatch ? parseInt(numericMatch[0], 10) : 0;
  }

  /**
   * Extract size from Japanese text
   */
  private extractSizeFromText(text: string): number {
    if (!text) return 0;

    // Look for square meter indicators
    const sqmMatch = text.match(/([\d.]+)[㎡m²]/);
    if (sqmMatch && sqmMatch[1]) {
      return parseFloat(sqmMatch[1]);
    }

    // Look for tatami mat indicators (1 tatami ≈ 1.65 sqm)
    const tatamiMatch = text.match(/([\d.]+)[畳帖]/);
    if (tatamiMatch && tatamiMatch[1]) {
      return Math.round(parseFloat(tatamiMatch[1]) * 1.65);
    }

    return 0;
  }

  /**
   * Parse date from Japanese text
   */
  private parseDateFromText(text: string): Date | undefined {
    if (!text) return undefined;

    try {
      // Handle various Japanese date formats
      const today = new Date();
      
      if (text.includes('今日') || text.includes('本日')) {
        return today;
      }
      
      if (text.includes('昨日')) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday;
      }

      // Look for specific date patterns
      const dateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
      if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateMatch[3], 10);
        return new Date(year, month, day);
      }

      return undefined;
    } catch (error) {
      console.warn('Error parsing date:', text, error);
      return undefined;
    }
  }

  /**
   * Normalize property URL to absolute URL
   */
  private normalizePropertyUrl(href: string): string | null {
    if (!href) return null;

    try {
      if (href.startsWith('http')) {
        return href;
      }
      
      if (href.startsWith('/')) {
        return this.config.baseUrl + href;
      }
      
      return this.config.baseUrl + '/' + href;
    } catch (error) {
      console.warn('Error normalizing URL:', href, error);
      return null;
    }
  }

  /**
   * Normalize image URL to absolute URL
   */
  private normalizeImageUrl(src: string): string {
    if (!src) return '';

    if (src.startsWith('http')) {
      return src;
    }
    
    if (src.startsWith('//')) {
      return 'https:' + src;
    }
    
    if (src.startsWith('/')) {
      return this.config.baseUrl + src;
    }
    
    return this.config.baseUrl + '/' + src;
  }

  /**
   * Validate image URL
   */
  private isValidImageUrl(src: string): boolean {
    if (!src) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerSrc = src.toLowerCase();
    
    return imageExtensions.some(ext => lowerSrc.includes(ext)) || 
           lowerSrc.includes('image') || 
           lowerSrc.includes('photo');
  }
}