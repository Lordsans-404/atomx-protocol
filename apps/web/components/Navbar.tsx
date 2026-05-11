'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';

import { LayoutDashboard } from 'lucide-react';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Navbar() {
  return (
    <nav className="fixed left-0 right-0 top-3 z-50 flex justify-center px-4 sm:px-6 lg:px-8 sm:top-4 mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-top-8 zoom-in-110 duration-1000 ease-out fill-mode-both">
      <div className="flex w-full items-center justify-between gap-2 rounded-full border border-white/10 bg-[#0f1624]/78 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-4">
        
        {/* Logo — tight fit, no oversized hover zone */}
        <Link
          href="/"
          className="flex items-center rounded-full p-1 transition-all duration-200 hover:bg-white/5 active:scale-95"
        >
          <Image
            src="/atomx.svg"
            alt="AtomX Logo"
            width={52}
            height={20}
            className="h-3 w-auto sm:h-6"
          />
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-all duration-200 hover:border-primary/25 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_12px_rgba(78,222,163,0.08)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:px-4"
          >
            <LayoutDashboard className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <WalletMultiButton
            className="
              !h-9 !px-4
              !rounded-full
              !bg-primary/10 !text-primary
              !border !border-primary/20
              !font-semibold !text-xs !tracking-wide
              !shadow-none
              !transition-all !duration-200
              hover:!bg-primary/18 hover:!border-primary/35
              hover:!shadow-[0_0_16px_rgba(78,222,163,0.12)]
              active:!scale-95
            "
          />
        </div>
      </div>
    </nav>
  );
}