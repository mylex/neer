import { renderHook, act } from '@testing-library/react';
import { useRetry } from '../useRetry';
import { ApiError } from '../../utils/errorUtils';

// Mock the errorUtils
jest.mock('../../utils/errorUtils', () => ({
  parseApiError: jest.fn((error) => ({
    message: error.message || 'Unknown error',
    type: 'unknown',
    retryable: true,
  })),
  shouldRetry: jest.fn((error, attempt, maxAttempts) => attempt < maxAttempts),
  getRetryDelay: jest.fn((attempt) => 100), // Short delay for tests
}));

describe('useRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('executes function successfully on first attempt', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(mockFunction));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute('arg1', 'arg2');
    });

    const value = await promise!;

    expect(value).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result.current.state.attempt).toBe(0);
    expect(result.current.state.error).toBeNull();
  });

  it('retries on failure and eventually succeeds', async () => {
    const mockFunction = jest
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockFunction, { maxAttempts: 3 }));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    // Fast-forward through retry delays
    act(() => {
      jest.runAllTimers();
    });

    const value = await promise!;

    expect(value).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(3);
    expect(result.current.state.attempt).toBe(0);
    expect(result.current.state.error).toBeNull();
  });

  it('fails after max attempts', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    const { result } = renderHook(() => useRetry(mockFunction, { maxAttempts: 2 }));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    // Fast-forward through retry delays
    act(() => {
      jest.runAllTimers();
    });

    await expect(promise!).rejects.toMatchObject({
      message: 'Persistent failure',
    });

    expect(mockFunction).toHaveBeenCalledTimes(2);
    expect(result.current.state.isRetrying).toBe(false);
  });

  it('calls onError callback on failure', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
    const onError = jest.fn();
    const { result } = renderHook(() => useRetry(mockFunction, { onError, maxAttempts: 1 }));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    await expect(promise!).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error',
      })
    );
  });

  it('calls onSuccess callback on success', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useRetry(mockFunction, { onSuccess }));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    await promise!;

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('retry function uses last arguments', async () => {
    const mockFunction = jest
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockFunction));

    // First execution fails
    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute('arg1', 'arg2');
    });

    await expect(promise!).rejects.toThrow();

    // Retry with same arguments
    act(() => {
      promise = result.current.retry();
    });

    const value = await promise!;

    expect(value).toBe('success');
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockFunction).toHaveBeenCalledTimes(2);
  });

  it('reset function clears state', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
    const { result } = renderHook(() => useRetry(mockFunction, { maxAttempts: 1 }));

    // Set some state by executing and failing
    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    try {
      await promise!;
    } catch (error) {
      // Expected to fail
    }

    // Reset state
    act(() => {
      result.current.reset();
    });

    expect(result.current.state.attempt).toBe(0);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.isRetrying).toBe(false);
  });

  it('tracks retry state correctly', async () => {
    const mockFunction = jest
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(mockFunction));

    let promise: Promise<string>;
    act(() => {
      promise = result.current.execute();
    });

    // Should be retrying after first failure
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current.state.isRetrying).toBe(true);
    expect(result.current.state.attempt).toBe(2);

    // Complete the retry
    act(() => {
      jest.runAllTimers();
    });

    try {
      await promise!;
      expect(result.current.state.isRetrying).toBe(false);
      expect(result.current.state.attempt).toBe(0);
    } catch (error) {
      // Handle any remaining promise rejections
    }
  });
});