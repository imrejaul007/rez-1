import { useState, useEffect, useCallback, useRef } from 'react';
import gameApi, { GameStatus } from '@/services/gameApi';

/**
 * Hook to fetch and track game status (plays remaining, cooldown, next reset).
 * Used by game pages to show plays left, cooldown timer, and next reset time.
 */
export function useGameStatus(gameType: string) {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await gameApi.getGameStatus(gameType);
      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        setError(result.error || 'Failed to load status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameType]);

  // Countdown timer to next reset
  useEffect(() => {
    if (!status?.nextResetAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const reset = new Date(status.nextResetAt).getTime();
      const diff = reset - now;

      if (diff <= 0) {
        setCountdown('Resetting...');
        // Refetch status after reset
        fetchStatus();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status?.nextResetAt, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    countdown,
    refresh: fetchStatus,
    playsRemaining: status?.playsRemaining ?? 0,
    maxPlays: status?.maxPlays ?? 0,
    isAvailable: status?.isAvailable ?? true,
  };
}
