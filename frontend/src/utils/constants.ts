// Application constants

export const PROPERTY_TYPES = {
  APARTMENT: 'apartment',
  HOUSE: 'house',
  MANSION: 'mansion',
  LAND: 'land',
} as const;

export const PROPERTY_TYPE_LABELS = {
  [PROPERTY_TYPES.APARTMENT]: 'Apartment',
  [PROPERTY_TYPES.HOUSE]: 'House',
  [PROPERTY_TYPES.MANSION]: 'Mansion',
  [PROPERTY_TYPES.LAND]: 'Land',
};

export const TRANSLATION_STATUS = {
  PENDING: 'pending',
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  FAILED: 'failed',
} as const;

export const SORT_OPTIONS = {
  PRICE_ASC: { field: 'price', order: 'asc', label: 'Price: Low to High' },
  PRICE_DESC: { field: 'price', order: 'desc', label: 'Price: High to Low' },
  SIZE_ASC: { field: 'size', order: 'asc', label: 'Size: Small to Large' },
  SIZE_DESC: { field: 'size', order: 'desc', label: 'Size: Large to Small' },
  DATE_DESC: { field: 'listingDate', order: 'desc', label: 'Newest First' },
  DATE_ASC: { field: 'listingDate', order: 'asc', label: 'Oldest First' },
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;