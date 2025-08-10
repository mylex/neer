import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material';
import '@testing-library/jest-dom';
import App from './App';
import theme from './theme';

// Create a test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

test('renders Japanese Real Estate title in header', () => {
  render(
    <TestWrapper>
      <App />
    </TestWrapper>
  );
  
  const banner = screen.getByRole('banner');
  expect(banner).toHaveTextContent('Japanese Real Estate');
});

test('renders Property Listings heading', () => {
  render(
    <TestWrapper>
      <App />
    </TestWrapper>
  );
  
  const headingElement = screen.getByRole('heading', { level: 1 });
  expect(headingElement).toHaveTextContent('Property Listings');
});