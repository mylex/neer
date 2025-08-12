// Performance optimization utilities

// Image optimization
export const optimizeImageUrl = (url: string, width?: number, height?: number, quality?: number): string => {
  if (!url) return url;
  
  // For external images, we can't optimize them directly
  // But we can add parameters if the service supports it
  const urlObj = new URL(url);
  
  if (width) urlObj.searchParams.set('w', width.toString());
  if (height) urlObj.searchParams.set('h', height.toString());
  if (quality) urlObj.searchParams.set('q', quality.toString());
  
  return urlObj.toString();
};

// Debounce function for search inputs
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Lazy loading intersection observer options
export const lazyLoadOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '50px',
  threshold: 0.1,
};

// Virtual scrolling configuration
export const virtualScrollConfig = {
  itemHeight: 300, // Approximate height of PropertyCard
  overscan: 5, // Number of items to render outside visible area
  threshold: 100, // Threshold for triggering load more
};

// Memory management
export const cleanupImageCache = () => {
  // Clear any cached images that are no longer needed
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('images')) {
          caches.delete(name);
        }
      });
    });
  }
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

// Bundle splitting helpers
export const loadComponent = (importFn: () => Promise<any>) => {
  return React.lazy(importFn);
};

// Service worker registration for caching
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap';
  fontLink.as = 'style';
  document.head.appendChild(fontLink);
  
  // Preload critical API endpoints
  if ('fetch' in window) {
    fetch('/api/stats', { method: 'HEAD' }).catch(() => {});
  }
};

// Image compression utility
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// React import for lazy loading
import React from 'react';