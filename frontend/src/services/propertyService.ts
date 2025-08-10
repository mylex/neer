import api from './api';

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
}

export interface PropertyResponse {
  properties: Property[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchCriteria extends PropertyFilters {
  query?: string;
  sortBy?: 'price' | 'size' | 'listingDate' | 'location';
  sortOrder?: 'asc' | 'desc';
}

// Property API service
export const propertyService = {
  // Get properties with pagination and filtering
  async getProperties(filters: PropertyFilters = {}): Promise<PropertyResponse> {
    const response = await api.get('/properties', { params: filters });
    return response.data;
  },

  // Get a single property by ID
  async getProperty(id: number): Promise<Property> {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  // Search properties with advanced criteria
  async searchProperties(criteria: SearchCriteria): Promise<PropertyResponse> {
    const response = await api.get('/properties/search', { params: criteria });
    return response.data;
  },

  // Get system statistics
  async getSystemStats(): Promise<any> {
    const response = await api.get('/stats');
    return response.data;
  },
};

export default propertyService;