import { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

export interface BrowserConfig {
  headless: boolean;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  timeout: number;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await puppeteerExtra.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: this.config.viewport || { width: 1366, height: 768 }
    });
  }

  async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    // Set user agent if provided
    if (this.config.userAgent) {
      await page.setUserAgent(this.config.userAgent);
    }

    // Set timeout
    page.setDefaultTimeout(this.config.timeout);
    page.setDefaultNavigationTimeout(this.config.timeout);

    // Block unnecessary resources to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'image') {
        req.abort();
      } else {
        req.continue();
      }
    });

    return page;
  }

  async closePage(page: Page): Promise<void> {
    if (page && !page.isClosed()) {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isInitialized(): boolean {
    return this.browser !== null;
  }
}