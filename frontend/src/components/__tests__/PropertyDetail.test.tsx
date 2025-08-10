import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import PropertyDetail from '../PropertyDetail';
import { Property } from '../../services/propertyService';
import theme from '../../theme';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
});

const mockProperty: Property = {
  id: 1,
  url: 'https://example.com/property/1',
  title: 'Beautiful Apartment in Tokyo',
  titleEn: 'Beautiful Apartment in Tokyo',
  price: 50000000,
  location: '東京都渋谷区',
  locationEn: 'Shibuya, Tokyo',
  sizeSqm: 45.5,
  propertyType: 'apartment',
  description: 'A beautiful apartment with great views.',
  descriptionEn: 'A beautiful apartment with great views.',
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ],
  listingDate: '2024-01-15',
  sourceWebsite: 'suumo.jp',
  translationStatus: 'complete',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('PropertyDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} loading={true} />
    );

    // Check for skeleton elements by class
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    // Check that there are multiple skeleton elements (exact count may vary)
    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(5);
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load property';
    renderWithProviders(
      <PropertyDetail property={mockProperty} error={errorMessage} />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('renders property details correctly', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    expect(screen.getByText('Property Details')).toBeInTheDocument();
    expect(screen.getByText(mockProperty.titleEn!)).toBeInTheDocument();
    expect(screen.getByText(mockProperty.locationEn!)).toBeInTheDocument();
    expect(screen.getAllByText('¥50,000,000')).toHaveLength(2); // Appears in chip and sidebar
    expect(screen.getAllByText('45.5 m²')).toHaveLength(2); // Appears in chip and sidebar
    expect(screen.getAllByText('Apartment')).toHaveLength(2); // Appears in chip and sidebar
  });

  it('displays both Japanese and English content when translation exists', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    // Should show English by default
    expect(screen.getByText(mockProperty.titleEn!)).toBeInTheDocument();
    expect(screen.getByText(mockProperty.locationEn!)).toBeInTheDocument();

    // Toggle to Japanese
    const languageSwitch = screen.getByRole('checkbox');
    fireEvent.click(languageSwitch);

    expect(screen.getByText(mockProperty.title)).toBeInTheDocument();
    expect(screen.getByText(mockProperty.location)).toBeInTheDocument();
  });

  it('handles back navigation', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    const backButton = screen.getByText('Back to Search');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('opens original listing in new tab', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    const originalListingButton = screen.getByText('Original Listing');
    fireEvent.click(originalListingButton);

    expect(window.open).toHaveBeenCalledWith(
      mockProperty.url,
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('renders property without images', () => {
    const propertyWithoutImages = {
      ...mockProperty,
      images: [],
    };

    renderWithProviders(
      <PropertyDetail property={propertyWithoutImages} />
    );

    // When there are no images, the ImageGallery component is not rendered at all
    // So we should just check that the property details are still shown
    expect(screen.getByText('Property Details')).toBeInTheDocument();
    expect(screen.getByText(mockProperty.titleEn!)).toBeInTheDocument();
    // The ImageGallery should not be present
    expect(screen.queryByText('No images available')).not.toBeInTheDocument();
  });

  it('renders property without translation', () => {
    const propertyWithoutTranslation = {
      ...mockProperty,
    };
    // Remove the translation fields
    delete (propertyWithoutTranslation as any).titleEn;
    delete (propertyWithoutTranslation as any).locationEn;
    delete (propertyWithoutTranslation as any).descriptionEn;

    renderWithProviders(
      <PropertyDetail property={propertyWithoutTranslation as Property} />
    );

    // Should show original Japanese text
    expect(screen.getByText(mockProperty.title)).toBeInTheDocument();
    expect(screen.getByText(mockProperty.location)).toBeInTheDocument();

    // Language switch should not be visible
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('displays property information in sidebar', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    expect(screen.getByText('Property Information')).toBeInTheDocument();
    expect(screen.getByText('Price:')).toBeInTheDocument();
    expect(screen.getByText('Size:')).toBeInTheDocument();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Source:')).toBeInTheDocument();
    expect(screen.getByText('Listed:')).toBeInTheDocument();
  });

  it('handles missing optional property fields', () => {
    const minimalProperty = {
      ...mockProperty,
      price: 0, // Use 0 instead of undefined since price is required
      sizeSqm: 0, // Use 0 instead of undefined since sizeSqm is required  
      description: '', // Use empty string instead of undefined since description is required
    };
    // Remove the optional field
    delete (minimalProperty as any).descriptionEn;

    renderWithProviders(
      <PropertyDetail property={minimalProperty as Property} />
    );

    // Should still render without errors
    expect(screen.getByText('Property Details')).toBeInTheDocument();
    expect(screen.getByText(mockProperty.titleEn!)).toBeInTheDocument();
  });

  it('shows translation status chip', () => {
    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('handles responsive design elements', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    renderWithProviders(
      <PropertyDetail property={mockProperty} />
    );

    // Component should render without errors on mobile
    expect(screen.getByText('Property Details')).toBeInTheDocument();
  });
});