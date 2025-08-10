import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Property Details
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Property details for ID: {id} will be displayed here. This component will be implemented in task 13.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PropertyDetailPage;