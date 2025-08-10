import React from 'react';
import { Box, Typography } from '@mui/material';
import { PropertyList } from '../components';

const PropertyListPage: React.FC = () => {
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
      
      <PropertyList />
    </Box>
  );
};

export default PropertyListPage;