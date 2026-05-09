import { useState, useEffect, useRef, useCallback } from 'react';

export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

const MAX_ALLOWED_ELAPSED_SECONDS = 24 * 60 * 60;

export function useCommitmentTimer(pda: string, commitment: any) {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishError, setFinishError] = useState<string | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const storageKey = `atomx_timer_${pda}`;

  const saveTimer = useCallback((state: TimerState, accumulated: number, startTime: number) => {
    try {
      if (accumulated < 0 || accumulated > MAX_ALLOWED_ELAPSED_SECONDS) return;
      localStorage.setItem(storageKey, JSON.stringify({ state, accumulated, startTime }));
    } catch (err) {
      console.error('Failed to save timer:', err);
    }
  }, [storageKey]);

  const clearSavedTimer = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  const tick = useCallback(() => {
    const now = Date.now();
    const totalSeconds = accumulatedRef.current + Math.floor((now - startTimeRef.current) / 1000);
    setElapsedSeconds(Math.min(totalSeconds, MAX_ALLOWED_ELAPSED_SECONDS));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const { state, accumulated, startTime } = JSON.parse(saved);

      if (typeof accumulated !== 'number' || accumulated < 0 || accumulated > MAX_ALLOWED_ELAPSED_SECONDS) {
        clearSavedTimer();
        return;
      }

      const now = Date.now();
      if (state === 'running' && startTime > 0) {
        if (startTime > now || now - startTime > MAX_ALLOWED_ELAPSED_SECONDS * 1000) {
          clearSavedTimer();
          return;
        }
        accumulatedRef.current = accumulated;
        startTimeRef.current = startTime;
        setTimerState('running');
        rafRef.current = requestAnimationFrame(tick);
      } else if (state === 'paused' && accumulated > 0) {
        accumulatedRef.current = accumulated;
        setElapsedSeconds(accumulated);
        setTimerState('paused');
      } else if (state === 'completed' && accumulated > 0) {
        accumulatedRef.current = accumulated;
        setElapsedSeconds(accumulated);
        setTimerState('completed');
      }
    } catch {
      clearSavedTimer();
    }
  }, [storageKey, tick, clearSavedTimer]);

  const startTimer = useCallback(() => {
    setTimerState('running');
    setFinishError(null);
    startTimeRef.current = Date.now();
    accumulatedRef.current = 0;
    saveTimer('running', 0, startTimeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, saveTimer]);

  const pauseTimer = useCallback(() => {
    setTimerState('paused');
    accumulatedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    saveTimer('paused', accumulatedRef.current, 0);
  }, [saveTimer]);

  const resumeTimer = useCallback(() => {
    setTimerState('running');
    setFinishError(null);
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    saveTimer('running', accumulatedRef.current, startTimeRef.current);
  }, [tick, saveTimer]);

  const resetTimer = useCallback(() => {
    setTimerState('idle');
    setElapsedSeconds(0);
    setFinishError(null);
    accumulatedRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearSavedTimer();
  }, [clearSavedTimer]);

  const finishTimer = useCallback((targetMinutes: number) => {
    const currentAccumulated = timerState === 'running'
      ? accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
      : accumulatedRef.current;

    const currentElapsedMinutes = Math.floor(currentAccumulated / 60);
    const minimumMinutes = Math.ceil(targetMinutes * 0.5);

    if (currentElapsedMinutes < minimumMinutes) {
      setFinishError(
        `Insufficient time. You need at least ${minimumMinutes} mins (50% of target). Only ${currentElapsedMinutes} mins recorded.`
      );
      return false;
    }

    setFinishError(null);
    setTimerState('completed');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    accumulatedRef.current = currentAccumulated;
    setElapsedSeconds(currentAccumulated);
    saveTimer('completed', currentAccumulated, 0);
    return true;
  }, [timerState, saveTimer]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return {
    timerState,
    setTimerState,
    elapsedSeconds,
    setElapsedSeconds,
    finishError,
    accumulatedRef,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    finishTimer,
    clearSavedTimer
  };
}
