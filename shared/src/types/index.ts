// Shared type definitions for Japanese Real Estate Scraper

// Core property data structure as scraped from websites
export interface PropertyData {
  url: string;
  title: string;
  price?: number | undefined;
  location: string;
  size?: number | undefined; // in square meters
  propertyType: string;
  description?: string | undefined;
  images: string[];
  listingDate?: Date | undefined;
  sourceWebsite: string;
}

// Translated property data with English versions
export interface TranslatedPropertyData extends PropertyData {
  titleEn?: string | undefined;
  locationEn?: string | undefined;
  descriptionEn?: string | undefined;
  translationStatus: TranslationStatus;
}

// Complete property model for database storage
export interface Property {
  id: number;
  url: string;
  title: string;
  titleEn?: string | undefined;
  price?: number | undefined;
  location: string;
  locationEn?: string | undefined;
  sizeSqm?: number | undefined;
  propertyType: PropertyType;
  description?: string | undefined;
  descriptionEn?: string | undefined;
  images: string[];
  listingDate?: Date | undefined;
  sourceWebsite: string;
  translationStatus: TranslationStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Enums for type safety
export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  MANSION = 'mansion',
  LAND = 'land',
  OTHER = 'other'
}

export enum TranslationStatus {
  PENDING = 'pending',
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  FAILED = 'failed'
}

// Input types for creating and updating properties
export interface CreatePropertyInput {
  url: string;
  title: string;
  titleEn?: string | undefined;
  price?: number | undefined;
  location: string;
  locationEn?: string | undefined;
  sizeSqm?: number | undefined;
  propertyType?: PropertyType | undefined;
  description?: string | undefined;
  descriptionEn?: string | undefined;
  images?: string[] | undefined;
  listingDate?: Date | undefined;
  sourceWebsite: string;
  translationStatus?: TranslationStatus | undefined;
}

export interface UpdatePropertyInput {
  id: number;
  url?: string | undefined;
  title?: string | undefined;
  titleEn?: string | undefined;
  price?: number | undefined;
  location?: string | undefined;
  locationEn?: string | undefined;
  sizeSqm?: number | undefined;
  propertyType?: PropertyType | undefined;
  description?: string | undefined;
  descriptionEn?: string | undefined;
  images?: string[] | undefined;
  listingDate?: Date | undefined;
  sourceWebsite?: string | undefined;
  translationStatus?: TranslationStatus | undefined;
}

// Search and filtering interfaces
export interface PropertyFilters {
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  propertyType?: PropertyType;
  minSize?: number;
  maxSize?: number;
  sourceWebsite?: string;
  translationStatus?: TranslationStatus;
  searchQuery?: string;
}

export interface SearchCriteria {
  query?: string;
  filters: PropertyFilters;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
}

export type SortField = 'price' | 'sizeSqm' | 'listingDate' | 'location' | 'createdAt';

// Pagination interfaces
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: SortField;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// System statistics and monitoring
export interface PropertyStats {
  totalProperties: number;
  translatedProperties: number;
  pendingTranslation: number;
  failedTranslation: number;
  avgPrice?: number | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sourceWebsites: number;
  lastScraped?: Date | undefined;
  propertiesByType: Record<PropertyType, number>;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Normalized property data for consistent processing
export interface NormalizedPropertyData extends PropertyData {
  normalizedPrice: number | undefined; // Price in JPY
  normalizedSize: number | undefined; // Size in square meters
  normalizedPropertyType: PropertyType;
  normalizedLocation: string;
}