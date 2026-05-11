'use client';

import Link from 'next/link';
import Image from 'next/image';

/**
 * Footer component for the landing page.
 */
export default function Footer() {
  return (
    <footer className="w-full py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-background">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="mb-2 transition-opacity hover:opacity-80">
            <Image 
              src="/atomx.svg" 
              alt="AtomX Logo" 
              width={48} 
              height={48} 
              className="h-7 w-auto"
            />
          </Link>
          <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            © 2026 ATOMX PROTOCOL · Made by Lordsans-404
          </div>
        </div>

        <ul className="flex flex-wrap justify-center gap-8">
          <li>
            <Link href="#how" className="text-xs font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">
              How It Works
            </Link>
          </li>
          {['Whitepaper', 'GitHub', 'Twitter', 'Discord'].map((link) => (
            <li key={link}>
              <Link href="#" className="text-xs font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider">
                {link}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
