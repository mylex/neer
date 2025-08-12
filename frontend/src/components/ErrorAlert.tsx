import React from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  Collapse,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { ApiError } from '../utils/errorUtils';

interface ErrorAlertProps {
  error: ApiError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  retryLabel?: string;
  dismissLabel?: string;
  context?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss',
  context,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const getSeverity = () => {
    switch (error.type) {
      case 'network':
        return 'warning';
      case 'server':
        return 'error';
      case 'client':
        return 'info';
      default:
        return 'error';
    }
  };

  const getTitle = () => {
    if (context) {
      return `${context} Error`;
    }

    switch (error.type) {
      case 'network':
        return 'Connection Issue';
      case 'server':
        return 'Server Error';
      case 'client':
        return 'Request Error';
      default:
        return 'Error';
    }
  };

  const handleToggleDetails = () => {
    setExpanded(!expanded);
  };

  return (
    <Alert
      severity={getSeverity()}
      sx={{ mb: 2 }}
      action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {showDetails && (
            <Button
              color="inherit"
              size="small"
              onClick={handleToggleDetails}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              Details
            </Button>
          )}
          {error.retryable && onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<RefreshIcon />}
            >
              {retryLabel}
            </Button>
          )}
          {onDismiss && (
            <Button
              color="inherit"
              size="small"
              onClick={onDismiss}
            >
              {dismissLabel}
            </Button>
          )}
        </Box>
      }
    >
      <AlertTitle>{getTitle()}</AlertTitle>
      {error.message}
      
      {showDetails && (
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
            <Typography variant="body2" component="div">
              <strong>Error Code:</strong> {error.code || 'Unknown'}
            </Typography>
            {error.status && (
              <Typography variant="body2" component="div">
                <strong>Status:</strong> {error.status}
              </Typography>
            )}
            <Typography variant="body2" component="div">
              <strong>Type:</strong> {error.type}
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}
            </Typography>
          </Box>
        </Collapse>
      )}
    </Alert>
  );
};

export default ErrorAlert;