import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import ImageGallery from '../ImageGallery';
import theme from '../../theme';

const mockImages = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg',
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ImageGallery', () => {
  it('renders empty state when no images provided', () => {
    renderWithTheme(<ImageGallery images={[]} title="Test Property" />);
    
    expect(screen.getByText('No images available')).toBeInTheDocument();
  });

  it('renders single image without navigation controls', () => {
    const singleImage = ['https://example.com/image1.jpg'];
    renderWithTheme(<ImageGallery images={singleImage} title="Test Property" />);
    
    const image = screen.getByAltText('Test Property - Image 1');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', singleImage[0]);
    
    // Should not show navigation controls for single image
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders multiple images with navigation controls', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // Should show first image by default
    const mainImage = screen.getByAltText('Test Property - Image 1');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', mockImages[0]);
    
    // Should show navigation buttons (using testid since they don't have aria-labels)
    expect(screen.getByTestId('ChevronLeftIcon')).toBeInTheDocument();
    expect(screen.getByTestId('ChevronRightIcon')).toBeInTheDocument();
    
    // Should show image counter
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('navigates to next image when next button is clicked', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    const nextButton = screen.getByTestId('ChevronRightIcon').closest('button')!;
    fireEvent.click(nextButton);
    
    const mainImage = screen.getByAltText('Test Property - Image 2');
    expect(mainImage).toHaveAttribute('src', mockImages[1]);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('navigates to previous image when previous button is clicked', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // First go to next image
    const nextButton = screen.getByTestId('ChevronRightIcon').closest('button')!;
    fireEvent.click(nextButton);
    
    // Then go back to previous
    const prevButton = screen.getByTestId('ChevronLeftIcon').closest('button')!;
    fireEvent.click(prevButton);
    
    const mainImage = screen.getByAltText('Test Property - Image 1');
    expect(mainImage).toHaveAttribute('src', mockImages[0]);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('wraps around when navigating past last image', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    const nextButton = screen.getByTestId('ChevronRightIcon').closest('button')!;
    
    // Click next twice to get to last image
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    
    // Click next again to wrap to first image
    fireEvent.click(nextButton);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('wraps around when navigating before first image', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    const prevButton = screen.getByTestId('ChevronLeftIcon').closest('button')!;
    
    // Click previous from first image to wrap to last
    fireEvent.click(prevButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('renders thumbnail strip for multiple images', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // Should show thumbnails
    const thumbnails = screen.getAllByAltText(/Test Property - Thumbnail/);
    expect(thumbnails).toHaveLength(3);
    
    thumbnails.forEach((thumbnail, index) => {
      expect(thumbnail).toHaveAttribute('src', mockImages[index]);
    });
  });

  it('changes main image when thumbnail is clicked', () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // Click on third thumbnail
    const thirdThumbnail = screen.getByAltText('Test Property - Thumbnail 3');
    fireEvent.click(thirdThumbnail);
    
    // Main image should change to third image
    const mainImage = screen.getByAltText('Test Property - Image 3');
    expect(mainImage).toHaveAttribute('src', mockImages[2]);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('opens modal when main image is clicked', async () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    const mainImage = screen.getByAltText('Test Property - Image 1');
    fireEvent.click(mainImage);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });
  });

  it('opens modal when fullscreen button is clicked', async () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    const fullscreenButton = screen.getByTestId('FullscreenIcon').closest('button')!;
    fireEvent.click(fullscreenButton);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // Open modal
    const mainImage = screen.getByAltText('Test Property - Image 1');
    fireEvent.click(mainImage);
    
    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });
    
    // Close modal
    const closeButton = screen.getByTestId('CloseIcon').closest('button')!;
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });
  });

  it('navigates images in modal with keyboard', async () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // Open modal
    const mainImage = screen.getByAltText('Test Property - Image 1');
    fireEvent.click(mainImage);
    
    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });
    
    // Navigate with arrow keys - need to target the focusable element
    const modalContent = screen.getByRole('presentation').querySelector('[tabindex="-1"]')!;
    fireEvent.keyDown(modalContent, { key: 'ArrowRight' });
    
    // Should show second image in modal - check for multiple counters
    await waitFor(() => {
      const counters = screen.getAllByText(/2 \/ 3/);
      expect(counters.length).toBeGreaterThan(0);
    });
    
    fireEvent.keyDown(modalContent, { key: 'ArrowLeft' });
    
    // Should go back to first image
    await waitFor(() => {
      const counters = screen.getAllByText(/1 \/ 3/);
      expect(counters.length).toBeGreaterThan(0);
    });
  });

  it('closes modal with Escape key', async () => {
    renderWithTheme(<ImageGallery images={mockImages} title="Test Property" />);
    
    // Open modal
    const mainImage = screen.getByAltText('Test Property - Image 1');
    fireEvent.click(mainImage);
    
    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });
    
    // Close with Escape key - target the focusable element
    const modalContent = screen.getByRole('presentation').querySelector('[tabindex="-1"]')!;
    fireEvent.keyDown(modalContent, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    });
  });

  it('handles empty images array gracefully', () => {
    renderWithTheme(<ImageGallery images={[]} title="Test Property" />);
    
    expect(screen.getByText('No images available')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('handles undefined images gracefully', () => {
    renderWithTheme(<ImageGallery images={undefined as any} title="Test Property" />);
    
    expect(screen.getByText('No images available')).toBeInTheDocument();
  });
});