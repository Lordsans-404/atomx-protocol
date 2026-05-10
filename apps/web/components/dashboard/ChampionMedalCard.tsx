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
    <div className="group relative flex flex-col items-center rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-secondary/25"> {/* updated, flatten the champion tile so it blends into the minimal dashboard surface */}
      {/* Trophy badge overlay */}
      <div className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-secondary/30 bg-secondary"> {/* updated, remove the bright trophy glow for a cleaner badge marker */}
        <Trophy className="h-3 w-3 text-[#472a00]" /> {/* updated, increase badge contrast against the secondary pill */}
      </div>

      {/* Medal image with gold glow */}
      <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-xl border border-secondary/30 bg-card p-1 transition-all duration-300 group-hover:scale-[1.02]"> {/* updated, keep the medal frame crisp and minimal without halo effects */}
        <img
          src={medal.image_url}
          alt={medal.name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      {/* Medal name */}
      <p
        className="line-clamp-2 text-center text-xs font-semibold leading-5 text-foreground"
        title={medal.name}
      >
        {subtitle}
      </p>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary/80"> {/* updated, match the Stitch label treatment on the medal footer */}
        Champion
      </span>
    </div>
  );
}
