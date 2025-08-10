import request from 'supertest';
import app from '../../index';
import { propertyRepository } from '../../database/repositories/PropertyRepository';
import { Property, PropertyType, TranslationStatus } from '../../models/Property';

// Mock the property repository
jest.mock('../../database/repositories/PropertyRepository');
const mockPropertyRepository = propertyRepository as jest.Mocked<typeof propertyRepository>;

describe('Property API Endpoints', () => {
  const mockProperty: Property = {
    id: 1,
    url: 'https://example.com/property/1',
    title: 'Test Property',
    titleEn: 'Test Property',
    price: 50000000,
    location: 'Tokyo',
    locationEn: 'Tokyo',
    sizeSqm: 50,
    propertyType: PropertyType.APARTMENT,
    description: 'A nice property',
    descriptionEn: 'A nice property',
    images: ['image1.jpg', 'image2.jpg'],
    listingDate: new Date('2024-01-01'),
    sourceWebsite: 'test-site',
    translationStatus: TranslationStatus.COMPLETE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  // Expected property with serialized dates for JSON comparison
  const expectedPropertyJson = {
    ...mockProperty,
    listingDate: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockPaginatedResponse = {
    data: [mockProperty],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/properties', () => {
    it('should return paginated properties list', async () => {
      mockPropertyRepository.findMany.mockResolvedValue(mockPaginatedResponse);

      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [expectedPropertyJson],
        pagination: mockPaginatedResponse.pagination,
        filters: {},
        appliedFiltersCount: 0,
        message: 'Found 1 properties.'
      });

      expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({}, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });

    it('should handle pagination parameters', async () => {
      mockPropertyRepository.findMany.mockResolvedValue(mockPaginatedResponse);

      await request(app)
        .get('/api/properties?page=2&limit=10')
        .expect(200);

      expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({}, {
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });

    it('should handle filter parameters', async () => {
      mockPropertyRepository.findMany.mockResolvedValue(mockPaginatedResponse);

      await request(app)
        .get('/api/properties?minPrice=1000000&maxPrice=10000000&location=Tokyo&propertyType=apartment')
        .expect(200);

      expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({
        minPrice: 1000000,
        maxPrice: 10000000,
        location: 'Tokyo',
        propertyType: PropertyType.APARTMENT
      }, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });

    it('should validate pagination parameters', async () => {
      const response1 = await request(app)
        .get('/api/properties?page=0')
        .expect(400);

      expect(response1.body.error.message).toBe('Page must be greater than 0');

      const response2 = await request(app)
        .get('/api/properties?limit=101')
        .expect(400);

      expect(response2.body.error.message).toBe('Limit must be between 1 and 100');
    });

    it('should validate price range parameters', async () => {
      const response1 = await request(app)
        .get('/api/properties?minPrice=-1000')
        .expect(400);

      expect(response1.body.error.message).toBe('Invalid minPrice: must be a positive number');

      const response2 = await request(app)
        .get('/api/properties?minPrice=10000000&maxPrice=5000000')
        .expect(400);

      expect(response2.body.error.message).toBe('minPrice cannot be greater than maxPrice');
    });

    it('should validate property type parameter', async () => {
      const response = await request(app)
        .get('/api/properties?propertyType=invalid')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid propertyType. Must be one of: apartment, house, mansion, land, other');
    });

    it('should validate size range parameters', async () => {
      const response = await request(app)
        .get('/api/properties?minSize=100&maxSize=50')
        .expect(400);

      expect(response.body.error.message).toBe('minSize cannot be greater than maxSize');
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property by ID', async () => {
      mockPropertyRepository.findById.mockResolvedValue(mockProperty);

      const response = await request(app)
        .get('/api/properties/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expectedPropertyJson
      });

      expect(mockPropertyRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent property', async () => {
      mockPropertyRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/properties/999')
        .expect(404);

      expect(response.body.error.message).toBe('Property with ID 999 not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid')
        .expect(400);

      expect(response.body.error.message).toBe('Invalid property ID. Must be a number.');
    });
  });

  describe('GET /api/properties/search', () => {
    it('should search properties with query', async () => {
      mockPropertyRepository.search.mockResolvedValue(mockPaginatedResponse);

      const response = await request(app)
        .get('/api/properties/search?q=apartment')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [expectedPropertyJson],
        pagination: mockPaginatedResponse.pagination,
        searchQuery: 'apartment',
        filters: {},
        appliedFiltersCount: 0,
        message: 'Found 1 properties matching "apartment".'
      });

      expect(mockPropertyRepository.search).toHaveBeenCalledWith('apartment', {}, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });

    it('should search with filters', async () => {
      mockPropertyRepository.search.mockResolvedValue(mockPaginatedResponse);

      await request(app)
        .get('/api/properties/search?q=apartment&minPrice=1000000&location=Tokyo')
        .expect(200);

      expect(mockPropertyRepository.search).toHaveBeenCalledWith('apartment', {
        minPrice: 1000000,
        location: 'Tokyo'
      }, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/properties/search')
        .expect(400);

      expect(response.body.error.message).toBe('Search query parameter "q" is required and cannot be empty');
    });

    it('should handle empty search query', async () => {
      const response = await request(app)
        .get('/api/properties/search?q=')
        .expect(400);

      expect(response.body.error.message).toBe('Search query parameter "q" is required and cannot be empty');
    });

    it('should validate search query length', async () => {
      const response1 = await request(app)
        .get('/api/properties/search?q=a')
        .expect(400);

      expect(response1.body.error.message).toBe('Search query must be at least 2 characters long');

      const longQuery = 'a'.repeat(101);
      const response2 = await request(app)
        .get('/api/properties/search?q=' + longQuery)
        .expect(400);

      expect(response2.body.error.message).toBe('Search query cannot exceed 100 characters');
    });
  });

  describe('GET /api/properties/clear-filters', () => {
    it('should return all properties without filters', async () => {
      mockPropertyRepository.findMany.mockResolvedValue(mockPaginatedResponse);

      const response = await request(app)
        .get('/api/properties/clear-filters')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [expectedPropertyJson],
        pagination: mockPaginatedResponse.pagination,
        filters: {},
        message: 'Showing all 1 properties. Filters have been cleared.'
      });

      expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({}, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      });
    });
  });

  describe('GET /api/stats', () => {
    it('should return system statistics', async () => {
      const mockStats = {
        totalProperties: 100,
        translatedProperties: 80,
        pendingTranslation: 15,
        failedTranslation: 5,
        avgPrice: 5000000,
        minPrice: 1000000,
        maxPrice: 20000000,
        sourceWebsites: 3,
        lastScraped: new Date('2024-01-01'),
        propertiesByType: {
          [PropertyType.APARTMENT]: 50,
          [PropertyType.HOUSE]: 30,
          [PropertyType.MANSION]: 15,
          [PropertyType.LAND]: 5,
          [PropertyType.OTHER]: 0
        }
      };

      const expectedStatsJson = {
        ...mockStats,
        lastScraped: '2024-01-01T00:00:00.000Z'
      };

      mockPropertyRepository.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expectedStatsJson
      });
    });
  });

  describe('Health check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });
});