'use client';

import React from 'react';
import { Trophy } from 'lucide-react';

interface Medal {
  mint_address: string;
  name: string;
  image_url: string;
  nft_type: string;
  commitment_id?: string;
}

interface ChampionMedalCardProps {
  medal: Medal;
}

/**
 * Displays a premium Champion Medal cNFT card for users who completed a
 * full commitment. Styled distinctly from daily badges with a gold glow and trophy badge.
 */
export function ChampionMedalCard({ medal }: ChampionMedalCardProps) {
  // Extract duration hint from name, e.g. "Atomx Champion — 7 Days Reading"
  const subtitleMatch = medal.name.match(/Atomx Champion — (.+)/);
  const subtitle = subtitleMatch ? subtitleMatch[1] : medal.name;

  return (
    <div className="relative flex flex-col items-center group">
      {/* Trophy badge overlay */}
      <div className="absolute -top-2 -right-2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] border border-yellow-200">
        <Trophy className="w-3 h-3 text-yellow-900" />
      </div>

      {/* Medal image with gold glow */}
      <div className="w-20 h-20 p-1 mb-2 rounded-xl border-2 border-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.35)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] group-hover:border-yellow-300 bg-black/60">
        <img
          src={medal.image_url}
          alt={medal.name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      {/* Medal name */}
      <p
        className="text-xs text-center text-yellow-300/90 font-semibold line-clamp-2 leading-tight"
        title={medal.name}
      >
        {subtitle}
      </p>
      <span className="mt-0.5 text-[10px] text-yellow-500/70 font-medium tracking-wide uppercase">
        Champion
      </span>
    </div>
  );
}
