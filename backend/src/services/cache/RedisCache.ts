import { createClient, RedisClientType } from 'redis';
import { SystemLogger } from '../monitoring/SystemLogger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttl: {
    properties: number;
    search: number;
    stats: number;
  };
}

export class RedisCache {
  private client: RedisClientType;
  private logger: SystemLogger;
  private config: CacheConfig;
  private isConnected: boolean = false;

  constructor(config: CacheConfig) {
    this.config = config;
    this.logger = SystemLogger.getInstance();
    
    const clientConfig: any = {
      socket: {
        host: config.host,
        port: config.port,
      },
      database: config.db || 0,
    };

    if (config.password) {
      clientConfig.password = config.password;
    }

    this.client = createClient(clientConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      this.logger.info('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info('Redis cache service initialized');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.logger.info('Redis cache service disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error as Error);
    }
  }

  // Property caching methods
  async getProperty(id: number): Promise<any | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `property:${id}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        this.logger.debug('Cache hit for property', { id });
        return JSON.parse(cached);
      }
      
      this.logger.debug('Cache miss for property', { id });
      return null;
    } catch (error) {
      this.logger.error('Error getting property from cache', error as Error, { propertyId: id });
      return null;
    }
  }

  async setProperty(id: number, property: any): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `property:${id}`;
      await this.client.setEx(
        key, 
        this.config.ttl.properties, 
        JSON.stringify(property)
      );
      
      this.logger.debug('Property cached', { id });
    } catch (error) {
      this.logger.error('Error setting property in cache', error as Error, { propertyId: id });
    }
  }

  // Search results caching
  async getSearchResults(searchKey: string): Promise<any | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = `search:${searchKey}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        this.logger.debug('Cache hit for search', { searchKey });
        return JSON.parse(cached);
      }
      
      this.logger.debug('Cache miss for search', { searchKey });
      return null;
    } catch (error) {
      this.logger.error('Error getting search results from cache', error as Error, { searchKey });
      return null;
    }
  }

  async setSearchResults(searchKey: string, results: any): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `search:${searchKey}`;
      await this.client.setEx(
        key, 
        this.config.ttl.search, 
        JSON.stringify(results)
      );
      
      this.logger.debug('Search results cached', { searchKey });
    } catch (error) {
      this.logger.error('Error setting search results in cache', error as Error, { searchKey });
    }
  }

  // Statistics caching
  async getStats(): Promise<any | null> {
    if (!this.isConnected) return null;
    
    try {
      const key = 'stats:system';
      const cached = await this.client.get(key);
      
      if (cached) {
        this.logger.debug('Cache hit for stats');
        return JSON.parse(cached);
      }
      
      this.logger.debug('Cache miss for stats');
      return null;
    } catch (error) {
      this.logger.error('Error getting stats from cache', error as Error);
      return null;
    }
  }

  async setStats(stats: any): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = 'stats:system';
      await this.client.setEx(
        key, 
        this.config.ttl.stats, 
        JSON.stringify(stats)
      );
      
      this.logger.debug('Stats cached');
    } catch (error) {
      this.logger.error('Error setting stats in cache', error as Error);
    }
  }

  // Cache invalidation methods
  async invalidateProperty(id: number): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const key = `property:${id}`;
      await this.client.del(key);
      this.logger.debug('Property cache invalidated', { id });
    } catch (error) {
      this.logger.error('Error invalidating property cache', error as Error, { propertyId: id });
    }
  }

  async invalidateSearchCache(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      const keys = await this.client.keys('search:*');
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug('Search cache invalidated', { keysCount: keys.length });
      }
    } catch (error) {
      this.logger.error('Error invalidating search cache', error as Error);
    }
  }

  async invalidateStats(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.del('stats:system');
      this.logger.debug('Stats cache invalidated');
    } catch (error) {
      this.logger.error('Error invalidating stats cache', error as Error);
    }
  }

  // Utility methods
  async flushAll(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await this.client.flushDb();
      this.logger.info('All cache data flushed');
    } catch (error) {
      this.logger.error('Error flushing cache', error as Error);
    }
  }

  async getInfo(): Promise<any> {
    if (!this.isConnected) return null;
    
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      this.logger.error('Error getting Redis info', error as Error);
      return null;
    }
  }

  // Generate cache key for search parameters
  generateSearchKey(filters: any, pagination: any, sortBy?: string): string {
    const searchParams = {
      ...filters,
      ...pagination,
      sortBy: sortBy || 'created_at'
    };
    
    // Create a consistent hash of the search parameters
    const sortedParams = Object.keys(searchParams)
      .sort()
      .reduce((result, key) => {
        result[key] = searchParams[key];
        return result;
      }, {} as any);
    
    return Buffer.from(JSON.stringify(sortedParams)).toString('base64');
  }
}