import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/5">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-xl font-bold tracking-widest text-[#00FFA3] uppercase">
          Atom/X
        </span>
      </Link>

      {/* Action Button */}
      <button className="px-6 py-2 text-sm font-bold tracking-wide text-black uppercase transition-all bg-[#00FFA3] rounded-full hover:bg-[#00FFA3]/90 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,255,163,0.3)]">
        Connect Wallet
      </button>
    </nav>
  );
}
