import { RedisClientType } from 'redis';
import { CacheConfig } from './TranslationConfig';
import { TranslationError } from './TranslationError';

/**
 * Translation cache implementation using Redis
 * Provides efficient caching for translated text to avoid redundant API calls
 */
export class TranslationCache {
  private redis: RedisClientType;
  private config: CacheConfig;
  private stats: { hits: number; misses: number };

  constructor(redisClient: RedisClientType, config: CacheConfig) {
    this.redis = redisClient;
    this.config = config;
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get a cached translation
   */
  async get(originalText: string): Promise<string | null> {
    try {
      const key = this.generateKey(originalText);
      const cachedValue = await this.redis.get(key);
      
      if (cachedValue) {
        this.stats.hits++;
        return cachedValue;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null; // Fail gracefully
    }
  }

  /**
   * Set a translation in the cache
   */
  async set(originalText: string, translatedText: string): Promise<void> {
    try {
      const key = this.generateKey(originalText);
      
      // Set with TTL
      await this.redis.setEx(key, this.config.ttl, translatedText);
      
      // Implement cache size management
      await this.manageCacheSize();
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw error to avoid breaking translation flow
    }
  }

  /**
   * Check if a translation exists in cache
   */
  async has(originalText: string): Promise<boolean> {
    try {
      const key = this.generateKey(originalText);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  /**
   * Delete a specific translation from cache
   */
  async delete(originalText: string): Promise<void> {
    try {
      const key = this.generateKey(originalText);
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all translation cache
   */
  async clear(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      
      // Reset stats
      this.stats = { hits: 0, misses: 0 };
    } catch (error) {
      console.error('Cache clear error:', error);
      throw new TranslationError('Failed to clear translation cache', error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ hits: number; misses: number; size: number }> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: keys.length,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: 0,
      };
    }
  }

  /**
   * Get multiple cached translations at once
   */
  async getMultiple(originalTexts: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    try {
      const keys = originalTexts.map(text => this.generateKey(text));
      const values = await this.redis.mGet(keys);
      
      originalTexts.forEach((text, index) => {
        const value = values[index];
        results.set(text, value || null);
        
        if (value) {
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      // Return empty results for all texts
      originalTexts.forEach(text => {
        results.set(text, null);
        this.stats.misses++;
      });
    }
    
    return results;
  }

  /**
   * Set multiple translations at once
   */
  async setMultiple(translations: Map<string, string>): Promise<void> {
    try {
      const pipeline = this.redis.multi();
      
      translations.forEach((translatedText, originalText) => {
        const key = this.generateKey(originalText);
        pipeline.setEx(key, this.config.ttl, translatedText);
      });
      
      await pipeline.exec();
      await this.manageCacheSize();
    } catch (error) {
      console.error('Cache setMultiple error:', error);
    }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Generate cache key for original text
   */
  private generateKey(originalText: string): string {
    // Create a hash of the original text to handle long texts and special characters
    const hash = this.simpleHash(originalText);
    return `${this.config.keyPrefix}${hash}`;
  }

  /**
   * Simple hash function for generating cache keys
   */
  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Manage cache size to prevent unlimited growth
   */
  private async manageCacheSize(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > this.config.maxSize) {
        // Remove oldest entries (simple FIFO approach)
        const keysToRemove = keys.slice(0, keys.length - this.config.maxSize);
        if (keysToRemove.length > 0) {
          await this.redis.del(keysToRemove);
        }
      }
    } catch (error) {
      console.error('Cache size management error:', error);
    }
  }
}