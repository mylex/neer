import { PropertyRepository } from '../repositories/PropertyRepository';
import { CreatePropertyInput, TranslationStatus, PropertyType } from '../../models/Property';

// Mock the database connection
jest.mock('../../config/database', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn()
  }
}));

describe('PropertyRepository', () => {
  let repository: PropertyRepository;
  let mockDb: any;

  beforeEach(() => {
    repository = new PropertyRepository();
    mockDb = require('../../config/database').db;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new property successfully', async () => {
      const mockProperty: CreatePropertyInput = {
        url: 'https://example.com/property/1',
        title: 'Test Property',
        titleEn: 'Test Property English',
        price: 50000000,
        location: 'Tokyo',
        locationEn: 'Tokyo',
        sizeSqm: 50.5,
        propertyType: PropertyType.APARTMENT,
        description: 'Test description',
        descriptionEn: 'Test description English',
        images: ['image1.jpg', 'image2.jpg'],
        listingDate: new Date('2024-01-01'),
        sourceWebsite: 'test-site.com',
        translationStatus: TranslationStatus.COMPLETE
      };

      const mockResult = {
        rows: [{
          id: 1,
          url: mockProperty.url,
          title: mockProperty.title,
          title_en: mockProperty.titleEn,
          price: mockProperty.price,
          location: mockProperty.location,
          location_en: mockProperty.locationEn,
          size_sqm: mockProperty.sizeSqm,
          property_type: mockProperty.propertyType,
          description: mockProperty.description,
          description_en: mockProperty.descriptionEn,
          images: JSON.stringify(mockProperty.images),
          listing_date: mockProperty.listingDate,
          source_website: mockProperty.sourceWebsite,
          translation_status: mockProperty.translationStatus,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await repository.create(mockProperty);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO properties'),
        expect.arrayContaining([
          mockProperty.url,
          mockProperty.title,
          mockProperty.titleEn,
          mockProperty.price,
          mockProperty.location,
          mockProperty.locationEn,
          mockProperty.sizeSqm,
          mockProperty.propertyType,
          mockProperty.description,
          mockProperty.descriptionEn,
          JSON.stringify(mockProperty.images),
          mockProperty.listingDate,
          mockProperty.sourceWebsite,
          mockProperty.translationStatus
        ])
      );

      expect(result).toMatchObject({
        id: 1,
        url: mockProperty.url,
        title: mockProperty.title,
        titleEn: mockProperty.titleEn,
        price: mockProperty.price,
        images: mockProperty.images
      });
    });

    it('should handle database errors', async () => {
      const mockProperty: CreatePropertyInput = {
        url: 'https://example.com/property/1',
        title: 'Test Property',
        location: 'Tokyo',
        sourceWebsite: 'test-site.com'
      };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(mockProperty)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find property by ID', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          url: 'https://example.com/property/1',
          title: 'Test Property',
          title_en: 'Test Property English',
          price: '50000000',
          location: 'Tokyo',
          location_en: 'Tokyo',
          size_sqm: '50.5',
          property_type: 'apartment',
          description: 'Test description',
          description_en: 'Test description English',
          images: '["image1.jpg", "image2.jpg"]',
          listing_date: new Date('2024-01-01'),
          source_website: 'test-site.com',
          translation_status: 'complete',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await repository.findById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM properties WHERE id = $1',
        [1]
      );

      expect(result).toMatchObject({
        id: 1,
        url: 'https://example.com/property/1',
        title: 'Test Property',
        price: 50000000,
        images: ['image1.jpg', 'image2.jpg']
      });
    });

    it('should return null when property not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find properties with pagination', async () => {
      const mockCountResult = { rows: [{ total: '10' }] };
      const mockDataResult = {
        rows: [
          {
            id: 1,
            url: 'https://example.com/property/1',
            title: 'Test Property 1',
            title_en: null,
            price: '50000000',
            location: 'Tokyo',
            location_en: null,
            size_sqm: '50.5',
            property_type: 'apartment',
            description: 'Test description 1',
            description_en: null,
            images: '[]',
            listing_date: new Date('2024-01-01'),
            source_website: 'test-site.com',
            translation_status: 'pending',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const result = await repository.findMany(
        { minPrice: 40000000, maxPrice: 60000000 },
        { page: 1, limit: 5 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 5,
        total: 10,
        totalPages: 2,
        hasNext: true,
        hasPrev: false
      });
    });
  });

  describe('search', () => {
    it('should search properties with full-text search', async () => {
      const mockCountResult = { rows: [{ total: '5' }] };
      const mockDataResult = {
        rows: [
          {
            id: 1,
            url: 'https://example.com/property/1',
            title: 'Test Property',
            title_en: 'Test Property English',
            price: '50000000',
            location: 'Tokyo',
            location_en: 'Tokyo',
            size_sqm: '50.5',
            property_type: 'apartment',
            description: 'Test description',
            description_en: 'Test description English',
            images: '[]',
            listing_date: new Date('2024-01-01'),
            source_website: 'test-site.com',
            translation_status: 'complete',
            created_at: new Date(),
            updated_at: new Date(),
            search_rank: 0.5
          }
        ]
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const result = await repository.search(
        'apartment Tokyo',
        {},
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.title).toBe('Test Property');
    });
  });

  describe('getStats', () => {
    it('should return property statistics', async () => {
      const mockResult = {
        rows: [{
          total_properties: '100',
          translated_properties: '80',
          pending_translation: '15',
          failed_translation: '5',
          avg_price: '45000000.50',
          min_price: '10000000.00',
          max_price: '100000000.00',
          source_websites: '3',
          last_scraped: new Date('2024-01-01')
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await repository.getStats();

      expect(result).toMatchObject({
        totalProperties: 100,
        translatedProperties: 80,
        pendingTranslation: 15,
        failedTranslation: 5,
        avgPrice: 45000000.50,
        minPrice: 10000000.00,
        maxPrice: 100000000.00,
        sourceWebsites: 3
      });
    });
  });
});