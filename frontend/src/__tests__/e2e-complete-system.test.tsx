import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import App from '../App';
import * as propertyService from '../services/propertyService';
import theme from '../theme';

// Mock the property service
jest.mock('../services/propertyService');

const mockPropertyService = propertyService as jest.Mocked<typeof propertyService>;

// Mock data representing different system states
const mockCompleteProperties = [
  {
    id: 1,
    url: 'https://suumo.jp/property/1',
    title: '東京の新築アパート',
    titleEn: 'New Tokyo Apartment',
    price: 120000,
    location: '東京都渋谷区',
    locationEn: 'Shibuya, Tokyo',
    sizeSqm: 55,
    propertyType: 'apartment',
    description: '駅から徒歩3分の新築物件',
    descriptionEn: '3 minutes walk from station, newly built',
    images: ['apartment1.jpg', 'apartment2.jpg'],
    listingDate: '2023-01-01',
    sourceWebsite: 'suumo',
    translationStatus: 'complete',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    url: 'https://suumo.jp/property/2',
    title: '大阪の中古マンション',
    titleEn: 'Used Osaka Condo',
    price: 85000,
    location: '大阪府大阪市中央区',
    locationEn: 'Chuo-ku, Osaka City',
    sizeSqm: 70,
    propertyType: 'condo',
    description: 'リノベーション済み',
    descriptionEn: 'Recently renovated',
    images: ['condo1.jpg'],
    listingDate: '2023-01-02',
    sourceWebsite: 'suumo',
    translationStatus: 'complete',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z'
  },
  {
    id: 3,
    url: 'https://suumo.jp/property/3',
    title: '京都の一戸建て',
    titleEn: undefined, // Partial translation
    price: 95000,
    location: '京都府京都市',
    locationEn: 'Kyoto City, Kyoto',
    sizeSqm: 120,
    propertyType: 'house',
    description: '庭付きの一戸建て',
    descriptionEn: undefined, // Partial translation
    images: ['house1.jpg', 'house2.jpg', 'house3.jpg'],
    listingDate: '2023-01-03',
    sourceWebsite: 'suumo',
    translationStatus: 'partial',
    createdAt: '2023-01-03T00:00:00Z',
    updatedAt: '2023-01-03T00:00:00Z'
  }
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Complete System End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockPropertyService.getProperties.mockResolvedValue({
      success: true,
      data: mockCompleteProperties,
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      filters: {},
      appliedFiltersCount: 0,
      message: 'Found 3 properties.'
    });

    mockPropertyService.searchProperties.mockResolvedValue({
      success: true,
      data: mockCompleteProperties,
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      searchQuery: '',
      filters: {},
      appliedFiltersCount: 0,
      message: 'Found 3 properties.'
    });

    mockPropertyService.getProperty.mockImplementation(async (id) => ({
      success: true,
      data: mockCompleteProperties.find(p => p.id === id)!
    }));
  });

  describe('Complete User Journey - Property Discovery', () => {
    it('should complete full property discovery workflow', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Step 1: Initial page load shows all properties
      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
        expect(screen.getByText('Used Osaka Condo')).toBeInTheDocument();
        expect(screen.getByText('京都の一戸建て')).toBeInTheDocument(); // Untranslated title
      });

      // Verify different translation statuses are handled
      expect(screen.getByText('Shibuya, Tokyo')).toBeInTheDocument(); // Complete translation
      expect(screen.getByText('Kyoto City, Kyoto')).toBeInTheDocument(); // Partial translation

      // Step 2: Navigate to search page
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      // Step 3: Apply complex search filters
      const searchInput = screen.getByPlaceholderText('Search properties...');
      await user.type(searchInput, 'apartment');

      const minPriceInput = screen.getByLabelText('Min Price');
      await user.type(minPriceInput, '100000');

      const maxPriceInput = screen.getByLabelText('Max Price');
      await user.type(maxPriceInput, '150000');

      const locationInput = screen.getByLabelText('Location');
      await user.type(locationInput, 'Tokyo');

      // Step 4: Execute search
      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockPropertyService.searchProperties).toHaveBeenCalledWith('apartment', {
          page: 1,
          limit: 20,
          minPrice: 100000,
          maxPrice: 150000,
          location: 'Tokyo'
        });
      });

      // Step 5: View property details
      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(mockPropertyService.getProperty).toHaveBeenCalledWith(1);
        expect(screen.getByText('Property Details')).toBeInTheDocument();
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
        expect(screen.getByText('3 minutes walk from station, newly built')).toBeInTheDocument();
      });

      // Step 6: Navigate back to search results
      const backButton = screen.getByText('Back to Search');
      await user.click(backButton);

      // Should return to search results
      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeInTheDocument();
      });
    });

    it('should handle mixed translation statuses gracefully', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Complete translation property
      const completeProperty = screen.getByText('New Tokyo Apartment').closest('[data-testid="property-card"]');
      expect(within(completeProperty!).getByText('Shibuya, Tokyo')).toBeInTheDocument();
      expect(within(completeProperty!).getByText('3 minutes walk from station, newly built')).toBeInTheDocument();

      // Partial translation property - should show original Japanese for missing translations
      const partialProperty = screen.getByText('京都の一戸建て').closest('[data-testid="property-card"]');
      expect(within(partialProperty!).getByText('Kyoto City, Kyoto')).toBeInTheDocument(); // Translated location
      expect(within(partialProperty!).getByText('庭付きの一戸建て')).toBeInTheDocument(); // Original Japanese description

      // Translation status indicators should be visible
      expect(screen.getByText('Translation: Complete')).toBeInTheDocument();
      expect(screen.getByText('Translation: Partial')).toBeInTheDocument();
    });
  });

  describe('System Performance and Responsiveness', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockCompleteProperties[0],
        id: i + 1,
        title: `物件 ${i + 1}`,
        titleEn: `Property ${i + 1}`,
        price: 50000 + (i * 1000)
      }));

      mockPropertyService.getProperties.mockResolvedValue({
        success: true,
        data: largeDataset.slice(0, 20), // First page
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: false
        },
        filters: {},
        appliedFiltersCount: 0,
        message: 'Found 100 properties.'
      });

      const startTime = Date.now();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Property 1')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(3000);

      // Should show pagination controls
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should handle rapid user interactions without breaking', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Rapid navigation between pages
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      const homeLink = screen.getByText('Home');
      await user.click(homeLink);

      await user.click(searchLink);

      // Rapid filter changes
      const minPriceInput = screen.getByLabelText('Min Price');
      await user.type(minPriceInput, '50000');
      await user.clear(minPriceInput);
      await user.type(minPriceInput, '100000');

      const locationInput = screen.getByLabelText('Location');
      await user.type(locationInput, 'Tokyo');
      await user.clear(locationInput);
      await user.type(locationInput, 'Osaka');

      // Should remain responsive
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(minPriceInput).toHaveValue('100000');
      expect(locationInput).toHaveValue('Osaka');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle complete system failure gracefully', async () => {
      // Mock complete API failure
      mockPropertyService.getProperties.mockRejectedValue(new Error('System unavailable'));

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByText(/system unavailable/i)).toBeInTheDocument();
      });

      // Should show retry option
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should recover from temporary failures', async () => {
      const user = userEvent.setup();

      // Mock initial failure then success
      mockPropertyService.getProperties
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          success: true,
          data: mockCompleteProperties,
          pagination: {
            page: 1,
            limit: 20,
            total: 3,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          },
          filters: {},
          appliedFiltersCount: 0,
          message: 'Found 3 properties.'
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

      // Click retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should recover and show properties
      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
        expect(screen.getByText('Used Osaka Condo')).toBeInTheDocument();
      });
    });

    it('should handle partial failures in property details', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Mock property detail failure
      mockPropertyService.getProperty.mockRejectedValueOnce(new Error('Property not found'));

      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      // Should show error for property detail
      await waitFor(() => {
        expect(screen.getByText(/property not found/i)).toBeInTheDocument();
      });

      // Should allow navigation back to list
      const backButton = screen.getByText('Back to List');
      await user.click(backButton);

      // Should return to property list
      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });
    });

    it('should handle search failures while maintaining list view', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Navigate to search
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      // Mock search failure
      mockPropertyService.searchProperties.mockRejectedValueOnce(new Error('Search service unavailable'));

      const searchInput = screen.getByPlaceholderText('Search properties...');
      await user.type(searchInput, 'apartment');

      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      // Should show search error
      await waitFor(() => {
        expect(screen.getByText(/search service unavailable/i)).toBeInTheDocument();
      });

      // Should allow fallback to view all properties
      const viewAllButton = screen.getByText('View All Properties');
      await user.click(viewAllButton);

      // Should show all properties
      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Usability', () => {
    it('should support complete keyboard navigation', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Test tab navigation through main elements
      const searchLink = screen.getByText('Search');
      searchLink.focus();
      expect(document.activeElement).toBe(searchLink);

      // Navigate to first property card
      const firstViewDetailsButton = screen.getAllByText('View Details')[0];
      firstViewDetailsButton.focus();
      expect(document.activeElement).toBe(firstViewDetailsButton);

      // Test Enter key activation
      fireEvent.keyDown(firstViewDetailsButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockPropertyService.getProperty).toHaveBeenCalledWith(1);
      });
    });

    it('should provide proper ARIA labels and screen reader support', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Check for proper semantic structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Check property list structure
      const propertyList = screen.getByRole('list');
      expect(propertyList).toBeInTheDocument();
      expect(propertyList).toHaveAttribute('aria-label', 'Property listings');
      
      const propertyItems = within(propertyList).getAllByRole('listitem');
      expect(propertyItems).toHaveLength(3);

      // Check individual property accessibility
      const firstProperty = propertyItems[0];
      expect(firstProperty).toHaveAttribute('aria-labelledby');
      
      // Check for price and location accessibility
      expect(screen.getByText('¥120,000')).toHaveAttribute('aria-label', 'Price: 120,000 yen per month');
      expect(screen.getByText('Shibuya, Tokyo')).toHaveAttribute('aria-label', 'Location: Shibuya, Tokyo');
    });

    it('should handle different screen sizes and orientations', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show mobile navigation
      expect(screen.getByLabelText('menu')).toBeInTheDocument();

      // Test tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
      });

      fireEvent(window, new Event('resize'));

      // Should adapt layout for tablet
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
      });

      fireEvent(window, new Event('resize'));

      // Should show full desktop layout
      expect(screen.getByText('Japanese Real Estate')).toBeInTheDocument();
    });
  });

  describe('Data Consistency and State Management', () => {
    it('should maintain consistent state across navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // Navigate to search and apply filters
      const searchLink = screen.getByText('Search');
      await user.click(searchLink);

      const minPriceInput = screen.getByLabelText('Min Price');
      await user.type(minPriceInput, '100000');

      const locationInput = screen.getByLabelText('Location');
      await user.type(locationInput, 'Tokyo');

      // Navigate to property detail
      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Property Details')).toBeInTheDocument();
      });

      // Navigate back to search
      const backButton = screen.getByText('Back to Search');
      await user.click(backButton);

      // Filters should be preserved
      await waitFor(() => {
        expect(screen.getByLabelText('Min Price')).toHaveValue('100000');
        expect(screen.getByLabelText('Location')).toHaveValue('Tokyo');
      });
    });

    it('should handle concurrent data updates correctly', async () => {
      const user = userEvent.setup();

      // Mock updated property data
      const updatedProperty = {
        ...mockCompleteProperties[0],
        price: 130000,
        titleEn: 'Updated Tokyo Apartment'
      };

      mockPropertyService.getProperty
        .mockResolvedValueOnce({ success: true, data: mockCompleteProperties[0] })
        .mockResolvedValueOnce({ success: true, data: updatedProperty });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
      });

      // View property details
      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('New Tokyo Apartment')).toBeInTheDocument();
        expect(screen.getByText('¥120,000')).toBeInTheDocument();
      });

      // Simulate data refresh (e.g., user refreshes or data updates)
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      // Should show updated data
      await waitFor(() => {
        expect(screen.getByText('Updated Tokyo Apartment')).toBeInTheDocument();
        expect(screen.getByText('¥130,000')).toBeInTheDocument();
      });
    });
  });
});