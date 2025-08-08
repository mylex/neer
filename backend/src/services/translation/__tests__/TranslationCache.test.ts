import { TranslationCache } from '../TranslationCache';
import { CacheConfig } from '../TranslationConfig';

// Mock Redis
const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  exists: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mGet: jest.fn(),
  multi: jest.fn().mockReturnValue({
    setEx: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
};

describe('TranslationCache', () => {
  let cache: TranslationCache;
  let config: CacheConfig;

  beforeEach(() => {
    config = {
      ttl: 3600,
      maxSize: 1000,
      keyPrefix: 'translation:',
    };

    cache = new TranslationCache(mockRedisClient as any, config);
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value when it exists', async () => {
      mockRedisClient.get.mockResolvedValue('Cached Translation');

      const result = await cache.get('テスト');

      expect(result).toBe('Cached Translation');
      expect(mockRedisClient.get).toHaveBeenCalledWith(expect.stringContaining('translation:'));
    });

    it('should return null when value does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.get('テスト');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cache.get('テスト');

      expect(result).toBeNull();
    });

    it('should update hit/miss statistics', async () => {
      mockRedisClient.get.mockResolvedValueOnce('hit').mockResolvedValueOnce(null);

      await cache.get('test1'); // hit
      await cache.get('test2'); // miss

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.keys.mockResolvedValue([]);

      await cache.set('テスト', 'Test Translation');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('translation:'),
        3600,
        'Test Translation'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(cache.set('テスト', 'Test Translation')).resolves.not.toThrow();
    });

    it('should manage cache size when limit is exceeded', async () => {
      const largeConfig = { ...config, maxSize: 2 };
      cache = new TranslationCache(mockRedisClient as any, largeConfig);

      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedisClient.del.mockResolvedValue(1);

      await cache.set('テスト', 'Test Translation');

      expect(mockRedisClient.del).toHaveBeenCalledWith(['key1']);
    });
  });

  describe('has', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await cache.has('テスト');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await cache.has('テスト');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await cache.has('テスト');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key successfully', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cache.delete('テスト');

      expect(mockRedisClient.del).toHaveBeenCalledWith(expect.stringContaining('translation:'));
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(cache.delete('テスト')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      mockRedisClient.keys.mockResolvedValue(['translation:key1', 'translation:key2']);
      mockRedisClient.del.mockResolvedValue(2);

      await cache.clear();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('translation:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['translation:key1', 'translation:key2']);
    });

    it('should handle empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await cache.clear();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should reset statistics after clearing', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      mockRedisClient.get.mockResolvedValue('hit');

      // Generate some stats
      await cache.get('test');
      let stats = await cache.getStats();
      expect(stats.hits).toBe(1);

      // Clear cache
      await cache.clear();
      stats = await cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      mockRedisClient.keys.mockResolvedValue(['translation:key1', 'translation:key2']);
      mockRedisClient.get.mockResolvedValueOnce('hit').mockResolvedValueOnce(null);

      await cache.get('test1'); // hit
      await cache.get('test2'); // miss

      const stats = await cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(2);
    });

    it('should handle Redis errors in stats', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await cache.getStats();

      expect(stats.size).toBe(0);
    });
  });

  describe('getMultiple', () => {
    it('should get multiple values at once', async () => {
      mockRedisClient.mGet.mockResolvedValue(['Translation 1', null, 'Translation 3']);

      const result = await cache.getMultiple(['text1', 'text2', 'text3']);

      expect(result.get('text1')).toBe('Translation 1');
      expect(result.get('text2')).toBeNull();
      expect(result.get('text3')).toBe('Translation 3');
    });

    it('should update statistics correctly for multiple gets', async () => {
      mockRedisClient.mGet.mockResolvedValue(['hit', null, 'hit']);

      await cache.getMultiple(['text1', 'text2', 'text3']);

      const stats = await cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.mGet.mockRejectedValue(new Error('Redis error'));

      const result = await cache.getMultiple(['text1', 'text2']);

      expect(result.get('text1')).toBeNull();
      expect(result.get('text2')).toBeNull();
    });
  });

  describe('setMultiple', () => {
    it('should set multiple values at once', async () => {
      const translations = new Map([
        ['text1', 'Translation 1'],
        ['text2', 'Translation 2'],
      ]);

      mockRedisClient.keys.mockResolvedValue([]);

      await cache.setMultiple(translations);

      expect(mockRedisClient.multi).toHaveBeenCalled();
      const pipeline = mockRedisClient.multi();
      expect(pipeline.setEx).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const translations = new Map([['text1', 'Translation 1']]);
      mockRedisClient.multi.mockReturnValue({
        setEx: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error')),
      });

      await expect(cache.setMultiple(translations)).resolves.not.toThrow();
    });
  });

  describe('getHitRate', () => {
    it('should calculate hit rate correctly', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('hit')
        .mockResolvedValueOnce('hit')
        .mockResolvedValueOnce(null);

      await cache.get('test1'); // hit
      await cache.get('test2'); // hit
      await cache.get('test3'); // miss

      const hitRate = cache.getHitRate();
      expect(hitRate).toBeCloseTo(2/3);
    });

    it('should return 0 when no requests made', () => {
      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('key generation', () => {
    it('should generate consistent keys for same text', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await cache.get('同じテキスト');
      await cache.get('同じテキスト');

      expect(mockRedisClient.get).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.get).toHaveBeenNthCalledWith(1, expect.stringContaining('translation:'));
      expect(mockRedisClient.get).toHaveBeenNthCalledWith(2, expect.stringContaining('translation:'));
      
      // Both calls should use the same key
      const firstCall = mockRedisClient.get.mock.calls[0][0];
      const secondCall = mockRedisClient.get.mock.calls[1][0];
      expect(firstCall).toBe(secondCall);
    });

    it('should generate different keys for different text', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await cache.get('テキスト1');
      await cache.get('テキスト2');

      const firstCall = mockRedisClient.get.mock.calls[0][0];
      const secondCall = mockRedisClient.get.mock.calls[1][0];
      expect(firstCall).not.toBe(secondCall);
    });
  });
});