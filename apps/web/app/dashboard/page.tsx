'use client';

import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Activity, ArrowDownUp, Flame, Loader2, Medal, Plus, Target, Wallet, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'; // updated, drop an unused icon import after the visual refactor
import Link from 'next/link';

import CreateCommitmentModal from '@/components/dashboard/CreateCommitmentModal';
import SwapModal from '@/components/SwapModal';
import { ChampionMedalCard } from '@/components/dashboard/ChampionMedalCard';
import { useCommitments } from '@/hooks/useCommitments'; // updated, remove an unused type import from the dashboard page
import PageShellWidth from '@/components/PageShellWidth';

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', classes: 'border border-primary/30 bg-primary/12 text-primary' }; // updated, align active badge colors with Stitch tokens
    case 'completed':
      return { label: 'Completed', classes: 'border border-secondary/30 bg-secondary/12 text-secondary' }; // updated, use the Stitch secondary accent for completed states
    case 'failed':
    case 'slashed':
      return { label: status === 'failed' ? 'Failed' : 'Slashed', classes: 'border border-error/30 bg-error/12 text-error' }; // updated, use the Stitch error palette for failed states
    default:
      return { label: 'Unknown', classes: 'border border-border bg-surface-container-high/60 text-muted-foreground' }; // updated, normalize fallback badge styling with shared surface tokens
  }
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const { commitments, isLoading, refetch } = useCommitments();
  const [medals, setMedals] = useState<any[]>([]);
  const [isLoadingMedals, setIsLoadingMedals] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    setIsLoadingMedals(true);
    fetch(`/api/medals?owner=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then(data => {
        setMedals(data.medals || []);
      })
      .catch(err => console.error('Error fetching medals:', err))
      .finally(() => setIsLoadingMedals(false));
  }, [publicKey]);

  if (!isMounted) return null;

  // Split medals into champion and daily badge categories for separate rendering
  const championMedals = medals.filter((m) => m.nft_type === 'completion_medal');
  const dailyBadges = medals.filter((m) => m.nft_type === 'daily_badge');

  // Computed stats from real on-chain data
  const activeCommitmentsList = commitments.filter(c => c.status === 'active' && !c.isOverdue);
  const totalActiveStaked = activeCommitmentsList.reduce((sum, c) => sum + c.remainingStake, 0);
  const completedCount = commitments.filter(c => c.status === 'completed').length;
  const failedCount = commitments.filter(c => c.status === 'failed' || c.status === 'slashed' || (c.status === 'active' && c.isOverdue)).length;
  const totalCount = commitments.length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Pagination logic
  const totalPages = Math.ceil(activeCommitmentsList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCommitments = activeCommitmentsList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!connected) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center"> {/* updated, keep the wallet gate centered with the new spacing system */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-[0_0_30px_rgba(78,222,163,0.18)]"> {/* updated, use the Stitch primary glow for the empty state icon */}
          <Wallet className="h-12 w-12 text-primary" /> {/* updated, move the icon onto the shared primary token */}
        </div>
        <h1 className="mb-4 font-playfair text-4xl font-bold tracking-tight text-white md:text-5xl"> {/* updated, give the wallet gate a display heading closer to Stitch */}
          Access Your Dashboard
        </h1>
        <p className="mb-8 max-w-md text-sm leading-6 text-muted-foreground sm:text-base"> {/* updated, soften supporting copy and improve mobile reading width */}
          Connect your Solana wallet to view your active commitments, track your progress, and manage your staked USDT.
        </p>
        <div className="wallet-adapter-button-trigger">
          <WalletMultiButton className="!bg-primary/10 !text-primary !h-12 !px-8 !py-3 !rounded-full !font-bold !text-sm hover:!bg-primary/20 hover:!scale-105 active:!scale-95 transition-all !border !border-primary/20 !shadow-[0_0_30px_rgba(78,222,163,0.18)]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageShellWidth value="80rem" />
      <div className="w-full"> {/* updated, keep the dashboard container airy while the surfaces become more minimal */}
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-5 lg:mb-12 lg:flex-row lg:items-end lg:justify-between"> {/* updated, tighten the hero layout and keep it stable across breakpoints */}
          <div className="space-y-2"> {/* updated, group the heading copy with Stitch-like vertical spacing */}
            <h1 className="font-playfair text-3xl font-bold tracking-tight text-white sm:text-4xl"> {/* updated, use the display type scale from the target design */}
              Welcome back, <span className="text-primary">{publicKey?.toBase58().substring(0, 4)}...{publicKey?.toBase58().substring(publicKey.toBase58().length - 4)}</span> {/* updated, swap the accent highlight to the shared primary token */}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">Here is your discipline overview.</p> {/* updated, use muted tokenized body text for the dashboard intro */}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end"> {/* updated, let dashboard actions stack cleanly on mobile and wrap on tablet */}
            <Link
              href="/dashboard/history"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface-container-high/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            >
              View History
            </Link>
            {/* Get USDT — only shown in dashboard after wallet is connected */}
            <button
              id="dashboard-get-usdt-btn"
              onClick={() => setIsSwapModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/18 bg-primary/8 px-5 py-3 text-sm font-bold text-primary transition-[background-color,border-color,transform] hover:border-primary/35 hover:bg-primary/12 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" // updated, soften the secondary CTA so it does not add extra glow to the dashboard shell
            >
              <ArrowDownUp className="w-4 h-4" />
              Get USDT
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold uppercase tracking-[0.12em] text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45" // updated, remove the heavy CTA glow for a flatter minimal header
            >
              <Plus className="w-5 h-5" />
              New Commitment
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"> {/* updated, move the dashboard into a denser Stitch-like two-column composition */}

          {/* Left Column: Overview & Medals */}
          <div className="space-y-6"> {/* updated, reduce vertical gaps to match the target card rhythm */}
            {/* Overview Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:p-6"> {/* updated, switch the overview card to a solid minimal surface */}
              <h2 className="mb-5 flex items-center gap-2 font-playfair text-xl font-semibold text-white"> {/* updated, align card heading typography with the target design */}
                <Activity className="h-5 w-5 text-primary" /> {/* updated, map the section icon to the shared accent token */}
                Account Overview
              </h2>
              <div className="space-y-5"> {/* updated, tighten internal card spacing */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active Stake</p> {/* updated, use Stitch label sizing for stat labels */}
                  <p className="mt-1 flex items-baseline gap-2 text-3xl font-bold tracking-tight text-white sm:text-[2rem]"> {/* updated, bring the main stat closer to the reference baseline treatment */}
                    {isLoading ? '...' : totalActiveStaked.toFixed(2)} <span className="font-mono text-sm text-primary">USDT</span> {/* updated, style the currency suffix with the mono accent from Stitch */}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3"> {/* updated, compress the secondary stat grid for better mobile fit */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4"> {/* updated, use a solid support surface to avoid translucent layering noise */}
                    <Flame className="mb-2 h-5 w-5 text-primary" /> {/* updated, use the shared primary color for positive stats */}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Success Rate</p> {/* updated, normalize secondary stat labels */}
                    <p className="mt-1 text-xl font-bold text-white">{isLoading ? '...' : `${successRate}%`}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4"> {/* updated, keep support cards flat and consistent */}
                    <TrendingDown className="mb-2 h-5 w-5 text-error" /> {/* updated, remap failure icon to the shared error token */}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Failed Habits</p> {/* updated, normalize negative stat labels */}
                    <p className="mt-1 text-xl font-bold text-error">{isLoading ? '...' : failedCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medal Showcase Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:p-6"> {/* updated, flatten the medal card into a cleaner solid panel */}
              <h2 className="mb-5 flex items-center gap-2 font-playfair text-xl font-semibold text-white"> {/* updated, align medal section heading with the new card system */}
                <Medal className="h-5 w-5 text-secondary" /> {/* updated, use the secondary accent for achievement framing */}
                Medal Showcase
              </h2>
              {isLoadingMedals ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-secondary" /> {/* updated, align the loading state accent with the medal palette */}
                </div>
              ) : medals.length === 0 ? (
                <div className="flex flex-col items-center py-4">
                  <p className="text-center text-sm leading-6 text-muted-foreground">No medals yet.<br />Complete challenges to earn cNFTs!</p> {/* updated, use calmer muted copy styling for the empty state */}
                </div>
              ) : (
                <div className="space-y-6"> {/* updated, keep a tighter vertical cadence inside the medal showcase */}
                  {/* Champion Medals — featured row with gold treatment */}
                  {championMedals.length > 0 && (
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary/80"> {/* updated, restyle the champion label with the Stitch label rhythm */}
                        🏆 Champion
                      </p>
                      <div className="grid grid-cols-2 gap-3"> {/* updated, limit to 2 columns to match the 2 item limit */}
                        {championMedals.slice(0, 2).map((medal) => (
                          <ChampionMedalCard key={medal.mint_address} medal={medal} />
                        ))}
                      </div>
                      {championMedals.length > 2 && (
                        <div className="flex justify-center mt-4">
                          <Link href="/dashboard/champion-medals" className="text-xs font-medium text-secondary transition-colors hover:text-white hover:underline">
                            View all {championMedals.length} champion medals →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Daily Badges — standard grid */}
                  {dailyBadges.length > 0 && (
                    <div>
                      {championMedals.length > 0 && (
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"> {/* updated, align the daily badge label with the shared label styling */}
                          Daily Badges
                        </p>
                      )}
                      <div className="mb-4 grid grid-cols-3 gap-3"> {/* updated, reduce badge grid spacing to match Stitch density */}
                        {dailyBadges.slice(0, 3).map((medal) => (
                          <div key={medal.mint_address} className="flex flex-col items-center group">
                            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-1 transition-transform duration-200 group-hover:scale-[1.02] group-hover:border-secondary/30"> {/* updated, simplify badge tiles so they feel less glossy and busy */}
                              <img src={medal.image_url} alt={medal.name} className="w-full h-full object-cover rounded-lg bg-black/50" />
                            </div>
                            <p className="line-clamp-2 text-center text-xs leading-5 text-foreground/80" title={medal.name}>{medal.name}</p> {/* updated, improve text contrast and alignment on badge captions */}
                          </div>
                        ))}
                        {/* Empty slot filler for aesthetics */}
                        {dailyBadges.length < 3 && Array.from({ length: 3 - dailyBadges.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="flex flex-col items-center">
                            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5"> {/* updated, keep placeholder tiles solid enough to avoid background bleed-through */}
                              <span className="text-2xl text-muted-foreground/40">?</span> {/* updated, soften the placeholder glyph */}
                            </div>
                          </div>
                        ))}
                      </div>
                      {dailyBadges.length > 3 && (
                        <div className="flex justify-center mt-2">
                          <Link href="/dashboard/daily-badges" className="text-xs font-medium text-primary transition-colors hover:text-white hover:underline">
                            View all {dailyBadges.length} daily badges →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Commitments */}
          <div>
            <div className="min-h-[600px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:p-6"> {/* updated, flatten the commitments panel into a more minimal solid surface */}
              <h2 className="mb-8 flex items-center gap-2 font-playfair text-2xl font-bold text-white"> {/* updated, align the commitments heading with Stitch display styling */}
                <Target className="h-6 w-6 text-primary" /> {/* updated, use the primary accent for the main commitments section */}
                Your Commitments
              </h2>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" /> {/* updated, unify the loading accent with the page system */}
                  <p className="text-muted-foreground">Loading commitments from blockchain...</p> {/* updated, use shared muted copy for the loading state */}
                </div>
              ) : activeCommitmentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-white/10 bg-white/5"> {/* updated, make the empty state chip more solid to reduce background visual noise */}
                    <Target className="h-10 w-10 text-muted-foreground/40" /> {/* updated, soften the empty state icon */}
                  </div>
                  <p className="mb-2 text-lg font-semibold text-white/80">No active commitments</p> {/* updated, improve empty state title contrast */}
                  <p className="mb-6 text-center text-sm text-muted-foreground">You don't have any ongoing challenges right now.</p> {/* updated, keep supporting copy centered and muted */}
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98]" // updated, keep the empty-state CTA direct without extra visual effects
                  >
                    <Plus className="w-4 h-4" />
                    Start New Challenge
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {paginatedCommitments.map((commitment) => {
                    const progressPercentage = commitment.durationDays > 0
                      ? Math.min((commitment.proofCount / commitment.durationDays) * 100, 100)
                      : 0;
                    const badge = statusBadge(commitment.status);
                    const createdDate = new Date(commitment.createdAt * 1000);

                    return (
                      <div key={commitment.publicKey} className={`group overflow-hidden rounded-2xl border p-5 transition-colors sm:p-6 ${commitment.isOverdue
                          ? 'border-error/24 bg-[#201416] hover:border-error/35'
                          : 'border-white/10 bg-white/5 backdrop-blur-xl hover:border-primary/30 hover:bg-primary/5'
                        }`}>
                        {/* updated, remove the blurred decorative glow so the dashboard background feels cleaner */}
                        {/* Overdue Warning */}
                        {commitment.isOverdue && (
                          <div className="mb-4 flex items-start gap-3 rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error"> {/* updated, keep the overdue alert clear without adding extra saturation */}
                            <span className="text-lg">⚠️</span>
                            <div>
                              <p className="font-semibold">Overdue! {commitment.missedDays} day{commitment.missedDays > 1 ? 's' : ''} missed</p>
                              <p className="text-xs text-error/75">
                                {commitment.failedCount === 0
                                  ? 'First miss → 40% stake at risk of being slashed'
                                  : 'Second miss → Full stake will be slashed!'}
                                {commitment.durationDays <= 7 && ' (Short commitment: full slash)'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"> {/* updated, allow the heading row to stack cleanly on mobile */}
                          <div className="space-y-1"> {/* updated, tighten the content stack in each commitment card */}
                            <div className="flex flex-wrap items-center gap-2"> {/* updated, let long commitment titles and chips wrap gracefully */}
                              <h3 className={`text-xl font-bold transition-colors ${commitment.isOverdue ? 'text-error group-hover:text-error' : 'text-white group-hover:text-primary'
                                }`}>
                                {commitment.title}
                              </h3>
                              <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"> {/* updated, make category chips more solid and neutral */}
                                {commitment.category || 'Other'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {commitment.dailyTargetMinutes} mins / day • {commitment.stakeAmount} USDT Staked
                            </p>
                            <p className="text-xs text-muted-foreground/80">
                              Created: {createdDate.toLocaleDateString()} • Day {commitment.currentDay + 1} of {commitment.durationDays}
                            </p>
                          </div>
                          <div className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badge.classes}`}> {/* updated, keep status chips minimal while preserving hierarchy */}
                            {badge.label}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                          <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between"> {/* updated, keep progress metadata readable on narrow widths */}
                            <span className="font-medium text-white">{commitment.proofCount} / {commitment.durationDays} Days Proved</span>
                            <span className="font-mono text-xs text-primary sm:text-sm">
                              {commitment.remainingStake.toFixed(2)} USDT Remaining
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-card"> {/* updated, darken the progress rail so it sits flatter inside the commitment card */}
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${commitment.isOverdue ? 'bg-gradient-to-r from-error to-secondary' : 'bg-primary shadow-[0_0_10px_rgba(78,222,163,0.5)]'
                                }`}
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"> {/* updated, let stat chips wrap while preserving the Stitch muted hierarchy */}
                          <span>⚡ Early finish: {commitment.earlyFinishCount}</span>
                          <span>❌ Failed: {commitment.failedCount}</span>
                          <span>📊 Progress: {Math.round(progressPercentage)}%</span>
                        </div>

                        {/* Action */}
                        <div className="mt-5 flex justify-end"> {/* updated, align the action with the new vertical rhythm */}
                          <Link
                            href={`/dashboard/commitments/${commitment.publicKey}`}
                            className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold transition-[background-color,border-color,color,transform] sm:w-auto ${commitment.isOverdue
                                ? 'border-error/25 bg-error/10 text-error hover:bg-error/16 hover:border-error/40'
                                : commitment.proofCount >= commitment.durationDays && commitment.status === 'active'
                                  ? 'border-primary/20 bg-primary text-primary-foreground active:scale-[0.98]'
                                  : 'border-primary/20 bg-primary/8 text-primary hover:bg-primary/12 hover:border-primary/30 active:scale-[0.98]'
                              }`}
                          >
                            {commitment.isOverdue ? '🔥 Submit Proof Now!' : commitment.proofCount >= commitment.durationDays && commitment.status === 'active' ? '🎉 Claim Rewards!' : 'Start Daily Commit'}
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-white/10">
                      <p className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, activeCommitmentsList.length)} of {activeCommitmentsList.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-white px-2">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <CreateCommitmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          // Refetch commitments from blockchain
          setTimeout(() => refetch(), 2000);
        }}
      />

      {/* Devnet SOL → USDT swap — only mounted in dashboard, only accessible when wallet is connected */}
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
      />
    </>
  );
}
