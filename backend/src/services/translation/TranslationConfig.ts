/**
 * Configuration interface for the translation service
 */
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of cached items
  keyPrefix: string; // Prefix for cache keys
}

/**
 * Configuration class for the translation service
 */
export class TranslationConfig {
  public readonly googleCloudProjectId: string;
  public readonly googleCloudKeyFile?: string | undefined;
  public readonly redisUrl: string;
  public readonly batchSize: number;
  public readonly batchDelayMs: number;
  public readonly fallbackEnabled: boolean;
  public readonly cacheConfig: CacheConfig;

  constructor() {
    // Google Cloud Translation API configuration
    this.googleCloudProjectId = process.env['GOOGLE_CLOUD_PROJECT_ID'] || '';
    this.googleCloudKeyFile = process.env['GOOGLE_CLOUD_KEY_FILE'];

    // Redis configuration
    this.redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

    // Batch processing configuration
    const batchSizeStr = process.env['TRANSLATION_BATCH_SIZE'] || '10';
    this.batchSize = parseInt(batchSizeStr, 10) || 10;
    const batchDelayStr = process.env['TRANSLATION_BATCH_DELAY_MS'] || '1000';
    this.batchDelayMs = parseInt(batchDelayStr, 10) || 1000;

    // Fallback configuration
    this.fallbackEnabled = process.env['TRANSLATION_FALLBACK_ENABLED'] === 'true';

    // Cache configuration
    const cacheTtlStr = process.env['TRANSLATION_CACHE_TTL'] || '86400';
    const cacheMaxSizeStr = process.env['TRANSLATION_CACHE_MAX_SIZE'] || '10000';
    this.cacheConfig = {
      ttl: parseInt(cacheTtlStr, 10) || 86400, // 24 hours default
      maxSize: parseInt(cacheMaxSizeStr, 10) || 10000,
      keyPrefix: process.env['TRANSLATION_CACHE_PREFIX'] || 'translation:',
    };

    this.validateConfig();
  }

  /**
   * Validate the configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    if (!this.googleCloudProjectId) {
      errors.push('GOOGLE_CLOUD_PROJECT_ID is required');
    }

    if (!process.env['REDIS_URL']) {
      errors.push('REDIS_URL is required');
    }

    const batchSizeEnv = process.env['TRANSLATION_BATCH_SIZE'];
    if (batchSizeEnv && parseInt(batchSizeEnv, 10) <= 0) {
      errors.push('TRANSLATION_BATCH_SIZE must be greater than 0');
    }

    const batchDelayEnv = process.env['TRANSLATION_BATCH_DELAY_MS'];
    if (batchDelayEnv && parseInt(batchDelayEnv, 10) < 0) {
      errors.push('TRANSLATION_BATCH_DELAY_MS must be non-negative');
    }

    const cacheTtlEnv = process.env['TRANSLATION_CACHE_TTL'];
    if (cacheTtlEnv && parseInt(cacheTtlEnv, 10) <= 0) {
      errors.push('TRANSLATION_CACHE_TTL must be greater than 0');
    }

    const cacheMaxSizeEnv = process.env['TRANSLATION_CACHE_MAX_SIZE'];
    if (cacheMaxSizeEnv && parseInt(cacheMaxSizeEnv, 10) <= 0) {
      errors.push('TRANSLATION_CACHE_MAX_SIZE must be greater than 0');
    }

    if (errors.length > 0) {
      throw new Error(`Translation configuration errors: ${errors.join(', ')}`);
    }
  }

  /**
   * Get configuration summary for logging
   */
  public getSummary(): Record<string, any> {
    return {
      googleCloudProjectId: this.googleCloudProjectId,
      hasKeyFile: !!this.googleCloudKeyFile,
      redisUrl: this.redisUrl.replace(/\/\/.*@/, '//***@'), // Hide credentials
      batchSize: this.batchSize,
      batchDelayMs: this.batchDelayMs,
      fallbackEnabled: this.fallbackEnabled,
      cacheConfig: this.cacheConfig,
    };
  }
}