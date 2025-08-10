import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Modal,
  Backdrop,
  Fade,
  Paper,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <Paper
        sx={{
          height: { xs: 250, md: 400 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.100',
          borderRadius: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'grey.500' }}>
          <HomeIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="body2">No images available</Typography>
        </Box>
      </Paper>
    );
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  const handleImageClick = () => {
    setModalImageIndex(currentIndex);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleModalPrevious = () => {
    setModalImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleModalNext = () => {
    setModalImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      handleModalPrevious();
    } else if (event.key === 'ArrowRight') {
      handleModalNext();
    } else if (event.key === 'Escape') {
      handleModalClose();
    }
  };

  return (
    <>
      {/* Main Gallery */}
      <Box sx={{ position: 'relative' }}>
        {/* Main Image */}
        <Box
          sx={{
            position: 'relative',
            height: { xs: 250, md: 400 },
            borderRadius: 2,
            overflow: 'hidden',
            cursor: 'pointer',
            '&:hover .gallery-controls': {
              opacity: 1,
            },
          }}
          onClick={handleImageClick}
        >
          <Box
            component="img"
            src={images[currentIndex]}
            alt={`${title} - Image ${currentIndex + 1}`}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          />

          {/* Navigation Controls */}
          {images.length > 1 && (
            <>
              <Box
                className="gallery-controls"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: { xs: 1, md: 0 },
                  transition: 'opacity 0.3s ease',
                  pointerEvents: 'none',
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  sx={{
                    ml: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    pointerEvents: 'auto',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>

                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  sx={{
                    mr: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    pointerEvents: 'auto',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Box>

              {/* Image Counter */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                }}
              >
                {currentIndex + 1} / {images.length}
              </Box>

              {/* Fullscreen Icon */}
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick();
                }}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <FullscreenIcon />
              </IconButton>
            </>
          )}
        </Box>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mt: 2,
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'grey.200',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: 'grey.500',
                },
              },
            }}
          >
            {images.map((image, index) => (
              <Box
                key={index}
                onClick={() => handleThumbnailClick(index)}
                sx={{
                  minWidth: { xs: 60, md: 80 },
                  height: { xs: 60, md: 80 },
                  borderRadius: 1,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: currentIndex === index ? 2 : 1,
                  borderColor: currentIndex === index ? 'primary.main' : 'grey.300',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={image}
                  alt={`${title} - Thumbnail ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Fullscreen Modal */}
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
        }}
      >
        <Fade in={modalOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
            }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {/* Close Button */}
            <IconButton
              onClick={handleModalClose}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>

            {/* Modal Image */}
            <Box
              component="img"
              src={images[modalImageIndex]}
              alt={`${title} - Image ${modalImageIndex + 1}`}
              sx={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
              }}
            />

            {/* Modal Navigation */}
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={handleModalPrevious}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>

                <IconButton
                  onClick={handleModalNext}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>

                {/* Modal Image Counter */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontSize: '1rem',
                  }}
                >
                  {modalImageIndex + 1} / {images.length}
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

export default ImageGallery;