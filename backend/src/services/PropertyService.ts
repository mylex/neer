import { PropertyRepository } from '../database/repositories/PropertyRepository';
import { CachedPropertyRepository } from '../database/repositories/CachedPropertyRepository';
import { RedisCache } from './cache/RedisCache';
import { config } from '../config';

class PropertyService {
  private repository: PropertyRepository | CachedPropertyRepository;
  private cache: RedisCache | null = null;

  constructor() {
    // Initialize with basic repository
    this.repository = new PropertyRepository();
  }

  async initialize(): Promise<void> {
    try {
      // Try to initialize Redis cache
      this.cache = new RedisCache(config.redis);
      await this.cache.connect();
      
      // Switch to cached repository
      this.repository = new CachedPropertyRepository(this.cache);
      console.log('PropertyService initialized with Redis caching');
    } catch (error) {
      console.warn('PropertyService initialized without caching:', (error as Error).message);
      // Keep using basic repository
    }
  }

  getRepository(): PropertyRepository | CachedPropertyRepository {
    return this.repository;
  }

  async shutdown(): Promise<void> {
    if (this.cache) {
      await this.cache.disconnect();
    }
  }

  isCacheEnabled(): boolean {
    return this.cache !== null;
  }

  async getCacheInfo(): Promise<any> {
    if (this.repository instanceof CachedPropertyRepository) {
      return this.repository.getCacheInfo();
    }
    return null;
  }

  async clearCache(): Promise<void> {
    if (this.repository instanceof CachedPropertyRepository) {
      await this.repository.clearCache();
    }
  }
}

// Export singleton instance
export const propertyService = new PropertyService();