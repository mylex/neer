import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import SearchFilters from '../SearchFilters';
import theme from '../../theme';
import { SearchCriteria } from '../../services/propertyService';

// Mock component wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('SearchFilters', () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  const renderSearchFilters = (props = {}) => {
    const defaultProps = {
      onFiltersChange: mockOnFiltersChange,
      ...props,
    };

    return render(
      <TestWrapper>
        <SearchFilters {...defaultProps} />
      </TestWrapper>
    );
  };

  describe('Search Input', () => {
    it('renders search input field', () => {
      renderSearchFilters();
      
      const searchInput = screen.getByPlaceholderText(/search properties/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('displays initial search query', () => {
      const initialQuery = 'Tokyo apartment';
      renderSearchFilters({ initialQuery });
      
      const searchInput = screen.getByDisplayValue(initialQuery);
      expect(searchInput).toBeInTheDocument();
    });

    it('calls onFiltersChange with debounced search query', async () => {
      renderSearchFilters();
      
      const searchInput = screen.getByPlaceholderText(/search properties/i);
      fireEvent.change(searchInput, { target: { value: 'Tokyo' } });
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Tokyo',
          })
        );
      }, { timeout: 500 });
    });
  });

  describe('Sort Controls', () => {
    it('renders sort controls', () => {
      renderSearchFilters();
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /desc/i })).toBeInTheDocument();
    });

    it('toggles sort order', () => {
      renderSearchFilters();
      
      const sortOrderButton = screen.getByRole('button', { name: /desc/i });
      fireEvent.click(sortOrderButton);
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 'asc',
        })
      );
    });
  });

  describe('Advanced Filters', () => {
    it('toggles advanced filters visibility', () => {
      renderSearchFilters();
      
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filtersButton);
      
      // Advanced filters should be visible - check for input fields instead of labels
      expect(screen.getByPlaceholderText(/enter city, prefecture/i)).toBeInTheDocument();
    });

    it('shows active filter count', () => {
      renderSearchFilters({
        initialFilters: {
          propertyType: 'apartment',
          location: 'Tokyo',
        },
        initialQuery: 'cheap',
      });
      
      // Should show count of 3 active filters (query + propertyType + location)
      expect(screen.getByText(/filters.*3/i)).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('shows clear all button when filters are active', () => {
      renderSearchFilters({
        initialFilters: { propertyType: 'apartment' },
      });
      
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('clears all filters when clear all is clicked', () => {
      renderSearchFilters({
        initialFilters: { propertyType: 'apartment', location: 'Tokyo' },
        initialQuery: 'cheap',
      });
      
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        sortBy: 'listingDate',
        sortOrder: 'desc',
      });
    });
  });

  describe('Loading State', () => {
    it('disables controls when loading', () => {
      renderSearchFilters({ loading: true });
      
      const searchInput = screen.getByPlaceholderText(/search properties/i);
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      
      expect(searchInput).toBeDisabled();
      expect(filtersButton).toBeDisabled();
    });
  });

  describe('Initial Values', () => {
    it('displays initial filters correctly', () => {
      const initialFilters = {
        propertyType: 'apartment',
        location: 'Tokyo',
        minPrice: 5000000,
        maxPrice: 10000000,
      };
      
      renderSearchFilters({ initialFilters });
      
      // Should show active filter count
      expect(screen.getByText(/filters.*4/i)).toBeInTheDocument();
    });
  });
});