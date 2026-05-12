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
  isAlreadySubmittedToday?: boolean;
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
  isAlreadySubmittedToday = false,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center">
        <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-8">
            {/* Progress Ring (SVG) */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle className="stroke-white/5 fill-none" cx="50%" cy="50%" r="46%" strokeWidth="12"></circle>
                <circle 
                    className="fill-none transition-all duration-500" 
                    cx="50%" cy="50%" r="46%" 
                    pathLength="100"
                    stroke={isAlreadySubmittedToday ? '#4edea3' : timerProgress >= 100 ? '#4edea3' : timerProgress >= 50 ? '#facc15' : '#ef4444'}
                    strokeDasharray="100"
                    strokeDashoffset={isAlreadySubmittedToday ? 0 : 100 - timerProgress} 
                    strokeLinecap="round" strokeWidth="12">
                </circle>
            </svg>
            {/* Inner Glow */}
            <div className={`absolute inset-4 rounded-full ${isAlreadySubmittedToday || timerProgress >= 100 ? 'bg-primary/10 shadow-[0_0_60px_rgba(78,222,163,0.3)]' : 'bg-primary/5 shadow-[0_0_60px_rgba(78,222,163,0.1)]'} flex flex-col items-center justify-center transition-all duration-500`}>
                {isAlreadySubmittedToday ? (
                  <CheckCircle2 className="w-20 h-20 text-primary mb-4" />
                ) : (
                  <span className="font-display-timer text-5xl md:text-[80px] text-foreground tracking-tighter mb-2">{formatTime(elapsedSeconds)}</span>
                )}
                <span className="font-label-caps text-primary tracking-widest uppercase">
                  {isAlreadySubmittedToday ? 'COMPLETED TODAY' : `DAY ${daysCompleted + 1}`}
                </span>
            </div>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
            {isAlreadySubmittedToday ? (
                <div className="w-full p-6 rounded-2xl bg-white/5 border border-primary/20 text-center flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
                    <p className="text-xl font-headline-card text-foreground">You've reached today's goal!</p>
                    <p className="text-sm text-muted-foreground font-body-main">Great work. Come back tomorrow (UTC) to continue your commitment.</p>
                </div>
            ) : (
                <>
                    {timerState === 'idle' && (
                        <button 
                            onClick={onStart} 
                            className="w-full py-5 rounded-2xl bg-primary text-on-primary font-headline-card text-xl shadow-[0_0_30px_rgba(78,222,163,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            <Play className="w-8 h-8 fill-current" />
                            Start Session
                        </button>
                    )}

                    {timerState === 'running' && (
                        <>
                            <button 
                                onClick={onPause} 
                                className="w-full py-4 rounded-2xl bg-surface-variant text-foreground border border-white/10 font-headline-card text-lg hover:bg-white/5 transition-all flex items-center justify-center gap-3">
                                <Pause className="w-6 h-6 fill-current" />
                                Pause
                            </button>
                            <button
                                onClick={onFinish}
                                disabled={!canFinish}
                                className={`w-full py-5 rounded-2xl font-headline-card text-xl transition-all flex items-center justify-center gap-3 ${
                                canFinish
                                    ? 'bg-primary text-on-primary shadow-[0_0_30px_rgba(78,222,163,0.3)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                                    : 'bg-primary/20 text-primary/40 cursor-not-allowed'
                                }`}>
                                <CheckCircle2 className="w-7 h-7" />
                                Finish & Upload
                            </button>
                        </>
                    )}

                    {timerState === 'paused' && (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={onResume} 
                                className="py-4 rounded-xl bg-primary text-on-primary font-headline-card text-lg shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                <Play className="w-6 h-6 fill-current" />
                                Resume
                            </button>
                            <button 
                                onClick={onReset} 
                                className="py-4 rounded-xl bg-surface-variant text-muted-foreground border border-white/10 font-headline-card text-lg hover:text-foreground transition-all flex items-center justify-center gap-2">
                                <RotateCcw className="w-5 h-5" />
                                Reset
                            </button>
                            <button
                                onClick={onFinish}
                                disabled={!canFinish}
                                className={`col-span-2 py-4 rounded-xl font-headline-card text-lg transition-all flex items-center justify-center gap-2 ${
                                canFinish
                                    ? 'bg-surface-variant text-primary border border-primary/30 hover:bg-primary/10 cursor-pointer'
                                    : 'bg-surface-variant/50 text-muted-foreground border border-white/5 cursor-not-allowed'
                                }`}>
                                <CheckCircle2 className="w-6 h-6" />
                                Finish
                            </button>
                        </div>
                    )}
                </>
            )}

            <p className="text-center mt-2 text-muted-foreground font-body-main">
                Today's goal: <span className="text-foreground font-bold">{targetMinutes}:00 mins</span>
                {!canFinish && <span className="block text-sm opacity-70 mt-1">Min. required: {minimumMinutes}:00 mins</span>}
            </p>
            
            {finishError && (
                <div className="mt-4 flex items-center gap-2 p-4 text-sm text-error bg-error/10 border border-error/20 rounded-xl justify-center">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {finishError}
                </div>
            )}
        </div>
    </div>
  );
};
