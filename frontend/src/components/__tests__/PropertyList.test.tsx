import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import PropertyList from '../PropertyList';
import { propertyService } from '../../services/propertyService';
import theme from '../../theme';

// Mock the property service
jest.mock('../../services/propertyService');
const mockedPropertyService = propertyService as jest.Mocked<typeof propertyService>;

const mockProperties = [
  {
    id: 1,
    url: 'https://example.com/property/1',
    title: 'Beautiful Apartment in Tokyo',
    titleEn: 'Beautiful Apartment in Tokyo',
    price: 50000000,
    location: '東京都渋谷区',
    locationEn: 'Shibuya, Tokyo',
    sizeSqm: 45,
    propertyType: 'apartment',
    description: 'A beautiful apartment in the heart of Tokyo',
    descriptionEn: 'A beautiful apartment in the heart of Tokyo',
    images: ['https://example.com/image1.jpg'],
    listingDate: '2024-01-15',
    sourceWebsite: 'suumo.jp',
    translationStatus: 'complete',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    url: 'https://example.com/property/2',
    title: 'Modern House in Osaka',
    titleEn: 'Modern House in Osaka',
    price: 75000000,
    location: '大阪府大阪市',
    locationEn: 'Osaka City, Osaka',
    sizeSqm: 80,
    propertyType: 'house',
    description: 'A modern house with great amenities',
    descriptionEn: 'A modern house with great amenities',
    images: ['https://example.com/image2.jpg'],
    listingDate: '2024-01-16',
    sourceWebsite: 'homes.co.jp',
    translationStatus: 'complete',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
];

const mockPropertyResponse = {
  properties: mockProperties,
  total: 2,
  page: 1,
  totalPages: 1,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('PropertyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders property list successfully', async () => {
    mockedPropertyService.getProperties.mockResolvedValue(mockPropertyResponse);

    render(
      <TestWrapper>
        <PropertyList />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('2 properties found')).toBeInTheDocument();
    });

    // Check if properties are rendered
    expect(screen.getByText('Beautiful Apartment in Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Modern House in Osaka')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    mockedPropertyService.getProperties.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <TestWrapper>
        <PropertyList />
      </TestWrapper>
    );

    // Should show loading skeletons
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays error state when API call fails', async () => {
    mockedPropertyService.getProperties.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <PropertyList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load properties. Please try again later.')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('displays empty state when no properties found', async () => {
    mockedPropertyService.getProperties.mockResolvedValue({
      properties: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    render(
      <TestWrapper>
        <PropertyList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No properties found')).toBeInTheDocument();
    });

    expect(screen.getByText('No properties are currently available.')).toBeInTheDocument();
  });

  test('uses search functionality when searchQuery is provided', async () => {
    mockedPropertyService.searchProperties.mockResolvedValue(mockPropertyResponse);

    render(
      <TestWrapper>
        <PropertyList searchQuery="Tokyo" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockedPropertyService.searchProperties).toHaveBeenCalledWith({
        query: 'Tokyo',
        page: 1,
        limit: 12,
      });
    });
  });

  test('applies filters when provided', async () => {
    const filters = {
      minPrice: 40000000,
      maxPrice: 60000000,
      propertyType: 'apartment',
    };

    mockedPropertyService.getProperties.mockResolvedValue(mockPropertyResponse);

    render(
      <TestWrapper>
        <PropertyList filters={filters} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockedPropertyService.getProperties).toHaveBeenCalledWith({
        ...filters,
        page: 1,
        limit: 12,
      });
    });
  });

  test('does not show pagination when totalPages is 1 or less', async () => {
    mockedPropertyService.getProperties.mockResolvedValue({
      ...mockPropertyResponse,
      totalPages: 1,
    });

    render(
      <TestWrapper>
        <PropertyList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('2 properties found')).toBeInTheDocument();
    });

    // Pagination should not be visible
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});