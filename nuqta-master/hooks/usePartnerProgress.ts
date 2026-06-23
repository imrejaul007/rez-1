import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import partnerApi, { PartnerDashboard } from '@/services/partnerApi';

interface UsePartnerProgressOptions {
  /**
   * Polling interval in milliseconds (default: 30000 = 30 seconds)
   */
  pollingInterval?: number;
  /**
   * Whether to enable polling (default: true)
   */
  enablePolling?: boolean;
  /**
   * Callback when task progress changes
   */
  onTaskProgressChange?: (oldTasks: any[], newTasks: any[]) => void;
  /**
   * Callback when milestone is achieved
   */
  onMilestoneAchieved?: (milestone: any) => void;
  /**
   * Callback when level changes
   */
  onLevelChange?: (oldLevel: number, newLevel: number) => void;
}

interface PartnerProgressState {
  data: PartnerDashboard | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Hook for managing partner progress with optional real-time polling
 *
 * Features:
 * - Initial data fetch
 * - Optional polling for real-time updates
 * - Pauses polling when app is in background
 * - Callbacks for progress changes
 * - Manual refresh support
 */
export function usePartnerProgress(options: UsePartnerProgressOptions = {}) {
  const {
    pollingInterval = 30000, // 30 seconds default
    enablePolling = true,
    onTaskProgressChange,
    onMilestoneAchieved,
    onLevelChange,
  } = options;

  const [state, setState] = useState<PartnerProgressState>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const [refreshing, setRefreshing] = useState(false);
  const previousDataRef = useRef<PartnerDashboard | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Fetch partner data
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const [dashboardResponse, benefitsResponse] = await Promise.all([
        partnerApi.getDashboard(),
        partnerApi.getBenefits(),
      ]);

      if (dashboardResponse.success && dashboardResponse.data) {
        const newData: PartnerDashboard = {
          ...dashboardResponse.data,
          // Add levels from benefits response if available
        };

        // Check for changes and trigger callbacks
        if (previousDataRef.current) {
          detectChanges(previousDataRef.current, newData);
        }

        previousDataRef.current = newData;

        setState({
          data: newData,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        throw new Error(dashboardResponse.error || 'Failed to load partner data');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load partner data',
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Detect changes between old and new data
  const detectChanges = useCallback((oldData: PartnerDashboard, newData: PartnerDashboard) => {
    // Check for task progress changes
    if (onTaskProgressChange && oldData.tasks && newData.tasks) {
      const hasTaskChanges = newData.tasks.some((newTask, index) => {
        const oldTask = oldData.tasks[index];
        if (!oldTask) return true;
        return (
          newTask.progress?.current !== oldTask.progress?.current ||
          newTask.completed !== oldTask.completed
        );
      });

      if (hasTaskChanges) {
        onTaskProgressChange(oldData.tasks, newData.tasks);
      }
    }

    // Check for newly achieved milestones
    if (onMilestoneAchieved && oldData.milestones && newData.milestones) {
      newData.milestones.forEach((newMilestone, index) => {
        const oldMilestone = oldData.milestones[index];
        if (oldMilestone && !oldMilestone.achieved && newMilestone.achieved) {
          onMilestoneAchieved(newMilestone);
        }
      });
    }

    // Check for level changes
    if (onLevelChange && oldData.profile && newData.profile) {
      const oldLevel = oldData.profile.level?.level || 1;
      const newLevel = newData.profile.level?.level || 1;
      if (oldLevel !== newLevel) {
        onLevelChange(oldLevel, newLevel);
      }
    }
  }, [onTaskProgressChange, onMilestoneAchieved, onLevelChange]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!enablePolling || pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(() => {
      // Only poll if app is in foreground
      if (appStateRef.current === 'active') {
        fetchData(false);
      }
    }, pollingInterval);
  }, [enablePolling, pollingInterval, fetchData]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground - refresh data
        fetchData(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchData]);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchData(false);

    if (enablePolling) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [fetchData, enablePolling, startPolling, stopPolling]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Update specific task optimistically
  const updateTaskProgress = useCallback((taskId: string, newProgress: number) => {
    setState(prev => {
      if (!prev.data) return prev;

      const updatedTasks = prev.data.tasks.map(task =>
        task.id === taskId
          ? { ...task, progress: { ...task.progress, current: newProgress } }
          : task
      );

      return {
        ...prev,
        data: {
          ...prev.data,
          tasks: updatedTasks,
        },
      };
    });
  }, []);

  return {
    // State
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refreshing,

    // Actions
    refresh,
    updateTaskProgress,
    startPolling,
    stopPolling,

    // Convenience accessors
    profile: state.data?.profile || null,
    tasks: state.data?.tasks || [],
    milestones: state.data?.milestones || [],
    jackpotProgress: state.data?.jackpotProgress || [],
    claimableOffers: state.data?.claimableOffers || [],
    faqs: state.data?.faqs || [],
  };
}

export default usePartnerProgress;
