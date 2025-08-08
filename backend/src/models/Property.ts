// Property data model and interfaces
// Re-export shared types for backward compatibility

export {
  Property,
  PropertyData,
  TranslatedPropertyData,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyFilters,
  PaginationParams,
  PaginatedResponse,
  PropertyStats,
  SearchCriteria,
  PropertyType,
  TranslationStatus,
  ValidationResult,
  NormalizedPropertyData,
  SortField
} from '../../../shared/src/types';

export {
  validatePropertyData,
  validateCreatePropertyInput,
  validateUpdatePropertyInput,
  normalizePropertyData,
  normalizePropertyType,
  normalizePrice,
  normalizeSize,
  normalizeLocation,
  normalizeImages,
  propertyDataToCreateInput,
  translatedPropertyDataToCreateInput,
  isValidUrl,
  sanitizeString,
  isValidPrice,
  isValidSize
} from '../../../shared/src/utils';