'use client';

import React from 'react';
import { ShieldCheck, Sunset, LayoutList, FileText, Clock, Calendar, Flag, Quote, XCircle } from 'lucide-react';

interface CommitmentHeaderProps {
    title: string;
    category: string;
    description: string;
    targetMinutes: number;
    stakeAmount: number;
    daysCompleted: number;
    daysTotal: number;
    remainingStake: number;
    failedCount: number;
    earlyFinishCount: number;
    statusLabel: string;
}

/**
 * CommitmentHeader component displays the main information and progress of a commitment
 */
export const CommitmentHeader: React.FC<CommitmentHeaderProps> = ({
    title,
    category,
    description,
    targetMinutes,
    stakeAmount,
    daysCompleted,
    daysTotal,
    remainingStake,
    failedCount,
    earlyFinishCount,
    statusLabel,
}) => {
    const maxFailures = daysTotal <= 7 ? 1 : 2;

    return (
        <>
            {/* Stake Card */}
            <div className="bg-card rounded-2xl border border-white/5 p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>
                <div className="flex items-center justify-between mb-6">
                    <span className="font-label-caps text-label-caps text-muted-foreground">CURRENT STAKE</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="font-display-timer text-4xl text-foreground font-mono">{(stakeAmount / 1e6).toFixed(2)}</span>
                    <span className="font-headline-card text-muted-foreground">USDT</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-body-main">Smart Contract Locked</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl border border-white/5 p-5">
                    <span className="font-label-caps text-label-caps text-muted-foreground block mb-3">Failures</span>
                    <div className="flex items-center gap-3">
                        <span className="font-display-timer text-3xl text-error font-mono">{failedCount}<span className="text-muted-foreground text-xl">/{maxFailures}</span></span>
                        <XCircle className="w-5 h-5 text-error" />
                        <div className="flex gap-1 ml-auto">
                            <div className={`w-2 h-2 rounded-full ${failedCount > 0 ? 'bg-error' : 'bg-white/10'}`}></div>
                            {maxFailures > 1 && (
                                <div className={`w-2 h-2 rounded-full ${failedCount > 1 ? 'bg-error' : 'bg-white/10'}`}></div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-2xl border border-white/5 p-5">
                    <span className="font-label-caps text-label-caps text-muted-foreground block mb-3">Early Finish</span>
                    <div className="flex items-center gap-3">
                        <span className="font-display-timer text-3xl text-streak-orange font-mono">{earlyFinishCount}</span>
                        <Sunset className="w-5 h-5 text-streak-orange" />
                    </div>
                </div>
            </div>

            {/* Habit Details */}
            <div className="bg-card rounded-2xl border border-white/5 p-6 space-y-6">
                <h3 className="font-headline-card text-lg text-foreground border-b border-white/5 pb-4">Habit Details</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <LayoutList className="w-4 h-4" />
                            <span className="font-body-main text-sm">Category</span>
                        </div>
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-label-caps uppercase">{category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            <span className="font-body-main text-sm">Description</span>
                        </div>
                        <span className="text-foreground font-body-main text-sm max-w-[150px] text-right truncate" title={description}>{description}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="font-body-main text-sm">Daily Commitment</span>
                        </div>
                        <span className="text-foreground font-body-main text-sm">{targetMinutes} mins/day</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="font-body-main text-sm">Duration</span>
                        </div>
                        <span className="text-foreground font-body-main text-sm">{daysTotal} Days Streak</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Flag className="w-4 h-4" />
                            <span className="font-body-main text-sm">Status</span>
                        </div>
                        <span className={`font-body-main text-sm font-semibold ${statusLabel === 'Active' ? 'text-primary' : statusLabel === 'Completed' ? 'text-blue-400' : 'text-error'}`}>{statusLabel}</span>
                    </div>
                </div>
            </div>

            {/* AI Suggestion */}
            <div className="bg-primary-container/10 border border-primary/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <div className="flex items-start gap-4">
                    <div className="bg-primary-container/20 p-2 rounded-lg shrink-0">
                        <Quote className="w-5 h-5 text-primary fill-current" />
                    </div>
                    <div>
                        <h4 className="font-headline-card text-success-emerald mb-2">Habit Reinforcement</h4>
                        <p className="text-foreground font-body-main italic mb-3 leading-relaxed text-sm">
                            "What is rewarded is repeated. What is punished is avoided."
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                                <p className="text-sm text-on-surface-variant font-body-main">
                                    <span className="text-primary font-bold">Never miss twice:</span> If you miss one day, try to get back on track quickly.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                                <p className="text-sm text-on-surface-variant font-body-main">
                                    <span className="text-primary font-bold">Progress:</span> You have completed {daysCompleted} out of {daysTotal} days. Keep going!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
