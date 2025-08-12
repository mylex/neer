import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Button,
  CardActions,
  Skeleton,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Home as HomeIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Property } from '../services/propertyService';
import { formatPrice, formatSize, formatDate, truncateText, capitalizeFirst } from '../utils/formatters';
import LazyImage from './LazyImage';

interface PropertyCardProps {
  property: Property;
  loading?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, loading = false }) => {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/property/${property.id}`);
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent sx={{ flex: 1 }}>
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={20} />
          <Box sx={{ mt: 2 }}>
            <Skeleton variant="text" height={20} width="60%" />
            <Skeleton variant="text" height={20} width="40%" />
          </Box>
        </CardContent>
        <CardActions>
          <Skeleton variant="rectangular" height={36} width={120} />
        </CardActions>
      </Card>
    );
  }

  const displayTitle = property.titleEn || property.title;
  const displayLocation = property.locationEn || property.location;
  const displayDescription = property.descriptionEn || property.description || '';
  const primaryImage = property.images && property.images.length > 0 ? property.images[0] : null;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      {primaryImage ? (
        <LazyImage
          src={primaryImage}
          alt={displayTitle}
          height={200}
          objectFit="cover"
          onClick={handleViewDetails}
          style={{ cursor: 'pointer' }}
          threshold={0.1}
          rootMargin="50px"
          errorPlaceholder={
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.200',
                cursor: 'pointer',
              }}
              onClick={handleViewDetails}
            >
              <HomeIcon sx={{ fontSize: 48, color: 'grey.400' }} />
            </Box>
          }
        />
      ) : (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.200',
            cursor: 'pointer',
          }}
          onClick={handleViewDetails}
        >
          <HomeIcon sx={{ fontSize: 48, color: 'grey.400' }} />
        </Box>
      )}

      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom
          sx={{
            fontWeight: 600,
            lineHeight: 1.3,
            cursor: 'pointer',
            '&:hover': {
              color: 'primary.main',
            },
          }}
          onClick={handleViewDetails}
        >
          {truncateText(displayTitle, 60)}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            {truncateText(displayLocation, 40)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {property.price && (
            <Chip
              label={formatPrice(property.price)}
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          {property.sizeSqm && (
            <Chip
              label={formatSize(property.sizeSqm)}
              variant="outlined"
              size="small"
            />
          )}
          <Chip
            label={capitalizeFirst(property.propertyType)}
            variant="outlined"
            size="small"
          />
        </Box>

        {displayDescription && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            {truncateText(displayDescription, 120)}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
          <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            Listed {formatDate(property.listingDate)}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        <Button 
          size="small" 
          variant="contained" 
          onClick={handleViewDetails}
          fullWidth
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
};

export default PropertyCard;