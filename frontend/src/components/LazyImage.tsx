import React, { useState, useRef, useEffect } from 'react';
import { Box, Skeleton, IconButton } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: string | number;
  height?: string | number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  borderRadius?: string | number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = '100%',
  height = '100%',
  objectFit = 'cover',
  borderRadius = 0,
  onClick,
  className,
  style,
  placeholder,
  errorPlaceholder,
  threshold = 0.1,
  rootMargin = '50px',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  // Handle image loading
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
      setIsRetrying(false);
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoaded(false);
      setIsRetrying(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isInView, isRetrying]);

  const handleRetry = () => {
    setIsRetrying(true);
    setHasError(false);
    setIsLoaded(false);
  };

  const handleImageClick = () => {
    if (onClick && isLoaded && !hasError) {
      onClick();
    }
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    borderRadius,
    overflow: 'hidden',
    position: 'relative',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: isLoaded ? 1 : 0,
  };

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={containerStyle}
      onClick={handleImageClick}
    >
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
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
          }}
        >
          {placeholder || (
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              animation="wave"
              sx={{ borderRadius }}
            />
          )}
        </Box>
      )}

      {/* Error placeholder */}
      {hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.100',
            color: 'grey.500',
          }}
        >
          {errorPlaceholder || (
            <>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Box component="span" sx={{ fontSize: '2rem' }}>
                  📷
                </Box>
                <Box sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                  Failed to load image
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                disabled={isRetrying}
                sx={{
                  backgroundColor: 'white',
                  '&:hover': {
                    backgroundColor: 'grey.50',
                  },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      )}

      {/* Actual image */}
      {isInView && (
        <Box
          ref={imgRef}
          component="img"
          src={src}
          alt={alt}
          sx={imageStyle}
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoaded(false);
          }}
        />
      )}

      {/* Loading indicator for retry */}
      {isRetrying && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '50%',
            p: 1,
          }}
        >
          <RefreshIcon
            sx={{
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': {
                  transform: 'rotate(0deg)',
                },
                '100%': {
                  transform: 'rotate(360deg)',
                },
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default LazyImage;