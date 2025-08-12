import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';
import App from '../App';
import * as propertyService from '../services/propertyService';

// Mock the property service
jest.mock('../services/propertyService');
const mockedPropertyService = propertyService as jest.Mocked<typeof propertyService>;

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

const renderApp = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles API errors gracefully in property list', async () => {
    // Mock API to return an error
    mockedPropertyService.propertyService.getProperties.mockRejectedValue(
      new Error('Network error')
    );

    renderApp();

    // Wait for the error to appear
    await waitFor(() => {
      expect(screen.getByText(/Property Loading Error/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Network error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retries API calls when retry button is clicked', async () => {
    // Mock API to fail first, then succeed
    mockedPropertyService.propertyService.getProperties
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        properties: [
          {
            id: 1,
            title: 'Test Property',
            titleEn: 'Test Property',
            price: 100000,
            location: 'Tokyo',
            locationEn: 'Tokyo',
            sizeSqm: 50,
            propertyType: 'apartment',
            description: 'Test description',
            descriptionEn: 'Test description',
            images: [],
            listingDate: '2024-01-01',
            sourceWebsite: 'test.com',
            translationStatus: 'complete',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            url: 'http://test.com/property/1',
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      });

    renderApp();

    // Wait for the error to appear
    await waitFor(() => {
      expect(screen.getByText(/Property Loading Error/)).toBeInTheDocument();
    });

    // Click retry button
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Wait for the property to load
    await waitFor(() => {
      expect(screen.getByText('Test Property')).toBeInTheDocument();
    });

    // Verify the API was called twice (initial + retry)
    expect(mockedPropertyService.propertyService.getProperties).toHaveBeenCalledTimes(2);
  });

  it('shows graceful degradation for partial failures', async () => {
    // Mock API to return partial data
    mockedPropertyService.propertyService.getProperties.mockResolvedValue({
      properties: [
        {
          id: 1,
          title: 'Test Property',
          titleEn: 'Test Property',
          price: 100000,
          location: 'Tokyo',
          locationEn: 'Tokyo',
          sizeSqm: 50,
          propertyType: 'apartment',
          description: 'Test description',
          descriptionEn: 'Test description',
          images: [],
          listingDate: '2024-01-01',
          sourceWebsite: 'test.com',
          translationStatus: 'partial', // Partial translation
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          url: 'http://test.com/property/1',
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    renderApp();

    // Wait for the property to load
    await waitFor(() => {
      expect(screen.getByText('Test Property')).toBeInTheDocument();
    });

    // Should show the property even with partial translation
    expect(screen.getByText('1 properties found')).toBeInTheDocument();
  });

  it('handles network errors with appropriate messaging', async () => {
    // Mock network error
    const networkError = new Error('Network Error');
    networkError.name = 'NetworkError';
    mockedPropertyService.propertyService.getProperties.mockRejectedValue(networkError);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Property Loading Error/)).toBeInTheDocument();
    });

    // Should show network-specific error message
    expect(screen.getByText(/Network Error/)).toBeInTheDocument();
  });

  it('handles server errors with appropriate messaging', async () => {
    // Mock server error
    const serverError = {
      response: {
        status: 500,
        data: { message: 'Internal server error' },
      },
    };
    mockedPropertyService.propertyService.getProperties.mockRejectedValue(serverError);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Property Loading Error/)).toBeInTheDocument();
    });

    // Should show server error message
    expect(screen.getByText(/Failed to fetch properties/)).toBeInTheDocument();
  });
});