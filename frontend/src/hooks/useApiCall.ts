import { useState, useCallback } from 'react';
import { ApiError, parseApiError } from '../utils/errorUtils';
import { useRetry } from './useRetry';

interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiCallOptions {
  maxRetries?: number;
  onError?: (error: ApiError) => void;
  onSuccess?: () => void;
}

interface UseApiCallReturn<T> {
  state: ApiCallState<T>;
  execute: (...args: any[]) => Promise<T>;
  retry: () => Promise<T>;
  reset: () => void;
  isRetrying: boolean;
}

export const useApiCall = <T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiCallOptions = {}
): UseApiCallReturn<T> => {
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const {
    execute: executeWithRetry,
    retry: retryExecution,
    reset: resetRetry,
    state: retryState,
  } = useRetry(apiFunction, {
    maxAttempts: options.maxRetries || 3,
    onError: options.onError,
    onSuccess: options.onSuccess,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const result = await executeWithRetry(...args);
        
        setState({
          data: result,
          loading: false,
          error: null,
        });
        
        return result;
      } catch (error) {
        const apiError = error instanceof Error ? parseApiError(error) : error as ApiError;
        
        setState({
          data: null,
          loading: false,
          error: apiError,
        });
        
        throw apiError;
      }
    },
    [executeWithRetry]
  );

  const retry = useCallback(async (): Promise<T> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await retryExecution();
      
      setState({
        data: result,
        loading: false,
        error: null,
      });
      
      return result;
    } catch (error) {
      const apiError = error instanceof Error ? parseApiError(error) : error as ApiError;
      
      setState({
        data: null,
        loading: false,
        error: apiError,
      });
      
      throw apiError;
    }
  }, [retryExecution]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
    resetRetry();
  }, [resetRetry]);

  return {
    state,
    execute,
    retry,
    reset,
    isRetrying: retryState.isRetrying,
  };
};