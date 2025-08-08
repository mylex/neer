export interface SiteSelectors {
  propertyCard: string;
  title: string;
  price: string;
  location: string;
  size: string;
  propertyType: string;
  description: string;
  images: string;
  listingDate: string;
  nextPage?: string;
  propertyLink: string;
}

export interface SiteConfig {
  name: string;
  baseUrl: string;
  searchUrl: string;
  selectors: SiteSelectors;
  pagination: {
    type: 'button' | 'url' | 'infinite';
    maxPages: number;
    pageParam?: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  userAgent: string;
  headers?: Record<string, string>;
  searchParams?: Record<string, any>;
}

export class ScraperConfigManager {
  private configs: Map<string, SiteConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // Suumo configuration
    this.configs.set('suumo', {
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
        type: 'button',
        maxPages: 50,
        pageParam: 'page'
      },
      rateLimit: {
        requestsPerMinute: 30,
        burstLimit: 5
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Homes.co.jp configuration
    this.configs.set('homes', {
      name: 'Homes',
      baseUrl: 'https://www.homes.co.jp',
      searchUrl: 'https://www.homes.co.jp/chintai/search/',
      selectors: {
        propertyCard: '.mod-mergeProperty',
        title: '.prg-bukkenName',
        price: '.prg-rent',
        location: '.prg-stationName',
        size: '.prg-area',
        propertyType: '.prg-madori',
        description: '.prg-comment',
        images: '.prg-photo img',
        listingDate: '.prg-newArrival',
        nextPage: '.pager-next',
        propertyLink: '.prg-bukkenName a'
      },
      pagination: {
        type: 'url',
        maxPages: 30,
        pageParam: 'page'
      },
      rateLimit: {
        requestsPerMinute: 25,
        burstLimit: 4
      },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    // AtHome configuration
    this.configs.set('athome', {
      name: 'AtHome',
      baseUrl: 'https://www.athome.co.jp',
      searchUrl: 'https://www.athome.co.jp/chintai/search/',
      selectors: {
        propertyCard: '.property-unit',
        title: '.property-name',
        price: '.property-rent',
        location: '.property-address',
        size: '.property-area',
        propertyType: '.property-layout',
        description: '.property-comment',
        images: '.property-photo img',
        listingDate: '.property-date',
        nextPage: '.pager-next',
        propertyLink: '.property-name a'
      },
      pagination: {
        type: 'button',
        maxPages: 40,
        pageParam: 'p'
      },
      rateLimit: {
        requestsPerMinute: 20,
        burstLimit: 3
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
  }

  getConfig(siteName: string): SiteConfig | null {
    return this.configs.get(siteName.toLowerCase()) || null;
  }

  getAllConfigs(): SiteConfig[] {
    return Array.from(this.configs.values());
  }

  addConfig(siteName: string, config: SiteConfig): void {
    this.configs.set(siteName.toLowerCase(), config);
  }

  updateConfig(siteName: string, updates: Partial<SiteConfig>): boolean {
    const existing = this.configs.get(siteName.toLowerCase());
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...updates };
    this.configs.set(siteName.toLowerCase(), updated);
    return true;
  }

  removeConfig(siteName: string): boolean {
    return this.configs.delete(siteName.toLowerCase());
  }

  getSupportedSites(): string[] {
    return Array.from(this.configs.keys());
  }

  validateConfig(config: SiteConfig): string[] {
    const errors: string[] = [];

    if (!config.name) errors.push('Site name is required');
    if (!config.baseUrl) errors.push('Base URL is required');
    if (!config.searchUrl) errors.push('Search URL is required');
    if (!config.selectors) errors.push('Selectors configuration is required');
    
    if (config.selectors) {
      const requiredSelectors = ['propertyCard', 'title', 'price', 'location', 'propertyLink'];
      for (const selector of requiredSelectors) {
        if (!config.selectors[selector as keyof SiteSelectors]) {
          errors.push(`Required selector '${selector}' is missing`);
        }
      }
    }

    if (!config.rateLimit) {
      errors.push('Rate limit configuration is required');
    } else {
      if (!config.rateLimit.requestsPerMinute || config.rateLimit.requestsPerMinute <= 0) {
        errors.push('Valid requestsPerMinute is required');
      }
      if (!config.rateLimit.burstLimit || config.rateLimit.burstLimit <= 0) {
        errors.push('Valid burstLimit is required');
      }
    }

    return errors;
  }
}