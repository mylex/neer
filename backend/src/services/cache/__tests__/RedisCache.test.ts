import { RedisCache, CacheConfig } from '../RedisCache';

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushDb: jest.fn(),
  info: jest.fn(),
  on: jest.fn(),
};

// Mock the redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

// Mock SystemLogger
jest.mock('../../monitoring/SystemLogger', () => ({
  SystemLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

describe('RedisCache', () => {
  let redisCache: RedisCache;
  let config: CacheConfig;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 6379,
      ttl: {
        properties: 3600,
        search: 300,
        stats: 600,
      },
    };

    redisCache = new RedisCache(config);
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await redisCache.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(error);

      await expect(redisCache.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      mockRedisClient.disconnect.mockResolvedValue(undefined);

      await redisCache.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('property caching', () => {
    beforeEach(() => {
      // Mock connected state
      (redisCache as any).isConnected = true;
    });

    it('should get property from cache', async () => {
      const propertyData = { id: 1, title: 'Test Property' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(propertyData));

      const result = await redisCache.getProperty(1);

      expect(mockRedisClient.get).toHaveBeenCalledWith('property:1');
      expect(result).toEqual(propertyData);
    });

    it('should return null for cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisCache.getProperty(1);

      expect(result).toBeNull();
    });

    it('should set property in cache', async () => {
      const propertyData = { id: 1, title: 'Test Property' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisCache.setProperty(1, propertyData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'property:1',
        3600,
        JSON.stringify(propertyData)
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await redisCache.getProperty(1);

      expect(result).toBeNull();
    });
  });

  describe('search results caching', () => {
    beforeEach(() => {
      (redisCache as any).isConnected = true;
    });

    it('should get search results from cache', async () => {
      const searchResults = { data: [], total: 0 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(searchResults));

      const result = await redisCache.getSearchResults('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('search:test-key');
      expect(result).toEqual(searchResults);
    });

    it('should set search results in cache', async () => {
      const searchResults = { data: [], total: 0 };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisCache.setSearchResults('test-key', searchResults);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'search:test-key',
        300,
        JSON.stringify(searchResults)
      );
    });
  });

  describe('stats caching', () => {
    beforeEach(() => {
      (redisCache as any).isConnected = true;
    });

    it('should get stats from cache', async () => {
      const stats = { totalProperties: 100 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(stats));

      const result = await redisCache.getStats();

      expect(mockRedisClient.get).toHaveBeenCalledWith('stats:system');
      expect(result).toEqual(stats);
    });

    it('should set stats in cache', async () => {
      const stats = { totalProperties: 100 };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisCache.setStats(stats);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'stats:system',
        600,
        JSON.stringify(stats)
      );
    });
  });

  describe('cache invalidation', () => {
    beforeEach(() => {
      (redisCache as any).isConnected = true;
    });

    it('should invalidate property cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisCache.invalidateProperty(1);

      expect(mockRedisClient.del).toHaveBeenCalledWith('property:1');
    });

    it('should invalidate search cache', async () => {
      mockRedisClient.keys.mockResolvedValue(['search:key1', 'search:key2']);
      mockRedisClient.del.mockResolvedValue(2);

      await redisCache.invalidateSearchCache();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('search:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['search:key1', 'search:key2']);
    });

    it('should invalidate stats cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisCache.invalidateStats();

      expect(mockRedisClient.del).toHaveBeenCalledWith('stats:system');
    });
  });

  describe('generateSearchKey', () => {
    it('should generate consistent search keys', () => {
      const filters = { minPrice: 100, maxPrice: 500 };
      const pagination = { page: 1, limit: 20 };

      const key1 = redisCache.generateSearchKey(filters, pagination);
      const key2 = redisCache.generateSearchKey(filters, pagination);

      expect(key1).toBe(key2);
      expect(typeof key1).toBe('string');
    });

    it('should generate different keys for different parameters', () => {
      const filters1 = { minPrice: 100 };
      const filters2 = { minPrice: 200 };
      const pagination = { page: 1, limit: 20 };

      const key1 = redisCache.generateSearchKey(filters1, pagination);
      const key2 = redisCache.generateSearchKey(filters2, pagination);

      expect(key1).not.toBe(key2);
    });
  });

  describe('disconnected state', () => {
    beforeEach(() => {
      (redisCache as any).isConnected = false;
    });

    it('should return null when disconnected', async () => {
      const result = await redisCache.getProperty(1);
      expect(result).toBeNull();
    });

    it('should not throw when setting cache while disconnected', async () => {
      await expect(redisCache.setProperty(1, {})).resolves.not.toThrow();
    });
  });
});