// useScratchCard Hook
// Manages scratch card flow: eligibility → create → play (server-side prize) → claimed
// All timing from server (never trust client clock)

import { useState, useCallback, useRef, useEffect } from 'react';
import scratchCardApi, { ScratchCardEligibility, ScratchCardSession, ScratchCardPrize } from '@/services/scratchCardApi';

export type ScratchCardState = 'loading' | 'unavailable' | 'available' | 'creating' | 'scratching' | 'revealed' | 'claimFailed';

interface UseScratchCardReturn {
  /** Current UI state */
  state: ScratchCardState;
  /** Server-driven eligibility data */
  eligibility: ScratchCardEligibility | null;
  /** Current session (after create) */
  session: ScratchCardSession | null;
  /** Revealed prize (after play) */
  prize: ScratchCardPrize | null;
  /** Error message */
  error: string | null;
  /** Cooldown seconds remaining (counts down from server time) */
  cooldownSeconds: number;
  /** Check eligibility from server */
  checkEligibility: () => Promise<void>;
  /** Create session (no prize yet) */
  createSession: () => Promise<ScratchCardSession | null>;
  /** Play = scratch + server-side prize gen + wallet credit */
  revealPrize: (sessionId: string) => Promise<ScratchCardPrize | null>;
  /** Retry a failed claim */
  retryClaim: (sessionId: string) => Promise<boolean>;
}

export const useScratchCard = (): UseScratchCardReturn => {
  const [state, setState] = useState<ScratchCardState>('loading');
  const [eligibility, setEligibility] = useState<ScratchCardEligibility | null>(null);
  const [session, setSession] = useState<ScratchCardSession | null>(null);
  const [prize, setPrize] = useState<ScratchCardPrize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Tick cooldown timer every second
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [cooldownSeconds]); // Only re-setup when transitioning to/from cooldown

  const checkEligibility = useCallback(async (): Promise<void> => {
    try {
      setState('loading');
      setError(null);

      const response = await scratchCardApi.checkEligibility();
      if (!mountedRef.current) return;
      if (response.success && response.data) {
        const elig = response.data;
        setEligibility(elig);
        setCooldownSeconds(elig.cooldownSeconds || 0);

        // Check if there's a pending session to resume
        if (elig.pendingSessionId) {
          setSession({ sessionId: elig.pendingSessionId } as ScratchCardSession);
          setState('scratching');
        } else if (elig.canPlay) {
          setState('available');
        } else {
          setState('unavailable');
        }
      } else {
        setError(response.error || 'Failed to check eligibility');
        setState('unavailable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check eligibility');
      setState('unavailable');
    }
  }, []);

  const createSession = useCallback(async (): Promise<ScratchCardSession | null> => {
    try {
      setState('creating');
      setError(null);

      const response = await scratchCardApi.createSession();
      if (!mountedRef.current) return null;
      if (response.success && response.data) {
        setSession(response.data);
        setState('scratching');
        return response.data;
      } else {
        setError(response.error || response.message || 'Failed to create session');
        setState('available');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setState('available');
      return null;
    }
  }, []);

  const revealPrize = useCallback(async (sessionId: string): Promise<ScratchCardPrize | null> => {
    try {
      setError(null);

      const response = await scratchCardApi.play(sessionId);
      if (!mountedRef.current) return null;
      if (response.success && response.data) {
        const completedSession = response.data;
        setSession(completedSession);

        if (completedSession.result?.prize) {
          setPrize(completedSession.result.prize);
          setState('revealed');
          return completedSession.result.prize;
        } else {
          setState('revealed');
          return null;
        }
      } else {
        const errMsg = response.error || response.message || 'Failed to reveal prize';
        // If coin award failed, server reverts to pending — show retry
        if (errMsg.includes('try again') || errMsg.includes('Failed to credit')) {
          setError(errMsg);
          setState('claimFailed');
        } else {
          setError(errMsg);
          setState('available');
        }
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal prize');
      setState('claimFailed');
      return null;
    }
  }, []);

  const retryClaim = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await scratchCardApi.retryClaim(sessionId);
      if (!mountedRef.current) return false;
      if (response.success && response.data) {
        const completedSession = response.data;
        setSession(completedSession);
        if (completedSession.result?.prize) {
          setPrize(completedSession.result.prize);
        }
        setState('revealed');
        return true;
      } else {
        setError(response.error || 'Retry failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
      return false;
    }
  }, []);

  return {
    state,
    eligibility,
    session,
    prize,
    error,
    cooldownSeconds,
    checkEligibility,
    createSession,
    revealPrize,
    retryClaim,
  };
};

export default useScratchCard;
