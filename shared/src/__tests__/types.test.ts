// Unit tests for type definitions and interfaces

import {
  PropertyType,
  TranslationStatus,
  PropertyData,
  TranslatedPropertyData,
  CreatePropertyInput,
  UpdatePropertyInput
} from '../types';

describe('PropertyType enum', () => {
  test('should have correct values', () => {
    expect(PropertyType.APARTMENT).toBe('apartment');
    expect(PropertyType.HOUSE).toBe('house');
    expect(PropertyType.MANSION).toBe('mansion');
    expect(PropertyType.LAND).toBe('land');
    expect(PropertyType.OTHER).toBe('other');
  });

  test('should have all expected property types', () => {
    const expectedTypes = ['apartment', 'house', 'mansion', 'land', 'other'];
    const actualTypes = Object.values(PropertyType);
    expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
    expect(actualTypes).toHaveLength(expectedTypes.length);
  });
});

describe('TranslationStatus enum', () => {
  test('should have correct values', () => {
    expect(TranslationStatus.PENDING).toBe('pending');
    expect(TranslationStatus.COMPLETE).toBe('complete');
    expect(TranslationStatus.PARTIAL).toBe('partial');
    expect(TranslationStatus.FAILED).toBe('failed');
  });

  test('should have all expected translation statuses', () => {
    const expectedStatuses = ['pending', 'complete', 'partial', 'failed'];
    const actualStatuses = Object.values(TranslationStatus);
    expect(actualStatuses).toEqual(expect.arrayContaining(expectedStatuses));
    expect(actualStatuses).toHaveLength(expectedStatuses.length);
  });
});

describe('PropertyData interface', () => {
  test('should accept valid property data', () => {
    const validPropertyData: PropertyData = {
      url: 'https://example.com/property/123',
      title: 'Test Property',
      price: 50000000,
      location: 'Tokyo, Japan',
      size: 50,
      propertyType: 'apartment',
      description: 'A nice apartment',
      images: ['https://example.com/image1.jpg'],
      listingDate: new Date(),
      sourceWebsite: 'example.com'
    };

    expect(validPropertyData.url).toBe('https://example.com/property/123');
    expect(validPropertyData.title).toBe('Test Property');
    expect(validPropertyData.price).toBe(50000000);
    expect(validPropertyData.location).toBe('Tokyo, Japan');
    expect(validPropertyData.size).toBe(50);
    expect(validPropertyData.propertyType).toBe('apartment');
    expect(validPropertyData.description).toBe('A nice apartment');
    expect(validPropertyData.images).toEqual(['https://example.com/image1.jpg']);
    expect(validPropertyData.sourceWebsite).toBe('example.com');
  });

  test('should accept minimal property data', () => {
    const minimalPropertyData: PropertyData = {
      url: 'https://example.com/property/123',
      title: 'Test Property',
      location: 'Tokyo, Japan',
      propertyType: 'apartment',
      images: [],
      sourceWebsite: 'example.com'
    };

    expect(minimalPropertyData.url).toBe('https://example.com/property/123');
    expect(minimalPropertyData.title).toBe('Test Property');
    expect(minimalPropertyData.location).toBe('Tokyo, Japan');
    expect(minimalPropertyData.propertyType).toBe('apartment');
    expect(minimalPropertyData.images).toEqual([]);
    expect(minimalPropertyData.sourceWebsite).toBe('example.com');
  });
});

describe('TranslatedPropertyData interface', () => {
  test('should extend PropertyData with translation fields', () => {
    const translatedData: TranslatedPropertyData = {
      url: 'https://example.com/property/123',
      title: 'テストプロパティ',
      titleEn: 'Test Property',
      location: '東京、日本',
      locationEn: 'Tokyo, Japan',
      propertyType: 'apartment',
      description: '素敵なアパート',
      descriptionEn: 'A nice apartment',
      images: [],
      sourceWebsite: 'example.com',
      translationStatus: TranslationStatus.COMPLETE
    };

    expect(translatedData.titleEn).toBe('Test Property');
    expect(translatedData.locationEn).toBe('Tokyo, Japan');
    expect(translatedData.descriptionEn).toBe('A nice apartment');
    expect(translatedData.translationStatus).toBe(TranslationStatus.COMPLETE);
  });
});

describe('CreatePropertyInput interface', () => {
  test('should accept valid create input', () => {
    const createInput: CreatePropertyInput = {
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
      translationStatus: TranslationStatus.PENDING
    };

    expect(createInput.url).toBe('https://example.com/property/123');
    expect(createInput.propertyType).toBe(PropertyType.APARTMENT);
    expect(createInput.translationStatus).toBe(TranslationStatus.PENDING);
  });
});

describe('UpdatePropertyInput interface', () => {
  test('should accept valid update input', () => {
    const updateInput: UpdatePropertyInput = {
      id: 1,
      titleEn: 'Updated Title',
      price: 60000000,
      translationStatus: TranslationStatus.COMPLETE
    };

    expect(updateInput.id).toBe(1);
    expect(updateInput.titleEn).toBe('Updated Title');
    expect(updateInput.price).toBe(60000000);
    expect(updateInput.translationStatus).toBe(TranslationStatus.COMPLETE);
  });
});