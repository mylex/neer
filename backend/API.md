# Japanese Real Estate Scraper API

This document describes the REST API endpoints for the Japanese Real Estate Scraper backend.

## Base URL

```
http://localhost:3001/api
```

## Endpoints

### Health Check

#### GET /health

Returns the health status of the server.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Properties

#### GET /api/properties

List properties with pagination and filtering.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort field (`price`, `sizeSqm`, `listingDate`, `createdAt`) (default: `createdAt`)
- `sortOrder` (string, optional): Sort order (`ASC`, `DESC`) (default: `DESC`)
- `minPrice` (number, optional): Minimum price filter (must be positive)
- `maxPrice` (number, optional): Maximum price filter (must be positive, cannot be less than minPrice)
- `location` (string, optional): Location filter (searches both Japanese and English, trimmed)
- `propertyType` (string, optional): Property type filter (`apartment`, `house`, `mansion`, `land`, `other`)
- `minSize` (number, optional): Minimum size filter in square meters (must be positive)
- `maxSize` (number, optional): Maximum size filter in square meters (must be positive, cannot be less than minSize)
- `sourceWebsite` (string, optional): Source website filter (trimmed)
- `translationStatus` (string, optional): Translation status filter (`pending`, `complete`, `partial`, `failed`)

**Example Request:**
```
GET /api/properties?page=1&limit=10&minPrice=1000000&maxPrice=10000000&location=Tokyo&propertyType=apartment
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://example.com/property/1",
      "title": "Nice Apartment",
      "titleEn": "Nice Apartment",
      "price": 5000000,
      "location": "東京都渋谷区",
      "locationEn": "Shibuya, Tokyo",
      "sizeSqm": 45.5,
      "propertyType": "apartment",
      "description": "素晴らしいアパートです",
      "descriptionEn": "A wonderful apartment",
      "images": ["image1.jpg", "image2.jpg"],
      "listingDate": "2024-01-01T00:00:00.000Z",
      "sourceWebsite": "suumo",
      "translationStatus": "complete",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "minPrice": 1000000,
    "maxPrice": 10000000,
    "location": "Tokyo",
    "propertyType": "apartment"
  },
  "appliedFiltersCount": 4,
  "message": "Found 100 properties matching your criteria."
}
```

#### GET /api/properties/:id

Get detailed information about a specific property.

**Parameters:**
- `id` (number): Property ID

**Example Request:**
```
GET /api/properties/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com/property/1",
    "title": "Nice Apartment",
    "titleEn": "Nice Apartment",
    "price": 5000000,
    "location": "東京都渋谷区",
    "locationEn": "Shibuya, Tokyo",
    "sizeSqm": 45.5,
    "propertyType": "apartment",
    "description": "素晴らしいアパートです",
    "descriptionEn": "A wonderful apartment",
    "images": ["image1.jpg", "image2.jpg"],
    "listingDate": "2024-01-01T00:00:00.000Z",
    "sourceWebsite": "suumo",
    "translationStatus": "complete",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/properties/clear-filters

Get all properties without any filters applied (useful for clearing filters).

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort field (`price`, `sizeSqm`, `listingDate`, `createdAt`) (default: `createdAt`)
- `sortOrder` (string, optional): Sort order (`ASC`, `DESC`) (default: `DESC`)

**Example Request:**
```
GET /api/properties/clear-filters?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...},
  "filters": {},
  "message": "Showing all 1000 properties. Filters have been cleared."
}
```

#### GET /api/properties/search

Search properties using full-text search with filtering capabilities.

**Query Parameters:**
- `q` (string, required): Search query (2-100 characters)
- All the same filtering parameters as `/api/properties`

**Example Request:**
```
GET /api/properties/search?q=apartment&minPrice=1000000&location=Tokyo
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://example.com/property/1",
      "title": "Nice Apartment",
      "titleEn": "Nice Apartment",
      "price": 5000000,
      "location": "東京都渋谷区",
      "locationEn": "Shibuya, Tokyo",
      "sizeSqm": 45.5,
      "propertyType": "apartment",
      "description": "素晴らしいアパートです",
      "descriptionEn": "A wonderful apartment",
      "images": ["image1.jpg", "image2.jpg"],
      "listingDate": "2024-01-01T00:00:00.000Z",
      "sourceWebsite": "suumo",
      "translationStatus": "complete",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "searchQuery": "apartment",
  "filters": {
    "minPrice": 1000000,
    "location": "Tokyo"
  },
  "appliedFiltersCount": 2,
  "message": "Found 5 properties matching \"apartment\" with your filters."
}
```

### Statistics

#### GET /api/stats

Get system statistics and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProperties": 1000,
    "translatedProperties": 800,
    "pendingTranslation": 150,
    "failedTranslation": 50,
    "avgPrice": 5000000,
    "minPrice": 500000,
    "maxPrice": 50000000,
    "sourceWebsites": 3,
    "lastScraped": "2024-01-01T00:00:00.000Z",
    "propertiesByType": {
      "apartment": 500,
      "house": 300,
      "mansion": 150,
      "land": 50,
      "other": 0
    }
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": {
    "message": "Error description",
    "status": 400,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Property Types

- `apartment`: Apartment/Flat
- `house`: Single-family house
- `mansion`: Luxury apartment/condo
- `land`: Land only
- `other`: Other property types

## Translation Status

- `pending`: Translation not started
- `complete`: Fully translated
- `partial`: Partially translated
- `failed`: Translation failed