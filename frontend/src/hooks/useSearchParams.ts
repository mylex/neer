import { useState, useEffect, useCallback } from 'react';
import { useSearchParams as useRouterSearchParams } from 'react-router-dom';
import { SearchCriteria } from '../services/propertyService';

interface UseSearchParamsReturn {
  searchCriteria: SearchCriteria;
  updateSearchCriteria: (criteria: SearchCriteria) => void;
  clearSearchCriteria: () => void;
}

const DEFAULT_CRITERIA: SearchCriteria = {
  sortBy: 'listingDate',
  sortOrder: 'desc',
};

export const useSearchParams = (): UseSearchParamsReturn => {
  const [searchParams, setSearchParams] = useRouterSearchParams();
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>(DEFAULT_CRITERIA);

  // Parse URL parameters into search criteria
  const parseSearchParams = useCallback((): SearchCriteria => {
    const criteria: SearchCriteria = {
      sortBy: (searchParams.get('sortBy') as 'price' | 'size' | 'listingDate' | 'location') || 'listingDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const query = searchParams.get('q');
    if (query) {
      criteria.query = query;
    }

    const minPrice = searchParams.get('minPrice');
    if (minPrice) {
      criteria.minPrice = Number(minPrice);
    }

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) {
      criteria.maxPrice = Number(maxPrice);
    }

    const location = searchParams.get('location');
    if (location) {
      criteria.location = location;
    }

    const propertyType = searchParams.get('propertyType');
    if (propertyType) {
      criteria.propertyType = propertyType;
    }

    const minSize = searchParams.get('minSize');
    if (minSize) {
      criteria.minSize = Number(minSize);
    }

    const maxSize = searchParams.get('maxSize');
    if (maxSize) {
      criteria.maxSize = Number(maxSize);
    }

    return criteria;
  }, [searchParams]);

  // Convert search criteria to URL parameters
  const criteriaToSearchParams = useCallback((criteria: SearchCriteria): URLSearchParams => {
    const params = new URLSearchParams();

    if (criteria.query) {
      params.set('q', criteria.query);
    }
    if (criteria.minPrice !== undefined) {
      params.set('minPrice', criteria.minPrice.toString());
    }
    if (criteria.maxPrice !== undefined) {
      params.set('maxPrice', criteria.maxPrice.toString());
    }
    if (criteria.location) {
      params.set('location', criteria.location);
    }
    if (criteria.propertyType) {
      params.set('propertyType', criteria.propertyType);
    }
    if (criteria.minSize !== undefined) {
      params.set('minSize', criteria.minSize.toString());
    }
    if (criteria.maxSize !== undefined) {
      params.set('maxSize', criteria.maxSize.toString());
    }
    if (criteria.sortBy !== 'listingDate') {
      params.set('sortBy', criteria.sortBy);
    }
    if (criteria.sortOrder !== 'desc') {
      params.set('sortOrder', criteria.sortOrder);
    }

    return params;
  }, []);

  // Initialize search criteria from URL on mount
  useEffect(() => {
    const initialCriteria = parseSearchParams();
    setSearchCriteria(initialCriteria);
  }, [parseSearchParams]);

  // Update search criteria and URL
  const updateSearchCriteria = useCallback((criteria: SearchCriteria) => {
    setSearchCriteria(criteria);
    
    const newParams = criteriaToSearchParams(criteria);
    
    // Only update URL if parameters have actually changed
    const currentParamsString = searchParams.toString();
    const newParamsString = newParams.toString();
    
    if (currentParamsString !== newParamsString) {
      setSearchParams(newParams, { replace: true });
    }
  }, [criteriaToSearchParams, searchParams, setSearchParams]);

  // Clear all search criteria
  const clearSearchCriteria = useCallback(() => {
    const clearedCriteria = { ...DEFAULT_CRITERIA };
    setSearchCriteria(clearedCriteria);
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    searchCriteria,
    updateSearchCriteria,
    clearSearchCriteria,
  };
};

export default useSearchParams;