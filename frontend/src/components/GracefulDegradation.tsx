import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Paper,
  Skeleton,
} from '@mui/material';
import { Warning as WarningIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface GracefulDegradationProps {
  children: ReactNode;
  fallback?: ReactNode;
  error?: Error | null;
  loading?: boolean;
  partial?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  errorMessage?: string;
  warningMessage?: string;
}

const GracefulDegradation: React.FC<GracefulDegradationProps> = ({
  children,
  fallback,
  error,
  loading = false,
  partial = false,
  onRetry,
  retryLabel = 'Try Again',
  errorMessage,
  warningMessage,
}) => {
  // Show loading skeleton if loading
  if (loading && !partial) {
    return fallback || (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="text" sx={{ mt: 1 }} />
        <Skeleton variant="text" width="60%" />
      </Box>
    );
  }

  // Show error state if there's a critical error
  if (error && !partial) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: 'error.light',
          color: 'error.contrastText',
        }}
      >
        <WarningIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Unable to Load Content
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {errorMessage || 'Something went wrong while loading this content.'}
        </Typography>
        {onRetry && (
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{
              backgroundColor: 'error.dark',
              '&:hover': {
                backgroundColor: 'error.main',
              },
            }}
          >
            {retryLabel}
          </Button>
        )}
      </Paper>
    );
  }

  // Show partial error warning with degraded content
  if (partial && (error || warningMessage)) {
    return (
      <Box>
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            onRetry ? (
              <Button
                color="inherit"
                size="small"
                onClick={onRetry}
                startIcon={<RefreshIcon />}
              >
                {retryLabel}
              </Button>
            ) : undefined
          }
        >
          <AlertTitle>Partial Content Available</AlertTitle>
          {warningMessage || errorMessage || 'Some features may not be available due to a temporary issue.'}
        </Alert>
        {children}
      </Box>
    );
  }

  // Normal rendering
  return <>{children}</>;
};

export default GracefulDegradation;