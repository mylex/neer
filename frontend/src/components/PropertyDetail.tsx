import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Button,
  IconButton,
  Skeleton,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  OpenInNew as OpenInNewIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Property } from '../services/propertyService';
import { formatPrice, formatSize, formatDate, capitalizeFirst } from '../utils/formatters';
import ImageGallery from './ImageGallery';

interface PropertyDetailProps {
  property: Property;
  loading?: boolean;
  error?: string | null;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ 
  property, 
  loading = false, 
  error = null 
}) => {
  const navigate = useNavigate();
  const [showJapanese, setShowJapanese] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenOriginal = () => {
    if (property.url) {
      window.open(property.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header skeleton */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={200} height={32} />
        </Box>

        {/* Image gallery skeleton */}
        <Skeleton variant="rectangular" height={400} sx={{ mb: 3, borderRadius: 2 }} />

        {/* Content skeleton */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
              <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" height={24} sx={{ mb: 3 }} />
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={80} height={32} />
                <Skeleton variant="rectangular" width={80} height={32} />
              </Box>
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Skeleton variant="text" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="text" height={24} />
              <Skeleton variant="text" height={24} />
              <Skeleton variant="text" height={24} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
        >
          Go Back
        </Button>
      </Box>
    );
  }

  const displayTitle = showJapanese ? property.title : (property.titleEn || property.title);
  const displayLocation = showJapanese ? property.location : (property.locationEn || property.location);
  const displayDescription = showJapanese ? property.description : (property.descriptionEn || property.description);

  const hasTranslation = property.titleEn || property.locationEn || property.descriptionEn;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ p: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Property Details
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {hasTranslation && (
            <FormControlLabel
              control={
                <Switch
                  checked={showJapanese}
                  onChange={(e) => setShowJapanese(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LanguageIcon fontSize="small" />
                  <Typography variant="body2">
                    {showJapanese ? '日本語' : 'English'}
                  </Typography>
                </Box>
              }
            />
          )}
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            onClick={handleOpenOriginal}
            size="small"
          >
            Original Listing
          </Button>
        </Box>
      </Box>

      {/* Image Gallery */}
      {property.images && property.images.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <ImageGallery images={property.images} title={displayTitle} />
        </Box>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Property Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: { xs: 3, md: 0 } }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              {displayTitle}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationIcon sx={{ fontSize: 20, color: 'text.secondary', mr: 1 }} />
              <Typography variant="body1" color="text.secondary">
                {displayLocation}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              {property.price && (
                <Chip
                  label={formatPrice(property.price)}
                  color="primary"
                  size="medium"
                  sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                />
              )}
              {property.sizeSqm && (
                <Chip
                  label={formatSize(property.sizeSqm)}
                  variant="outlined"
                  size="medium"
                />
              )}
              <Chip
                label={capitalizeFirst(property.propertyType)}
                variant="outlined"
                size="medium"
              />
              <Chip
                label={capitalizeFirst(property.translationStatus)}
                color={property.translationStatus === 'complete' ? 'success' : 'warning'}
                variant="outlined"
                size="small"
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            {displayDescription && (
              <>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Description
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    mb: 3
                  }}
                >
                  {displayDescription}
                </Typography>
              </>
            )}

            {/* Show both languages if translation exists and user wants to see both */}
            {hasTranslation && showJapanese && property.descriptionEn && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Description (English)
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    color: 'text.secondary'
                  }}
                >
                  {property.descriptionEn}
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Property Details Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 24 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Property Information
            </Typography>

            <Box sx={{ mb: 3 }}>
              {property.price && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Price:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatPrice(property.price)}
                  </Typography>
                </Box>
              )}

              {property.sizeSqm && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Size:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatSize(property.sizeSqm)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Type:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {capitalizeFirst(property.propertyType)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Source:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {property.sourceWebsite}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Listed:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(property.listingDate)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button
              variant="contained"
              fullWidth
              startIcon={<OpenInNewIcon />}
              onClick={handleOpenOriginal}
              sx={{ mb: 2 }}
            >
              View Original Listing
            </Button>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Back to Search
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PropertyDetail;