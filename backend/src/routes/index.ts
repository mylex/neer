import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { propertyRepository } from '../database/repositories/PropertyRepository';
import { validatePagination } from '../middleware';
import { PropertyFilters, PropertyType, TranslationStatus, SortField } from '../models/Property';

const router = express.Router();

// Helper function to safely access query parameters
const getQueryParam = (req: Request, key: string): string | undefined => {
  return req.query[key] as string | undefined;
};

// Helper function to validate and parse numeric parameters
const parseNumericParam = (value: string | undefined, paramName: string): { value?: number; error?: string } => {
  if (!value) return {};
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < 0) {
    return { error: `Invalid ${paramName}: must be a positive number` };
  }
  return { value: parsed };
};

// Helper function to validate sort parameters
const validateSortParams = (sortBy?: string, sortOrder?: string): { sortBy: SortField; sortOrder: 'ASC' | 'DESC' } => {
  const validSortFields: SortField[] = ['price', 'sizeSqm', 'listingDate', 'createdAt'];
  const validSortBy = sortBy && validSortFields.includes(sortBy as SortField) ? sortBy as SortField : 'createdAt';
  const validSortOrder = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { sortBy: validSortBy, sortOrder: validSortOrder };
};

// GET /api/properties - List properties with pagination
router.get('/properties', validatePagination, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.pagination!;
    const { sortBy, sortOrder } = validateSortParams(getQueryParam(req, 'sortBy'), getQueryParam(req, 'sortOrder'));

    // Build filters from query parameters with enhanced validation
    const filters: PropertyFilters = {};
    
    // Price range validation
    const minPriceResult = parseNumericParam(getQueryParam(req, 'minPrice'), 'minPrice');
    const maxPriceResult = parseNumericParam(getQueryParam(req, 'maxPrice'), 'maxPrice');
    
    if (minPriceResult.error) {
      res.status(400).json({
        error: {
          message: minPriceResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    if (maxPriceResult.error) {
      res.status(400).json({
        error: {
          message: maxPriceResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    const minPrice = minPriceResult.value;
    const maxPrice = maxPriceResult.value;
    
    if (minPrice !== undefined) filters.minPrice = minPrice;
    if (maxPrice !== undefined) filters.maxPrice = maxPrice;
    
    // Validate price range logic
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      res.status(400).json({
        error: {
          message: 'minPrice cannot be greater than maxPrice',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Location filter (trim whitespace)
    const location = getQueryParam(req, 'location')?.trim();
    if (location && location.length > 0) {
      filters.location = location;
    }
    
    // Property type validation
    const propertyType = getQueryParam(req, 'propertyType');
    if (propertyType) {
      if (Object.values(PropertyType).includes(propertyType as PropertyType)) {
        filters.propertyType = propertyType as PropertyType;
      } else {
        res.status(400).json({
          error: {
            message: `Invalid propertyType. Must be one of: ${Object.values(PropertyType).join(', ')}`,
            status: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }
    
    // Size range validation
    const minSizeResult = parseNumericParam(getQueryParam(req, 'minSize'), 'minSize');
    const maxSizeResult = parseNumericParam(getQueryParam(req, 'maxSize'), 'maxSize');
    
    if (minSizeResult.error) {
      res.status(400).json({
        error: {
          message: minSizeResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    if (maxSizeResult.error) {
      res.status(400).json({
        error: {
          message: maxSizeResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    const minSize = minSizeResult.value;
    const maxSize = maxSizeResult.value;
    
    if (minSize !== undefined) filters.minSize = minSize;
    if (maxSize !== undefined) filters.maxSize = maxSize;
    
    // Validate size range logic
    if (minSize !== undefined && maxSize !== undefined && minSize > maxSize) {
      res.status(400).json({
        error: {
          message: 'minSize cannot be greater than maxSize',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Source website filter
    const sourceWebsite = getQueryParam(req, 'sourceWebsite')?.trim();
    if (sourceWebsite && sourceWebsite.length > 0) {
      filters.sourceWebsite = sourceWebsite;
    }
    
    // Translation status validation
    const translationStatus = getQueryParam(req, 'translationStatus');
    if (translationStatus) {
      if (Object.values(TranslationStatus).includes(translationStatus as TranslationStatus)) {
        filters.translationStatus = translationStatus as TranslationStatus;
      } else {
        res.status(400).json({
          error: {
            message: `Invalid translationStatus. Must be one of: ${Object.values(TranslationStatus).join(', ')}`,
            status: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }

    const result = await propertyRepository.findMany(filters, {
      page,
      limit,
      sortBy,
      sortOrder
    });

    // Enhanced response with better messaging for empty results
    const appliedFiltersCount = Object.keys(filters).length;
    const response = {
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: filters,
      appliedFiltersCount,
      message: result.pagination.total === 0 
        ? appliedFiltersCount > 0 
          ? 'No properties found matching the specified criteria. Try adjusting your filters or search terms.'
          : 'No properties available in the database.'
        : `Found ${result.pagination.total} properties${appliedFiltersCount > 0 ? ' matching your criteria' : ''}.`
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/properties/search - Advanced search with filtering capabilities
router.get('/properties/search', validatePagination, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.pagination!;
    const searchQuery = getQueryParam(req, 'q')?.trim();
    const { sortBy, sortOrder } = validateSortParams(getQueryParam(req, 'sortBy'), getQueryParam(req, 'sortOrder'));

    // Enhanced search query validation
    if (!searchQuery || searchQuery.length === 0) {
      res.status(400).json({
        error: {
          message: 'Search query parameter "q" is required and cannot be empty',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (searchQuery.length < 2) {
      res.status(400).json({
        error: {
          message: 'Search query must be at least 2 characters long',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (searchQuery.length > 100) {
      res.status(400).json({
        error: {
          message: 'Search query cannot exceed 100 characters',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Build filters with same validation as properties endpoint
    const filters: PropertyFilters = {};
    
    // Price range validation
    const minPriceResult = parseNumericParam(getQueryParam(req, 'minPrice'), 'minPrice');
    const maxPriceResult = parseNumericParam(getQueryParam(req, 'maxPrice'), 'maxPrice');
    
    if (minPriceResult.error) {
      res.status(400).json({
        error: {
          message: minPriceResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    if (maxPriceResult.error) {
      res.status(400).json({
        error: {
          message: maxPriceResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    const minPrice = minPriceResult.value;
    const maxPrice = maxPriceResult.value;
    
    if (minPrice !== undefined) filters.minPrice = minPrice;
    if (maxPrice !== undefined) filters.maxPrice = maxPrice;
    
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      res.status(400).json({
        error: {
          message: 'minPrice cannot be greater than maxPrice',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Location filter
    const location = getQueryParam(req, 'location')?.trim();
    if (location && location.length > 0) {
      filters.location = location;
    }
    
    // Property type validation
    const propertyType = getQueryParam(req, 'propertyType');
    if (propertyType) {
      if (Object.values(PropertyType).includes(propertyType as PropertyType)) {
        filters.propertyType = propertyType as PropertyType;
      } else {
        res.status(400).json({
          error: {
            message: `Invalid propertyType. Must be one of: ${Object.values(PropertyType).join(', ')}`,
            status: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }
    
    // Size range validation
    const minSizeResult = parseNumericParam(getQueryParam(req, 'minSize'), 'minSize');
    const maxSizeResult = parseNumericParam(getQueryParam(req, 'maxSize'), 'maxSize');
    
    if (minSizeResult.error) {
      res.status(400).json({
        error: {
          message: minSizeResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    if (maxSizeResult.error) {
      res.status(400).json({
        error: {
          message: maxSizeResult.error,
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    const minSize = minSizeResult.value;
    const maxSize = maxSizeResult.value;
    
    if (minSize !== undefined) filters.minSize = minSize;
    if (maxSize !== undefined) filters.maxSize = maxSize;
    
    if (minSize !== undefined && maxSize !== undefined && minSize > maxSize) {
      res.status(400).json({
        error: {
          message: 'minSize cannot be greater than maxSize',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Source website filter
    const sourceWebsite = getQueryParam(req, 'sourceWebsite')?.trim();
    if (sourceWebsite && sourceWebsite.length > 0) {
      filters.sourceWebsite = sourceWebsite;
    }
    
    // Translation status validation
    const translationStatus = getQueryParam(req, 'translationStatus');
    if (translationStatus) {
      if (Object.values(TranslationStatus).includes(translationStatus as TranslationStatus)) {
        filters.translationStatus = translationStatus as TranslationStatus;
      } else {
        res.status(400).json({
          error: {
            message: `Invalid translationStatus. Must be one of: ${Object.values(TranslationStatus).join(', ')}`,
            status: 400,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }

    const result = await propertyRepository.search(searchQuery, filters, {
      page,
      limit,
      sortBy,
      sortOrder
    });

    // Enhanced response with better messaging for search results
    const appliedFiltersCount = Object.keys(filters).length;
    const response = {
      success: true,
      data: result.data,
      pagination: result.pagination,
      searchQuery: searchQuery,
      filters: filters,
      appliedFiltersCount,
      message: result.pagination.total === 0 
        ? `No properties found for "${searchQuery}"${appliedFiltersCount > 0 ? ' with the applied filters' : ''}. Try different search terms or adjust your filters.`
        : `Found ${result.pagination.total} properties matching "${searchQuery}"${appliedFiltersCount > 0 ? ' with your filters' : ''}.`
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/properties/clear-filters - Get all properties without any filters (supports clearing filters)
router.get('/properties/clear-filters', validatePagination, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.pagination!;
    const { sortBy, sortOrder } = validateSortParams(getQueryParam(req, 'sortBy'), getQueryParam(req, 'sortOrder'));

    // Get all properties without any filters
    const result = await propertyRepository.findMany({}, {
      page,
      limit,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      filters: {},
      message: `Showing all ${result.pagination.total} properties. Filters have been cleared.`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/properties/:id - Get detailed property view
router.get('/properties/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idParam = req.params['id'];
    if (!idParam) {
      res.status(400).json({
        error: {
          message: 'Property ID is required',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      res.status(400).json({
        error: {
          message: 'Invalid property ID. Must be a number.',
          status: 400,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const property = await propertyRepository.findById(id);
    
    if (!property) {
      res.status(404).json({
        error: {
          message: `Property with ID ${id} not found`,
          status: 404,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    next(error);
  }
});



// GET /api/stats - System statistics (bonus endpoint for monitoring)
router.get('/stats', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await propertyRepository.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

export { router as propertyRoutes };