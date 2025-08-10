import { renderHook, act } from '@testing-library/react';
import { useSearchParams } from '../useSearchParams';
import { SearchCriteria } from '../../services/propertyService';

// Mock react-router-dom
const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

describe('useSearchParams', () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear();
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });
  });

  it('returns default search criteria', () => {
    const { result } = renderHook(() => useSearchParams());

    expect(result.current.searchCriteria).toEqual({
      sortBy: 'listingDate',
      sortOrder: 'desc',
    });
  });

  it('updates search criteria and URL parameters', () => {
    const { result } = renderHook(() => useSearchParams());

    const newCriteria: SearchCriteria = {
      query: 'Osaka house',
      minPrice: 3000000,
      maxPrice: 8000000,
      location: 'Osaka',
      propertyType: 'house',
      sortBy: 'price',
      sortOrder: 'asc',
    };

    act(() => {
      result.current.updateSearchCriteria(newCriteria);
    });

    expect(result.current.searchCriteria).toEqual(newCriteria);
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expect.any(URLSearchParams),
      { replace: true }
    );
  });

  it('clears search criteria and URL parameters', () => {
    const { result } = renderHook(() => useSearchParams());

    const initialCriteria: SearchCriteria = {
      query: 'Tokyo apartment',
      minPrice: 5000000,
      propertyType: 'apartment',
      sortBy: 'price',
      sortOrder: 'asc',
    };

    act(() => {
      result.current.updateSearchCriteria(initialCriteria);
    });

    // Clear criteria
    act(() => {
      result.current.clearSearchCriteria();
    });

    expect(result.current.searchCriteria).toEqual({
      sortBy: 'listingDate',
      sortOrder: 'desc',
    });

    expect(mockSetSearchParams).toHaveBeenLastCalledWith(
      new URLSearchParams(),
      { replace: true }
    );
  });

  it('handles undefined values correctly', () => {
    const { result } = renderHook(() => useSearchParams());

    const criteriaWithUndefined: SearchCriteria = {
      query: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      location: undefined,
      propertyType: undefined,
      minSize: undefined,
      maxSize: undefined,
      sortBy: 'listingDate',
      sortOrder: 'desc',
    };

    act(() => {
      result.current.updateSearchCriteria(criteriaWithUndefined);
    });

    // Should not set URL parameters for undefined values
    const expectedParams = new URLSearchParams();
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      expectedParams,
      { replace: true }
    );
  });
});