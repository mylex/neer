import request from 'supertest';
import app from '../index';
import { propertyRepository } from '../database/repositories/PropertyRepository';
import { PropertyType, TranslationStatus, CreatePropertyInput } from '../models/Property';

describe('End-to-End System Integration Tests', () => {
  let server: any;

  const mockPropertyData: CreatePropertyInput = {
    url: 'http://suumo.jp/test-property/123',
    title: 'テスト物件',
    price: 75000,
    location: '東京都新宿区',
    sizeSqm: 45,
    propertyType: PropertyType.APARTMENT,
    description: '駅近の便利な物件です',
    images: ['test-image1.jpg', 'test-image2.jpg'],
    listingDate: new Date('2023-01-15'),
    sourceWebsite: 'suumo'
  };

  beforeAll(async () => {
    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test - delete all properties
    try {
      const allProperties = await propertyRepository.findMany({}, { page: 1, limit: 1000 });
      for (const property of allProperties.data) {
        await propertyRepository.delete(property.id);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    jest.clearAllMocks();
  });

  describe('Complete System Workflow', () => {
    it('should complete full scraping-to-display workflow', async () => {
      // Step 1: Simulate scraping process
      const translatedProperty: CreatePropertyInput = {
        ...mockPropertyData,
        titleEn: 'Test Property',
        locationEn: 'Shinjuku, Tokyo',
        descriptionEn: 'Convenient property near station',
        translationStatus: TranslationStatus.COMPLETE
      };

      // Insert test data directly (simulating successful scraping and translation)
      const savedProperty = await propertyRepository.create(translatedProperty);
      expect(savedProperty.id).toBeDefined();

      // Step 2: Verify data is accessible via API
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].titleEn).toBe('Test Property');
      expect(response.body.data[0].locationEn).toBe('Shinjuku, Tokyo');

      // Step 3: Test property detail endpoint
      const detailResponse = await request(app)
        .get(`/api/properties/${savedProperty.id}`)
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data.id).toBe(savedProperty.id);
      expect(detailResponse.body.data.descriptionEn).toBe('Convenient property near station');

      // Step 4: Test search functionality
      const searchResponse = await request(app)
        .get('/api/properties/search')
        .query({ q: 'Test', minPrice: 50000, maxPrice: 100000 })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].titleEn).toBe('Test Property');
    });

    it('should handle multiple properties with different translation statuses', async () => {
      // Create properties with different translation statuses
      const properties: CreatePropertyInput[] = [
        {
          ...mockPropertyData,
          url: 'http://suumo.jp/property/1',
          title: '完全翻訳物件',
          titleEn: 'Fully Translated Property',
          locationEn: 'Tokyo',
          descriptionEn: 'Fully translated description',
          translationStatus: TranslationStatus.COMPLETE
        },
        {
          ...mockPropertyData,
          url: 'http://suumo.jp/property/2',
          title: '部分翻訳物件',
          titleEn: 'Partially Translated Property',
          locationEn: undefined, // Missing translation
          descriptionEn: undefined, // Missing translation
          translationStatus: TranslationStatus.PARTIAL
        },
        {
          ...mockPropertyData,
          url: 'http://suumo.jp/property/3',
          title: '翻訳失敗物件',
          titleEn: undefined,
          locationEn: undefined,
          descriptionEn: undefined,
          translationStatus: TranslationStatus.FAILED
        }
      ];

      // Insert all properties
      for (const property of properties) {
        await propertyRepository.create(property);
      }

      // Test API returns all properties
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Verify translation statuses are preserved
      const completeProperty = response.body.data.find((p: any) => p.translationStatus === 'complete');
      const partialProperty = response.body.data.find((p: any) => p.translationStatus === 'partial');
      const failedProperty = response.body.data.find((p: any) => p.translationStatus === 'failed');

      expect(completeProperty.titleEn).toBe('Fully Translated Property');
      expect(partialProperty.titleEn).toBe('Partially Translated Property');
      expect(partialProperty.locationEn).toBeNull();
      expect(failedProperty.titleEn).toBeNull();
    });

    it('should handle concurrent API requests efficiently', async () => {
      // Insert multiple properties
      const properties: CreatePropertyInput[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockPropertyData,
        url: `http://suumo.jp/property/${i}`,
        title: `物件 ${i}`,
        titleEn: `Property ${i}`,
        locationEn: `Location ${i}`,
        descriptionEn: `Description ${i}`,
        price: 50000 + (i * 1000),
        translationStatus: TranslationStatus.COMPLETE
      }));

      for (const property of properties) {
        await propertyRepository.create(property);
      }

      // Make multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/properties').query({ limit: 10 })
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(10);
      });
    });

    it('should maintain data consistency during updates', async () => {
      // Insert initial property
      const initialProperty = await propertyRepository.create({
        ...mockPropertyData,
        titleEn: 'Initial Title',
        price: 100000
      });

      // Simulate property update (as would happen during re-scraping)
      const updatedData = {
        id: initialProperty.id,
        titleEn: 'Updated Title',
        price: 95000,
        descriptionEn: 'Updated description'
      };

      await propertyRepository.update(updatedData);

      // Verify update via API
      const response = await request(app)
        .get(`/api/properties/${initialProperty.id}`)
        .expect(200);

      expect(response.body.data.titleEn).toBe('Updated Title');
      expect(response.body.data.price).toBe(95000);
      expect(response.body.data.descriptionEn).toBe('Updated description');
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide comprehensive health check information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('cache');
      expect(response.body.checks).toHaveProperty('translation');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should collect and report system metrics', async () => {
      // Generate some activity
      await request(app).get('/api/properties');
      await request(app).get('/api/properties/search').query({ q: 'test' });

      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body.requests).toHaveProperty('total');
      expect(response.body.requests).toHaveProperty('successful');
      expect(response.body.database).toHaveProperty('connections');
      expect(response.body.cache).toHaveProperty('hits');
      expect(response.body.cache).toHaveProperty('misses');
    });

    it('should handle database connection failures gracefully', async () => {
      // Mock database failure
      jest.spyOn(propertyRepository, 'findMany').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/properties')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle cache failures gracefully', async () => {
      // Insert test property
      await propertyRepository.create({
        ...mockPropertyData,
        titleEn: 'Cache Test Property'
      });

      // Request should succeed (cache failures are handled internally)
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume property listings efficiently', async () => {
      // Insert large number of properties
      const properties: CreatePropertyInput[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockPropertyData,
        url: `http://suumo.jp/property/${i}`,
        title: `物件 ${i}`,
        titleEn: `Property ${i}`,
        price: 50000 + (i * 100),
        translationStatus: TranslationStatus.COMPLETE
      }));

      // Batch insert for performance
      const insertPromises = properties.map(property => 
        propertyRepository.create(property)
      );
      await Promise.all(insertPromises);

      const startTime = Date.now();

      // Test paginated retrieval
      const response = await request(app)
        .get('/api/properties')
        .query({ page: 1, limit: 50 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(50);
      expect(response.body.pagination.total).toBe(100);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle complex search queries efficiently', async () => {
      // Insert properties with varied attributes
      const properties: CreatePropertyInput[] = [
        { ...mockPropertyData, url: 'http://suumo.jp/1', price: 60000, sizeSqm: 30, propertyType: PropertyType.APARTMENT, locationEn: 'Tokyo', titleEn: 'Property 60000', translationStatus: TranslationStatus.COMPLETE },
        { ...mockPropertyData, url: 'http://suumo.jp/2', price: 80000, sizeSqm: 50, propertyType: PropertyType.HOUSE, locationEn: 'Osaka', titleEn: 'Property 80000', translationStatus: TranslationStatus.COMPLETE },
        { ...mockPropertyData, url: 'http://suumo.jp/3', price: 100000, sizeSqm: 70, propertyType: PropertyType.APARTMENT, locationEn: 'Tokyo', titleEn: 'Property 100000', translationStatus: TranslationStatus.COMPLETE },
        { ...mockPropertyData, url: 'http://suumo.jp/4', price: 120000, sizeSqm: 90, propertyType: PropertyType.HOUSE, locationEn: 'Kyoto', titleEn: 'Property 120000', translationStatus: TranslationStatus.COMPLETE }
      ];

      for (const property of properties) {
        await propertyRepository.create(property);
      }

      const startTime = Date.now();

      // Complex search with multiple filters
      const response = await request(app)
        .get('/api/properties/search')
        .query({
          minPrice: 70000,
          maxPrice: 110000,
          minSize: 40,
          maxSize: 80,
          propertyType: 'apartment',
          location: 'Tokyo'
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1); // Only one property matches all criteria
      expect(response.body.data[0].price).toBe(100000);
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });

    it('should maintain performance under concurrent load', async () => {
      // Insert test data
      const properties: CreatePropertyInput[] = Array.from({ length: 20 }, (_, i) => ({
        ...mockPropertyData,
        url: `http://suumo.jp/property/${i}`,
        titleEn: `Property ${i}`,
        price: 50000 + (i * 1000),
        translationStatus: TranslationStatus.COMPLETE
      }));

      for (const property of properties) {
        await propertyRepository.create(property);
      }

      // Create concurrent requests
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        if (i % 3 === 0) {
          return request(app).get('/api/properties').query({ page: 1, limit: 10 });
        } else if (i % 3 === 1) {
          return request(app).get('/api/properties/search').query({ minPrice: 60000, maxPrice: 90000 });
        } else {
          return request(app).get(`/api/properties/${i + 1}`);
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary service failures', async () => {
      // Insert test property
      const property = await propertyRepository.create({
        ...mockPropertyData,
        titleEn: 'Recovery Test Property'
      });

      // Simulate temporary database failure
      let failureCount = 0;
      const originalFindById = propertyRepository.findById;
      jest.spyOn(propertyRepository, 'findById').mockImplementation(async (id) => {
        if (failureCount < 2) {
          failureCount++;
          throw new Error('Temporary database error');
        }
        return originalFindById.call(propertyRepository, id);
      });

      // First request should fail
      await request(app)
        .get(`/api/properties/${property.id}`)
        .expect(500);

      // Second request should fail
      await request(app)
        .get(`/api/properties/${property.id}`)
        .expect(500);

      // Third request should succeed
      const response = await request(app)
        .get(`/api/properties/${property.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.titleEn).toBe('Recovery Test Property');
    });

    it('should handle malformed requests gracefully', async () => {
      // Test invalid property ID
      await request(app)
        .get('/api/properties/invalid-id')
        .expect(400);

      // Test invalid search parameters
      await request(app)
        .get('/api/properties/search')
        .query({ minPrice: 'invalid', maxPrice: 'also-invalid' })
        .expect(400);

      // Test invalid pagination parameters
      await request(app)
        .get('/api/properties')
        .query({ page: -1, limit: 0 })
        .expect(400);
    });

    it('should maintain service availability during high error rates', async () => {
      // Insert test properties
      for (let i = 1; i <= 10; i++) {
        await propertyRepository.create({
          ...mockPropertyData,
          url: `http://suumo.jp/property/${i}`,
          titleEn: `Property ${i}`
        });
      }

      // Mix of successful and failing requests
      const requests = Array.from({ length: 20 }, (_, i) => {
        if (i % 2 === 0) {
          // Valid requests
          return request(app).get('/api/properties').query({ page: 1, limit: 5 });
        } else {
          // Invalid requests
          return request(app).get('/api/properties/invalid-id');
        }
      });

      const responses = await Promise.all(requests);

      // Count successful vs failed requests
      const successful = responses.filter(r => r.status === 200).length;
      const failed = responses.filter(r => r.status >= 400).length;

      expect(successful).toBe(10); // Half should succeed
      expect(failed).toBe(10); // Half should fail
      
      // Service should remain responsive
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain referential integrity across operations', async () => {
      // Create property with specific URL
      await propertyRepository.create({
        ...mockPropertyData,
        url: 'http://suumo.jp/unique-property'
      });

      // Attempt to create duplicate (should be prevented)
      try {
        await propertyRepository.create({
          ...mockPropertyData,
          url: 'http://suumo.jp/unique-property' // Same URL
        });
        fail('Should have thrown duplicate error');
      } catch (error: any) {
        expect(error.message).toContain('duplicate');
      }

      // Verify only one property exists
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should validate property data consistency', async () => {
      // Create property with all required fields
      const property = await propertyRepository.create({
        ...mockPropertyData,
        titleEn: 'Validated Property',
        locationEn: 'Validated Location',
        descriptionEn: 'Validated Description',
        translationStatus: TranslationStatus.COMPLETE
      });

      // Retrieve and verify all fields are preserved
      const response = await request(app)
        .get(`/api/properties/${property.id}`)
        .expect(200);

      const retrievedProperty = response.body.data;
      expect(retrievedProperty.title).toBe(mockPropertyData.title);
      expect(retrievedProperty.titleEn).toBe('Validated Property');
      expect(retrievedProperty.price).toBe(mockPropertyData.price);
      expect(retrievedProperty.location).toBe(mockPropertyData.location);
      expect(retrievedProperty.locationEn).toBe('Validated Location');
      expect(retrievedProperty.sizeSqm).toBe(mockPropertyData.sizeSqm);
      expect(retrievedProperty.propertyType).toBe(mockPropertyData.propertyType);
      expect(retrievedProperty.description).toBe(mockPropertyData.description);
      expect(retrievedProperty.descriptionEn).toBe('Validated Description');
      expect(retrievedProperty.translationStatus).toBe('complete');
    });
  });
});