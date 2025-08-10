import React, { useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { PropertyList } from '../components';
import SearchFilters from '../components/SearchFilters';
import { useSearchParams } from '../hooks';
import { SearchCriteria, PropertyFilters } from '../services/propertyService';

const PropertyListPage: React.FC = () => {
  const { searchCriteria, updateSearchCriteria } = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Handle filter changes from SearchFilters component
  const handleFiltersChange = useCallback((criteria: SearchCriteria) => {
    setLoading(true);
    updateSearchCriteria(criteria);
    // Loading will be managed by PropertyList component
    setTimeout(() => setLoading(false), 100);
  }, [updateSearchCriteria]);

  // Extract filters and query from search criteria for PropertyList
  const filters: PropertyFilters = {};
  if (searchCriteria.minPrice !== undefined) {
    filters.minPrice = searchCriteria.minPrice;
  }
  if (searchCriteria.maxPrice !== undefined) {
    filters.maxPrice = searchCriteria.maxPrice;
  }
  if (searchCriteria.location) {
    filters.location = searchCriteria.location;
  }
  if (searchCriteria.propertyType) {
    filters.propertyType = searchCriteria.propertyType;
  }
  if (searchCriteria.minSize !== undefined) {
    filters.minSize = searchCriteria.minSize;
  }
  if (searchCriteria.maxSize !== undefined) {
    filters.maxSize = searchCriteria.maxSize;
  }

  return (
    <Box>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          fontWeight: 600,
          mb: 3,
        }}
      >
        Property Listings
      </Typography>
      
      <SearchFilters
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
        initialQuery={searchCriteria.query || ''}
        loading={loading}
      />
      
      <PropertyList 
        filters={filters}
        {...(searchCriteria.query && { searchQuery: searchCriteria.query })}
        sortBy={searchCriteria.sortBy}
        sortOrder={searchCriteria.sortOrder}
      />
    </Box>
  );
};

export default PropertyListPage;