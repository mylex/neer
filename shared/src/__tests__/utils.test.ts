// Unit tests for utility functions

import {
  validatePropertyData,
  validateCreatePropertyInput,
  validateUpdatePropertyInput,
  normalizePropertyType,
  normalizePrice,
  normalizeSize,
  normalizeLocation,
  normalizeImages,
  normalizePropertyData,
  propertyDataToCreateInput,
  translatedPropertyDataToCreateInput,
  isValidUrl,
  sanitizeString,
  isValidPrice,
  isValidSize
} from '../utils';

import {
  PropertyType,
  TranslationStatus,
  PropertyData,
  TranslatedPropertyData
} from '../types';

describe('Validation Functions', () => {
  describe('validatePropertyData', () => {
    test('should validate correct property data', () => {
      const validData = {
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

      const result = validatePropertyData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid URL', () => {
      const invalidData = {
        url: 'not-a-url',
        title: 'Test Property',
        location: 'Tokyo, Japan',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'example.com'
      };

      const result = validatePropertyData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('url'))).toBe(true);
    });

    test('should reject missing required fields', () => {
      const invalidData = {
        url: 'https://example.com/property/123',
        // missing title
        location: 'Tokyo, Japan',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'example.com'
      };

      const result = validatePropertyData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('title'))).toBe(true);
    });

    test('should reject negative price', () => {
      const invalidData = {
        url: 'https://example.com/property/123',
        title: 'Test Property',
        price: -1000,
        location: 'Tokyo, Japan',
        propertyType: 'apartment',
        images: [],
        sourceWebsite: 'example.com'
      };

      const result = validatePropertyData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('price'))).toBe(true);
    });
  });

  describe('validateCreatePropertyInput', () => {
    test('should validate correct create input', () => {
      const validInput = {
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

      const result = validateCreatePropertyInput(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid property type', () => {
      const invalidInput = {
        url: 'https://example.com/property/123',
        title: 'Test Property',
        location: 'Tokyo, Japan',
        propertyType: 'invalid-type',
        images: [],
        sourceWebsite: 'example.com'
      };

      const result = validateCreatePropertyInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('propertyType'))).toBe(true);
    });
  });

  describe('validateUpdatePropertyInput', () => {
    test('should validate correct update input', () => {
      const validInput = {
        id: 1,
        titleEn: 'Updated Title',
        price: 60000000,
        translationStatus: TranslationStatus.COMPLETE
      };

      const result = validateUpdatePropertyInput(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should require id field', () => {
      const invalidInput = {
        titleEn: 'Updated Title',
        price: 60000000
      };

      const result = validateUpdatePropertyInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('id'))).toBe(true);
    });
  });
});

describe('Normalization Functions', () => {
  describe('normalizePropertyType', () => {
    test('should normalize Japanese property types', () => {
      expect(normalizePropertyType('アパート')).toBe(PropertyType.APARTMENT);
      expect(normalizePropertyType('マンション')).toBe(PropertyType.MANSION);
      expect(normalizePropertyType('一戸建て')).toBe(PropertyType.HOUSE);
      expect(normalizePropertyType('土地')).toBe(PropertyType.LAND);
    });

    test('should normalize English property types', () => {
      expect(normalizePropertyType('apartment')).toBe(PropertyType.APARTMENT);
      expect(normalizePropertyType('house')).toBe(PropertyType.HOUSE);
      expect(normalizePropertyType('mansion')).toBe(PropertyType.MANSION);
      expect(normalizePropertyType('land')).toBe(PropertyType.LAND);
    });

    test('should handle case insensitive input', () => {
      expect(normalizePropertyType('APARTMENT')).toBe(PropertyType.APARTMENT);
      expect(normalizePropertyType('House')).toBe(PropertyType.HOUSE);
    });

    test('should return OTHER for unknown types', () => {
      expect(normalizePropertyType('unknown')).toBe(PropertyType.OTHER);
      expect(normalizePropertyType('')).toBe(PropertyType.OTHER);
    });
  });

  describe('normalizePrice', () => {
    test('should normalize numeric prices', () => {
      expect(normalizePrice(50000000)).toBe(50000000);
      expect(normalizePrice(5000)).toBe(50000000); // Convert from 万円
    });

    test('should normalize string prices', () => {
      expect(normalizePrice('50000000')).toBe(50000000);
      expect(normalizePrice('5000万円')).toBe(50000000);
    });

    test('should handle undefined/null prices', () => {
      expect(normalizePrice(undefined)).toBeUndefined();
      expect(normalizePrice(null as any)).toBeUndefined();
    });

    test('should handle invalid prices', () => {
      expect(normalizePrice('invalid')).toBeUndefined();
      expect(normalizePrice(-1000)).toBeUndefined();
      expect(normalizePrice(0)).toBeUndefined();
    });
  });

  describe('normalizeSize', () => {
    test('should normalize numeric sizes', () => {
      expect(normalizeSize(50.5)).toBe(50.5);
      expect(normalizeSize(100)).toBe(100);
    });

    test('should normalize string sizes', () => {
      expect(normalizeSize('50.5')).toBe(50.5);
      expect(normalizeSize('100㎡')).toBe(100);
    });

    test('should handle undefined/null sizes', () => {
      expect(normalizeSize(undefined)).toBeUndefined();
      expect(normalizeSize(null as any)).toBeUndefined();
    });

    test('should handle invalid sizes', () => {
      expect(normalizeSize('invalid')).toBeUndefined();
      expect(normalizeSize(-10)).toBeUndefined();
      expect(normalizeSize(0)).toBeUndefined();
    });
  });

  describe('normalizeLocation', () => {
    test('should trim and normalize whitespace', () => {
      expect(normalizeLocation('  Tokyo,   Japan  ')).toBe('Tokyo, Japan');
      expect(normalizeLocation('Tokyo\n\nJapan')).toBe('Tokyo Japan');
    });

    test('should handle empty strings', () => {
      expect(normalizeLocation('')).toBe('');
      expect(normalizeLocation('   ')).toBe('');
    });
  });

  describe('normalizeImages', () => {
    test('should filter and deduplicate valid URLs', () => {
      const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image1.jpg', // duplicate
        '',
        'https://example.com/image3.jpg'
      ];

      const result = normalizeImages(images);
      expect(result).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ]);
    });

    test('should handle undefined/null input', () => {
      expect(normalizeImages(undefined)).toEqual([]);
      expect(normalizeImages(null as any)).toEqual([]);
    });

    test('should handle non-array input', () => {
      expect(normalizeImages('not-an-array' as any)).toEqual([]);
    });
  });

  describe('normalizePropertyData', () => {
    test('should normalize all fields in property data', () => {
      const propertyData: PropertyData = {
        url: 'https://example.com/property/123',
        title: 'Test Property',
        price: 5000, // Should be converted from 万円
        location: '  Tokyo,   Japan  ',
        size: 50.5,
        propertyType: 'アパート',
        description: 'A nice apartment',
        images: ['https://example.com/image1.jpg', 'https://example.com/image1.jpg'],
        listingDate: new Date(),
        sourceWebsite: 'example.com'
      };

      const result = normalizePropertyData(propertyData);
      
      expect(result.normalizedPrice).toBe(50000000);
      expect(result.normalizedLocation).toBe('Tokyo, Japan');
      expect(result.normalizedSize).toBe(50.5);
      expect(result.normalizedPropertyType).toBe(PropertyType.APARTMENT);
      expect(result.images).toEqual(['https://example.com/image1.jpg']);
    });
  });
});

describe('Transformation Functions', () => {
  describe('propertyDataToCreateInput', () => {
    test('should transform property data to create input', () => {
      const propertyData: PropertyData = {
        url: 'https://example.com/property/123',
        title: 'Test Property',
        price: 5000,
        location: '  Tokyo,   Japan  ',
        size: 50,
        propertyType: 'アパート',
        description: 'A nice apartment',
        images: ['https://example.com/image1.jpg'],
        listingDate: new Date(),
        sourceWebsite: 'example.com'
      };

      const result = propertyDataToCreateInput(propertyData);
      
      expect(result.url).toBe(propertyData.url);
      expect(result.title).toBe(propertyData.title);
      expect(result.price).toBe(50000000); // Normalized
      expect(result.location).toBe('Tokyo, Japan'); // Normalized
      expect(result.sizeSqm).toBe(50);
      expect(result.propertyType).toBe(PropertyType.APARTMENT); // Normalized
      expect(result.translationStatus).toBe(TranslationStatus.PENDING);
    });
  });

  describe('translatedPropertyDataToCreateInput', () => {
    test('should transform translated property data to create input', () => {
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

      const result = translatedPropertyDataToCreateInput(translatedData);
      
      expect(result.titleEn).toBe('Test Property');
      expect(result.locationEn).toBe('Tokyo, Japan');
      expect(result.descriptionEn).toBe('A nice apartment');
      expect(result.translationStatus).toBe(TranslationStatus.COMPLETE);
    });
  });
});

describe('Utility Functions', () => {
  describe('isValidUrl', () => {
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(true); // FTP is valid URL
    });
  });

  describe('sanitizeString', () => {
    test('should trim and limit string length', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
      expect(sanitizeString('a'.repeat(2000), 100)).toBe('a'.repeat(100));
    });

    test('should handle undefined input', () => {
      expect(sanitizeString(undefined)).toBeUndefined();
    });

    test('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });

  describe('isValidPrice', () => {
    test('should validate reasonable prices', () => {
      expect(isValidPrice(1000000)).toBe(true);
      expect(isValidPrice(50000000)).toBe(true);
      expect(isValidPrice(999999999)).toBe(true);
    });

    test('should reject invalid prices', () => {
      expect(isValidPrice(undefined)).toBe(false);
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-1000)).toBe(false);
      expect(isValidPrice(1000000000)).toBe(false); // Too high
    });
  });

  describe('isValidSize', () => {
    test('should validate reasonable sizes', () => {
      expect(isValidSize(10)).toBe(true);
      expect(isValidSize(100.5)).toBe(true);
      expect(isValidSize(9999)).toBe(true);
    });

    test('should reject invalid sizes', () => {
      expect(isValidSize(undefined)).toBe(false);
      expect(isValidSize(0)).toBe(false);
      expect(isValidSize(-10)).toBe(false);
      expect(isValidSize(10000)).toBe(false); // Too high
    });
  });
});