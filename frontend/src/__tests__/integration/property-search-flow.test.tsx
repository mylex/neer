import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import App from '../../App';
import * as propertyService from '../../services/propertyService';
import theme from '../../theme';

// Mock the property service
jest.mock('../../services/propertyService');

const mockPropertyService = propertyService as jest.Mocked<typeof propertyService>;

const mockProperties = [
  {
    id: 1,
    url: 'https://suumo.jp/property/1',
    title: '東京のアパート',
    titleEn: 'Tokyo Apartment',
    price: 100000,
    location: '東京都渋谷区',
    locationEn: 'Shibuya, Tokyo',
    sizeSqm: 50,
    propertyType: 'apartment',
    description: '駅から徒歩5分',
    descriptionEn: '5 minutes walk from station',
    images: ['image1.jpg'],
    listingDate: '2023-01-01',
    sourceWebsite: 'suumo',
    translationStatus: 'complete',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    url: 'https://suumo.jp/property/2',
    title: '大阪のマンション',
    titleEn: 'Osaka Condo',
    price: 80000,
    location: '大阪府大阪市',
    locationEn: 'Osaka City, Osaka',
    sizeSqm: 60,
    propertyType: 'condo',
    description: '新築物件',
    descriptionEn: 'Newly built property',
    images: ['image2.jpg'],
    listingDate: '2023-01-02',
    sourceWebsite: 'suumo',
    translationStatus: 'complete',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  }
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Property Search Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockPropertyService.getProperties.mockResolvedValue({
      success: true,
      data: mockProperties,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      filters: {},
      appliedFiltersCount: 0,
      message: 'Found 2 properties.'
    });

    mockPropertyService.searchProperties.mockResolvedValue({
      success: true,
      data: mockProperties,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      searchQuery: 'apartment',
      filters: {},
      appliedFiltersCount: 0,
      message: 'Found 2 properties matching "apartment".'
    });

    mockPropertyService.getProperty.mockResolvedValue({
      success: true,
      data: mockProperties[0]
    });
  });

  describe('initial page load', () => {
    it('should load and display properties on initial page load', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for properties to load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
        expect(screen.getByText('Osaka Condo')).toBeInTheDocument();
      });

      expect(mockPropertyService.getProperties).toHaveBeenCalledWith({
        page: 1,
        limit: 20
      });
    });

    it('should show loading state while fetching properties', async () => {
      // Make the API call take longer
      mockPropertyService.getProperties.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: mockProperties,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          },
          filters: {},
          appliedFiltersCount: 0,
          message: 'Found 2 properties.'
        }), 100))
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show loading skeletons
      expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(20); // Default skeleton count

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });
    });
  });

  describe('search functionality', () => {
    it('should perform search when search form is submitted', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });

      // Navigate to search page
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      // Enter search query
      const searchInput = screen.getByPlaceholderText('Search properties...');
      await user.type(searchInput, 'apartment');

      // Submit search
      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockPropertyService.searchProperties).toHaveBeenCalledWith('apartment', {
          page: 1,
          limit: 20
        });
      });
    });

    it('should apply filters during search', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to search page
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      // Enter search query
      const searchInput = screen.getByPlaceholderText('Search properties...');
      await user.type(searchInput, 'apartment');

      // Apply price filter
      const minPriceInput = screen.getByLabelText('Min Price');
      await user.type(minPriceInput, '50000');

      const maxPriceInput = screen.getByLabelText('Max Price');
      await user.type(maxPriceInput, '150000');

      // Apply location filter
      const locationInput = screen.getByLabelText('Location');
      await user.type(locationInput, 'Tokyo');

      // Submit search
      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockPropertyService.searchProperties).toHaveBeenCalledWith('apartment', {
          page: 1,
          limit: 20,
          minPrice: 50000,
          maxPrice: 150000,
          location: 'Tokyo'
        });
      });
    });

    it('should clear filters when clear button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to search page
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      // Apply some filters
      const minPriceInput = screen.getByLabelText('Min Price');
      await user.type(minPriceInput, '50000');

      const locationInput = screen.getByLabelText('Location');
      await user.type(locationInput, 'Tokyo');

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      // Verify filters are cleared
      expect(minPriceInput).toHaveValue('');
      expect(locationInput).toHaveValue('');
    });
  });

  describe('property detail navigation', () => {
    it('should navigate to property detail when View Details is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for properties to load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });

      // Click on View Details for first property
      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      // Should navigate to property detail page
      await waitFor(() => {
        expect(mockPropertyService.getProperty).toHaveBeenCalledWith(1);
      });

      // Should show property details
      expect(screen.getByText('Property Details')).toBeInTheDocument();
      expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      expect(screen.getByText('5 minutes walk from station')).toBeInTheDocument();
    });

    it('should show error message for non-existent property', async () => {
      mockPropertyService.getProperty.mockResolvedValue({
        success: false,
        error: {
          message: 'Property not found',
          status: 404,
          timestamp: new Date().toISOString()
        }
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for properties to load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });

      // Click on View Details
      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Property not found')).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('should handle pagination correctly', async () => {
      const user = userEvent.setup();

      // Mock paginated response
      mockPropertyService.getProperties.mockResolvedValue({
        success: true,
        data: [mockProperties[0]],
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNext: true,
          hasPrev: false
        },
        filters: {},
        appliedFiltersCount: 0,
        message: 'Found 2 properties.'
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });

      // Should show pagination controls
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

      // Click next page
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockPropertyService.getProperties).toHaveBeenCalledWith({
          page: 2,
          limit: 20
        });
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when API fails', async () => {
      mockPropertyService.getProperties.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      const user = userEvent.setup();

      mockPropertyService.getProperties
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: mockProperties,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          },
          filters: {},
          appliedFiltersCount: 0,
          message: 'Found 2 properties.'
        });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should load properties successfully
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });
    });
  });

  describe('responsive behavior', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show mobile menu button
      expect(screen.getByLabelText('menu')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for properties to load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });

      // Test tab navigation through property cards
      const firstViewDetailsButton = screen.getAllByText('View Details')[0];
      firstViewDetailsButton.focus();
      expect(document.activeElement).toBe(firstViewDetailsButton);

      // Test Enter key activation
      fireEvent.keyDown(firstViewDetailsButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockPropertyService.getProperty).toHaveBeenCalledWith(1);
      });
    });

    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Wait for properties to load
      await waitFor(() => {
        expect(screen.getByText('Tokyo Apartment')).toBeInTheDocument();
      });

      // Check for proper ARIA roles
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Check for property list
      const propertyList = screen.getByRole('list');
      expect(propertyList).toBeInTheDocument();
      
      const propertyItems = within(propertyList).getAllByRole('listitem');
      expect(propertyItems).toHaveLength(2);
    });
  });
});