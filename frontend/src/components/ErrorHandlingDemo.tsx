import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import {
  Error as ErrorIcon,
  NetworkCheck as NetworkIcon,
  Refresh as RefreshIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';
import ErrorBoundary from './ErrorBoundary';
import ErrorAlert from './ErrorAlert';
import GracefulDegradation from './GracefulDegradation';
import { useApiCall } from '../hooks/useApiCall';
import { ApiError } from '../utils/errorUtils';

// Demo component that throws errors
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean; errorType: string }> = ({ 
  shouldThrow, 
  errorType 
}) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'render':
        throw new Error('Render error occurred');
      case 'network':
        const networkError = new Error('Network Error');
        (networkError as any).code = 'NETWORK_ERROR';
        throw networkError;
      case 'server':
        const serverError = new Error('Server Error');
        (serverError as any).response = { status: 500 };
        throw serverError;
      default:
        throw new Error('Unknown error');
    }
  }
  return <Typography color="success.main">✓ Component rendered successfully</Typography>;
};

// Mock API function for testing
const mockApiCall = async (shouldFail: boolean, errorType: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
  
  if (shouldFail) {
    switch (errorType) {
      case 'network':
        const networkError = new Error('Network connection failed');
        (networkError as any).code = 'NETWORK_ERROR';
        throw networkError;
      case 'server':
        const serverError = new Error('Internal server error');
        (serverError as any).response = { status: 500 };
        throw serverError;
      case 'client':
        const clientError = new Error('Bad request');
        (clientError as any).response = { status: 400 };
        throw clientError;
      default:
        throw new Error('Unknown API error');
    }
  }
  
  return 'API call successful!';
};

const ErrorHandlingDemo: React.FC = () => {
  const [renderError, setRenderError] = useState({ shouldThrow: false, type: 'render' });
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [showPartialError, setShowPartialError] = useState(false);

  const {
    state: { data, loading, error },
    execute: callApi,
    retry,
    isRetrying,
  } = useApiCall(mockApiCall);

  const handleRenderError = (errorType: string) => {
    setRenderError({ shouldThrow: true, type: errorType });
    // Reset after a short delay to show recovery
    setTimeout(() => {
      setRenderError({ shouldThrow: false, type: errorType });
    }, 100);
  };

  const handleApiError = async (errorType: string) => {
    try {
      await callApi(true, errorType);
    } catch (err) {
      // Error is handled by useApiCall
    }
  };

  const handleSuccessfulApiCall = async () => {
    try {
      await callApi(false, '');
    } catch (err) {
      // Should not happen
    }
  };

  const createMockError = (type: string): ApiError => {
    switch (type) {
      case 'network':
        return {
          message: 'Unable to connect to the server. Please check your internet connection.',
          code: 'NETWORK_ERROR',
          type: 'network',
          retryable: true,
        };
      case 'server':
        return {
          message: 'Internal server error. Please try again later.',
          code: 'INTERNAL_ERROR',
          status: 500,
          type: 'server',
          retryable: true,
        };
      case 'client':
        return {
          message: 'Invalid request. Please check your input.',
          code: 'BAD_REQUEST',
          status: 400,
          type: 'client',
          retryable: false,
        };
      default:
        return {
          message: 'An unexpected error occurred.',
          code: 'UNKNOWN_ERROR',
          type: 'unknown',
          retryable: true,
        };
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Error Handling Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This demo showcases the comprehensive error handling system implemented in the application.
      </Typography>

      <Grid container spacing={3}>
        {/* Error Boundary Demo */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <BugIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Error Boundary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Catches JavaScript errors in React components and displays fallback UI.
            </Typography>

            <ErrorBoundary>
              <Box sx={{ mb: 2, p: 2, border: '1px dashed', borderColor: 'grey.300' }}>
                <ErrorThrowingComponent 
                  shouldThrow={renderError.shouldThrow} 
                  errorType={renderError.type}
                />
              </Box>
            </ErrorBoundary>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleRenderError('render')}
              >
                Trigger Render Error
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => handleRenderError('network')}
              >
                Trigger Network Error
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* API Error Handling Demo */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <NetworkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              API Error Handling
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Handles API errors with retry mechanisms and user-friendly messages.
            </Typography>

            <Box sx={{ mb: 2, p: 2, border: '1px dashed', borderColor: 'grey.300' }}>
              {loading || isRetrying ? (
                <Typography color="info.main">
                  {isRetrying ? '🔄 Retrying...' : '⏳ Loading...'}
                </Typography>
              ) : error ? (
                <Typography color="error.main">❌ {error.message}</Typography>
              ) : data ? (
                <Typography color="success.main">✓ {data}</Typography>
              ) : (
                <Typography color="text.secondary">Ready to make API call</Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleApiError('network')}
                disabled={loading || isRetrying}
              >
                Network Error
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleApiError('server')}
                disabled={loading || isRetrying}
              >
                Server Error
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={handleSuccessfulApiCall}
                disabled={loading || isRetrying}
              >
                Success Call
              </Button>
            </Stack>

            {error && (
              <Button
                size="small"
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={retry}
                disabled={isRetrying}
              >
                Retry
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Error Alert Demo */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <ErrorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Error Alert Components
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Different types of error alerts with appropriate styling and actions.
            </Typography>

            <Stack spacing={2}>
              <ErrorAlert
                error={createMockError('network')}
                onRetry={() => console.log('Retry network error')}
                showDetails={true}
              />
              
              <ErrorAlert
                error={createMockError('server')}
                onRetry={() => console.log('Retry server error')}
                onDismiss={() => console.log('Dismiss server error')}
                context="Data Loading"
              />
              
              <ErrorAlert
                error={createMockError('client')}
                onDismiss={() => console.log('Dismiss client error')}
                context="Form Validation"
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Graceful Degradation Demo */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Graceful Degradation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Shows how the application handles partial failures while maintaining functionality.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <GracefulDegradation loading={true}>
                  <Typography>This content is loading...</Typography>
                </GracefulDegradation>
              </Grid>

              <Grid item xs={12} md={4}>
                <GracefulDegradation
                  error={new Error('Critical error')}
                  onRetry={() => console.log('Retry critical error')}
                >
                  <Typography>This content failed to load</Typography>
                </GracefulDegradation>
              </Grid>

              <Grid item xs={12} md={4}>
                <GracefulDegradation
                  partial={true}
                  warningMessage="Some features may not be available due to a temporary issue."
                  onRetry={() => console.log('Retry partial error')}
                >
                  <Typography>This content loaded with warnings</Typography>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Partial content available
                  </Alert>
                </GracefulDegradation>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Alert severity="info">
        <Typography variant="body2">
          <strong>Error Handling Features:</strong>
          <br />
          • Error boundaries catch React component errors
          <br />
          • API errors are parsed and displayed with user-friendly messages
          <br />
          • Automatic retry mechanisms with exponential backoff
          <br />
          • Graceful degradation for partial system failures
          <br />
          • Comprehensive error logging and monitoring
        </Typography>
      </Alert>
    </Box>
  );
};

export default ErrorHandlingDemo;