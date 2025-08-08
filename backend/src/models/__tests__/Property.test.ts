// Unit tests for Property model re-exports

import {
  Property,
  PropertyData,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyType,
  TranslationStatus,
  validatePropertyData,
  validateCreatePropertyInput,
  normalizePropertyData,
  propertyDataToCreateInput
} from '../Property';

describe('Property Model Re-exports', () => {
  test('should re-export all types correctly', () => {
    // Test that enums are available
    expect(PropertyType.APARTMENT).toBe('apartment');
    expect(TranslationStatus.PENDING).toBe('pending');
  });

  test('should re-export validation functions', () => {
    const validData = {
      url: 'https://example.com/property/123',
      title: 'Test Property',
      location: 'Tokyo, Japan',
      propertyType: 'apartment',
      images: [],
      sourceWebsite: 'example.com'
    };

    const result = validatePropertyData(validData);
    expect(result.isValid).toBe(true);
    expect(typeof validateCreatePropertyInput).toBe('function');
  });

  test('should re-export normalization functions', () => {
    const propertyData: PropertyData = {
      url: 'https://example.com/property/123',
      title: 'Test Property',
      price: 5000,
      location: 'Tokyo, Japan',
      size: 50,
      propertyType: 'apartment',
      images: [],
      sourceWebsite: 'example.com'
    };

    const normalized = normalizePropertyData(propertyData);
    expect(normalized.normalizedPrice).toBe(50000000);
    
    const createInput = propertyDataToCreateInput(propertyData);
    expect(createInput.translationStatus).toBe(TranslationStatus.PENDING);
  });

  test('should work with TypeScript interfaces', () => {
    const property: Property = {
      id: 1,
      url: 'https://example.com/property/123',
      title: 'Test Property',
      titleEn: 'Test Property EN',
      price: 50000000,
      location: 'Tokyo, Japan',
      locationEn: 'Tokyo, Japan EN',
      sizeSqm: 50,
      propertyType: PropertyType.APARTMENT,
      description: 'A nice apartment',
      descriptionEn: 'A nice apartment EN',
      images: ['https://example.com/image1.jpg'],
      listingDate: new Date(),
      sourceWebsite: 'example.com',
      translationStatus: TranslationStatus.COMPLETE,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(property.id).toBe(1);
    expect(property.propertyType).toBe(PropertyType.APARTMENT);
    expect(property.translationStatus).toBe(TranslationStatus.COMPLETE);
  });

  test('should work with create and update inputs', () => {
    const createInput: CreatePropertyInput = {
      url: 'https://example.com/property/123',
      title: 'Test Property',
      location: 'Tokyo, Japan',
      propertyType: PropertyType.APARTMENT,
      sourceWebsite: 'example.com'
    };

    const updateInput: UpdatePropertyInput = {
      id: 1,
      titleEn: 'Updated Title',
      translationStatus: TranslationStatus.COMPLETE
    };

    expect(createInput.propertyType).toBe(PropertyType.APARTMENT);
    expect(updateInput.translationStatus).toBe(TranslationStatus.COMPLETE);
  });
});