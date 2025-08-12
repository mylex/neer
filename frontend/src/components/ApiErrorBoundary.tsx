import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import { Wifi as WifiIcon, CloudOff as CloudOffIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  errorType: 'network' | 'server' | 'unknown';
  errorMessage: string;
}

class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorType: 'unknown',
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: any): State {
    // Determine error type based on error properties
    let errorType: 'network' | 'server' | 'unknown' = 'unknown';
    let errorMessage = 'An unexpected error occurred';

    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
      errorType = 'network';
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error?.response?.status >= 500) {
      errorType = 'server';
      errorMessage = 'The server is currently experiencing issues. Please try again later.';
    } else if (error?.response?.status === 404) {
      errorType = 'server';
      errorMessage = 'The requested resource was not found.';
    } else if (error?.response?.status === 429) {
      errorType = 'server';
      errorMessage = 'Too many requests. Please wait a moment before trying again.';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      hasError: true,
      errorType,
      errorMessage,
    };
  }

  componentDidCatch(error: Error) {
    console.error('ApiErrorBoundary caught an error:', error);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorType: 'unknown',
      errorMessage: '',
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  getErrorIcon = () => {
    switch (this.state.errorType) {
      case 'network':
        return <WifiIcon sx={{ fontSize: 48, color: 'warning.main' }} />;
      case 'server':
        return <CloudOffIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      default:
        return <CloudOffIcon sx={{ fontSize: 48, color: 'error.main' }} />;
    }
  };

  getErrorTitle = () => {
    switch (this.state.errorType) {
      case 'network':
        return 'Connection Problem';
      case 'server':
        return 'Server Error';
      default:
        return 'Something Went Wrong';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            p: 2,
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 3,
              maxWidth: 500,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {this.getErrorIcon()}
            
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {this.getErrorTitle()}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.errorMessage}
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                size="small"
              >
                Try Again
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ApiErrorBoundary;