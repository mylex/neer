import axios, { AxiosError, AxiosResponse } from 'axios';
import { parseApiError } from '../utils/errorUtils';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env['REACT_APP_API_URL'] || '/api',
  timeout: 30000, // Increased timeout for better UX
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens or other headers
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here (e.g., auth tokens)
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(parseApiError(error));
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const endTime = new Date();
      const duration = endTime.getTime() - response.config.metadata.startTime.getTime();
      console.log(`API call to ${response.config.url} took ${duration}ms`);
    }
    return response;
  },
  (error: AxiosError) => {
    // Enhanced error handling with user-friendly messages
    const apiError = parseApiError(error);
    
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: apiError.message,
        originalError: error,
      });
    }

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Handle unauthorized access - could redirect to login
      console.warn('Unauthorized access detected');
    } else if (error.response?.status >= 500) {
      // Handle server errors - could show maintenance message
      console.error('Server error detected:', error.response.status);
    }

    return Promise.reject(apiError);
  }
);

// Add request/response type declarations
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

export default api;