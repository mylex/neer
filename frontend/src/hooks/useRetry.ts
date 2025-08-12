import { useState, useCallback } from 'react';
import { ApiError, parseApiError, shouldRetry, getRetryDelay } from '../utils/errorUtils';

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  error: ApiError | null;
}

interface UseRetryOptions {
  maxAttempts?: number;
  onError?: (error: ApiError) => void;
  onSuccess?: () => void;
}

interface UseRetryReturn<T> {
  execute: (...args: any[]) => Promise<T>;
  retry: () => Promise<T>;
  reset: () => void;
  state: RetryState;
}

export const useRetry = <T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> => {
  const { maxAttempts = 3, onError, onSuccess } = options;
  
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    error: null,
  });
  
  const [lastArgs, setLastArgs] = useState<any[]>([]);

  const executeWithRetry = useCallback(
    async (...args: any[]): Promise<T> => {
      setLastArgs(args);
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        setState(prev => ({
          ...prev,
          isRetrying: attempt > 1,
          attempt,
          error: null,
        }));

        try {
          const result = await asyncFunction(...args);
          
          setState({
            isRetrying: false,
            attempt: 0,
            error: null,
          });
          
          if (onSuccess) {
            onSuccess();
          }
          
          return result;
        } catch (error) {
          const apiError = parseApiError(error);
          
          setState(prev => ({
            ...prev,
            error: apiError,
          }));

          if (!shouldRetry(apiError, attempt, maxAttempts)) {
            setState(prev => ({
              ...prev,
              isRetrying: false,
            }));
            
            if (onError) {
              onError(apiError);
            }
            
            throw apiError;
          }

          // Wait before retrying (except on last attempt)
          if (attempt < maxAttempts) {
            const delay = getRetryDelay(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // This should never be reached, but TypeScript requires it
      throw state.error || new Error('Max retry attempts exceeded');
    },
    [asyncFunction, maxAttempts, onError, onSuccess, state.error]
  );

  const retry = useCallback(async (): Promise<T> => {
    return executeWithRetry(...lastArgs);
  }, [executeWithRetry, lastArgs]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attempt: 0,
      error: null,
    });
  }, []);

  return {
    execute: executeWithRetry,
    retry,
    reset,
    state,
  };
};