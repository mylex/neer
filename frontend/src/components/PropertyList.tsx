import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Pagination,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Skeleton,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import PropertyCard from './PropertyCard';
import ErrorAlert from './ErrorAlert';
import GracefulDegradation from './GracefulDegradation';
import { propertyService, Property, PropertyFilters, PropertyResponse } from '../services/propertyService';
import { useApiCall } from '../hooks/useApiCall';
import { ApiError } from '../utils/errorUtils';

interface PropertyListProps {
  filters?: PropertyFilters;
  searchQuery?: string;
  sortBy?: 'price' | 'size' | 'listingDate' | 'location';
  sortOrder?: 'asc' | 'desc';
}

const PropertyList: React.FC<PropertyListProps> = ({ 
  filters = {}, 
  searchQuery,
  sortBy = 'listingDate',
  sortOrder = 'desc'
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  const fetchPropertiesFunction = useCallback(async (page: number = 1, limit: number = pageSize) => {
    const requestFilters = {
      ...filters,
      page,
      limit,
    };

    let response: PropertyResponse;
    
    if (searchQuery) {
      response = await propertyService.searchProperties({
        query: searchQuery,
        ...requestFilters,
        sortBy,
        sortOrder,
      });
    } else {
      response = await propertyService.getProperties({
        ...requestFilters,
        sortBy,
        sortOrder,
      });
    }

    return response;
  }, [filters, searchQuery, pageSize, sortBy, sortOrder]);

  const {
    state: { data: response, loading, error },
    execute: fetchProperties,
    retry,
    isRetrying,
  } = useApiCall(fetchPropertiesFunction, {
    maxRetries: 3,
    onError: (error: ApiError) => {
      console.error('Error fetching properties:', error);
    },
    onSuccess: () => {
      console.log('Properties fetched successfully');
    },
  });

  // Update local state when response changes
  useEffect(() => {
    if (response) {
      setProperties(response.properties);
      setTotalPages(response.totalPages);
      setTotalProperties(response.total);
      setCurrentPage(response.page);
    }
  }, [response]);

  useEffect(() => {
    setCurrentPage(1);
    fetchProperties(1, pageSize);
  }, [fetchProperties, pageSize]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    fetchProperties(page, pageSize);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
    const newPageSize = event.target.value as number;
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchProperties(1, newPageSize);
  };

  const handleRetry = () => {
    retry();
  };

  const renderLoadingSkeletons = () => {
    return Array.from({ length: pageSize }, (_, index) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={`skeleton-${index}`}>
        <PropertyCard property={{} as Property} loading={true} />
      </Grid>
    ));
  };

  const renderEmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" color="text.secondary" gutterBottom>
        No properties found
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {searchQuery || Object.keys(filters).length > 0
          ? 'Try adjusting your search criteria or filters.'
          : 'No properties are currently available.'}
      </Typography>
    </Box>
  );

  const renderResultsHeader = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h6" component="div">
          {loading ? (
            <Skeleton width={200} />
          ) : (
            `${totalProperties.toLocaleString()} properties found`
          )}
        </Typography>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Per page</InputLabel>
          <Select
            value={pageSize}
            label="Per page"
            onChange={handlePageSizeChange}
            disabled={loading}
          >
            <MenuItem value={6}>6</MenuItem>
            <MenuItem value={12}>12</MenuItem>
            <MenuItem value={24}>24</MenuItem>
            <MenuItem value={48}>48</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );

  return (
    <GracefulDegradation
      loading={loading && !properties.length}
      error={error}
      onRetry={handleRetry}
      errorMessage="Failed to load properties. Please check your connection and try again."
    >
      <Box>
        {error && (
          <ErrorAlert
            error={error}
            onRetry={handleRetry}
            context="Property Loading"
            showDetails={process.env.NODE_ENV === 'development'}
          />
        )}

        {renderResultsHeader()}

        <Grid container spacing={3}>
          {loading && !properties.length ? (
            renderLoadingSkeletons()
          ) : properties.length === 0 && !loading ? (
            <Grid item xs={12}>
              {renderEmptyState()}
            </Grid>
          ) : (
            properties.map((property) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={property.id}>
                <PropertyCard property={property} />
              </Grid>
            ))
          )}
        </Grid>

        {!loading && properties.length > 0 && totalPages > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 4,
              gap: 2,
            }}
          >
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
              disabled={loading || isRetrying}
              sx={{
                '& .MuiPagination-ul': {
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                },
              }}
            />
          </Box>
        )}

        {(loading || isRetrying) && properties.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 2,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {isRetrying ? 'Retrying...' : 'Loading...'}
            </Typography>
          </Box>
        )}
      </Box>
    </GracefulDegradation>
  );
};

export default PropertyList;