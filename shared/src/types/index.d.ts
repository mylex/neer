export interface PropertyData {
    url: string;
    title: string;
    price?: number | undefined;
    location: string;
    size?: number | undefined;
    propertyType: string;
    description?: string | undefined;
    images: string[];
    listingDate?: Date | undefined;
    sourceWebsite: string;
}
export interface TranslatedPropertyData extends PropertyData {
    titleEn?: string | undefined;
    locationEn?: string | undefined;
    descriptionEn?: string | undefined;
    translationStatus: TranslationStatus;
}
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
export declare enum PropertyType {
    APARTMENT = "apartment",
    HOUSE = "house",
    MANSION = "mansion",
    LAND = "land",
    OTHER = "other"
}
export declare enum TranslationStatus {
    PENDING = "pending",
    COMPLETE = "complete",
    PARTIAL = "partial",
    FAILED = "failed"
}
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
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export interface NormalizedPropertyData extends PropertyData {
    normalizedPrice: number | undefined;
    normalizedSize: number | undefined;
    normalizedPropertyType: PropertyType;
    normalizedLocation: string;
}
//# sourceMappingURL=index.d.ts.map