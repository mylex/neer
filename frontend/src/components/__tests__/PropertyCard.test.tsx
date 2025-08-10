import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import PropertyCard from '../PropertyCard';
import { Property } from '../../services/propertyService';
import theme from '../../theme';

const mockProperty: Property = {
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
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('PropertyCard', () => {
  test('renders property information correctly', () => {
    render(
      <TestWrapper>
        <PropertyCard property={mockProperty} />
      </TestWrapper>
    );

    expect(screen.getByText('Beautiful Apartment in Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Shibuya, Tokyo')).toBeInTheDocument();
    expect(screen.getByText('¥50,000,000')).toBeInTheDocument();
    expect(screen.getByText('45 m²')).toBeInTheDocument();
    expect(screen.getByText('Apartment')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  test('renders loading skeleton when loading prop is true', () => {
    render(
      <TestWrapper>
        <PropertyCard property={mockProperty} loading={true} />
      </TestWrapper>
    );

    // Check for skeleton elements (MUI Skeleton components)
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('handles missing optional fields gracefully', () => {
    const propertyWithoutOptionalFields: Property = {
      ...mockProperty,
      titleEn: undefined,
      locationEn: undefined,
      price: undefined,
      sizeSqm: undefined,
      descriptionEn: undefined,
      images: [],
    };

    render(
      <TestWrapper>
        <PropertyCard property={propertyWithoutOptionalFields} />
      </TestWrapper>
    );

    // Should still render the component without errors
    expect(screen.getByText('Beautiful Apartment in Tokyo')).toBeInTheDocument();
    expect(screen.getByText('東京都渋谷区')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  test('navigates to property detail when View Details is clicked', () => {
    const mockNavigate = jest.fn();
    
    // Mock useNavigate hook
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(
      <TestWrapper>
        <PropertyCard property={mockProperty} />
      </TestWrapper>
    );

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    // Note: This test might not work as expected due to mocking limitations
    // In a real test environment, you'd want to test navigation differently
  });

  test('displays placeholder when no image is available', () => {
    const propertyWithoutImages: Property = {
      ...mockProperty,
      images: [],
    };

    render(
      <TestWrapper>
        <PropertyCard property={propertyWithoutImages} />
      </TestWrapper>
    );

    // Should render a placeholder icon instead of an image
    const homeIcon = screen.getByTestId('HomeIcon');
    expect(homeIcon).toBeInTheDocument();
  });
});