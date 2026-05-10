'use client';

import React from 'react';
import { Loader2, Shield } from 'lucide-react';

/**
 * ValidationLoading component shown during AI analysis process
 */
export const ValidationLoading = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <Shield className="absolute w-8 h-8 text-primary transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 animate-pulse" />
      </div>
      <h3 className="text-2xl font-bold text-foreground font-headline-card mb-2">Analyzing Your Proof</h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed font-body-main">
        Our Vision AI is currently validating your activity against the commitment requirements. This usually takes a few seconds.
      </p>
      
      {/* Progress placeholder bars */}
      <div className="w-full max-w-xs mt-10 space-y-3">
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-primary/40 w-2/3 animate-[shimmer_1.5s_infinite]" />
        </div>
        <div className="h-1.5 w-4/5 bg-white/5 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-primary/40 w-1/2 animate-[shimmer_1.5s_infinite_0.5s]" />
        </div>
      </div>
    </div>
  );
};
