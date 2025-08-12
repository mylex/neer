import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import Layout from '../Layout';
import theme from '../../theme';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' })
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render header with title', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText('Japanese Real Estate')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render navigation menu', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should render children content', () => {
      const testContent = 'This is test content';
      render(
        <TestWrapper>
          <Layout>
            <div>{testContent}</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText(testContent)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to properties page when Properties link is clicked', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const propertiesLink = screen.getByText('Properties');
      fireEvent.click(propertiesLink);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to search page when Search link is clicked', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const searchLink = screen.getByText('Search');
      fireEvent.click(searchLink);

      expect(mockNavigate).toHaveBeenCalledWith('/search');
    });

    it('should navigate to home when title is clicked', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const titleLink = screen.getByText('Japanese Real Estate');
      fireEvent.click(titleLink);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('responsive behavior', () => {
    it('should show mobile menu button on small screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should open mobile drawer when menu button is clicked', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('presentation')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // Navigation
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const propertiesLink = screen.getByText('Properties');
      propertiesLink.focus();
      expect(document.activeElement).toBe(propertiesLink);

      // Test Tab navigation
      fireEvent.keyDown(propertiesLink, { key: 'Tab' });
      const searchLink = screen.getByText('Search');
      expect(document.activeElement).toBe(searchLink);
    });

    it('should support Enter key for navigation', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const propertiesLink = screen.getByText('Properties');
      fireEvent.keyDown(propertiesLink, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('theme integration', () => {
    it('should apply theme colors correctly', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveStyle({
        backgroundColor: theme.palette.primary.main
      });
    });
  });

  describe('error boundaries', () => {
    it('should handle children rendering errors gracefully', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <TestWrapper>
            <Layout>
              <ThrowError />
            </Layout>
          </TestWrapper>
        );
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('loading states', () => {
    it('should show loading indicator when loading prop is true', () => {
      render(
        <TestWrapper>
          <Layout loading={true}>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should hide content when loading', () => {
      render(
        <TestWrapper>
          <Layout loading={true}>
            <div data-testid="content">Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('should render footer with copyright information', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Japanese Real Estate Scraper`)).toBeInTheDocument();
    });

    it('should render footer links', () => {
      render(
        <TestWrapper>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </TestWrapper>
      );

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });
  });
});