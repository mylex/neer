import api from './api';
import { ApiError, parseApiError } from '../utils/errorUtils';

// Types for API responses
export interface Property {
  id: number;
  url: string;
  title: string;
  titleEn?: string;
  price: number;
  location: string;
  locationEn?: string;
  sizeSqm: number;
  propertyType: string;
  description: string;
  descriptionEn?: string;
  images: string[];
  listingDate: string;
  sourceWebsite: string;
  translationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  propertyType?: string;
  minSize?: number;
  maxSize?: number;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'size' | 'listingDate' | 'location';
  sortOrder?: 'asc' | 'desc';
}

export interface PropertyResponse {
  properties: Property[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchCriteria extends PropertyFilters {
  query?: string;
  sortBy: 'price' | 'size' | 'listingDate' | 'location';
  sortOrder: 'asc' | 'desc';
}

export interface SystemStats {
  totalProperties: number;
  recentlyAdded: number;
  translationStatus: {
    complete: number;
    partial: number;
    pending: number;
  };
  sourceWebsites: Record<string, number>;
  lastUpdated: string;
}

// Enhanced property API service with error handling
export const propertyService = {
  // Get properties with pagination and filtering
  async getProperties(filters: PropertyFilters = {}): Promise<PropertyResponse> {
    try {
      const response = await api.get('/properties', { params: filters });
      return response.data;
    } catch (error) {
      const apiError = parseApiError(error);
      throw new Error(`Failed to fetch properties: ${apiError.message}`);
    }
  },

  // Get a single property by ID
  async getProperty(id: number): Promise<Property> {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      const apiError = parseApiError(error);
      if (apiError.status === 404) {
        throw new Error('Property not found');
      }
      throw new Error(`Failed to fetch property: ${apiError.message}`);
    }
  },

  // Search properties with advanced criteria
  async searchProperties(criteria: SearchCriteria): Promise<PropertyResponse> {
    try {
      const response = await api.get('/properties/search', { params: criteria });
      return response.data;
    } catch (error) {
      const apiError = parseApiError(error);
      throw new Error(`Failed to search properties: ${apiError.message}`);
    }
  },

  // Get system statistics with graceful degradation
  async getSystemStats(): Promise<SystemStats> {
    try {
      const response = await api.get('/stats');
      return response.data;
    } catch (error) {
      const apiError = parseApiError(error);
      // Return default stats if API fails
      console.warn('Failed to fetch system stats, returning defaults:', apiError.message);
      return {
        totalProperties: 0,
        recentlyAdded: 0,
        translationStatus: {
          complete: 0,
          partial: 0,
          pending: 0,
        },
        sourceWebsites: {},
        lastUpdated: new Date().toISOString(),
      };
    }
  },

  // Health check endpoint
  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string }> {
    try {
      const response = await api.get('/monitoring/health');
      return response.data;
    } catch (error) {
      const apiError = parseApiError(error);
      return {
        status: 'unhealthy',
        message: apiError.message,
      };
    }
  },
};

export default propertyService;