import { Translate } from '@google-cloud/translate/build/src/v2';
import { createClient, RedisClientType } from 'redis';
import { PropertyData, TranslatedPropertyData, TranslationStatus } from '../../models/Property';
import { TranslationConfig } from './TranslationConfig';
import { TranslationCache } from './TranslationCache';
import { TranslationError } from './TranslationError';

/**
 * Translation service for converting Japanese property data to English
 * Implements caching, batch processing, and fallback mechanisms
 */
export class TranslationService {
  private translate: Translate;
  private cache: TranslationCache;
  private config: TranslationConfig;
  private redisClient: RedisClientType;

  constructor(config: TranslationConfig) {
    this.config = config;
    const translateConfig: any = {
      projectId: config.googleCloudProjectId,
    };
    if (config.googleCloudKeyFile) {
      translateConfig.keyFilename = config.googleCloudKeyFile;
    }
    this.translate = new Translate(translateConfig);
    
    // Initialize Redis client for caching
    this.redisClient = createClient({
      url: config.redisUrl,
      socket: {
        connectTimeout: 5000,
      },
    });

    this.cache = new TranslationCache(this.redisClient, config.cacheConfig);
    this.setupRedisErrorHandling();
  }

  /**
   * Initialize the translation service
   */
  async initialize(): Promise<void> {
    try {
      await this.redisClient.connect();
      console.log('Translation service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize translation service:', error);
      throw new TranslationError('Failed to initialize translation service', error as Error);
    }
  }

  /**
   * Translate a single property from Japanese to English
   */
  async translateProperty(property: PropertyData): Promise<TranslatedPropertyData> {
    try {
      const translatedProperty: TranslatedPropertyData = {
        ...property,
        translationStatus: TranslationStatus.PENDING,
      };

      // Translate title
      if (property.title) {
        translatedProperty.titleEn = await this.translateText(property.title);
      }

      // Translate location
      if (property.location) {
        translatedProperty.locationEn = await this.translateText(property.location);
      }

      // Translate description
      if (property.description) {
        translatedProperty.descriptionEn = await this.translateText(property.description);
      }

      // Determine translation status
      const hasTranslations = translatedProperty.titleEn || translatedProperty.locationEn || translatedProperty.descriptionEn;
      const hasAllTranslations = 
        (!property.title || translatedProperty.titleEn) &&
        (!property.location || translatedProperty.locationEn) &&
        (!property.description || translatedProperty.descriptionEn);

      if (hasAllTranslations) {
        translatedProperty.translationStatus = TranslationStatus.COMPLETE;
      } else if (hasTranslations) {
        translatedProperty.translationStatus = TranslationStatus.PARTIAL;
      } else {
        translatedProperty.translationStatus = TranslationStatus.FAILED;
      }

      return translatedProperty;
    } catch (error) {
      console.error('Error translating property:', error);
      return {
        ...property,
        translationStatus: TranslationStatus.FAILED,
      };
    }
  }

  /**
   * Translate multiple properties in batches for efficiency
   */
  async translateBatch(properties: PropertyData[]): Promise<TranslatedPropertyData[]> {
    const results: TranslatedPropertyData[] = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchPromises = batch.map(property => this.translateProperty(property));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const property = batch[index];
            if (property) {
              console.error(`Failed to translate property ${property.url}:`, result.reason);
              results.push({
                ...property,
                translationStatus: TranslationStatus.FAILED,
              });
            }
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < properties.length) {
          await this.delay(this.config.batchDelayMs);
        }
      } catch (error) {
        console.error('Batch translation error:', error);
        // Add failed translations for the entire batch
        batch.forEach(property => {
          results.push({
            ...property,
            translationStatus: TranslationStatus.FAILED,
          });
        });
      }
    }

    return results;
  }

  /**
   * Translate text with caching and fallback mechanisms
   */
  private async translateText(text: string): Promise<string | undefined> {
    if (!text || text.trim().length === 0) {
      return undefined;
    }

    try {
      // Check cache first
      const cachedTranslation = await this.cache.get(text);
      if (cachedTranslation) {
        return cachedTranslation;
      }

      // Translate using Google Translate API
      const [translation] = await this.translate.translate(text, {
        from: 'ja',
        to: 'en',
      });

      if (translation && translation.trim().length > 0) {
        // Cache the translation
        await this.cache.set(text, translation);
        return translation;
      }

      return undefined;
    } catch (error) {
      console.error('Translation error for text:', text, error);
      
      // Try fallback translation service if configured
      if (this.config.fallbackEnabled) {
        return await this.fallbackTranslate(text);
      }

      return undefined;
    }
  }

  /**
   * Fallback translation method (can be extended with alternative services)
   */
  private async fallbackTranslate(text: string): Promise<string | undefined> {
    try {
      // For now, return undefined - can be extended with Azure Translator or other services
      console.log('Fallback translation not implemented yet for:', text);
      return undefined;
    } catch (error) {
      console.error('Fallback translation failed:', error);
      return undefined;
    }
  }

  /**
   * Get cached translation without making API calls
   */
  async getCachedTranslation(text: string): Promise<string | null> {
    return await this.cache.get(text);
  }

  /**
   * Clear translation cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ hits: number; misses: number; size: number }> {
    return await this.cache.getStats();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.redisClient.quit();
      console.log('Translation service cleaned up successfully');
    } catch (error) {
      console.error('Error during translation service cleanup:', error);
    }
  }

  /**
   * Setup Redis error handling
   */
  private setupRedisErrorHandling(): void {
    this.redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    this.redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    this.redisClient.on('disconnect', () => {
      console.log('Redis client disconnected');
    });
  }

  /**
   * Utility method for adding delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}