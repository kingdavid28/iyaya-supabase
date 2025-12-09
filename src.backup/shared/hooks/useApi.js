import { useState, useCallback } from 'react';
import { errorHandler } from '../utils/errorHandler';
import { logger } from '../../utils/logger';

/**
 * Custom hook for API calls with loading states and error handling
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      showLoading = true,
      retries = 0,
      retryDelay = 1000 
    } = options;

    if (showLoading) setLoading(true);
    setError(null);

    let attempt = 0;
    const maxAttempts = retries + 1;

    while (attempt < maxAttempts) {
      try {
        logger.debug(`API call attempt ${attempt + 1}/${maxAttempts}`);
        const result = await apiCall();
        
        if (showLoading) setLoading(false);
        
        if (onSuccess) onSuccess(result);
        return { success: true, data: result };

      } catch (err) {
        attempt++;
        logger.error(`API call failed (attempt ${attempt}):`, err);

        if (attempt < maxAttempts) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // All attempts failed
        const processedError = errorHandler.process(err);
        setError(processedError);
        
        if (showLoading) setLoading(false);
        
        if (onError) onError(processedError);
        return { success: false, error: processedError };
      }
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset,
  };
};

/**
 * Hook for paginated API calls
 */
export const usePaginatedApi = (apiCall, initialPage = 1, pageSize = 10) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { loading, error, execute } = useApi();

  const loadPage = useCallback(async (pageNum = page, reset = false) => {
    const result = await execute(() => apiCall({ page: pageNum, limit: pageSize }));
    
    if (result.success) {
      const { items, total, hasMore: moreAvailable } = result.data;
      
      setData(prevData => reset ? items : [...prevData, ...items]);
      setTotalCount(total);
      setHasMore(moreAvailable);
      setPage(pageNum);
    }
    
    return result;
  }, [apiCall, execute, page, pageSize]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return loadPage(page + 1, false);
    }
  }, [loading, hasMore, loadPage, page]);

  const refresh = useCallback(() => {
    return loadPage(1, true);
  }, [loadPage]);

  return {
    data,
    loading,
    error,
    hasMore,
    totalCount,
    page,
    loadMore,
    refresh,
    loadPage,
  };
};
