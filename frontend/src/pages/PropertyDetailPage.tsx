import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PropertyDetail from '../components/PropertyDetail';
import { Property, propertyService } from '../services/propertyService';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) {
        setError('Property ID is required');
        setLoading(false);
        return;
      }

      const propertyId = parseInt(id, 10);
      if (isNaN(propertyId)) {
        setError('Invalid property ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const propertyData = await propertyService.getProperty(propertyId);
        setProperty(propertyData);
      } catch (err) {
        console.error('Error fetching property:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load property details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

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
    <PropertyDetail 
      property={property!} 
      loading={loading} 
      error={error} 
    />
  );
};

export default PropertyDetailPage;