import { PropertyRepository } from './PropertyRepository';
import { RedisCache } from '../../services/cache/RedisCache';
import {
  Property,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyFilters,
  PaginationParams,
  PaginatedResponse,
  PropertyStats
} from '../../models/Property';

export class CachedPropertyRepository extends PropertyRepository {
  private cache: RedisCache;

  constructor(cache: RedisCache) {
    super();
    this.cache = cache;
  }

  // Override findById with caching
  async findById(id: number): Promise<Property | null> {
    // Try to get from cache first
    const cached = await this.cache.getProperty(id);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const property = await super.findById(id);
    
    // Cache the result if found
    if (property) {
      await this.cache.setProperty(id, property);
    }

    return property;
  }

  // Override create with cache invalidation
  async create(propertyData: CreatePropertyInput): Promise<Property> {
    const property = await super.create(propertyData);
    
    // Cache the new property
    await this.cache.setProperty(property.id, property);
    
    // Invalidate search cache and stats since new data was added
    await Promise.all([
      this.cache.invalidateSearchCache(),
      this.cache.invalidateStats()
    ]);

    return property;
  }

  // Override update with cache invalidation
  async update(propertyData: UpdatePropertyInput): Promise<Property | null> {
    const property = await super.update(propertyData);
    
    if (property) {
      // Update cache with new data
      await this.cache.setProperty(property.id, property);
      
      // Invalidate search cache since data changed
      await this.cache.invalidateSearchCache();
    }

    return property;
  }

  // Override delete with cache invalidation
  async delete(id: number): Promise<boolean> {
    const deleted = await super.delete(id);
    
    if (deleted) {
      // Remove from cache
      await Promise.all([
        this.cache.invalidateProperty(id),
        this.cache.invalidateSearchCache(),
        this.cache.invalidateStats()
      ]);
    }

    return deleted;
  }

  // Override findMany with caching
  async findMany(
    filters: PropertyFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Property>> {
    // Generate cache key for this search
    const searchKey = this.cache.generateSearchKey(filters, pagination);
    
    // Try to get from cache first
    const cached = await this.cache.getSearchResults(searchKey);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const result = await super.findMany(filters, pagination);
    
    // Cache the result
    await this.cache.setSearchResults(searchKey, result);

    return result;
  }

  // Override search with caching
  async search(
    searchQuery: string,
    filters: PropertyFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Property>> {
    // Generate cache key for this search (include search query)
    const searchParams = { ...filters, searchQuery };
    const searchKey = this.cache.generateSearchKey(searchParams, pagination, 'search');
    
    // Try to get from cache first
    const cached = await this.cache.getSearchResults(searchKey);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const result = await super.search(searchQuery, filters, pagination);
    
    // Cache the result
    await this.cache.setSearchResults(searchKey, result);

    return result;
  }

  // Override getStats with caching
  async getStats(): Promise<PropertyStats> {
    // Try to get from cache first
    const cached = await this.cache.getStats();
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const stats = await super.getStats();
    
    // Cache the result
    await this.cache.setStats(stats);

    return stats;
  }

  // Override upsert with cache invalidation
  async upsert(propertyData: CreatePropertyInput): Promise<Property> {
    const property = await super.upsert(propertyData);
    
    // Cache the property
    await this.cache.setProperty(property.id, property);
    
    // Invalidate search cache and stats
    await Promise.all([
      this.cache.invalidateSearchCache(),
      this.cache.invalidateStats()
    ]);

    return property;
  }

  // Override createMany with cache invalidation
  async createMany(properties: CreatePropertyInput[]): Promise<Property[]> {
    const createdProperties = await super.createMany(properties);
    
    // Cache all created properties
    const cachePromises = createdProperties.map(property => 
      this.cache.setProperty(property.id, property)
    );
    
    // Invalidate search cache and stats
    await Promise.all([
      ...cachePromises,
      this.cache.invalidateSearchCache(),
      this.cache.invalidateStats()
    ]);

    return createdProperties;
  }

  // Additional cache management methods
  async warmupCache(propertyIds: number[]): Promise<void> {
    const promises = propertyIds.map(async (id) => {
      const cached = await this.cache.getProperty(id);
      if (!cached) {
        const property = await super.findById(id);
        if (property) {
          await this.cache.setProperty(id, property);
        }
      }
    });

    await Promise.all(promises);
  }

  async clearCache(): Promise<void> {
    await this.cache.flushAll();
  }

  async getCacheInfo(): Promise<any> {
    return this.cache.getInfo();
  }
}