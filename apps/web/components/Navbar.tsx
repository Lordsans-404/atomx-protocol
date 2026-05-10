'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

import { LayoutDashboard } from 'lucide-react';

// Import the WalletMultiButton dynamically to avoid SSR hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

/**
 * Navbar component rendered on every page.
 * Contains the logo, navigation link, and the Solana wallet connect button.
 * The SOL→USDT swap button is intentionally kept in the dashboard only.
 */
export default function Navbar() {

  return (
    <nav className="fixed left-0 right-0 top-3 z-50 flex justify-center px-4 sm:px-6 lg:px-8 sm:top-4 mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-top-8 zoom-in-110 duration-1000 ease-out fill-mode-both">
      {/* Logo */}
      <div className="flex w-full items-center justify-between gap-2 rounded-full border border-white/10 bg-[#0f1624]/78 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-4">
        <Link href="/" className="group flex min-h-10 items-center gap-2 rounded-full px-2.5 transition-colors hover:bg-white/5">
          <span className="font-playfair text-lg font-bold tracking-tight text-white sm:text-xl">
            Atom/X
          </span>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/8 bg-white/4 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-[background-color,color,border-color] hover:border-primary/20 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:px-4"
          >
            <span className="hidden sm:inline">Dashboard</span>
            <LayoutDashboard className="w-4 h-4 sm:hidden" />
          </Link>
          <div className="wallet-adapter-button-trigger">
            <WalletMultiButton className="!bg-primary/10 !text-primary !h-10 !px-4 !py-2 !rounded-full !font-bold !text-xs hover:!bg-primary/20 hover:!scale-105 active:!scale-95 transition-all !border !border-primary/20 !shadow-none" />
          </div>
        </div>
      </div>
    </nav>
  );
}
