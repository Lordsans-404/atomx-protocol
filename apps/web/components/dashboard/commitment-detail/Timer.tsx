'use client';

import React from 'react';
import { Clock, Play, Pause, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TimerSectionProps {
  timerState: 'idle' | 'running' | 'paused' | 'completed';
  elapsedSeconds: number;
  elapsedMinutes: number;
  targetMinutes: number;
  minimumMinutes: number;
  timerProgress: number;
  canFinish: boolean;
  daysCompleted: number;
  finishError: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onFinish: () => void;
  formatTime: (seconds: number) => string;
}

/**
 * TimerSection component manages the daily timer interface and interaction
 */
export const TimerSection: React.FC<TimerSectionProps> = ({
  timerState,
  elapsedSeconds,
  elapsedMinutes,
  targetMinutes,
  minimumMinutes,
  timerProgress,
  canFinish,
  daysCompleted,
  finishError,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinish,
  formatTime,
}) => {
  return (
    <div className="p-8 border bg-white/5 backdrop-blur-xl border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <h2 className="flex items-center gap-2 mb-8 text-2xl font-bold text-center text-white font-playfair justify-center">
        <Clock className="w-6 h-6 text-[#00FFA3]" />
        Daily Timer — Day {daysCompleted + 1}
      </h2>

      <div className="flex flex-col items-center">
        {/* Circular Progress Timer */}
        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle 
              cx="100" cy="100" r="90" fill="none" 
              stroke={timerProgress >= 100 ? '#00FFA3' : timerProgress >= 50 ? '#facc15' : '#ef4444'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - timerProgress / 100)}`}
              className="transition-all duration-500"
              style={{ filter: timerProgress >= 100 ? 'drop-shadow(0 0 8px rgba(0,255,163,0.5))' : 'none' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold text-white font-mono tracking-wider">{formatTime(elapsedSeconds)}</p>
            <p className="mt-2 text-sm text-white/40">{elapsedMinutes} / {targetMinutes} min</p>
          </div>
        </div>

        {/* Dynamic Hints and Status Messages */}
        <div className="min-h-[60px] flex flex-col items-center justify-center mb-6">
          {timerState === 'idle' && (
            <p className="text-sm text-center text-white/40 max-w-sm">
              Start the timer when you begin your activity. You need at least{' '}
              <span className="text-[#00FFA3] font-semibold">{minimumMinutes} minutes</span>{' '}
              (50% of target) to pass.
            </p>
          )}
          {timerProgress >= 100 && timerState === 'running' && (
            <p className="text-sm text-center text-[#00FFA3] font-medium animate-pulse">
              🎉 Target reached! You can finish the timer and upload your proof.
            </p>
          )}

          {finishError && (
            <div className="flex items-center gap-2 p-4 text-sm text-orange-300 border rounded-xl bg-orange-500/10 border-orange-500/20 max-w-sm text-center">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {finishError}
            </div>
          )}
        </div>

        {/* Progress towards minimum requirement */}
        {!canFinish && timerState !== 'idle' && (
          <div className="mb-8 w-full max-w-xs">
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Goal: Minimum {minimumMinutes} min</span>
              <span>{Math.round((elapsedMinutes / minimumMinutes) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((elapsedMinutes / minimumMinutes) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Timer Action Controls */}
        <div className="flex gap-4 flex-wrap justify-center">
          {timerState === 'idle' && (
            <button 
              onClick={onStart} 
              className="flex items-center gap-2 px-10 py-4 text-lg font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,255,163,0.3)]"
            >
              <Play className="w-5 h-5 fill-current" /> Start Timer
            </button>
          )}
          
          {timerState === 'running' && (
            <>
              <button 
                onClick={onPause} 
                className="flex items-center gap-2 px-6 py-3 font-semibold text-white transition-all border border-white/20 rounded-full hover:bg-white/10 hover:border-white/40"
              >
                <Pause className="w-5 h-5" /> Pause
              </button>
              <button
                onClick={onFinish}
                disabled={!canFinish}
                title={!canFinish ? `Minimal ${minimumMinutes} menit diperlukan` : ''}
                className={`flex items-center gap-2 px-8 py-3 font-bold text-black uppercase rounded-full transition-all shadow-[0_0_15px_rgba(0,255,163,0.3)] ${
                  canFinish
                    ? 'bg-[#00FFA3] hover:bg-[#00FFA3]/90 cursor-pointer hover:scale-105'
                    : 'bg-[#00FFA3]/30 text-black/40 cursor-not-allowed grayscale-[0.5]'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" /> Finish & Upload
              </button>
            </>
          )}

          {timerState === 'paused' && (
            <>
              <button 
                onClick={onResume} 
                className="flex items-center gap-2 px-8 py-3 font-bold text-black uppercase bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 transition-all hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" /> Resume
              </button>
              <button 
                onClick={onReset} 
                className="flex items-center gap-2 px-6 py-3 font-semibold text-white/50 transition-all border border-white/10 rounded-full hover:text-white hover:border-white/30"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button
                onClick={onFinish}
                disabled={!canFinish}
                className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-full transition-all ${
                  canFinish
                    ? 'text-white border border-white/20 hover:bg-white/10 cursor-pointer'
                    : 'text-white/20 border border-white/5 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" /> Finish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
