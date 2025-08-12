import React, { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PropertyDetail from '../components/PropertyDetail';
import ErrorAlert from '../components/ErrorAlert';
import GracefulDegradation from '../components/GracefulDegradation';
import { Property, propertyService } from '../services/propertyService';
import { useApiCall } from '../hooks/useApiCall';
import { ApiError } from '../utils/errorUtils';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchPropertyFunction = useCallback(async () => {
    if (!id) {
      throw new Error('Property ID is required');
    }

    const propertyId = parseInt(id, 10);
    if (isNaN(propertyId)) {
      throw new Error('Invalid property ID');
    }

    return await propertyService.getProperty(propertyId);
  }, [id]);

  const {
    state: { data: property, loading, error },
    execute: fetchProperty,
    retry,
    isRetrying,
  } = useApiCall(fetchPropertyFunction, {
    maxRetries: 3,
    onError: (error: ApiError) => {
      console.error('Error fetching property:', error);
    },
  });

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  if (!id) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Property ID is required
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          Go Back to Search
        </Button>
      </Box>
    );
  }

  return (
    <GracefulDegradation
      loading={loading}
      error={error}
      onRetry={retry}
      errorMessage="Failed to load property details. Please check your connection and try again."
    >
      <Box>
        {error && (
          <ErrorAlert
            error={error}
            onRetry={retry}
            context="Property Details"
            showDetails={process.env.NODE_ENV === 'development'}
          />
        )}
        
        <PropertyDetail 
          property={property!} 
          loading={loading || isRetrying} 
          error={error?.message || null} 
        />
      </Box>
    </GracefulDegradation>
  );
};

export default PropertyDetailPage;