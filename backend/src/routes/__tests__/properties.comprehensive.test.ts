import request from 'supertest';
import express from 'express';
import { propertyRoutes } from '../index';
import { propertyRepository } from '../../database/repositories/PropertyRepository';
import { PropertyType, TranslationStatus } from '../../models/Property';

// Mock the repository
jest.mock('../../database/repositories/PropertyRepository');

const app = express();
app.use(express.json());
app.use('/api', propertyRoutes);

// Add error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
    res.status(500).json({
        error: {
            message: error.message,
            status: 500,
            timestamp: new Date().toISOString()
        }
    });
});

describe('Properties API Endpoints - Comprehensive Tests', () => {
    let mockPropertyRepository: jest.Mocked<typeof propertyRepository>;

    const mockProperty = {
        id: 1,
        url: 'http://suumo.jp/property/123',
        title: '東京のアパート',
        titleEn: 'Tokyo Apartment',
        price: 100000,
        location: '東京都渋谷区',
        locationEn: 'Shibuya, Tokyo',
        sizeSqm: 50,
        propertyType: PropertyType.APARTMENT,
        description: '駅から徒歩5分の便利な立地',
        descriptionEn: 'Convenient location 5 minutes walk from station',
        images: ['image1.jpg', 'image2.jpg'],
        listingDate: new Date('2023-01-01'),
        sourceWebsite: 'suumo',
        translationStatus: TranslationStatus.COMPLETE,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPropertyRepository = propertyRepository as jest.Mocked<typeof propertyRepository>;
    });

    describe('GET /api/properties', () => {
        describe('successful requests', () => {
            it('should return properties with default pagination', async () => {
                const mockResult = {
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
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

                const response = await request(app)
                    .get('/api/properties')
                    .expect(200);

                expect(response.body).toEqual({
                    success: true,
                    data: [mockProperty],
                    pagination: mockResult.pagination,
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

            it('should handle custom pagination parameters', async () => {
                const mockResult = {
                    data: [mockProperty],
                    pagination: {
                        page: 2,
                        limit: 10,
                        total: 25,
                        totalPages: 3,
                        hasNext: true,
                        hasPrev: true
                    }
                };
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

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

            it('should apply price range filters', async () => {
                const mockResult = {
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
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

                await request(app)
                    .get('/api/properties?minPrice=50000&maxPrice=150000')
                    .expect(200);

                expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({
                    minPrice: 50000,
                    maxPrice: 150000
                }, expect.any(Object));
            });

            it('should apply multiple filters simultaneously', async () => {
                const mockResult = {
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
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

                await request(app)
                    .get('/api/properties?minPrice=50000&maxPrice=150000&location=Tokyo&propertyType=apartment')
                    .expect(200);

                expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({
                    minPrice: 50000,
                    maxPrice: 150000,
                    location: 'Tokyo',
                    propertyType: PropertyType.APARTMENT
                }, expect.any(Object));
            });
        });
        describe('validation errors', () => {
            it('should return 400 for invalid minPrice', async () => {
                const response = await request(app)
                    .get('/api/properties?minPrice=invalid')
                    .expect(400);

                expect(response.body.error.message).toContain('Invalid minPrice');
            });

            it('should return 400 for negative price values', async () => {
                const response = await request(app)
                    .get('/api/properties?minPrice=-100')
                    .expect(400);

                expect(response.body.error.message).toContain('Invalid minPrice');
            });

            it('should return 400 when minPrice > maxPrice', async () => {
                const response = await request(app)
                    .get('/api/properties?minPrice=200000&maxPrice=100000')
                    .expect(400);

                expect(response.body.error.message).toBe('minPrice cannot be greater than maxPrice');
            });

            it('should return 400 for invalid property type', async () => {
                const response = await request(app)
                    .get('/api/properties?propertyType=invalid')
                    .expect(400);

                expect(response.body.error.message).toContain('Invalid propertyType');
            });

            it('should return 400 when minSize > maxSize', async () => {
                const response = await request(app)
                    .get('/api/properties?minSize=100&maxSize=50')
                    .expect(400);

                expect(response.body.error.message).toBe('minSize cannot be greater than maxSize');
            });

            it('should return 400 for invalid translation status', async () => {
                const response = await request(app)
                    .get('/api/properties?translationStatus=invalid')
                    .expect(400);

                expect(response.body.error.message).toContain('Invalid translationStatus');
            });
        });

        describe('edge cases', () => {
            it('should handle empty results with filters', async () => {
                const mockResult = {
                    data: [],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                };
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

                const response = await request(app)
                    .get('/api/properties?location=NonExistent')
                    .expect(200);

                expect(response.body.message).toContain('No properties found matching the specified criteria');
            });

            it('should trim whitespace from location filter', async () => {
                const mockResult = {
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
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

                await request(app)
                    .get('/api/properties?location=  Tokyo  ')
                    .expect(200);

                expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({
                    location: 'Tokyo'
                }, expect.any(Object));
            });

            it('should ignore empty location filter', async () => {
                const mockResult = {
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
                mockPropertyRepository.findMany.mockResolvedValue(mockResult);

                await request(app)
                    .get('/api/properties?location=')
                    .expect(200);

                expect(mockPropertyRepository.findMany).toHaveBeenCalledWith({}, expect.any(Object));
            });
        });
    });
    describe('GET /api/properties/search', () => {
        describe('successful searches', () => {
            it('should perform basic search', async () => {
                const mockResult = {
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
                mockPropertyRepository.search.mockResolvedValue(mockResult);

                const response = await request(app)
                    .get('/api/properties/search?q=apartment')
                    .expect(200);

                expect(response.body).toEqual({
                    success: true,
                    data: [mockProperty],
                    pagination: mockResult.pagination,
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
                const mockResult = {
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
                mockPropertyRepository.search.mockResolvedValue(mockResult);

                await request(app)
                    .get('/api/properties/search?q=apartment&minPrice=50000&location=Tokyo')
                    .expect(200);

                expect(mockPropertyRepository.search).toHaveBeenCalledWith('apartment', {
                    minPrice: 50000,
                    location: 'Tokyo'
                }, expect.any(Object));
            });
        });

        describe('search validation', () => {
            it('should return 400 for missing search query', async () => {
                const response = await request(app)
                    .get('/api/properties/search')
                    .expect(400);

                expect(response.body.error.message).toBe('Search query parameter "q" is required and cannot be empty');
            });

            it('should return 400 for empty search query', async () => {
                const response = await request(app)
                    .get('/api/properties/search?q=')
                    .expect(400);

                expect(response.body.error.message).toBe('Search query parameter "q" is required and cannot be empty');
            });

            it('should return 400 for search query too short', async () => {
                const response = await request(app)
                    .get('/api/properties/search?q=a')
                    .expect(400);

                expect(response.body.error.message).toBe('Search query must be at least 2 characters long');
            });

            it('should return 400 for search query too long', async () => {
                const longQuery = 'a'.repeat(101);
                const response = await request(app)
                    .get(`/api/properties/search?q=${longQuery}`)
                    .expect(400);

                expect(response.body.error.message).toBe('Search query cannot exceed 100 characters');
            });
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
                data: mockProperty
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

    describe('GET /api/stats', () => {
        it('should return system statistics', async () => {
            const mockStats = {
                totalProperties: 100,
                translatedProperties: 80,
                pendingTranslation: 15,
                failedTranslation: 5,
                avgPrice: 85000,
                minPrice: 50000,
                maxPrice: 200000,
                sourceWebsites: 3,
                lastScraped: new Date('2023-01-01'),
                propertiesByType: {
                    [PropertyType.APARTMENT]: 60,
                    [PropertyType.HOUSE]: 30,
                    [PropertyType.MANSION]: 10,
                    [PropertyType.LAND]: 0,
                    [PropertyType.OTHER]: 0
                }
            };
            mockPropertyRepository.getStats.mockResolvedValue(mockStats);

            const response = await request(app)
                .get('/api/stats')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockStats
            });
        });
    });

    describe('error handling', () => {
        it('should handle repository errors gracefully', async () => {
            mockPropertyRepository.findMany.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/properties')
                .expect(500);

            expect(response.body.error.message).toBe('Database connection failed');
        });

        it('should handle search repository errors', async () => {
            mockPropertyRepository.search.mockRejectedValue(new Error('Search index unavailable'));

            const response = await request(app)
                .get('/api/properties/search?q=apartment')
                .expect(500);

            expect(response.body.error.message).toBe('Search index unavailable');
        });
    });
});