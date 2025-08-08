"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePropertyInputSchema = exports.createPropertyInputSchema = exports.propertyDataSchema = void 0;
exports.validatePropertyData = validatePropertyData;
exports.validateCreatePropertyInput = validateCreatePropertyInput;
exports.validateUpdatePropertyInput = validateUpdatePropertyInput;
exports.normalizePropertyType = normalizePropertyType;
exports.normalizePrice = normalizePrice;
exports.normalizeSize = normalizeSize;
exports.normalizeLocation = normalizeLocation;
exports.normalizeImages = normalizeImages;
exports.normalizePropertyData = normalizePropertyData;
exports.propertyDataToCreateInput = propertyDataToCreateInput;
exports.translatedPropertyDataToCreateInput = translatedPropertyDataToCreateInput;
exports.isValidUrl = isValidUrl;
exports.sanitizeString = sanitizeString;
exports.isValidPrice = isValidPrice;
exports.isValidSize = isValidSize;
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../types");
const propertyDataSchema = joi_1.default.object({
    url: joi_1.default.string().uri().required(),
    title: joi_1.default.string().min(1).max(500).required(),
    price: joi_1.default.number().positive().optional(),
    location: joi_1.default.string().min(1).max(200).required(),
    size: joi_1.default.number().positive().optional(),
    propertyType: joi_1.default.string().min(1).max(50).required(),
    description: joi_1.default.string().max(5000).optional(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).default([]),
    listingDate: joi_1.default.date().optional(),
    sourceWebsite: joi_1.default.string().min(1).max(100).required()
});
exports.propertyDataSchema = propertyDataSchema;
const createPropertyInputSchema = joi_1.default.object({
    url: joi_1.default.string().uri().required(),
    title: joi_1.default.string().min(1).max(500).required(),
    titleEn: joi_1.default.string().min(1).max(500).optional(),
    price: joi_1.default.number().positive().optional(),
    location: joi_1.default.string().min(1).max(200).required(),
    locationEn: joi_1.default.string().min(1).max(200).optional(),
    sizeSqm: joi_1.default.number().positive().optional(),
    propertyType: joi_1.default.string().valid(...Object.values(types_1.PropertyType)).optional(),
    description: joi_1.default.string().max(5000).optional(),
    descriptionEn: joi_1.default.string().max(5000).optional(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).default([]),
    listingDate: joi_1.default.date().optional(),
    sourceWebsite: joi_1.default.string().min(1).max(100).required(),
    translationStatus: joi_1.default.string().valid(...Object.values(types_1.TranslationStatus)).optional()
});
exports.createPropertyInputSchema = createPropertyInputSchema;
const updatePropertyInputSchema = joi_1.default.object({
    id: joi_1.default.number().integer().positive().required(),
    url: joi_1.default.string().uri().optional(),
    title: joi_1.default.string().min(1).max(500).optional(),
    titleEn: joi_1.default.string().min(1).max(500).optional(),
    price: joi_1.default.number().positive().optional(),
    location: joi_1.default.string().min(1).max(200).optional(),
    locationEn: joi_1.default.string().min(1).max(200).optional(),
    sizeSqm: joi_1.default.number().positive().optional(),
    propertyType: joi_1.default.string().valid(...Object.values(types_1.PropertyType)).optional(),
    description: joi_1.default.string().max(5000).optional(),
    descriptionEn: joi_1.default.string().max(5000).optional(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    listingDate: joi_1.default.date().optional(),
    sourceWebsite: joi_1.default.string().min(1).max(100).optional(),
    translationStatus: joi_1.default.string().valid(...Object.values(types_1.TranslationStatus)).optional()
});
exports.updatePropertyInputSchema = updatePropertyInputSchema;
function validatePropertyData(data) {
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
function validateCreatePropertyInput(data) {
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
function validateUpdatePropertyInput(data) {
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
function normalizePropertyType(propertyType) {
    const normalized = propertyType.toLowerCase().trim();
    const typeMapping = {
        'アパート': types_1.PropertyType.APARTMENT,
        'apartment': types_1.PropertyType.APARTMENT,
        'マンション': types_1.PropertyType.MANSION,
        'mansion': types_1.PropertyType.MANSION,
        '一戸建て': types_1.PropertyType.HOUSE,
        '戸建て': types_1.PropertyType.HOUSE,
        'house': types_1.PropertyType.HOUSE,
        '土地': types_1.PropertyType.LAND,
        'land': types_1.PropertyType.LAND,
        '一軒家': types_1.PropertyType.HOUSE,
        'detached house': types_1.PropertyType.HOUSE
    };
    return typeMapping[normalized] || types_1.PropertyType.OTHER;
}
function normalizePrice(price) {
    if (price === undefined || price === null)
        return undefined;
    const numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) : price;
    if (isNaN(numPrice) || numPrice <= 0)
        return undefined;
    return numPrice < 10000 ? numPrice * 10000 : numPrice;
}
function normalizeSize(size) {
    if (size === undefined || size === null)
        return undefined;
    const numSize = typeof size === 'string' ? parseFloat(size.replace(/[^\d.]/g, '')) : size;
    if (isNaN(numSize) || numSize <= 0)
        return undefined;
    return numSize;
}
function normalizeLocation(location) {
    return location.trim().replace(/\s+/g, ' ');
}
function normalizeImages(images) {
    if (!images || !Array.isArray(images))
        return [];
    return images
        .filter(img => typeof img === 'string' && img.trim().length > 0)
        .map(img => img.trim())
        .filter((img, index, arr) => arr.indexOf(img) === index);
}
function normalizePropertyData(data) {
    return {
        ...data,
        normalizedPrice: normalizePrice(data.price),
        normalizedSize: normalizeSize(data.size),
        normalizedPropertyType: normalizePropertyType(data.propertyType),
        normalizedLocation: normalizeLocation(data.location),
        images: normalizeImages(data.images)
    };
}
function propertyDataToCreateInput(data) {
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
        translationStatus: types_1.TranslationStatus.PENDING
    };
}
function translatedPropertyDataToCreateInput(data) {
    const baseInput = propertyDataToCreateInput(data);
    return {
        ...baseInput,
        titleEn: data.titleEn,
        locationEn: data.locationEn,
        descriptionEn: data.descriptionEn,
        translationStatus: data.translationStatus
    };
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
function sanitizeString(str, maxLength = 1000) {
    if (str === undefined || str === null)
        return undefined;
    const trimmed = str.trim();
    if (trimmed === '')
        return '';
    return trimmed.substring(0, maxLength);
}
function isValidPrice(price) {
    return price !== undefined && price > 0 && price < 1000000000;
}
function isValidSize(size) {
    return size !== undefined && size > 0 && size < 10000;
}
//# sourceMappingURL=index.js.map