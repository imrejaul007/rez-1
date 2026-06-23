// useActivities Hook
// Manages user activity feed with pagination and filtering

import { useState, useEffect, useCallback } from 'react';
import activityApi, {
  Activity,
  ActivityType,
  ActivityCreate,
  ActivityPagination,
  ActivitySummary,
} from '@/services/activityApi';

interface UseActivitiesOptions {
  autoFetch?: boolean;
  initialPage?: number;
  initialLimit?: number;
  filterType?: ActivityType;
}

interface UseActivitiesReturn {
  activities: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  summary: ActivitySummary | null;
  isLoading: boolean;
  error: string | null;
  fetchActivities: (page?: number, limit?: number, type?: ActivityType) => Promise<void>;
  fetchSummary: () => Promise<void>;
  createActivity: (data: ActivityCreate) => Promise<Activity | null>;
  batchCreateActivities: (activities: ActivityCreate[]) => Promise<Activity[] | null>;
  deleteActivity: (id: string) => Promise<boolean>;
  clearAllActivities: () => Promise<boolean>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilterType: (type?: ActivityType) => void;
  clearError: () => void;
  hasMore: boolean;
}

export const useActivities = ({
  autoFetch = true,
  initialPage = 1,
  initialLimit = 20,
  filterType,
}: UseActivitiesOptions = {}): UseActivitiesReturn => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentLimit] = useState(initialLimit);
  const [currentType, setCurrentType] = useState<ActivityType | undefined>(filterType);

  const fetchActivities = useCallback(
    async (page: number = currentPage, limit: number = currentLimit, type?: ActivityType) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await activityApi.getUserActivities(page, limit, type);

        if (response.success && response.data) {
          setActivities(response.data.activities);
          setPagination(response.data.pagination);
          setCurrentPage(page);
        } else {
          throw new Error(response.message || 'Failed to fetch activities');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch activities';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, currentLimit]
  );

  const fetchSummary = useCallback(async () => {
    setError(null);

    try {
      const response = await activityApi.getActivitySummary();

      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch activity summary');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch activity summary';
      setError(errorMessage);
    }
  }, []);

  const createActivity = useCallback(
    async (data: ActivityCreate): Promise<Activity | null> => {
      setError(null);

      try {
        const response = await activityApi.createActivity(data);

        if (response.success && response.data) {
          await fetchActivities(1, currentLimit, currentType); // Refresh from page 1
          await fetchSummary(); // Update summary
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to create activity');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to create activity';
        setError(errorMessage);
        return null;
      }
    },
    [fetchActivities, fetchSummary, currentLimit, currentType]
  );

  const batchCreateActivities = useCallback(
    async (activitiesData: ActivityCreate[]): Promise<Activity[] | null> => {
      setError(null);

      try {
        const response = await activityApi.batchCreateActivities(activitiesData);

        if (response.success && response.data) {
          await fetchActivities(1, currentLimit, currentType); // Refresh from page 1
          await fetchSummary(); // Update summary
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to batch create activities');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to batch create activities';
        setError(errorMessage);
        return null;
      }
    },
    [fetchActivities, fetchSummary, currentLimit, currentType]
  );

  const deleteActivity = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await activityApi.deleteActivity(id);

        if (response.success) {
          await fetchActivities(currentPage, currentLimit, currentType); // Refresh current page
          await fetchSummary(); // Update summary
          return true;
        } else {
          throw new Error(response.message || 'Failed to delete activity');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to delete activity';
        setError(errorMessage);
        return false;
      }
    },
    [fetchActivities, fetchSummary, currentPage, currentLimit, currentType]
  );

  const clearAllActivities = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const response = await activityApi.clearAllActivities();

      if (response.success) {
        setActivities([]);
        setPagination(null);
        setSummary(null);
        return true;
      } else {
        throw new Error(response.message || 'Failed to clear activities');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to clear activities';
      setError(errorMessage);
      return false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (pagination && currentPage < pagination.pages) {
      await fetchActivities(currentPage + 1, currentLimit, currentType);
    }
  }, [pagination, currentPage, currentLimit, currentType, fetchActivities]);

  const refresh = useCallback(async () => {
    await fetchActivities(1, currentLimit, currentType);
    await fetchSummary();
  }, [fetchActivities, fetchSummary, currentLimit, currentType]);

  const setFilterType = useCallback(
    (type?: ActivityType) => {
      setCurrentType(type);
      fetchActivities(1, currentLimit, type);
    },
    [fetchActivities, currentLimit]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const hasMore = pagination ? currentPage < pagination.pages : false;

  useEffect(() => {
    if (autoFetch) {
      fetchActivities(currentPage, currentLimit, currentType);
      fetchSummary();
    }
  }, [autoFetch]); // Only run on mount

  return {
    activities,
    pagination,
    summary,
    isLoading,
    error,
    fetchActivities,
    fetchSummary,
    createActivity,
    batchCreateActivities,
    deleteActivity,
    clearAllActivities,
    loadMore,
    refresh,
    setFilterType,
    clearError,
    hasMore,
  };
};

export default useActivities;
