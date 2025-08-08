// Shared utility functions for data validation and normalization

import Joi from 'joi';
import {
  PropertyData,
  TranslatedPropertyData,
  CreatePropertyInput,
  PropertyType,
  TranslationStatus,
  ValidationResult,
  NormalizedPropertyData
} from '../types';

// Joi validation schemas
const propertyDataSchema = Joi.object({
  url: Joi.string().uri().required(),
  title: Joi.string().min(1).max(500).required(),
  price: Joi.number().positive().optional(),
  location: Joi.string().min(1).max(200).required(),
  size: Joi.number().positive().optional(),
  propertyType: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(5000).optional(),
  images: Joi.array().items(Joi.string().uri()).default([]),
  listingDate: Joi.date().optional(),
  sourceWebsite: Joi.string().min(1).max(100).required()
});

const createPropertyInputSchema = Joi.object({
  url: Joi.string().uri().required(),
  title: Joi.string().min(1).max(500).required(),
  titleEn: Joi.string().min(1).max(500).optional(),
  price: Joi.number().positive().optional(),
  location: Joi.string().min(1).max(200).required(),
  locationEn: Joi.string().min(1).max(200).optional(),
  sizeSqm: Joi.number().positive().optional(),
  propertyType: Joi.string().valid(...Object.values(PropertyType)).optional(),
  description: Joi.string().max(5000).optional(),
  descriptionEn: Joi.string().max(5000).optional(),
  images: Joi.array().items(Joi.string().uri()).default([]),
  listingDate: Joi.date().optional(),
  sourceWebsite: Joi.string().min(1).max(100).required(),
  translationStatus: Joi.string().valid(...Object.values(TranslationStatus)).optional()
});

const updatePropertyInputSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  url: Joi.string().uri().optional(),
  title: Joi.string().min(1).max(500).optional(),
  titleEn: Joi.string().min(1).max(500).optional(),
  price: Joi.number().positive().optional(),
  location: Joi.string().min(1).max(200).optional(),
  locationEn: Joi.string().min(1).max(200).optional(),
  sizeSqm: Joi.number().positive().optional(),
  propertyType: Joi.string().valid(...Object.values(PropertyType)).optional(),
  description: Joi.string().max(5000).optional(),
  descriptionEn: Joi.string().max(5000).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  listingDate: Joi.date().optional(),
  sourceWebsite: Joi.string().min(1).max(100).optional(),
  translationStatus: Joi.string().valid(...Object.values(TranslationStatus)).optional()
});

// Validation functions
export function validatePropertyData(data: any): ValidationResult {
  const { error, warning } = propertyDataSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false 
  });
  
  return {
    isValid: !error,
    errors: error ? error.details.map(detail => detail.message) : [],
    warnings: warning ? warning.details.map(detail => detail.message) : []
  };
}

export function validateCreatePropertyInput(data: any): ValidationResult {
  const { error, warning } = createPropertyInputSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false 
  });
  
  return {
    isValid: !error,
    errors: error ? error.details.map(detail => detail.message) : [],
    warnings: warning ? warning.details.map(detail => detail.message) : []
  };
}

export function validateUpdatePropertyInput(data: any): ValidationResult {
  const { error, warning } = updatePropertyInputSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false 
  });
  
  return {
    isValid: !error,
    errors: error ? error.details.map(detail => detail.message) : [],
    warnings: warning ? warning.details.map(detail => detail.message) : []
  };
}

// Data normalization functions
export function normalizePropertyType(propertyType: string): PropertyType {
  const normalized = propertyType.toLowerCase().trim();
  
  // Map common Japanese property types to our enum
  const typeMapping: Record<string, PropertyType> = {
    'アパート': PropertyType.APARTMENT,
    'apartment': PropertyType.APARTMENT,
    'マンション': PropertyType.MANSION,
    'mansion': PropertyType.MANSION,
    '一戸建て': PropertyType.HOUSE,
    '戸建て': PropertyType.HOUSE,
    'house': PropertyType.HOUSE,
    '土地': PropertyType.LAND,
    'land': PropertyType.LAND,
    '一軒家': PropertyType.HOUSE,
    'detached house': PropertyType.HOUSE
  };
  
  return typeMapping[normalized] || PropertyType.OTHER;
}

export function normalizePrice(price: number | string | undefined): number | undefined {
  if (price === undefined || price === null) return undefined;
  
  const numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) : price;
  
  if (isNaN(numPrice) || numPrice <= 0) return undefined;
  
  // Convert to JPY if needed (assuming input might be in 万円)
  // If price is less than 10000, assume it's in 万円 (10,000 JPY units)
  return numPrice < 10000 ? numPrice * 10000 : numPrice;
}

export function normalizeSize(size: number | string | undefined): number | undefined {
  if (size === undefined || size === null) return undefined;
  
  const numSize = typeof size === 'string' ? parseFloat(size.replace(/[^\d.]/g, '')) : size;
  
  if (isNaN(numSize) || numSize <= 0) return undefined;
  
  return numSize;
}

export function normalizeLocation(location: string): string {
  return location.trim().replace(/\s+/g, ' ');
}

export function normalizeImages(images: string[] | undefined): string[] {
  if (!images || !Array.isArray(images)) return [];
  
  return images
    .filter(img => typeof img === 'string' && img.trim().length > 0)
    .map(img => img.trim())
    .filter((img, index, arr) => arr.indexOf(img) === index); // Remove duplicates
}

export function normalizePropertyData(data: PropertyData): NormalizedPropertyData {
  return {
    ...data,
    normalizedPrice: normalizePrice(data.price),
    normalizedSize: normalizeSize(data.size),
    normalizedPropertyType: normalizePropertyType(data.propertyType),
    normalizedLocation: normalizeLocation(data.location),
    images: normalizeImages(data.images)
  };
}

// Data transformation functions
export function propertyDataToCreateInput(data: PropertyData): CreatePropertyInput {
  const normalized = normalizePropertyData(data);
  
  return {
    url: data.url,
    title: data.title,
    price: normalized.normalizedPrice,
    location: normalized.normalizedLocation,
    sizeSqm: normalized.normalizedSize,
    propertyType: normalized.normalizedPropertyType,
    description: data.description,
    images: normalized.images,
    listingDate: data.listingDate,
    sourceWebsite: data.sourceWebsite,
    translationStatus: TranslationStatus.PENDING
  };
}

export function translatedPropertyDataToCreateInput(data: TranslatedPropertyData): CreatePropertyInput {
  const baseInput = propertyDataToCreateInput(data);
  
  return {
    ...baseInput,
    titleEn: data.titleEn,
    locationEn: data.locationEn,
    descriptionEn: data.descriptionEn,
    translationStatus: data.translationStatus
  };
}

// Utility functions for data integrity
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(str: string | undefined, maxLength: number = 1000): string | undefined {
  if (str === undefined || str === null) return undefined;
  
  const trimmed = str.trim();
  if (trimmed === '') return '';
  
  return trimmed.substring(0, maxLength);
}

export function isValidPrice(price: number | undefined): boolean {
  return price !== undefined && price > 0 && price < 1000000000; // Max 1 billion JPY
}

export function isValidSize(size: number | undefined): boolean {
  return size !== undefined && size > 0 && size < 10000; // Max 10,000 sqm
}

// Export validation schemas for external use
export { propertyDataSchema, createPropertyInputSchema, updatePropertyInputSchema };