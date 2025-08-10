import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Button,
  Grid,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { PropertyFilters, SearchCriteria } from '../services/propertyService';

interface SearchFiltersProps {
  onFiltersChange: (criteria: SearchCriteria) => void;
  initialFilters?: PropertyFilters;
  initialQuery?: string;
  loading?: boolean;
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'mansion', label: 'Mansion' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'price', label: 'Price' },
  { value: 'size', label: 'Size' },
  { value: 'listingDate', label: 'Listing Date' },
  { value: 'location', label: 'Location' },
];

const PRICE_RANGES = [
  { min: 0, max: 5000000, label: 'Under ¥5M' },
  { min: 5000000, max: 10000000, label: '¥5M - ¥10M' },
  { min: 10000000, max: 20000000, label: '¥10M - ¥20M' },
  { min: 20000000, max: 50000000, label: '¥20M - ¥50M' },
  { min: 50000000, max: 100000000, label: '¥50M - ¥100M' },
  { min: 100000000, max: Infinity, label: 'Over ¥100M' },
];

const SIZE_RANGES = [
  { min: 0, max: 30, label: 'Under 30㎡' },
  { min: 30, max: 50, label: '30-50㎡' },
  { min: 50, max: 80, label: '50-80㎡' },
  { min: 80, max: 120, label: '80-120㎡' },
  { min: 120, max: 200, label: '120-200㎡' },
  { min: 200, max: Infinity, label: 'Over 200㎡' },
];

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  initialQuery = '',
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<'price' | 'size' | 'listingDate' | 'location'>('listingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialFilters.minPrice || 0,
    initialFilters.maxPrice || 100000000,
  ]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([
    initialFilters.minSize || 0,
    initialFilters.maxSize || 500,
  ]);

  // Debounced search function
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback((query: string, currentFilters: PropertyFilters) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      const trimmedQuery = query.trim();
      const criteria: SearchCriteria = {
        ...currentFilters,
        sortBy,
        sortOrder,
      };
      if (trimmedQuery) {
        criteria.query = trimmedQuery;
      }
      onFiltersChange(criteria);
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);
  }, [onFiltersChange, sortBy, sortOrder, searchTimeout]);

  // Handle search query changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    debouncedSearch(query, filters);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<PropertyFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    debouncedSearch(searchQuery, updatedFilters);
  };

  // Handle property type change
  const handlePropertyTypeChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    const newFilters: Partial<PropertyFilters> = {};
    if (value) {
      newFilters.propertyType = value;
    }
    handleFilterChange(newFilters);
  };

  // Handle location change
  const handleLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const newFilters: Partial<PropertyFilters> = {};
    if (value) {
      newFilters.location = value;
    }
    handleFilterChange(newFilters);
  };

  // Handle price range change
  const handlePriceRangeChange = (_event: Event, newValue: number | number[]) => {
    const range = newValue as [number, number];
    setPriceRange(range);
    const newFilters: Partial<PropertyFilters> = {};
    if (range[0] > 0) {
      newFilters.minPrice = range[0];
    }
    if (range[1] < 100000000) {
      newFilters.maxPrice = range[1];
    }
    handleFilterChange(newFilters);
  };

  // Handle size range change
  const handleSizeRangeChange = (_event: Event, newValue: number | number[]) => {
    const range = newValue as [number, number];
    setSizeRange(range);
    const newFilters: Partial<PropertyFilters> = {};
    if (range[0] > 0) {
      newFilters.minSize = range[0];
    }
    if (range[1] < 500) {
      newFilters.maxSize = range[1];
    }
    handleFilterChange(newFilters);
  };

  // Handle sort changes
  const handleSortChange = (event: SelectChangeEvent<string>) => {
    const newSortBy = event.target.value as 'price' | 'size' | 'listingDate' | 'location';
    setSortBy(newSortBy);
    const trimmedQuery = searchQuery.trim();
    const criteria: SearchCriteria = {
      ...filters,
      sortBy: newSortBy,
      sortOrder,
    };
    if (trimmedQuery) {
      criteria.query = trimmedQuery;
    }
    onFiltersChange(criteria);
  };

  const handleSortOrderChange = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
    const trimmedQuery = searchQuery.trim();
    const criteria: SearchCriteria = {
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    };
    if (trimmedQuery) {
      criteria.query = trimmedQuery;
    }
    onFiltersChange(criteria);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({});
    setPriceRange([0, 100000000]);
    setSizeRange([0, 500]);
    setSortBy('listingDate');
    setSortOrder('desc');
    
    const criteria: SearchCriteria = {
      sortBy: 'listingDate',
      sortOrder: 'desc',
    };
    onFiltersChange(criteria);
  };

  // Quick filter buttons
  const handleQuickPriceFilter = (min: number, max: number) => {
    setPriceRange([min, max === Infinity ? 100000000 : max]);
    const newFilters: Partial<PropertyFilters> = {};
    if (min > 0) {
      newFilters.minPrice = min;
    }
    if (max !== Infinity) {
      newFilters.maxPrice = max;
    }
    handleFilterChange(newFilters);
  };

  const handleQuickSizeFilter = (min: number, max: number) => {
    setSizeRange([min, max === Infinity ? 500 : max]);
    const newFilters: Partial<PropertyFilters> = {};
    if (min > 0) {
      newFilters.minSize = min;
    }
    if (max !== Infinity) {
      newFilters.maxSize = max;
    }
    handleFilterChange(newFilters);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filters.propertyType) count++;
    if (filters.location) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minSize || filters.maxSize) count++;
    return count;
  };

  // Format price for display
  const formatPrice = (value: number) => {
    if (value >= 100000000) return '¥100M+';
    if (value >= 1000000) return `¥${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `¥${(value / 1000).toFixed(0)}K`;
    return `¥${value}`;
  };

  // Format size for display
  const formatSize = (value: number) => {
    if (value >= 500) return '500㎡+';
    return `${value}㎡`;
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search properties by title, location, or description..."
          value={searchQuery}
          onChange={handleSearchChange}
          disabled={loading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchQuery('');
                    debouncedSearch('', filters);
                  }}
                  disabled={loading}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Quick Filters and Sort */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={handleSortChange}
            disabled={loading}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          size="small"
          onClick={handleSortOrderChange}
          disabled={loading}
          sx={{ minWidth: 80 }}
        >
          {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterIcon />}
          endIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          disabled={loading}
        >
          Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
        </Button>

        {getActiveFilterCount() > 0 && (
          <Button
            variant="text"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={loading}
            color="secondary"
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Advanced Filters */}
      <Collapse in={showAdvancedFilters}>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {/* Property Type and Location */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Property Type</InputLabel>
              <Select
                value={filters.propertyType || ''}
                label="Property Type"
                onChange={handlePropertyTypeChange}
                disabled={loading}
              >
                <MenuItem value="">All Types</MenuItem>
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Location"
              placeholder="Enter city, prefecture, or area"
              value={filters.location || ''}
              onChange={handleLocationChange}
              disabled={loading}
            />
          </Grid>

          {/* Price Range */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
            </Typography>
            <Slider
              value={priceRange}
              onChange={handlePriceRangeChange}
              valueLabelDisplay="auto"
              valueLabelFormat={formatPrice}
              min={0}
              max={100000000}
              step={1000000}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRICE_RANGES.map((range, index) => (
                <Chip
                  key={index}
                  label={range.label}
                  variant={
                    priceRange[0] === range.min && 
                    (priceRange[1] === range.max || (range.max === Infinity && priceRange[1] === 100000000))
                      ? 'filled' 
                      : 'outlined'
                  }
                  size="small"
                  onClick={() => handleQuickPriceFilter(range.min, range.max)}
                  disabled={loading}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Grid>

          {/* Size Range */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Size Range: {formatSize(sizeRange[0])} - {formatSize(sizeRange[1])}
            </Typography>
            <Slider
              value={sizeRange}
              onChange={handleSizeRangeChange}
              valueLabelDisplay="auto"
              valueLabelFormat={formatSize}
              min={0}
              max={500}
              step={10}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {SIZE_RANGES.map((range, index) => (
                <Chip
                  key={index}
                  label={range.label}
                  variant={
                    sizeRange[0] === range.min && 
                    (sizeRange[1] === range.max || (range.max === Infinity && sizeRange[1] === 500))
                      ? 'filled' 
                      : 'outlined'
                  }
                  size="small"
                  onClick={() => handleQuickSizeFilter(range.min, range.max)}
                  disabled={loading}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
};

export default SearchFilters;