'use client';

import { Wallet, ChevronDown, Copy, LogOut } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useState, useRef, useEffect } from 'react';

interface WalletButtonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'rounded';
  showIcon?: boolean;
}

export default function WalletButton({
  size = 'md',
  variant = 'pill',
  showIcon = true,
}: WalletButtonProps) {
  const { connected, publicKey, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const copyAddress = () => {
    if (publicKey) navigator.clipboard.writeText(publicKey.toBase58());
    setOpen(false);
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-[0.65rem] gap-1.5',
    md: 'h-10 px-4 text-xs gap-2',
    lg: 'h-12 px-6 text-sm gap-2.5',
  };

  const radiusClasses = {
    pill: 'rounded-full',
    rounded: 'rounded-xl',
  };

  const baseClasses = `inline-flex items-center font-bold uppercase tracking-widest border border-primary/25 bg-primary/10 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_16px_rgba(74,222,128,0.15)] hover:scale-[1.03] active:scale-[0.97] ${sizeClasses[size]} ${radiusClasses[variant]}`;

  if (!connected) {
    return (
      <button onClick={() => setVisible(true)} className={baseClasses}>
        {showIcon && <Wallet className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
        <span>Select Wallet</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} className={baseClasses}>
        {wallet?.adapter.icon && (
          <img src={wallet.adapter.icon} alt="" className={`rounded-full ${size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
        )}
        <span>{shortAddress}</span>
        <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''} ${size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3'}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[160px] overflow-hidden rounded-2xl border border-white/8 bg-[#0f1624]/90 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <button
            onClick={copyAddress}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Address
          </button>
          <div className="mx-3 h-px bg-white/6" />
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-xs font-medium text-red-400/80 transition-colors hover:bg-red-500/8 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}