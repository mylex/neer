import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorAlert from '../ErrorAlert';
import { ApiError } from '../../utils/errorUtils';

describe('ErrorAlert', () => {
  const mockNetworkError: ApiError = {
    message: 'Network connection failed',
    code: 'NETWORK_ERROR',
    type: 'network',
    retryable: true,
  };

  const mockServerError: ApiError = {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    status: 500,
    type: 'server',
    retryable: true,
  };

  const mockClientError: ApiError = {
    message: 'Bad request',
    code: 'BAD_REQUEST',
    status: 400,
    type: 'client',
    retryable: false,
  };

  it('renders error message correctly', () => {
    render(<ErrorAlert error={mockNetworkError} />);

    expect(screen.getByText('Connection Issue')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const onRetry = jest.fn();
    render(<ErrorAlert error={mockNetworkError} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for non-retryable errors', () => {
    render(<ErrorAlert error={mockClientError} />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorAlert error={mockNetworkError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows details when showDetails is true', () => {
    render(<ErrorAlert error={mockServerError} showDetails={true} />);

    const detailsButton = screen.getByRole('button', { name: /details/i });
    expect(detailsButton).toBeInTheDocument();

    fireEvent.click(detailsButton);

    expect(screen.getByText('Error Code:')).toBeInTheDocument();
    expect(screen.getByText('INTERNAL_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('uses correct severity for different error types', () => {
    const { rerender } = render(<ErrorAlert error={mockNetworkError} />);
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardWarning');

    rerender(<ErrorAlert error={mockServerError} />);
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');

    rerender(<ErrorAlert error={mockClientError} />);
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardInfo');
  });

  it('shows custom context in title', () => {
    render(<ErrorAlert error={mockNetworkError} context="Property Loading" />);

    expect(screen.getByText('Property Loading Error')).toBeInTheDocument();
  });

  it('uses custom retry and dismiss labels', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();

    render(
      <ErrorAlert
        error={mockNetworkError}
        onRetry={onRetry}
        onDismiss={onDismiss}
        retryLabel="Retry Now"
        dismissLabel="Close"
      />
    );

    expect(screen.getByRole('button', { name: 'Retry Now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});