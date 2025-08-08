import { TranslationConfig } from '../TranslationConfig';

describe('TranslationConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create config with default values', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      const config = new TranslationConfig();

      expect(config.googleCloudProjectId).toBe('test-project');
      expect(config.redisUrl).toBe('redis://localhost:6379');
      expect(config.batchSize).toBe(10);
      expect(config.batchDelayMs).toBe(1000);
      expect(config.fallbackEnabled).toBe(false);
      expect(config.cacheConfig.ttl).toBe(86400);
      expect(config.cacheConfig.maxSize).toBe(10000);
      expect(config.cacheConfig.keyPrefix).toBe('translation:');
    });

    it('should use environment variables when provided', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'custom-project';
      process.env['GOOGLE_CLOUD_KEY_FILE'] = '/path/to/key.json';
      process.env['REDIS_URL'] = 'redis://custom:6379';
      process.env['TRANSLATION_BATCH_SIZE'] = '20';
      process.env['TRANSLATION_BATCH_DELAY_MS'] = '2000';
      process.env['TRANSLATION_FALLBACK_ENABLED'] = 'true';
      process.env['TRANSLATION_CACHE_TTL'] = '7200';
      process.env['TRANSLATION_CACHE_MAX_SIZE'] = '5000';
      process.env['TRANSLATION_CACHE_PREFIX'] = 'custom:';

      const config = new TranslationConfig();

      expect(config.googleCloudProjectId).toBe('custom-project');
      expect(config.googleCloudKeyFile).toBe('/path/to/key.json');
      expect(config.redisUrl).toBe('redis://custom:6379');
      expect(config.batchSize).toBe(20);
      expect(config.batchDelayMs).toBe(2000);
      expect(config.fallbackEnabled).toBe(true);
      expect(config.cacheConfig.ttl).toBe(7200);
      expect(config.cacheConfig.maxSize).toBe(5000);
      expect(config.cacheConfig.keyPrefix).toBe('custom:');
    });

    it('should handle missing optional environment variables', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      // GOOGLE_CLOUD_KEY_FILE is optional
      delete process.env['GOOGLE_CLOUD_KEY_FILE'];

      const config = new TranslationConfig();

      expect(config.googleCloudProjectId).toBe('test-project');
      expect(config.googleCloudKeyFile).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should throw error when GOOGLE_CLOUD_PROJECT_ID is missing', () => {
      delete process.env['GOOGLE_CLOUD_PROJECT_ID'];
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      expect(() => new TranslationConfig()).toThrow('GOOGLE_CLOUD_PROJECT_ID is required');
    });

    it('should throw error when REDIS_URL is missing', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      delete process.env['REDIS_URL'];

      expect(() => new TranslationConfig()).toThrow('REDIS_URL is required');
    });

    it('should throw error when batch size is invalid', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_BATCH_SIZE'] = '0';

      expect(() => new TranslationConfig()).toThrow('TRANSLATION_BATCH_SIZE must be greater than 0');
    });

    it('should throw error when batch delay is negative', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_BATCH_DELAY_MS'] = '-100';

      expect(() => new TranslationConfig()).toThrow('TRANSLATION_BATCH_DELAY_MS must be non-negative');
    });

    it('should throw error when cache TTL is invalid', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_CACHE_TTL'] = '0';

      expect(() => new TranslationConfig()).toThrow('TRANSLATION_CACHE_TTL must be greater than 0');
    });

    it('should throw error when cache max size is invalid', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_CACHE_MAX_SIZE'] = '-1';

      expect(() => new TranslationConfig()).toThrow('TRANSLATION_CACHE_MAX_SIZE must be greater than 0');
    });

    it('should throw multiple validation errors', () => {
      delete process.env['GOOGLE_CLOUD_PROJECT_ID'];
      delete process.env['REDIS_URL'];
      process.env['TRANSLATION_BATCH_SIZE'] = '0';

      expect(() => new TranslationConfig()).toThrow('Translation configuration errors: GOOGLE_CLOUD_PROJECT_ID is required, REDIS_URL is required, TRANSLATION_BATCH_SIZE must be greater than 0');
    });
  });

  describe('getSummary', () => {
    it('should return configuration summary', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['GOOGLE_CLOUD_KEY_FILE'] = '/path/to/key.json';
      process.env['REDIS_URL'] = 'redis://user:pass@localhost:6379';

      const config = new TranslationConfig();
      const summary = config.getSummary();

      expect(summary['googleCloudProjectId']).toBe('test-project');
      expect(summary['hasKeyFile']).toBe(true);
      expect(summary['redisUrl']).toBe('redis://***@localhost:6379'); // Credentials hidden
      expect(summary['batchSize']).toBe(10);
      expect(summary['batchDelayMs']).toBe(1000);
      expect(summary['fallbackEnabled']).toBe(false);
      expect(summary['cacheConfig']).toEqual({
        ttl: 86400,
        maxSize: 10000,
        keyPrefix: 'translation:',
      });
    });

    it('should handle missing key file in summary', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      delete process.env['GOOGLE_CLOUD_KEY_FILE'];

      const config = new TranslationConfig();
      const summary = config.getSummary();

      expect(summary['hasKeyFile']).toBe(false);
    });

    it('should hide credentials in Redis URL', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://username:password@redis.example.com:6379/0';

      const config = new TranslationConfig();
      const summary = config.getSummary();

      expect(summary['redisUrl']).toBe('redis://***@redis.example.com:6379/0');
    });

    it('should not modify Redis URL without credentials', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      const config = new TranslationConfig();
      const summary = config.getSummary();

      expect(summary['redisUrl']).toBe('redis://localhost:6379');
    });
  });

  describe('type parsing', () => {
    it('should parse integer environment variables correctly', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_BATCH_SIZE'] = '15';
      process.env['TRANSLATION_BATCH_DELAY_MS'] = '500';
      process.env['TRANSLATION_CACHE_TTL'] = '3600';
      process.env['TRANSLATION_CACHE_MAX_SIZE'] = '2000';

      const config = new TranslationConfig();

      expect(typeof config.batchSize).toBe('number');
      expect(typeof config.batchDelayMs).toBe('number');
      expect(typeof config.cacheConfig.ttl).toBe('number');
      expect(typeof config.cacheConfig.maxSize).toBe('number');
      expect(config.batchSize).toBe(15);
      expect(config.batchDelayMs).toBe(500);
      expect(config.cacheConfig.ttl).toBe(3600);
      expect(config.cacheConfig.maxSize).toBe(2000);
    });

    it('should parse boolean environment variables correctly', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_FALLBACK_ENABLED'] = 'true';

      const config = new TranslationConfig();

      expect(typeof config.fallbackEnabled).toBe('boolean');
      expect(config.fallbackEnabled).toBe(true);
    });

    it('should handle invalid integer values gracefully', () => {
      process.env['GOOGLE_CLOUD_PROJECT_ID'] = 'test-project';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['TRANSLATION_BATCH_SIZE'] = 'invalid';

      const config = new TranslationConfig();

      expect(config.batchSize).toBe(10); // Should fall back to default
    });
  });
});