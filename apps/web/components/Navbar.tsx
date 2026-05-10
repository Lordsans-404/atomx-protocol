'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

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
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/5">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-xl font-bold tracking-widest text-[#00FFA3] uppercase">
          Atom/X
        </span>
      </Link>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-medium tracking-wide text-white uppercase transition-colors hover:text-[#00FFA3]"
        >
          Dashboard
        </Link>
        <div className="wallet-adapter-button-trigger">
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}
